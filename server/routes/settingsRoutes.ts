import { Router, Response } from 'express';
import { db } from '../database/db.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/settings - Retrieve current configuration
router.get('/', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ settings: db.getSettings() });
});

// PUT /api/settings - Update configuration
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
  res.json({ success: true, settings: updatedSettings, message: 'Settings updated successfully.' });
});

export default router;
