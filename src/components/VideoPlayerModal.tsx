import React from 'react';
import { X, PlaySquare, Film, Clock, Layers, Volume2, VolumeX, HardDrive } from 'lucide-react';
import { VideoItem } from '../types.js';

interface VideoPlayerModalProps {
  video: VideoItem | null;
  onClose: () => void;
  onSelectForStream: (video: VideoItem) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  video,
  onClose,
  onSelectForStream,
}) => {
  if (!video) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      id="video-player-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="bg-[#111622] border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-base font-bold text-white truncate">{video.originalName}</h3>
              <p className="text-xs text-zinc-400">Video Asset Preview & Metadata</p>
            </div>
          </div>
          <button
            id="btn-close-video-modal"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative bg-black flex items-center justify-center aspect-video w-full">
          <video
            src={`/api/videos/${video.id}/file`}
            controls
            autoPlay
            loop
            className="w-full h-full max-h-[50vh] object-contain"
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Metadata Details & Actions */}
        <div className="p-5 overflow-y-auto space-y-4 bg-zinc-950/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Duration</span>
              </div>
              <p className="font-semibold text-zinc-200 text-sm">{video.durationFormatted}</p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Resolution</span>
              </div>
              <p className="font-semibold text-zinc-200 text-sm">
                {video.resolution} @ {video.fps}fps
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>File Size</span>
              </div>
              <p className="font-semibold text-zinc-200 text-sm">{formatFileSize(video.size)}</p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
                {video.hasAudio ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                )}
                <span>Audio Track</span>
              </div>
              <p className="font-semibold text-zinc-200 text-sm">
                {video.hasAudio ? video.audioCodec?.toUpperCase() || 'Audio present' : 'No Audio (Muted)'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onSelectForStream(video);
                onClose();
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all duration-150"
            >
              <PlaySquare className="w-4 h-4" />
              <span>Select For 24/7 Stream</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
