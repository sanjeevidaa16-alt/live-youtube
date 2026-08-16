import { Router, Response } from 'express';
import { db } from '../database/db.js';
import { SupabaseService } from '../services/supabaseService.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/playlists - List all playlists
router.get('/', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  if (SupabaseService.isConfigured()) {
    const sbPlaylists = await SupabaseService.getPlaylists();
    if (sbPlaylists) {
      res.json({ playlists: sbPlaylists });
      return;
    }
  }
  const playlists = db.getPlaylists();
  res.json({ playlists });
});

// GET /api/playlists/:id - Get playlist by ID with populated video objects
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const playlist = db.getPlaylistById(id);
  if (!playlist) {
    res.status(404).json({ error: 'Playlist not found.' });
    return;
  }

  const videos = playlist.videoIds
    .map((vid) => db.getVideoById(vid))
    .filter(Boolean);

  res.json({ playlist, videos });
});

// POST /api/playlists - Create new playlist
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { name, videoIds = [], description } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Playlist name is required.' });
    return;
  }

  const cleanIds = Array.isArray(videoIds) ? videoIds.filter((id) => typeof id === 'string') : [];
  const playlist = db.createPlaylist(name.trim(), cleanIds, description?.trim());

  if (SupabaseService.isConfigured()) {
    await SupabaseService.createPlaylist(playlist);
    await SupabaseService.logEvent(undefined, 'PLAYLIST', `Playlist "${playlist.name}" (${playlist.id}) created.`);
  }

  res.status(201).json({
    success: true,
    message: 'Playlist created successfully.',
    playlist,
  });
});

// PUT /api/playlists/:id - Update playlist
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, videoIds } = req.body;

  const existing = db.getPlaylistById(id);
  if (!existing) {
    res.status(404).json({ error: 'Playlist not found.' });
    return;
  }

  const updates: Partial<{ name: string; description: string; videoIds: string[] }> = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description.trim();
  if (videoIds !== undefined && Array.isArray(videoIds)) {
    updates.videoIds = videoIds;
  }

  const updated = db.updatePlaylist(id, updates);

  if (updated && SupabaseService.isConfigured()) {
    await SupabaseService.createPlaylist(updated);
  }

  res.json({
    success: true,
    message: 'Playlist updated successfully.',
    playlist: updated,
  });
});

// DELETE /api/playlists/:id - Delete playlist
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const success = db.deletePlaylist(id);

  if (SupabaseService.isConfigured()) {
    await SupabaseService.deletePlaylist(id);
    await SupabaseService.logEvent(undefined, 'PLAYLIST', `Playlist (${id}) deleted.`);
  }

  if (!success) {
    res.status(404).json({ error: 'Playlist not found or already deleted.' });
    return;
  }
  res.json({ success: true, message: 'Playlist deleted successfully.' });
});

export default router;
