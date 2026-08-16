import { Router, Request, Response } from 'express';
import { streamingEngine } from '../services/streamingEngine.js';
import { db } from '../database/db.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { StreamConfig, StreamInstance } from '../../src/types.js';

const router = Router();

// =========================================================================
// MULTI-STREAM INSTANCES CRUD & CONTROLS
// =========================================================================

// GET /api/streams - List all streams for authenticated user (or all if admin)
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const streams = user.role === 'admin' ? db.getStreamInstances() : db.getStreamInstances(user.id);
  res.json({ success: true, streams });
});

// POST /api/streams - Create a new stream instance
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const {
    name,
    rtmpUrl,
    streamKey,
    playlistId,
    playlistName,
    videoId,
    videoTitle,
    videoIds,
    loop,
    quality,
    bitrate,
    fps,
    audio,
    autoReconnect,
  } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ success: false, error: 'Stream name is required (e.g. "Main Channel 24/7 Lo-Fi").' });
    return;
  }

  const settings = db.getSettings();
  const finalRtmp = (rtmpUrl || settings.defaultRtmpUrl || 'rtmps://a.rtmps.youtube.com/live2').trim();
  const finalKey = (streamKey || settings.defaultStreamKey || '').trim();

  // Resolve video title / playlist name if not provided
  let resolvedVideoTitle = videoTitle;
  if (videoId && !resolvedVideoTitle) {
    const v = db.getVideoById(videoId);
    if (v) resolvedVideoTitle = v.originalName;
  }

  let resolvedPlaylistName = playlistName;
  if (playlistId && !resolvedPlaylistName) {
    const p = db.getPlaylistById(playlistId);
    if (p) resolvedPlaylistName = p.name;
  }

  const stream = db.createStreamInstance({
    userId: user.id,
    userName: user.name || user.username,
    name: name.trim(),
    rtmpUrl: finalRtmp,
    streamKey: finalKey,
    playlistId,
    playlistName: resolvedPlaylistName,
    videoId,
    videoTitle: resolvedVideoTitle,
    videoIds,
    loop: loop !== false,
    quality: quality || settings.defaultQuality || '1080p',
    bitrate: bitrate || settings.defaultBitrate || '4000k',
    fps: fps || settings.defaultFps || 30,
    audio: audio !== false,
    autoReconnect: autoReconnect !== false,
  });

  res.status(201).json({ success: true, stream, message: `Stream "${stream.name}" created successfully.` });
});

// GET /api/streams/:id - Get specific stream instance
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const stream = db.getStreamInstanceById(req.params.id);
  if (!stream) {
    res.status(404).json({ success: false, error: 'Stream not found.' });
    return;
  }

  if (user.role !== 'admin' && stream.userId !== user.id) {
    res.status(403).json({ success: false, error: 'Access denied: You do not own this stream.' });
    return;
  }

  res.json({ success: true, stream });
});

// PUT /api/streams/:id - Update specific stream instance
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const stream = db.getStreamInstanceById(req.params.id);
  if (!stream) {
    res.status(404).json({ success: false, error: 'Stream not found.' });
    return;
  }

  if (user.role !== 'admin' && stream.userId !== user.id) {
    res.status(403).json({ success: false, error: 'Access denied: You do not own this stream.' });
    return;
  }

  // Reject editing RTMP key/source if stream is actively LIVE
  if (stream.status === 'LIVE' || stream.status === 'STARTING') {
    if (req.body.rtmpUrl || req.body.streamKey || req.body.videoId || req.body.playlistId) {
      res.status(409).json({
        success: false,
        error: 'Cannot modify core RTMP destination or media source while the stream is actively broadcasting. Stop the stream first.',
      });
      return;
    }
  }

  // Resolve video title / playlist name if updating IDs
  const updates: Partial<StreamInstance> = { ...req.body };
  if (updates.videoId) {
    const v = db.getVideoById(updates.videoId);
    if (v) updates.videoTitle = v.originalName;
  }
  if (updates.playlistId) {
    const p = db.getPlaylistById(updates.playlistId);
    if (p) {
      updates.playlistName = p.name;
      updates.videoIds = p.videoIds;
    }
  }

  const updated = db.updateStreamInstance(req.params.id, updates);
  res.json({ success: true, stream: updated, message: 'Stream settings updated.' });
});

// DELETE /api/streams/:id - Delete stream instance
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const stream = db.getStreamInstanceById(req.params.id);
  if (!stream) {
    res.status(404).json({ success: false, error: 'Stream not found.' });
    return;
  }

  if (user.role !== 'admin' && stream.userId !== user.id) {
    res.status(403).json({ success: false, error: 'Access denied: You do not own this stream.' });
    return;
  }

  if (stream.status === 'LIVE' || stream.status === 'STARTING' || stream.status === 'RECONNECTING') {
    res.status(409).json({
      success: false,
      error: 'Cannot delete an active live stream. Please stop the stream first.',
    });
    return;
  }

  db.deleteStreamInstance(req.params.id);
  streamingEngine.clearStreamLogs(req.params.id);
  res.json({ success: true, message: `Stream "${stream.name}" deleted.` });
});

// POST /api/streams/:id/start - Start specific stream
router.post('/:id/start', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const stream = db.getStreamInstanceById(req.params.id);
  if (!stream) {
    res.status(404).json({ success: false, error: 'Stream configuration not found.' });
    return;
  }

  if (user.role !== 'admin' && stream.userId !== user.id) {
    res.status(403).json({ success: false, error: 'Access denied: You do not own this stream.' });
    return;
  }

  const result = await streamingEngine.startStreamInstance(req.params.id, req.body);
  if (!result.success) {
    const statusCode = result.code === 'STREAM_ALREADY_RUNNING' ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      code: result.code || 'STREAM_START_FAILED',
      error: result.message,
    });
    return;
  }

  res.json({
    success: true,
    sessionId: result.sessionId,
    streamId: result.streamId,
    message: result.message,
    stream: result.stream,
  });
});

// POST /api/streams/:id/stop - Stop specific stream
router.post('/:id/stop', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const stream = db.getStreamInstanceById(req.params.id);
  if (!stream) {
    res.status(404).json({ success: false, error: 'Stream not found.' });
    return;
  }

  if (user.role !== 'admin' && stream.userId !== user.id) {
    res.status(403).json({ success: false, error: 'Access denied: You do not own this stream.' });
    return;
  }

  const result = await streamingEngine.stopStreamInstance(req.params.id);
  res.json({
    success: result.success,
    message: result.message,
    stream: db.getStreamInstanceById(req.params.id),
  });
});

// POST /api/streams/:id/restart - Restart specific stream
router.post('/:id/restart', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const stream = db.getStreamInstanceById(req.params.id);
  if (!stream) {
    res.status(404).json({ success: false, error: 'Stream not found.' });
    return;
  }

  if (user.role !== 'admin' && stream.userId !== user.id) {
    res.status(403).json({ success: false, error: 'Access denied: You do not own this stream.' });
    return;
  }

  const result = await streamingEngine.restartStreamInstance(req.params.id);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.message });
    return;
  }

  res.json({
    success: true,
    message: result.message,
    stream: result.stream,
  });
});

// GET /api/streams/:id/logs - Get logs for specific stream
router.get('/:id/logs', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const stream = db.getStreamInstanceById(req.params.id);
  if (!stream) {
    res.status(404).json({ success: false, error: 'Stream not found.' });
    return;
  }

  if (user.role !== 'admin' && stream.userId !== user.id) {
    res.status(403).json({ success: false, error: 'Access denied.' });
    return;
  }

  res.json({ success: true, logs: streamingEngine.getStreamLogs(req.params.id) });
});

// DELETE /api/streams/:id/logs - Clear logs for specific stream
router.delete('/:id/logs', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const stream = db.getStreamInstanceById(req.params.id);
  if (!stream) {
    res.status(404).json({ success: false, error: 'Stream not found.' });
    return;
  }

  if (user.role !== 'admin' && stream.userId !== user.id) {
    res.status(403).json({ success: false, error: 'Access denied.' });
    return;
  }

  streamingEngine.clearStreamLogs(req.params.id);
  res.json({ success: true, message: 'Logs cleared.' });
});

// GET /api/streams/:id/logs/live - SSE for specific stream logs
router.get('/:id/logs/live', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const streamId = req.params.id;
  const stream = db.getStreamInstanceById(streamId);
  if (!stream) {
    res.status(404).json({ error: 'Stream not found.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send existing logs
  const existing = streamingEngine.getStreamLogs(streamId);
  for (const log of existing.slice(-50)) {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  }

  const unsubscribe = streamingEngine.subscribeStreamLogs(streamId, (logEntry) => {
    try {
      res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
    } catch (e) {}
  });

  const keepAlive = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch (e) {}
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
});

// =========================================================================
// LEGACY STREAM ENDPOINTS FOR BACKWARDS COMPATIBILITY
// =========================================================================

// POST /api/stream/start - Legacy single start
router.post('/start', requireAuth, async (req: Request, res: Response) => {
  const result = await streamingEngine.startStream(req.body);
  if (!result.success) {
    const statusCode = result.code === 'STREAM_ALREADY_RUNNING' ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      code: result.code || 'STREAM_START_FAILED',
      error: result.message,
      message: result.message,
    });
    return;
  }

  res.status(200).json({
    success: true,
    sessionId: result.sessionId,
    message: result.message,
    status: result.status || streamingEngine.getStatus(),
  });
});

// GET /api/stream/diagnostics - Diagnostics
router.get('/diagnostics', requireAuth, async (req: Request, res: Response) => {
  const videoId = req.query.videoId as string | undefined;
  const diagnostics = await streamingEngine.runDiagnostics(videoId);
  res.json({ diagnostics });
});

// POST /api/stream/stop - Legacy stop
router.post('/stop', requireAuth, async (_req: Request, res: Response) => {
  const result = await streamingEngine.stopStream();
  if (!result.success) {
    res.status(500).json({ error: result.message });
    return;
  }

  res.json({
    success: true,
    message: 'Stream stopped successfully.',
    status: streamingEngine.getStatus(),
  });
});

// POST /api/stream/restart - Legacy restart
router.post('/restart', requireAuth, async (_req: Request, res: Response) => {
  const result = await streamingEngine.restartStream();
  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }

  res.json({
    success: true,
    message: 'Stream restarted successfully.',
    status: streamingEngine.getStatus(),
  });
});

// GET /api/stream/status - Get status snapshot
router.get('/status', requireAuth, (_req: Request, res: Response) => {
  res.json({ status: streamingEngine.getStatus() });
});

// GET /api/stream/logs - Legacy get logs
router.get('/logs', requireAuth, (_req: Request, res: Response) => {
  res.json({ logs: streamingEngine.getLogs() });
});

// DELETE /api/stream/logs - Legacy clear logs
router.delete('/logs', requireAuth, (_req: Request, res: Response) => {
  streamingEngine.clearLogs();
  res.json({ success: true, message: 'Logs cleared.' });
});

// GET /api/stream/history - History
router.get('/history', requireAuth, (_req: Request, res: Response) => {
  res.json({ history: db.getHistory() });
});

// DELETE /api/stream/history - Clear history
router.delete('/history', requireAuth, (_req: Request, res: Response) => {
  db.clearHistory();
  res.json({ success: true, message: 'Stream history cleared.' });
});

// GET /api/stream/status/live - SSE Status
router.get('/status/live', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify(streamingEngine.getStatus())}\n\n`);

  const unsubscribe = streamingEngine.subscribeStatus((status) => {
    try {
      res.write(`data: ${JSON.stringify(status)}\n\n`);
    } catch (e) {}
  });

  const keepAliveTimer = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch (e) {}
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAliveTimer);
    unsubscribe();
  });
});

// GET /api/stream/logs/live - SSE Logs
router.get('/logs/live', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const existingLogs = streamingEngine.getLogs();
  for (const log of existingLogs.slice(-50)) {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  }

  const unsubscribe = streamingEngine.subscribeLogs((logEntry) => {
    try {
      res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
    } catch (e) {}
  });

  const keepAliveTimer = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch (e) {}
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAliveTimer);
    unsubscribe();
  });
});

export default router;
