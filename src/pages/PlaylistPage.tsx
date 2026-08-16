import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { PlaylistItem, VideoItem } from '../types.js';
import {
  ListVideo,
  Plus,
  Radio,
  Play,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  AlertTriangle,
  Film,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface PlaylistPageProps {
  onNavigate: (tab: string) => void;
}

export const PlaylistPage: React.FC<PlaylistPageProps> = ({ onNavigate }) => {
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create / Edit Playlist Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDesc, setPlaylistDesc] = useState('');
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, vRes] = await Promise.all([api.getPlaylists(), api.getVideos()]);
      setPlaylists(pRes.playlists);
      setVideos(vRes.videos);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load playlist data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingPlaylistId(null);
    setPlaylistName('');
    setPlaylistDesc('');
    setSelectedVideoIds([]);
    setModalOpen(true);
  };

  const openEditModal = (p: PlaylistItem) => {
    setEditingPlaylistId(p.id);
    setPlaylistName(p.name);
    setPlaylistDesc(p.description || '');
    setSelectedVideoIds(p.videoIds || []);
    setModalOpen(true);
  };

  const handleToggleVideo = (videoId: string) => {
    if (selectedVideoIds.includes(videoId)) {
      setSelectedVideoIds(selectedVideoIds.filter((id) => id !== videoId));
    } else {
      setSelectedVideoIds([...selectedVideoIds, videoId]);
    }
  };

  const handleMoveVideo = (index: number, direction: 'up' | 'down') => {
    const newIds = [...selectedVideoIds];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newIds.length) return;
    const temp = newIds[index];
    newIds[index] = newIds[targetIndex];
    newIds[targetIndex] = temp;
    setSelectedVideoIds(newIds);
  };

  const handleSavePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistName.trim()) {
      setErrorMsg('Playlist name is required.');
      return;
    }
    if (selectedVideoIds.length === 0) {
      setErrorMsg('Please select at least one video for the playlist.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      if (editingPlaylistId) {
        await api.updatePlaylist(editingPlaylistId, {
          name: playlistName.trim(),
          description: playlistDesc.trim(),
          videoIds: selectedVideoIds,
        });
        setSuccessMsg('Playlist updated successfully!');
      } else {
        await api.createPlaylist(playlistName.trim(), selectedVideoIds, playlistDesc.trim());
        setSuccessMsg('New continuous playlist created!');
      }
      setModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save playlist.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlaylist = async (id: string, name: string) => {
    if (!window.confirm(`Delete playlist "${name}"?`)) return;
    try {
      await api.deletePlaylist(id);
      setPlaylists(playlists.filter((p) => p.id !== id));
      setSuccessMsg(`Deleted "${name}".`);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to delete playlist.');
    }
  };

  const handleStreamPlaylist = async (p: PlaylistItem) => {
    try {
      await api.startStream({ playlistId: p.id });
      onNavigate('stream');
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to start stream with this playlist.');
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} min`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
            <ListVideo className="w-3.5 h-3.5 text-red-500" />
            Multi-Video Continuous Sequences
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Playlist Builder
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Chain multiple video clips into an unbroken 24/7 continuous broadcast loop.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-red-600/30 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Playlist</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Playlists List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs">
          Loading playlists...
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-[#0e0e12] border border-white/[0.08] space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-red-600/15 border border-red-500/30 text-red-500 flex items-center justify-center">
            <ListVideo className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-bold text-white">No playlists created yet</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Combine multiple video clips into an automated multi-hour 24/7 stream sequence.
            </p>
            <button
              onClick={openCreateModal}
              className="py-2.5 px-6 rounded-full bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            >
              Create First Playlist
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((p) => {
            const playlistVideos = videos.filter((v) => p.videoIds.includes(v.id));
            const totalDuration = playlistVideos.reduce((acc, v) => acc + (v.duration || 0), 0);

            return (
              <div
                key={p.id}
                className="group bg-[#0e0e12] border border-white/[0.08] hover:border-red-500/50 rounded-3xl p-6 shadow-lg hover:shadow-[0_10px_35px_rgba(255,20,20,0.15)] transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 rounded-full bg-red-600/15 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                      {p.videoIds.length} Videos Chained
                    </span>
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(totalDuration)}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-red-300 transition-colors mb-1">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                    {p.description || 'Continuous multi-video loop.'}
                  </p>

                  {/* Video Items preview */}
                  <div className="space-y-1.5 bg-black/40 p-3 rounded-2xl border border-white/[0.05] mb-4">
                    {playlistVideos.slice(0, 3).map((v, idx) => (
                      <div key={v.id} className="text-xs text-slate-300 flex items-center gap-2 truncate">
                        <span className="text-[10px] font-mono text-red-500 font-bold">{idx + 1}.</span>
                        <span className="truncate">{v.originalName}</span>
                      </div>
                    ))}
                    {playlistVideos.length > 3 && (
                      <div className="text-[10px] text-slate-500 font-semibold pt-1">
                        + {playlistVideos.length - 3} more videos
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(p)}
                      className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                      title="Edit Playlist"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePlaylist(p.id, p.name)}
                      className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 transition-colors"
                      title="Delete Playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleStreamPlaylist(p)}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Stream Playlist</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* CREATE / EDIT PLAYLIST MODAL */}
      {/* ========================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#0e0e12] border border-red-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-600/20 text-red-500">
                  <ListVideo className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {editingPlaylistId ? 'Edit Playlist' : 'Create Multi-Video Playlist'}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlaylist} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Playlist Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 24/7 Lo-Fi Non-Stop Mega Mix"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-slate-700 focus:border-red-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Smooth instrumentals, ambient tracks, and piano loops"
                  value={playlistDesc}
                  onChange={(e) => setPlaylistDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-slate-700 focus:border-red-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Video Selection and Order */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Select & Order Videos for Continuous Loop ({selectedVideoIds.length} selected)
                </label>

                {videos.length === 0 ? (
                  <div className="p-4 rounded-xl bg-black/40 border border-slate-800 text-xs text-slate-400">
                    No videos available in your library. Please upload videos first.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {videos.map((v) => {
                      const isSelected = selectedVideoIds.includes(v.id);
                      const orderIndex = selectedVideoIds.indexOf(v.id);

                      return (
                        <div
                          key={v.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            isSelected
                              ? 'bg-red-950/30 border-red-500/50 text-white'
                              : 'bg-black/40 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div
                            onClick={() => handleToggleVideo(v.id)}
                            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-red-600 focus:ring-red-500"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-xs text-white truncate">
                                {v.originalName}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {formatDuration(v.duration)} • {v.resolution || '1080p'}
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white">
                                #{orderIndex + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleMoveVideo(orderIndex, 'up')}
                                disabled={orderIndex === 0}
                                className="p-1 rounded bg-white/10 hover:bg-white/20 text-white disabled:opacity-30"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveVideo(orderIndex, 'down')}
                                disabled={orderIndex === selectedVideoIds.length - 1}
                                className="p-1 rounded bg-white/10 hover:bg-white/20 text-white disabled:opacity-30"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || selectedVideoIds.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-md shadow-red-600/30 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingPlaylistId ? 'Update Playlist' : 'Create Playlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
