import React, { useState, useEffect } from 'react';
import {
  Radio,
  Clock,
  Film,
  Play,
  Square,
  RefreshCw,
  Repeat,
  Terminal,
  Layers,
  Cpu,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useStream } from '../context/StreamContext.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { VideoItem, FFmpegLogEntry } from '../types.js';
import { api } from '../services/api.js';
import { NavTab } from '../components/Sidebar.js';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
  onSelectVideoForStream: (video: VideoItem) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onSelectVideoForStream }) => {
  const { status, stopStream, restartStream, isActionPending } = useStream();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<FFmpegLogEntry[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [videosRes, logsRes] = await Promise.all([
          api.getVideos(),
          api.getLogs(),
        ]);
        setVideos(videosRes.videos || []);
        setRecentLogs((logsRes.logs || []).slice(-8));
      } catch (e) {
        console.warn('Dashboard data fetch error:', e);
      } finally {
        setLoadingVideos(false);
      }
    };
    loadData();
  }, []);

  const isLive = status?.status === 'LIVE';
  const isStarting = status?.status === 'STARTING' || status?.status === 'RECONNECTING';
  const isRunning = isLive || isStarting;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Alert when active */}
      {isLive && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-emerald-900/40 to-zinc-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-emerald-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">24/7 RTMP Stream is Live</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40">
                  Uptime: {status?.uptimeFormatted || '00:00:00'}
                </span>
              </div>
              <p className="text-xs text-zinc-300">
                Broadcasting <strong className="text-white">"{status?.videoTitle}"</strong> continuously to YouTube Live.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="dash-view-active-stream-btn"
              onClick={() => onNavigate('active-stream')}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Monitor Telemetry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              id="dash-stop-stream-btn"
              onClick={() => stopStream()}
              disabled={isActionPending}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Stream</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {status?.status === 'ERROR' && status.errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 flex items-start gap-3 text-xs text-rose-200">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-rose-300">Stream Exited / Error Detected</p>
            <p className="text-rose-200/90 mt-0.5">{status.errorMessage}</p>
          </div>
          <button
            onClick={() => onNavigate('start-stream')}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg transition-colors"
          >
            Reconfigure
          </button>
        </div>
      )}

      {/* 6 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Streaming Status */}
        <div className="p-5 rounded-2xl bg-[#111622] border border-zinc-800/90 shadow-sm relative overflow-hidden group hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Stream Status</span>
            <Radio className={`w-4 h-4 ${isLive ? 'text-emerald-400' : 'text-zinc-500'}`} />
          </div>
          <div className="mt-1">
            <StatusBadge status={status?.status || 'IDLE'} size="lg" />
          </div>
          <p className="text-xs text-zinc-400 mt-3 flex items-center gap-1.5">
            {isRunning ? (
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active Server FFmpeg Process
              </span>
            ) : (
              'Ready to broadcast 24/7'
            )}
          </p>
        </div>

        {/* Card 2: Current Video */}
        <div className="p-5 rounded-2xl bg-[#111622] border border-zinc-800/90 shadow-sm relative overflow-hidden group hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active Loop Source</span>
            <Film className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-1">
            <h3 className="text-lg font-bold text-white truncate" title={status?.videoTitle || 'No Video Selected'}>
              {status?.videoTitle || (videos.length > 0 ? videos[0].originalName : 'No Video Uploaded')}
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-3 flex items-center gap-2">
            <span>Duration: {status?.videoDuration ? `${Math.floor(status.videoDuration / 60)}m ${Math.floor(status.videoDuration % 60)}s` : 'N/A'}</span>
            <span>•</span>
            <span className="capitalize">{status?.quality || '1080p'}</span>
          </p>
        </div>

        {/* Card 3: Stream Uptime */}
        <div className="p-5 rounded-2xl bg-[#111622] border border-zinc-800/90 shadow-sm relative overflow-hidden group hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Stream Uptime</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-1">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
              {status?.uptimeFormatted || '00:00:00'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            {isRunning ? 'Continuous 24/7 background broadcast' : 'Stream is currently inactive'}
          </p>
        </div>

        {/* Card 4: Stream Destination */}
        <div className="p-5 rounded-2xl bg-[#111622] border border-zinc-800/90 shadow-sm relative overflow-hidden group hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Stream Target</span>
            <ExternalLink className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-1">
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>YouTube RTMP Live</span>
            </p>
            <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate">
              {status?.rtmpUrl || 'rtmps://a.rtmps.youtube.com/live2'}
            </p>
          </div>
          <p className="text-xs text-zinc-400 mt-2 flex items-center gap-1">
            <span>Key:</span>
            <span className="font-mono text-zinc-300">{status?.maskedStreamKey || '••••••••'}</span>
          </p>
        </div>

        {/* Card 5: FFmpeg Process */}
        <div className="p-5 rounded-2xl bg-[#111622] border border-zinc-800/90 shadow-sm relative overflow-hidden group hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">FFmpeg Engine</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-white">
              {status?.pid ? `PID: ${status.pid}` : 'Standby'}
            </span>
            {status?.encoderStats?.fps ? (
              <span className="text-xs font-bold text-emerald-400">{status.encoderStats.fps} FPS</span>
            ) : null}
          </div>
          <p className="text-xs text-zinc-400 mt-2 flex items-center gap-2">
            <span>Bitrate: {status?.encoderStats?.bitrate || status?.bitrate || '4000k'}</span>
            <span>•</span>
            <span>Speed: {status?.encoderStats?.speed || '1.0x'}</span>
          </p>
        </div>

        {/* Card 6: Current Loop */}
        <div className="p-5 rounded-2xl bg-[#111622] border border-zinc-800/90 shadow-sm relative overflow-hidden group hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Infinite Looper</span>
            <Repeat className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              Loop #{status?.currentLoopCount || 1}
            </span>
            <span className="text-xs text-indigo-400 font-semibold">24×7 Active</span>
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Seamless continuous repeat on the server
          </p>
        </div>
      </div>

      {/* Main Row: Quick Stream Setup or Live Telemetry + Video Library Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Action Center */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Start / Control Panel */}
          <div className="p-6 rounded-2xl bg-[#111622] border border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">24/7 Streaming Control Center</h3>
                <p className="text-xs text-zinc-400">Launch or manage your YouTube RTMP loop broadcast</p>
              </div>
              <button
                onClick={() => onNavigate(isRunning ? 'active-stream' : 'start-stream')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                <span>{isRunning ? 'Full Telemetry' : 'Advanced Configuration'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {isRunning ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{status?.videoTitle}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {status?.quality}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Destination: <code className="text-zinc-300 font-mono text-[11px]">{status?.rtmpUrl}</code>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="dash-restart-stream-btn"
                      onClick={() => restartStream()}
                      disabled={isActionPending}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Restart Stream</span>
                    </button>
                    <button
                      id="dash-stop-stream-btn-main"
                      onClick={() => stopStream()}
                      disabled={isActionPending}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Stream</span>
                    </button>
                  </div>
                </div>

                {/* Live Real-Time Gauge Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                    <span className="text-zinc-400 block text-[11px]">Frame Rate</span>
                    <span className="font-bold text-white text-sm">
                      {status?.encoderStats?.fps || status?.fps || 30} FPS
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                    <span className="text-zinc-400 block text-[11px]">Bitrate</span>
                    <span className="font-bold text-white text-sm">
                      {status?.encoderStats?.bitrate || status?.bitrate || '4000k'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                    <span className="text-zinc-400 block text-[11px]">Process Time</span>
                    <span className="font-bold text-white text-sm">
                      {status?.encoderStats?.time || status?.uptimeFormatted || '00:00:00'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                    <span className="text-zinc-400 block text-[11px]">Stream Speed</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {status?.encoderStats?.speed || '1.00x'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
                  <Play className="w-6 h-6 ml-0.5 fill-current" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">No Stream Currently Active</h4>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                    Select a video from your library, enter your YouTube stream key, and start a 24/7 background loop.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    id="dash-quick-start-stream-btn"
                    onClick={() => onNavigate('start-stream')}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all duration-150 inline-flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Launch 24/7 RTMP Stream</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recent Videos Row */}
          <div className="p-6 rounded-2xl bg-[#111622] border border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Video Library</h3>
                <p className="text-xs text-zinc-400">Select an uploaded asset to start looping</p>
              </div>
              <button
                onClick={() => onNavigate('library')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                <span>View All ({videos.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loadingVideos ? (
              <div className="py-8 text-center text-xs text-zinc-500">Loading videos...</div>
            ) : videos.length === 0 ? (
              <div className="p-6 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-center space-y-2">
                <Film className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-300 font-semibold">No video assets yet</p>
                <p className="text-xs text-zinc-500">Upload your first MP4 video to start streaming</p>
                <button
                  onClick={() => onNavigate('library')}
                  className="mt-2 px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors inline-block"
                >
                  Upload Video
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {videos.slice(0, 4).map((video) => (
                  <div
                    key={video.id}
                    className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 flex items-center gap-3 transition-colors group"
                  >
                    <div className="w-16 h-12 rounded-lg bg-zinc-900 overflow-hidden shrink-0 border border-zinc-800 relative flex items-center justify-center">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.originalName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Film className="w-5 h-5 text-zinc-600" />
                      )}
                      <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/80 text-[9px] font-mono text-zinc-300">
                        {video.durationFormatted}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-200 truncate group-hover:text-white">
                        {video.originalName}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {video.resolution} • {video.fps}fps
                      </p>
                    </div>

                    <button
                      onClick={() => onSelectVideoForStream(video)}
                      title="Stream this video"
                      className="p-2 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Live FFmpeg Logs preview & Quick Info */}
        <div className="space-y-6">
          {/* FFmpeg Real-time Terminal preview */}
          <div className="p-5 rounded-2xl bg-[#111622] border border-zinc-800 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Live Engine Output</h3>
              </div>
              <button
                onClick={() => onNavigate('logs')}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Open Terminal
              </button>
            </div>

            <div className="flex-1 bg-black/90 rounded-xl p-3 border border-zinc-800/80 font-mono text-[11px] text-zinc-300 overflow-y-auto max-h-[360px] space-y-1.5 custom-scrollbar">
              {recentLogs.length === 0 ? (
                <div className="text-zinc-500 py-6 text-center text-xs">
                  Awaiting FFmpeg execution output...
                </div>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="leading-tight break-all">
                    <span className="text-zinc-500 text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>{' '}
                    <span
                      className={
                        log.level === 'error'
                          ? 'text-rose-400 font-bold'
                          : log.level === 'warn'
                          ? 'text-amber-400'
                          : 'text-zinc-300'
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Quick 24/7 Reminder */}
            <div className="mt-4 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-[11px] text-zinc-400">
              <span className="font-semibold text-zinc-200">24/7 Server Persistence:</span> The FFmpeg stream process runs independently in background mode. You can safely close or disconnect from this admin console.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
