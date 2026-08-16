import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import { VideoItem } from '../types.js';
import {
  Film,
  Upload,
  Play,
  Trash2,
  Edit2,
  CheckCircle,
  AlertTriangle,
  FileVideo,
  Loader2,
  ShieldAlert,
  HardDrive,
  Clock,
  Cloud,
} from 'lucide-react';

interface VideosPageProps {
  onNavigate: (tab: string) => void;
}

export const VideosPage: React.FC<VideosPageProps> = ({ onNavigate }) => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Video Preview Modal
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null);

  // Edit Video Modal
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [editName, setEditName] = useState('');

  // Delete Confirmation Modal
  const [deleteTargetVideo, setDeleteTargetVideo] = useState<VideoItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchVideos = async () => {
    try {
      const res = await api.getVideos();
      setVideos(res.videos || []);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load videos from storage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const startUpload = async (file: File) => {
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setUploadState('uploading');
    setUploadProgress(0);
    setUploadStatusText('Preparing video upload...');

    try {
      const res = await api.uploadVideo(file, file.name, (percent, statusText) => {
        setUploadProgress(percent);
        if (percent >= 99) {
          setUploadState('processing');
        }
        if (statusText) setUploadStatusText(statusText);
      });

      setUploadState('success');
      setUploadProgress(100);
      setUploadStatusText('Upload completed and stored in Cloudflare R2.');
      setSuccessMsg(`"${res.video?.originalName || file.name}" uploaded successfully to Cloudflare R2!`);

      if (res.video) {
        setVideos((prev) => [res.video, ...prev.filter((v) => v.id !== res.video.id)]);
      }

      await fetchVideos();
    } catch (err: any) {
      setUploadState('error');
      setErrorMsg(err.message || 'Failed to upload video to Cloudflare R2. Please verify your Storage Settings.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => {
        setUploadState((curr) => (curr === 'uploading' || curr === 'processing' ? curr : 'idle'));
      }, 4000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await startUpload(file);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetVideo || isDeleting) return;

    setIsDeleting(true);
    setErrorMsg(null);

    try {
      await api.deleteVideo(deleteTargetVideo.id);
      setVideos((prev) => prev.filter((v) => v.id !== deleteTargetVideo.id));
      setSuccessMsg(`"${deleteTargetVideo.originalName}" was deleted successfully from Cloudflare R2 storage.`);
      setDeleteTargetVideo(null);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to delete video. It may be currently streaming.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveRename = async () => {
    if (!editingVideo || !editName.trim()) return;
    try {
      const res = await api.updateVideoName(editingVideo.id, editName.trim());
      setVideos(videos.map((v) => (v.id === editingVideo.id ? res.video : v)));
      setEditingVideo(null);
      setSuccessMsg('Video renamed successfully.');
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to rename video.');
    }
  };

  const handleDirectStream = async (video: VideoItem) => {
    try {
      await api.startStream({ videoId: video.id });
      onNavigate('stream');
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to start stream with this video.');
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Film className="w-3.5 h-3.5 text-red-500" />
            Direct VPS Local Storage
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Video Library
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Store video clips locally on your VPS server for continuous 24/7 FFmpeg broadcasting.
          </p>
        </div>

        {/* Upload Action Button */}
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="video/*"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadState === 'uploading' || uploadState === 'processing'}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadState === 'uploading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading... {uploadProgress}%</span>
              </>
            ) : uploadState === 'processing' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing video...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Video to VPS</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Progress Bar */}
      {(uploadState === 'uploading' || uploadState === 'processing') && (
        <div className="p-4 rounded-2xl bg-[#0e0e12] border border-red-500/40 space-y-2 animate-fadeIn">
          <div className="flex justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {uploadStatusText || (uploadState === 'processing' ? 'Analyzing metadata and generating thumbnail...' : 'Uploading video file directly to VPS...')}
            </span>
            <span className="text-red-400 font-mono font-bold">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300 shadow-[0_0_10px_#ff1a1a]"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white px-1 cursor-pointer">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Video Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs">
          Loading video storage from VPS...
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-[#0e0e12] border border-white/[0.08] space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-red-600/15 border border-red-500/30 text-red-500 flex items-center justify-center">
            <FileVideo className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-bold text-white">No videos in your library yet</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Upload MP4, MKV, or MOV video files directly to VPS storage to begin 24/7 broadcasting.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-6 rounded-full bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            >
              Upload First Video
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="group bg-[#0e0e12] border border-white/[0.08] hover:border-red-500/50 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              {/* Thumbnail / Video Preview Banner */}
              <div className="relative aspect-video w-full bg-black overflow-hidden">
                {video.thumbnailUrl || (video as any).thumbnailPath ? (
                  <img
                    src={video.thumbnailUrl || (video as any).thumbnailPath}
                    alt={video.originalName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-950">
                    <FileVideo className="w-12 h-12 text-slate-700" />
                  </div>
                )}

                {/* Duration & Resolution Badges */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-white bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg">
                  <span>{formatDuration(video.duration)}</span>
                  <span>{video.resolution || '1080p'} • {video.fps || 60}fps</span>
                </div>
              </div>

              {/* Info & Action Controls */}
              <div className="p-4 flex flex-col flex-1 justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-red-300 transition-colors" title={video.originalName}>
                      {video.originalName}
                    </h3>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between gap-2 mt-1">
                    <div className="flex items-center gap-1.5">
                      <span>{formatSize(video.size)}</span>
                      <span>•</span>
                      <span>{new Date(video.createdAt || (video as any).uploadedAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Buttons Bar */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Preview Button */}
                    <button
                      onClick={() => setPreviewVideo(video)}
                      className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Preview Video"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>

                    {/* Rename Button */}
                    <button
                      onClick={() => {
                        setEditingVideo(video);
                        setEditName(video.originalName);
                      }}
                      className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Rename Video"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button (Opens Safe Confirmation Modal) */}
                    <button
                      onClick={() => setDeleteTargetVideo(video)}
                      className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 transition-colors cursor-pointer"
                      title="Delete Video"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleDirectStream(video)}
                    className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Stream</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* DELETE CONFIRMATION MODAL WITH ACTIVE CHECK */}
      {/* ========================================================= */}
      {deleteTargetVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#0e0e12] border border-red-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 rounded-2xl bg-red-950 border border-red-500/40">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Video Deletion</h3>
                <p className="text-xs text-slate-400">Permanent cloud storage removal</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white font-mono">"{deleteTargetVideo.originalName}"</strong> from your Google Drive storage?
            </p>

            <div className="p-3 rounded-xl bg-black/50 border border-white/[0.06] text-[11px] text-slate-400 space-y-1">
              <div>Size: <span className="text-white">{formatSize(deleteTargetVideo.size)}</span></div>
              <div>Duration: <span className="text-white">{formatDuration(deleteTargetVideo.duration)}</span></div>
              <div>Resolution: <span className="text-white">{deleteTargetVideo.resolution || '1080p'}</span></div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTargetVideo(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-white/[0.05] text-xs font-semibold text-slate-300 hover:text-white cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-md shadow-red-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIDEO PREVIEW MODAL */}
      {/* ========================================================= */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-3xl bg-[#0e0e12] border border-red-500/40 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-black/50">
              <span className="font-bold text-sm text-white truncate max-w-md">
                {previewVideo.originalName}
              </span>
              <button
                onClick={() => setPreviewVideo(null)}
                className="text-slate-400 hover:text-white px-2 py-1 text-xs cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black">
              <video
                src={`/api/videos/${previewVideo.id}/file`}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-4 bg-[#0a0a0d] flex items-center justify-between text-xs text-slate-400">
              <div>Resolution: <strong className="text-white">{previewVideo.resolution || '1080p'}</strong></div>
              <div>Duration: <strong className="text-white">{formatDuration(previewVideo.duration)}</strong></div>
              <div>FPS: <strong className="text-white">{previewVideo.fps || 60}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* RENAME MODAL */}
      {/* ========================================================= */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#0e0e12] border border-white/20 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Rename Video</h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-black/60 border border-slate-700 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none mb-4"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingVideo(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRename}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-md shadow-red-600/30 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
