import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import authRoutes from './server/routes/authRoutes.js';
import videoRoutes from './server/routes/videoRoutes.js';
import playlistRoutes from './server/routes/playlistRoutes.js';
import streamRoutes from './server/routes/streamRoutes.js';
import settingsRoutes from './server/routes/settingsRoutes.js';
import systemRoutes from './server/routes/systemRoutes.js';
import { UPLOAD_DIR } from './server/database/db.js';
import { streamingEngine } from './server/services/streamingEngine.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static uploads directory for thumbnails and previews
  app.use('/uploads', express.static(UPLOAD_DIR));

  // Health check endpoint
  app.get('/api/health', async (_req, res) => {
    const diagnostics = await streamingEngine.runDiagnostics();
    res.json({
      server: 'OK',
      ffmpeg: diagnostics.ffmpegInstalled ? 'OK' : 'MISSING',
      ffprobe: diagnostics.ffprobeInstalled ? 'OK' : 'MISSING',
      streamingEngine: diagnostics.ffmpegInstalled && diagnostics.ffprobeInstalled ? 'READY' : 'DEGRADED',
      status: 'ok',
      service: 'CastLoop 24/7 RTMP Streamer',
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/videos', videoRoutes);
  app.use('/api/playlists', playlistRoutes);
  app.use('/api/streams', streamRoutes);
  app.use('/api/stream', streamRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/system', systemRoutes);

  // Global JSON error handler for all /api endpoints to prevent HTML error responses
  app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[API Error Handler]:', err);
    if (res.headersSent) return;
    const status = typeof err.status === 'number' ? err.status : typeof err.statusCode === 'number' ? err.statusCode : 500;
    res.status(status).json({
      success: false,
      error: err.message || 'An unexpected server error occurred.',
    });
  });

  // 404 handler for unknown /api routes
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ success: false, error: 'API endpoint not found.' });
  });

  // Vite middleware for development vs Static dist for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`  CastLoop 24/7 RTMP Streaming Engine`);
    console.log(`  Running on http://localhost:${PORT}`);
    console.log(`  Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=======================================================`);

    // Perform auto-recovery check on server boot
    setTimeout(() => {
      streamingEngine.attemptServerRestartRecovery().catch((err) => {
        console.error('[Engine] Error during server restart recovery:', err);
      });
    }, 1000);
  });

  // Keep-alive settings to prevent socket resets and idle disconnects behind reverse proxies
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.requestTimeout = 300000; // 5 minute request timeout for large chunk handling

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Shutting down cleanly...`);
    try {
      await streamingEngine.stopStream();
    } catch (e) {
      console.warn('[Server] Error stopping stream during shutdown:', e);
    }
    server.close(() => {
      console.log('[Server] HTTP server closed. Process exiting.');
      process.exit(0);
    });

    // Force exit after 5s if still hanging
    setTimeout(() => {
      console.error('[Server] Forceful shutdown initiated.');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
