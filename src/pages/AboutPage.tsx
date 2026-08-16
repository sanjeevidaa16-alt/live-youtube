import React from 'react';
import { Info, Server, Cpu, Radio, ShieldCheck, Zap, Globe, HardDrive, RefreshCw } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-3">
          <Info className="w-3.5 h-3.5 text-red-500" />
          Behind The Technology
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
          How 24/7 Cloud Streaming Works
        </h1>
        <p className="text-base text-slate-400 max-w-2xl mx-auto mt-2">
          Discover why YouTube 24/7 Live keeps broadcasting continuously even when all client devices are offline.
        </p>
      </div>

      {/* Architecture Cards */}
      <div className="space-y-6">
        
        {/* Core 1 */}
        <div className="p-8 rounded-3xl bg-[#0e0e12] border border-red-500/30 relative overflow-hidden shadow-xl">
          <div className="flex items-start gap-5">
            <div className="p-4 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-400 shrink-0">
              <Server className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">
                1. Dedicated VPS FFmpeg Processing Engine
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                Traditional browser tools stop streaming the moment you close your tab or lose connection. Our platform runs an isolated Linux FFmpeg process on high-performance cloud VPS instances. The stream source is read directly from server NVMe storage and encoded natively in real time.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1 rounded-lg bg-black/60 border border-white/10 text-slate-300">
                  ⚡ Hardware-accelerated H.264
                </span>
                <span className="px-3 py-1 rounded-lg bg-black/60 border border-white/10 text-slate-300">
                  🎧 AAC 48kHz Stereo Audio Engine
                </span>
                <span className="px-3 py-1 rounded-lg bg-black/60 border border-white/10 text-slate-300">
                  🔄 Infinite Stream Loop (-stream_loop -1)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Core 2 */}
        <div className="p-8 rounded-3xl bg-[#0e0e12] border border-white/10 relative overflow-hidden shadow-xl">
          <div className="flex items-start gap-5">
            <div className="p-4 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-400 shrink-0">
              <RefreshCw className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">
                2. Multi-Video Playlist Concatenation Loop
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                You can group 2, 5, or 20+ video clips into a single continuous broadcast playlist. The backend dynamically merges the video feed into an unbroken continuous broadcast timeline without any stream disconnects or buffering spikes.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1 rounded-lg bg-black/60 border border-white/10 text-slate-300">
                  📜 FFmpeg Concat Demuxer
                </span>
                <span className="px-3 py-1 rounded-lg bg-black/60 border border-white/10 text-slate-300">
                  🎯 Zero-Drop Keyframe Sync
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Core 3 */}
        <div className="p-8 rounded-3xl bg-[#0e0e12] border border-white/10 relative overflow-hidden shadow-xl">
          <div className="flex items-start gap-5">
            <div className="p-4 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-400 shrink-0">
              <HardDrive className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">
                3. High-Capacity Chunked Uploads & Google Drive Sync
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                Upload video files up to 10 GB via our chunked proxy-bypass pipeline, or paste a public Google Drive link to have the VPS download the high-definition video directly into your cloud repository.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1 rounded-lg bg-black/60 border border-white/10 text-slate-300">
                  📦 10MB Sliced Resilient Chunking
                </span>
                <span className="px-3 py-1 rounded-lg bg-black/60 border border-white/10 text-slate-300">
                  ☁️ Direct Google Drive Streaming
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
