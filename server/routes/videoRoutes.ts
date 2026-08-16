import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db, UPLOAD_DIR } from '../database/db.js';
import { VideoService } from '../services/videoService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const CHUNKS_TEMP_DIR = path.join(UPLOAD_DIR, 'chunks_temp');

// Ensure chunk directory exists
if (!fs.existsSync(CHUNKS_TEMP_DIR)) {
  fs.mkdirSync(CHUNKS_TEMP_DIR, { recursive: true });
}

// Clean up stale chunk directories older than 2 hours
function cleanupStaleChunks() {
  try {
    if (!fs.existsSync(CHUNKS_TEMP_DIR)) return;
    const entries = fs.readdirSync(CHUNKS_TEMP_DIR);
    const now = Date.now();
    for (const entry of entries) {
      const entryPath = path.join(CHUNKS_TEMP_DIR, entry);
      try {
        const stats = fs.statSync(entryPath);
        if (stats.isDirectory() && now - stats.mtimeMs > 2 * 3600 * 1000) {
          fs.rmSync(entryPath, { recursive: true, force: true });
        }
      } catch (e) {}
    }
  } catch (e) {}
}
cleanupStaleChunks();

// Configure Multer storage for standard uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const safeId = crypto.randomUUID();
    cb(null, `${safeId}${ext}`);
  },
});

// Multer upload filter
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024 * 50, // 50GB cap to allow 10GB+ large video uploads
  },
  fileFilter: (_req, file, cb) => {
    const settings = db.getSettings();
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = settings.allowedExtensions && settings.allowedExtensions.length > 0
      ? settings.allowedExtensions.map((e) => e.toLowerCase())
      : ['.mp4', '.mkv', '.mov', '.avi', '.webm', '.ts', '.flv', '.m4v', '.3gp', '.wmv', '.mpeg', '.mpg'];

    if (!allowed.includes(ext)) {
      return cb(new Error(`Invalid file extension "${ext}". Supported: ${allowed.join(', ')}`));
    }
    cb(null, true);
  },
});

// Multer storage for chunk uploads (streams directly from socket to chunk file on disk)
const chunkStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const uploadId = (req.body.uploadId || req.headers['x-upload-id'] as string || '').trim();
    if (!uploadId || !/^[a-zA-Z0-9_-]+$/.test(uploadId)) {
      // Fallback temp location if headers/body haven't finished parsing yet
      const fallbackDir = path.join(CHUNKS_TEMP_DIR, 'staging');
      fs.mkdirSync(fallbackDir, { recursive: true });
      return cb(null, fallbackDir);
    }
    const sessionDir = path.join(CHUNKS_TEMP_DIR, uploadId);
    fs.mkdirSync(sessionDir, { recursive: true });
    cb(null, sessionDir);
  },
  filename: (req, file, cb) => {
    const chunkIndexStr = req.body.chunkIndex || req.headers['x-chunk-index'] as string || '0';
    const chunkIndex = parseInt(chunkIndexStr, 10) || 0;
    cb(null, `chunk_${String(chunkIndex).padStart(6, '0')}.part`);
  },
});

const chunkUpload = multer({
  storage: chunkStorage,
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB limit per single chunk slice
  },
});

// GET /api/videos - List all videos
router.get('/', requireAuth, (_req, res) => {
  const videos = db.getVideos();
  res.json({ videos });
});

// GET /api/videos/:id - Get single video info
router.get('/:id', requireAuth, (req, res) => {
  const video = db.getVideoById(req.params.id);
  if (!video) {
    res.status(404).json({ error: 'Video not found.' });
    return;
  }
  res.json({ video });
});

// GET /api/videos/:id/file - Stream raw video for preview in browser
router.get('/:id/file', (req, res) => {
  const video = db.getVideoById(req.params.id);
  if (!video || !fs.existsSync(video.path)) {
    res.status(404).json({ error: 'Video file not found on disk.' });
    return;
  }

  const stat = fs.statSync(video.path);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(video.path, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(video.path).pipe(res);
  }
});

// ==========================================
// CHUNKED UPLOAD ENDPOINTS (For large files)
// ==========================================

// GET /api/videos/upload/status/:uploadId - Check upload session progress & existing chunks
router.get('/upload/status/:uploadId', requireAuth, (req: Request, res: Response) => {
  const { uploadId } = req.params;
  if (!uploadId || !/^[a-zA-Z0-9_-]+$/.test(uploadId)) {
    res.status(400).json({ error: 'Invalid uploadId' });
    return;
  }

  const sessionDir = path.join(CHUNKS_TEMP_DIR, uploadId);
  if (!fs.existsSync(sessionDir)) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  try {
    const files = fs.readdirSync(sessionDir);
    const completedChunks: number[] = [];
    for (const f of files) {
      const match = f.match(/^chunk_(\d+)\.part$/);
      if (match) {
        completedChunks.push(parseInt(match[1], 10));
      }
    }
    res.json({ success: true, uploadId, completedChunks });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to read session status' });
  }
});

// POST /api/videos/upload/init - Initialize chunked upload session
router.post('/upload/init', requireAuth, (req: Request, res: Response) => {
  const { filename, totalChunks, totalSize, fingerprint } = req.body;

  if (!filename || !filename.trim()) {
    res.status(400).json({ error: 'Filename is required.' });
    return;
  }

  const ext = path.extname(filename).toLowerCase();
  const settings = db.getSettings();
  const allowed = settings.allowedExtensions && settings.allowedExtensions.length > 0
    ? settings.allowedExtensions.map((e) => e.toLowerCase())
    : ['.mp4', '.mkv', '.mov', '.avi', '.webm', '.ts', '.flv', '.m4v', '.3gp', '.wmv', '.mpeg', '.mpg'];

  if (!allowed.includes(ext)) {
    res.status(400).json({ error: `Invalid video format "${ext}". Supported: ${allowed.join(', ')}` });
    return;
  }

  const maxBytes = (settings.maxUploadSizeMb || 25600) * 1024 * 1024;
  if (totalSize && totalSize > maxBytes) {
    res.status(400).json({
      error: `File size exceeds the configured maximum limit of ${settings.maxUploadSizeMb || 25600} MB. You can adjust this in Settings.`,
    });
    return;
  }

  // Generate deterministic uploadId if client provided a fingerprint (for auto-resuming)
  let uploadId = '';
  if (fingerprint && typeof fingerprint === 'string' && fingerprint.length > 3) {
    const hash = crypto.createHash('sha1').update(fingerprint).digest('hex').substring(0, 32);
    uploadId = `resumable_${hash}`;
  } else {
    uploadId = crypto.randomUUID();
  }

  const sessionDir = path.join(CHUNKS_TEMP_DIR, uploadId);
  fs.mkdirSync(sessionDir, { recursive: true });

  // Read any already uploaded chunks from this session (if resuming)
  const completedChunks: number[] = [];
  try {
    const existingFiles = fs.readdirSync(sessionDir);
    for (const f of existingFiles) {
      const match = f.match(/^chunk_(\d+)\.part$/);
      if (match) {
        const idx = parseInt(match[1], 10);
        const st = fs.statSync(path.join(sessionDir, f));
        if (st.size > 0) {
          completedChunks.push(idx);
        }
      }
    }
  } catch (e) {}

  res.status(200).json({
    success: true,
    uploadId,
    chunkSize: Math.floor(2.5 * 1024 * 1024), // 2.5MB lightweight chunks for 100% stability on proxies
    totalChunks: parseInt(totalChunks, 10) || 1,
    completedChunks,
  });
});

// POST /api/videos/upload/chunk - Upload individual slice/chunk
router.post('/upload/chunk', requireAuth, chunkUpload.single('chunk'), (req: Request, res: Response) => {
  const uploadId = (req.body.uploadId || req.headers['x-upload-id'] as string || '').trim();
  const chunkIndexStr = req.body.chunkIndex || req.headers['x-chunk-index'] as string;
  const chunkIndex = parseInt(chunkIndexStr, 10);

  if (!uploadId || !/^[a-zA-Z0-9_-]+$/.test(uploadId)) {
    res.status(400).json({ error: 'Invalid or missing uploadId.' });
    return;
  }

  if (isNaN(chunkIndex) || chunkIndex < 0) {
    res.status(400).json({ error: 'Invalid or missing chunkIndex.' });
    return;
  }

  const sessionDir = path.join(CHUNKS_TEMP_DIR, uploadId);
  if (!fs.existsSync(sessionDir)) {
    res.status(404).json({ error: 'Upload session not found or expired. Please restart the upload.' });
    return;
  }

  const chunkPath = path.join(sessionDir, `chunk_${String(chunkIndex).padStart(6, '0')}.part`);

  // If already uploaded and intact, acknowledge immediately
  if (fs.existsSync(chunkPath) && (!req.file || !req.file.buffer)) {
    const existingStat = fs.statSync(chunkPath);
    if (existingStat.size > 0) {
      res.status(200).json({
        success: true,
        uploadId,
        chunkIndex,
        receivedBytes: existingStat.size,
        alreadyExists: true,
      });
      return;
    }
  }

  // Check if chunk file was written to disk by multer diskStorage
  if (req.file && req.file.path) {
    if (req.file.path !== chunkPath) {
      fs.renameSync(req.file.path, chunkPath);
    }
  } else if (!fs.existsSync(chunkPath) || fs.statSync(chunkPath).size === 0) {
    res.status(400).json({ error: 'Missing chunk binary payload.' });
    return;
  }

  const savedSize = fs.existsSync(chunkPath) ? fs.statSync(chunkPath).size : (req.file?.size || 0);

  res.status(200).json({
    success: true,
    uploadId,
    chunkIndex,
    receivedBytes: savedSize,
  });
});

// POST /api/videos/upload/complete - Merge all chunks and process video
router.post('/upload/complete', requireAuth, async (req: Request, res: Response) => {
  const { uploadId, filename, totalChunks, title } = req.body;

  if (!uploadId || !/^[a-zA-Z0-9_-]+$/.test(uploadId)) {
    res.status(400).json({ error: 'Invalid or missing uploadId.' });
    return;
  }

  const sessionDir = path.join(CHUNKS_TEMP_DIR, uploadId);
  if (!fs.existsSync(sessionDir)) {
    res.status(404).json({ error: 'Upload session not found. Please re-upload the video.' });
    return;
  }

  const total = parseInt(totalChunks, 10);
  if (isNaN(total) || total <= 0) {
    res.status(400).json({ error: 'Invalid totalChunks count.' });
    return;
  }

  // Validate all chunk files exist
  for (let i = 0; i < total; i++) {
    const chunkPath = path.join(sessionDir, `chunk_${String(i).padStart(6, '0')}.part`);
    if (!fs.existsSync(chunkPath)) {
      res.status(400).json({
        error: `Missing chunk ${i + 1} of ${total}. Please retry the upload.`,
      });
      return;
    }
  }

  // Create destination file
  const ext = path.extname(filename || 'video.mp4').toLowerCase() || '.mp4';
  const safeId = crypto.randomUUID();
  const storedName = `${safeId}${ext}`;
  const finalPath = path.join(UPLOAD_DIR, storedName);

  try {
    // Stream-pipe all chunks sequentially into the final file without loading full video into RAM
    const writeStream = fs.createWriteStream(finalPath, { flags: 'w' });

    for (let i = 0; i < total; i++) {
      const chunkPath = path.join(sessionDir, `chunk_${String(i).padStart(6, '0')}.part`);
      await new Promise<void>((resolveChunk, rejectChunk) => {
        const readStream = fs.createReadStream(chunkPath);
        readStream.on('error', (err) => rejectChunk(err));
        readStream.pipe(writeStream, { end: false });
        readStream.on('end', () => resolveChunk());
      });
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.end((err?: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Remove chunk session directory
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch (e) {}

    const stat = fs.statSync(finalPath);
    const originalName = title?.trim() || filename || storedName;

    // Analyze and process video metadata via FFprobe
    const videoItem = await VideoService.processNewUpload(
      originalName,
      storedName,
      finalPath,
      stat.size
    );

    res.status(201).json({
      success: true,
      message: 'Video uploaded and processed successfully.',
      video: videoItem,
    });
  } catch (err: any) {
    console.error('[VideoUploadComplete] Error merging or processing video:', err);
    try {
      if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
      if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch (e) {}

    res.status(400).json({
      error: `Failed to process uploaded video: ${err.message || 'Processing error'}`,
    });
  }
});

// POST /api/videos/upload - Standard direct multipart upload (using FormData)
router.post('/upload', requireAuth, (req: Request, res: Response) => {
  // 1. Verify storage directory is accessible
  if (!fs.existsSync(UPLOAD_DIR)) {
    try {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    } catch (dirErr: any) {
      console.error('[VideoUpload] Storage directory error:', dirErr);
      res.status(500).json({
        success: false,
        error: 'INSUFFICIENT_STORAGE',
        message: 'VPS storage directory cannot be created or accessed.',
      });
      return;
    }
  }

  upload.single('video')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            success: false,
            error: 'LIMIT_FILE_SIZE',
            message: 'Uploaded video exceeds the maximum file size limit.',
          });
          return;
        }
        res.status(400).json({
          success: false,
          error: 'UPLOAD_ERROR',
          message: `Upload error: ${err.message}`,
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: err.message || 'File upload failed.',
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'NO_FILE',
        message: 'No video file provided in the upload request.',
      });
      return;
    }

    const settings = db.getSettings();
    const maxBytes = (settings.maxUploadSizeMb || 25600) * 1024 * 1024;
    if (req.file.size > maxBytes) {
      // Clean up oversized file
      try {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch (e) {}
      res.status(400).json({
        success: false,
        error: 'LIMIT_FILE_SIZE',
        message: `File size exceeds the configured maximum limit of ${settings.maxUploadSizeMb || 25600} MB.`,
      });
      return;
    }

    // Verify physical file exists and size > 0
    if (!fs.existsSync(req.file.path) || req.file.size === 0) {
      try {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch (e) {}
      res.status(400).json({
        success: false,
        error: 'FILE_CORRUPT',
        message: 'Uploaded video file was empty or corrupted during transfer.',
      });
      return;
    }

    try {
      console.log(`[VideoUpload] Processing new file: ${req.file.originalname} (${(req.file.size / (1024 * 1024)).toFixed(2)} MB)`);
      const originalName = req.body.title?.trim() || req.file.originalname;
      const videoItem = await VideoService.processNewUpload(
        originalName,
        req.file.filename,
        req.file.path,
        req.file.size
      );

      console.log(`[VideoUpload] Successfully stored and registered video: ${videoItem.id}`);
      res.status(201).json({
        success: true,
        message: 'Video uploaded and processed successfully.',
        video: videoItem,
      });
    } catch (processErr: any) {
      console.error('[VideoUpload] Processing error:', processErr);
      // Clean up orphaned physical file if database registration or processing failed
      try {
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (e) {}
      res.status(400).json({
        success: false,
        error: 'PROCESSING_ERROR',
        message: `Failed to process uploaded video: ${processErr.message || 'Video analysis error'}`,
      });
    }
  });
});

// POST /api/videos/gdrive-import - Import video from Google Drive link / ID
router.post('/gdrive-import', requireAuth, async (req, res) => {
  const { url, fileId, title } = req.body;

  if (!url && !fileId) {
    res.status(400).json({ error: 'Google Drive URL or fileId is required.' });
    return;
  }

  // Extract Google Drive File ID if full URL provided
  let driveId = fileId;
  if (!driveId && url) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
    if (match) {
      driveId = match[1];
    } else if (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim())) {
      driveId = url.trim();
    }
  }

  if (!driveId) {
    res.status(400).json({ error: 'Invalid Google Drive link format. Could not extract file ID.' });
    return;
  }

  try {
    const videoId = crypto.randomUUID();
    const filename = `${videoId}.mp4`;
    const destPath = path.join(UPLOAD_DIR, filename);

    // Google Drive direct export download URL
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
    
    // Download using streaming fetch or curl
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      // If direct link restricted or fails, test curl fallback or throw helpful message
      res.status(400).json({
        error: 'Unable to download file directly from Google Drive. Please ensure the file sharing is set to "Anyone with the link can view".',
      });
      return;
    }

    const fileStream = fs.createWriteStream(destPath);
    // @ts-ignore
    const body = response.body;
    if (!body) {
      res.status(400).json({ error: 'Empty response from Google Drive.' });
      return;
    }

    // Convert web stream to node stream
    // @ts-ignore
    for await (const chunk of body) {
      fileStream.write(chunk);
    }
    fileStream.end();

    await new Promise<void>((resolve) => fileStream.on('finish', () => resolve()));

    const stats = fs.statSync(destPath);
    if (stats.size < 1000) {
      // Likely an HTML confirmation page instead of video
      const content = fs.readFileSync(destPath, 'utf8');
      if (content.includes('<!DOCTYPE') || content.includes('<html')) {
        fs.unlinkSync(destPath);
        res.status(400).json({
          error: 'Google Drive requires confirmation for large file virus scans or authentication. Please upload the file directly or use direct public link.',
        });
        return;
      }
    }

    const videoItem = await VideoService.processNewUpload(
      title || `GDrive-Video-${driveId.slice(0, 6)}`,
      filename,
      destPath,
      stats.size
    );

    // Mark as gdrive source
    const updated = db.updateVideo(videoId, { source: 'gdrive', gdriveFileId: driveId });

    res.status(201).json({
      success: true,
      message: 'Google Drive video imported and cached successfully.',
      video: updated || videoItem,
    });
  } catch (err: any) {
    console.error('[GDriveImport] Error:', err);
    res.status(500).json({
      error: `Failed to import Google Drive video: ${err.message}`,
    });
  }
});

// PUT /api/videos/:id - Rename video
router.put('/:id', requireAuth, (req, res) => {
  const { originalName } = req.body;
  if (!originalName || !originalName.trim()) {
    res.status(400).json({ error: 'Video name cannot be empty.' });
    return;
  }

  const updated = db.updateVideo(req.params.id, { originalName: originalName.trim() });
  if (!updated) {
    res.status(404).json({ error: 'Video not found.' });
    return;
  }

  res.json({ success: true, video: updated });
});

// DELETE /api/videos/:id - Delete video with active stream check and cleanup
router.delete('/:id', requireAuth, (req, res) => {
  const result = db.deleteVideo(req.params.id);

  if (!result.success) {
    if (result.reason === 'ACTIVE_STREAM_IN_USE') {
      res.status(409).json({
        success: false,
        reason: 'ACTIVE_STREAM_IN_USE',
        error: result.error || 'Cannot delete video while it is currently being used by an active livestream. Stop the stream first.',
      });
      return;
    }
    if (result.reason === 'NOT_FOUND') {
      res.status(404).json({
        success: false,
        reason: 'NOT_FOUND',
        error: 'Video file not found or already deleted.',
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: result.error || 'Failed to delete video.',
    });
    return;
  }

  res.json({
    success: true,
    deleted: true,
    videoId: req.params.id,
    message: 'Video deleted successfully from VPS storage.',
  });
});

export default router;
