import { Router, Response } from 'express';
import { db } from '../database/db.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { SupabaseService } from '../services/supabaseService.js';

const router = Router();

// GET /api/settings - Retrieve current configuration
router.get('/', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  const settings = db.getSettings();
  const sanitizedSettings = {
    ...settings,
    database: SupabaseService.getSanitizedConfig(),
  };
  res.json({ settings: sanitizedSettings });
});

// GET /api/settings/database - Get Supabase database status & diagnostics
router.get('/database', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  const config = SupabaseService.getSanitizedConfig();
  const diagnostics = await SupabaseService.getDiagnostics();
  res.json({ config, diagnostics });
});

// POST /api/settings/database - Save Supabase database configuration
router.post('/database', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = SupabaseService.saveSettings(req.body || {});
    res.json({
      success: true,
      database: updated,
      message: 'Supabase PostgreSQL database configuration saved successfully.',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to save database configuration: ${err.message || 'Unknown error'}`,
    });
  }
});

// POST /api/settings/database/test - Test Supabase database connection
router.post('/database/test', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = req.body || {};
  try {
    const result = await SupabaseService.testConnection({
      supabaseUrl,
      supabaseAnonKey,
      supabaseServiceRoleKey,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      connected: false,
      databaseProvider: 'supabase_postgres',
      error: `Test execution failed: ${err.message || 'Unknown error'}`,
      testedAt: new Date().toISOString(),
    });
  }
});

// PUT /api/settings - Update general configuration
router.put('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const {
    defaultRtmpUrl,
    defaultQuality,
    defaultBitrate,
    defaultFps,
    autoReconnect,
    reconnectDelay,
    maxReconnectAttempts,
    maxUploadSizeMb,
    allowedExtensions,
    autoRestartOnServerBoot,
  } = req.body;

  const updates: any = {};
  if (defaultRtmpUrl !== undefined) updates.defaultRtmpUrl = String(defaultRtmpUrl).trim();
  if (defaultQuality !== undefined) updates.defaultQuality = defaultQuality;
  if (defaultBitrate !== undefined) updates.defaultBitrate = defaultBitrate;
  if (defaultFps !== undefined) updates.defaultFps = defaultFps;
  if (autoReconnect !== undefined) updates.autoReconnect = Boolean(autoReconnect);
  if (reconnectDelay !== undefined) updates.reconnectDelay = Math.max(1, parseInt(reconnectDelay, 10));
  if (maxReconnectAttempts !== undefined) updates.maxReconnectAttempts = Math.max(1, parseInt(maxReconnectAttempts, 10));
  if (maxUploadSizeMb !== undefined) updates.maxUploadSizeMb = Math.max(10, parseInt(maxUploadSizeMb, 10));
  if (Array.isArray(allowedExtensions)) updates.allowedExtensions = allowedExtensions;
  if (autoRestartOnServerBoot !== undefined) updates.autoRestartOnServerBoot = Boolean(autoRestartOnServerBoot);

  const updatedSettings = db.updateSettings(updates);
  const sanitizedSettings = {
    ...updatedSettings,
    database: SupabaseService.getSanitizedConfig(),
  };

  res.json({ success: true, settings: sanitizedSettings, message: 'Settings updated successfully.' });
});

export default router;
