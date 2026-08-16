import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Readable } from 'stream';
import { db, UPLOAD_DIR } from '../database/db.js';
import { VideoService } from '../services/videoService.js';
import { SupabaseService } from '../services/supabaseService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const CHUNKS_TEMP_DIR = path.join(UPLOAD_DIR, 'chunks_temp');

// Ensure chunk and upload directory exists
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

// Configure Multer temporary storage for direct multipart uploads
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
    cb(null, `temp_upload_${safeId}${ext}`);
  },
});

// Multer upload filter
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024 * 50, // 50GB max
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

// Multer storage for chunk uploads
const chunkStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const uploadId = (req.body.uploadId || (req.headers['x-upload-id'] as string) || '').trim();
    if (!uploadId || !/^[a-zA-Z0-9_-]+$/.test(uploadId)) {
      const fallbackDir = path.join(CHUNKS_TEMP_DIR, 'staging');
      fs.mkdirSync(fallbackDir, { recursive: true });
      return cb(null, fallbackDir);
    }
    const sessionDir = path.join(CHUNKS_TEMP_DIR, uploadId);
    fs.mkdirSync(sessionDir, { recursive: true });
    cb(null, sessionDir);
  },
  filename: (req, _file, cb) => {
    const chunkIndexStr = req.body.chunkIndex || (req.headers['x-chunk-index'] as string) || '0';
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

// GET /api/videos - List all videos with search and pagination support
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const search = req.query.search ? String(req.query.search) : undefined;
  const page = parseInt(String(req.query.page || '1'), 10) || 1;
  const limit = parseInt(String(req.query.limit || '50'), 10) || 50;
  const offset = (page - 1) * limit;

  // 1. If Supabase is configured, fetch from Supabase
  if (SupabaseService.isConfigured()) {
    const sbResult = await SupabaseService.getVideos({ search, limit, offset });
    if (sbResult && sbResult.videos) {
      res.json({
        videos: sbResult.videos,
        total: sbResult.total,
        page,
        limit,
        source: 'supabase',
      });
      return;
    }
  }

  // 2. Fallback to local DB cache
  let allVideos = db.getVideos();
  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    allVideos = allVideos.filter((v) => v.originalName.toLowerCase().includes(s));
  }

  const total = allVideos.length;
  const pagedVideos = allVideos.slice(offset, offset + limit);

  res.json({
    videos: pagedVideos,
    total,
    page,
    limit,
    source: 'local',
  });
});

// GET /api/videos/:id - Get single video info
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  if (SupabaseService.isConfigured()) {
    const sbVideo = await SupabaseService.getVideoById(req.params.id);
    if (sbVideo) {
      res.json({ video: sbVideo });
      return;
    }
  }

  const video = db.getVideoById(req.params.id);
  if (!video) {
    res.status(404).json({ error: 'Video not found.' });
    return;
  }
  res.json({ video });
});

// Helper for streaming readable stream to Express Response
function pipeWebStream(stream: any, res: Response) {
  if (stream && typeof stream.pipe === 'function') {
    stream.pipe(res);
  } else if (stream && typeof (Readable as any).fromWeb === 'function') {
    const nodeStream = (Readable as any).fromWeb(stream);
    nodeStream.pipe(res);
  } else if (stream && typeof stream.getReader === 'function') {
    const reader = stream.getReader();
    function read() {
      reader.read().then(({ done, value }: any) => {
        if (done) {
          res.end();
          return;
        }
        res.write(Buffer.from(value));
        read();
      }).catch((err: any) => {
        console.error('[StreamProxy] Pipe error:', err);
        res.end();
      });
    }
    read();
  } else {
    res.end();
  }
}

// Handler for streaming raw video for preview in browser & FFmpeg
async function handleVideoStream(req: Request, res: Response) {
  const video = db.getVideoById(req.params.id);
  if (!video) {
    res.status(404).json({ error: 'Video not found.' });
    return;
  }

  const filePath = video.path || path.join(UPLOAD_DIR, video.storedName);

  if (filePath && fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
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
      fs.createReadStream(filePath).pipe(res);
    }
    return;
  }

  res.status(404).json({ error: 'Video file not found on server disk.' });
}

// GET /api/videos/:id/file - Stream raw video for preview in browser & FFmpeg
router.get('/:id/file', handleVideoStream);

// GET /api/videos/:id/stream - Alias for video file stream
router.get('/:id/stream', handleVideoStream);

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
router.post('/upload/init', requireAuth, async (req: Request, res: Response) => {
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

  const maxBytes = (settings.maxUploadSizeMb || 51200) * 1024 * 1024;
  if (totalSize && totalSize > maxBytes) {
    res.status(400).json({
      error: `File size exceeds the configured maximum limit of ${settings.maxUploadSizeMb || 51200} MB. You can adjust this in Settings.`,
    });
    return;
  }

  let uploadId = '';
  if (fingerprint && typeof fingerprint === 'string' && fingerprint.length > 3) {
    const hash = crypto.createHash('sha1').update(fingerprint).digest('hex').substring(0, 32);
    uploadId = `resumable_${hash}`;
  } else {
    uploadId = crypto.randomUUID();
  }

  const sessionDir = path.join(CHUNKS_TEMP_DIR, uploadId);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const metadataPath = path.join(sessionDir, 'metadata.json');
  fs.writeFileSync(
    metadataPath,
    JSON.stringify({
      uploadId,
      filename,
      totalChunks: parseInt(totalChunks, 10) || 1,
      totalSize: totalSize || 0,
      createdAt: new Date().toISOString(),
    }),
    'utf8'
  );

  res.json({
    success: true,
    uploadId,
    chunkSize: 5 * 1024 * 1024,
    message: 'Upload session initialized successfully.',
  });
});

// POST /api/videos/upload/chunk - Upload individual slice/chunk
router.post('/upload/chunk', requireAuth, chunkUpload.single('chunk'), (req: Request, res: Response) => {
  const uploadId = (req.body.uploadId || (req.headers['x-upload-id'] as string) || '').trim();
  const chunkIndex = parseInt(req.body.chunkIndex || (req.headers['x-chunk-index'] as string) || '0', 10);

  if (!uploadId || !/^[a-zA-Z0-9_-]+$/.test(uploadId)) {
    res.status(400).json({ error: 'Invalid or missing uploadId.' });
    return;
  }

  const sessionDir = path.join(CHUNKS_TEMP_DIR, uploadId);
  if (!fs.existsSync(sessionDir)) {
    res.status(404).json({ error: 'Upload session does not exist. Please re-initiate upload.' });
    return;
  }

  const targetChunkPath = path.join(sessionDir, `chunk_${String(chunkIndex).padStart(6, '0')}.part`);
  if (!fs.existsSync(targetChunkPath)) {
    res.status(500).json({ error: 'Chunk save failed on server.' });
    return;
  }

  const savedSize = fs.statSync(targetChunkPath).size;

  res.json({
    success: true,
    uploadId,
    chunkIndex,
    receivedBytes: savedSize,
  });
});

// POST /api/videos/upload/complete - Merge chunks, validate, upload to Cloudflare R2, and delete temp VPS file
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



  const ext = path.extname(filename || 'video.mp4').toLowerCase() || '.mp4';
  const safeId = crypto.randomUUID();
  const storedName = `${safeId}${ext}`;
  const tempMergedPath = path.join(UPLOAD_DIR, `temp_merged_${storedName}`);

  try {
    // 2. Merge chunks sequentially into temp VPS file
    const writeStream = fs.createWriteStream(tempMergedPath, { flags: 'w' });

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

    const stat = fs.statSync(tempMergedPath);
    const originalName = title?.trim() || filename || storedName;

    // 3. Process new upload (store permanently in UPLOAD_DIR, extract metadata, generate thumbnail)
    const videoItem = await VideoService.processNewUpload(
      originalName,
      storedName,
      tempMergedPath,
      stat.size
    );

    // 4. Delete temporary VPS video file if separate from permanent path
    try {
      if (fs.existsSync(tempMergedPath)) {
        fs.unlinkSync(tempMergedPath);
      }
    } catch (delErr) {
      console.warn(`[VideoUpload] Notice deleting temp file: ${delErr}`);
    }

    res.status(201).json({
      success: true,
      message: '✓ Upload completed and stored permanently in local storage.',
      video: videoItem,
    });
  } catch (err: any) {
    console.error('[VideoUploadComplete] Error during upload or merge:', err);
    try {
      if (fs.existsSync(tempMergedPath)) fs.unlinkSync(tempMergedPath);
      if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch (e) {}

    res.status(400).json({
      error: `Failed to upload video: ${err.message || 'Storage error'}`,
    });
  }
});

// POST /api/videos/upload - Direct multipart upload
router.post('/upload', requireAuth, (req: Request, res: Response) => {
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

    const tempFilePath = req.file.path;

    try {
      const originalName = req.body.title?.trim() || req.file.originalname;

      // Extract metadata, generate thumbnail, and save database record
      const videoItem = await VideoService.processNewUpload(
        originalName,
        req.file.filename,
        tempFilePath,
        req.file.size
      );

      res.status(201).json({
        success: true,
        message: '✓ Upload completed and stored permanently in local storage.',
        video: videoItem,
      });
    } catch (processErr: any) {
      console.error('[VideoUpload] Processing error:', processErr);
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (e) {}

      res.status(400).json({
        success: false,
        error: 'PROCESSING_ERROR',
        message: `Video processing failed: ${processErr.message || 'Storage error'}`,
      });
    }
  });
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

// DELETE /api/videos/:id - Delete video with active stream protection and local file cleanup
router.delete('/:id', requireAuth, async (req, res) => {
  const video = db.getVideoById(req.params.id);
  if (!video) {
    res.status(404).json({
      success: false,
      reason: 'NOT_FOUND',
      error: 'Video file not found or already deleted.',
    });
    return;
  }

  // 1. Active Stream Protection: Return 409 Conflict if video is currently being streamed
  if (db.isVideoActiveInAnyStream(req.params.id)) {
    res.status(409).json({
      success: false,
      reason: 'ACTIVE_STREAM_IN_USE',
      error: 'This video is currently being used by an active livestream. Stop the livestream before deleting it.',
    });
    return;
  }

  // 2. Delete local physical file if exists
  if (video.path && fs.existsSync(video.path)) {
    try {
      fs.unlinkSync(video.path);
    } catch (e: any) {
      console.warn(`[VideoRoutes] Notice deleting local file: ${e.message}`);
    }
  }

  // 3. Delete database metadata record and local thumbnail
  const result = db.deleteVideo(req.params.id);

  if (SupabaseService.isConfigured()) {
    await SupabaseService.deleteVideo(req.params.id);
    await SupabaseService.logEvent(undefined, 'DELETE', `Video "${video.originalName}" (${req.params.id}) deleted from server and Supabase.`);
  }

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: result.error || 'Failed to delete video record.',
    });
    return;
  }

  res.json({
    success: true,
    deleted: true,
    videoId: req.params.id,
    message: 'Video deleted successfully from storage and Supabase database.',
  });
});

export default router;
