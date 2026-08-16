import { Router, Response } from 'express';
import { db } from '../database/db.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/playlists - List all playlists
router.get('/', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
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
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { name, videoIds = [], description } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Playlist name is required.' });
    return;
  }

  const cleanIds = Array.isArray(videoIds) ? videoIds.filter((id) => typeof id === 'string') : [];
  const playlist = db.createPlaylist(name.trim(), cleanIds, description?.trim());

  res.status(201).json({
    success: true,
    message: 'Playlist created successfully.',
    playlist,
  });
});

// PUT /api/playlists/:id - Update playlist
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
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
  res.json({
    success: true,
    message: 'Playlist updated successfully.',
    playlist: updated,
  });
});

// DELETE /api/playlists/:id - Delete playlist
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const success = db.deletePlaylist(id);
  if (!success) {
    res.status(404).json({ error: 'Playlist not found or already deleted.' });
    return;
  }
  res.json({ success: true, message: 'Playlist deleted successfully.' });
});

export default router;
