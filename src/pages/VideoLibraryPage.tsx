import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Film,
  PlaySquare,
  Eye,
  Trash2,
  Edit2,
  Clock,
  Layers,
  HardDrive,
  Check,
  X,
  AlertCircle,
  Volume2,
  VolumeX,
  Search,
} from 'lucide-react';
import { VideoItem } from '../types.js';
import { api } from '../services/api.js';
import { VideoPlayerModal } from '../components/VideoPlayerModal.js';
import { useStream } from '../context/StreamContext.js';

interface VideoLibraryPageProps {
  onSelectForStream: (video: VideoItem) => void;
}

export const VideoLibraryPage: React.FC<VideoLibraryPageProps> = ({ onSelectForStream }) => {
  const { status } = useStream();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchVideos = async () => {
    try {
      const data = await api.getVideos();
      setVideos(data.videos || []);
    } catch (e: any) {
      console.error('Fetch videos error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Client-side extension validation
    const validExts = ['.mp4', '.mkv', '.mov', '.avi', '.webm', '.ts', '.flv', '.m4v', '.3gp', '.wmv', '.mpeg', '.mpg'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExts.some((ext) => lowerName.endsWith(ext));
    if (!hasValidExt) {
      setUploadError(`Unsupported video format. Supported formats: MP4, MKV, MOV, WebM, AVI, TS, FLV, M4V, WMV`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const result = await api.uploadVideo(file, undefined, (progress) => {
        setUploadProgress(progress);
      });
      if (result?.video) {
        setVideos((prev) => [result.video, ...prev.filter((v) => v.id !== result.video.id)]);
      }
      setUploadSuccess(`"${result.video.originalName}" uploaded and processed successfully.`);
      await fetchVideos();
    } catch (err: any) {
      console.error('Video upload error:', err);
      setUploadError(err.message || 'Video upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleStartRename = (video: VideoItem) => {
    setEditingId(video.id);
    setEditName(video.originalName);
  };

  const handleSaveRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await api.updateVideoName(id, editName.trim());
      setEditingId(null);
      fetchVideos();
    } catch (err: any) {
      alert(err.message || 'Failed to rename video');
    }
  };

  const handleDelete = async (video: VideoItem) => {
    if (status?.active && status.videoId === video.id) {
      alert('Cannot delete this video because it is currently used in an active livestream. Stop the stream first.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${video.originalName}" from the server?`)) {
      return;
    }

    try {
      await api.deleteVideo(video.id);
      fetchVideos();
    } catch (err: any) {
      alert(err.message || 'Failed to delete video');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredVideos = videos.filter((v) =>
    v.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Upload Box */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="p-8 rounded-2xl bg-[#111622] border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 transition-colors text-center relative overflow-hidden"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/mkv,video/quicktime,video/x-matroska,video/webm,video/avi"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
            <Upload className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-bold text-white">Upload Video File for 24/7 Looping</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Drag & drop MP4, MKV, MOV or WebM files here, or click browse
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-2 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-[11px] text-zinc-400">
              <span>Supports large files up to 10 GB with automatic chunked streaming</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              id="btn-browse-video-files"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              Browse Computer
            </button>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="pt-2 space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Uploading & Processing via FFprobe...</span>
                <span className="font-bold text-indigo-400">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Feedback alerts */}
          {uploadError && (
            <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-500/40 text-xs text-rose-200 flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="p-1 text-rose-400 hover:text-white rounded-lg transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2 text-left">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadSuccess(null)}
                className="p-1 text-emerald-400 hover:text-white rounded-lg transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Video Assets Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Video Assets</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-semibold">
              {videos.length} Total
            </span>
          </h2>
          <p className="text-xs text-zinc-400">All uploaded media stored persistently on the server</p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#111622] border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Videos Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-zinc-500">Loading video library...</div>
      ) : filteredVideos.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#111622] border border-zinc-800 text-center space-y-3">
          <Film className="w-10 h-10 text-zinc-600 mx-auto" />
          <h4 className="text-sm font-bold text-white">No video files found</h4>
          <p className="text-xs text-zinc-400">
            {searchQuery ? 'No videos matching your search query.' : 'Upload an MP4 video above to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredVideos.map((video) => {
            const isCurrentlyStreaming = status?.active && status.videoId === video.id;

            return (
              <div
                key={video.id}
                id={`video-card-${video.id}`}
                className={`p-4 rounded-2xl bg-[#111622] border transition-all flex flex-col justify-between group ${
                  isCurrentlyStreaming
                    ? 'border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div>
                  {/* Thumbnail / Preview Area */}
                  <div className="relative aspect-video rounded-xl bg-black overflow-hidden border border-zinc-800 mb-3 flex items-center justify-center">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.originalName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Film className="w-8 h-8 text-zinc-700" />
                    )}

                    {/* Duration Badge */}
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono font-semibold text-zinc-200">
                      {video.durationFormatted}
                    </span>

                    {/* Live Streaming Badge if active */}
                    {isCurrentlyStreaming && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold tracking-wider flex items-center gap-1 shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                        STREAMING
                      </span>
                    )}

                    {/* Hover Play Button */}
                    <button
                      onClick={() => setPreviewVideo(video)}
                      title="Preview video"
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg">
                        <Eye className="w-5 h-5" />
                      </div>
                    </button>
                  </div>

                  {/* Title & Rename Mode */}
                  <div className="mb-2">
                    {editingId === video.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={() => handleSaveRename(video.id)}
                          className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          className="text-sm font-bold text-white truncate flex-1"
                          title={video.originalName}
                        >
                          {video.originalName}
                        </h4>
                        <button
                          onClick={() => handleStartRename(video)}
                          title="Rename"
                          className="text-zinc-500 hover:text-zinc-300 p-1"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{video.resolution} @ {video.fps}fps</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                      <span>{formatFileSize(video.size)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="uppercase">{video.codec}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {video.hasAudio ? (
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                      <span>{video.hasAudio ? 'Audio AAC' : 'Silent (Synthetic AAC)'}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-800/80">
                  <button
                    onClick={() => handleDelete(video)}
                    title="Delete video file"
                    className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewVideo(video)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>

                    <button
                      id={`btn-stream-video-${video.id}`}
                      onClick={() => onSelectForStream(video)}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
                    >
                      <PlaySquare className="w-3.5 h-3.5" />
                      <span>Stream This</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Video Player */}
      <VideoPlayerModal
        video={previewVideo}
        onClose={() => setPreviewVideo(null)}
        onSelectForStream={onSelectForStream}
      />
    </div>
  );
};
