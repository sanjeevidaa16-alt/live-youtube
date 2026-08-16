import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import {
  StreamInstance,
  VideoItem,
  PlaylistItem,
  StreamSessionHistory,
} from '../types.js';
import {
  Radio,
  Play,
  Square,
  Film,
  ListVideo,
  Activity,
  Clock,
  Cpu,
  HardDrive,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ChevronRight,
  Plus,
  Tv,
  Zap,
  Loader2,
} from 'lucide-react';

interface UserDashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const UserDashboardPage: React.FC<UserDashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [streams, setStreams] = useState<StreamInstance[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [history, setHistory] = useState<StreamSessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [streamsRes, videosRes, playlistsRes, historyRes] = await Promise.allSettled([
        api.getStreams(),
        api.getVideos(),
        api.getPlaylists(),
        api.getHistory(),
      ]);

      if (streamsRes.status === 'fulfilled') setStreams(streamsRes.value.streams || []);
      if (videosRes.status === 'fulfilled') setVideos(videosRes.value.videos || []);
      if (playlistsRes.status === 'fulfilled') setPlaylists(playlistsRes.value.playlists || []);
      if (historyRes.status === 'fulfilled') setHistory(historyRes.value.history.slice(0, 5) || []);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStartStream = async (streamId: string) => {
    setActionLoadingMap((prev) => ({ ...prev, [streamId]: true }));
    setErrorMsg(null);
    try {
      await api.startStreamInstance(streamId);
      await fetchDashboardData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start stream.');
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [streamId]: false }));
    }
  };

  const handleStopStream = async (streamId: string) => {
    setActionLoadingMap((prev) => ({ ...prev, [streamId]: true }));
    setErrorMsg(null);
    try {
      await api.stopStreamInstance(streamId);
      await fetchDashboardData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to stop stream.');
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [streamId]: false }));
    }
  };

  const activeStreamsCount = streams.filter(
    (s) => s.status === 'LIVE' || s.status === 'STARTING' || s.status === 'RECONNECTING'
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* User Welcome & Quick Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#140a0e] via-[#0d0d12] to-[#0a0a0c] border border-red-500/30 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`}
            alt="Profile"
            className="w-14 h-14 rounded-2xl bg-red-950 border border-red-500/50 object-cover shadow-lg shadow-red-600/20"
          />
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              {user?.role === 'admin' ? 'Authorized Broadcaster / Admin' : 'Google Verified Broadcaster'}
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Welcome back, {user?.name || user?.username}!
            </h1>
            <p className="text-xs text-slate-400">
              {user?.email || 'Cloud 24/7 Multi-Live Stream Dashboard'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => onNavigate('stream')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-xs font-bold text-white shadow-md shadow-red-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Manage Streams</span>
          </button>
          <button
            onClick={() => onNavigate('videos')}
            className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer"
          >
            <Film className="w-4 h-4 text-red-400" />
            <span>Upload Media</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* ========================================================= */}
      {/* MULTI-STREAM INSTANCES DASHBOARD CARDS */}
      {/* ========================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500 animate-pulse" />
            <h2 className="text-xl font-bold text-white">Live Stream Channels ({streams.length})</h2>
          </div>
          <div className="text-xs font-mono text-slate-400">
            <span className="text-red-400 font-bold">{activeStreamsCount}</span> Active Broadcasts
          </div>
        </div>

        {streams.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[#0e0e12] border border-white/[0.08] text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-600/15 text-red-500 flex items-center justify-center">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No stream channels configured</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Create your first live stream channel to start 24/7 broadcasting to YouTube RTMP.
            </p>
            <button
              onClick={() => onNavigate('stream')}
              className="py-2 px-5 rounded-full bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              Configure Live Stream
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {streams.map((stream) => {
              const isLive = stream.status === 'LIVE';
              const isStarting = stream.status === 'STARTING';
              const isReconnecting = stream.status === 'RECONNECTING';
              const isBusy = !!actionLoadingMap[stream.id];

              return (
                <div
                  key={stream.id}
                  className={`p-5 rounded-3xl bg-[#0e0e12] border transition-all duration-300 flex flex-col justify-between ${
                    isLive
                      ? 'border-red-500/60 shadow-[0_0_20px_rgba(255,26,26,0.15)] ring-1 ring-red-500/30'
                      : 'border-white/[0.08] hover:border-white/20 shadow-lg'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                          isLive
                            ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(255,26,26,0.5)]'
                            : isStarting
                            ? 'bg-amber-500 text-black'
                            : isReconnecting
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isLive ? 'bg-white animate-ping' : isStarting ? 'bg-black' : 'bg-slate-500'
                          }`}
                        />
                        {stream.status}
                      </span>

                      <span className="text-[10px] font-mono text-slate-400">
                        {stream.uptimeFormatted || '00:00:00'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white truncate mb-1" title={stream.name}>
                      {stream.name}
                    </h3>

                    <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-3">
                      {stream.playlistId ? <ListVideo className="w-3.5 h-3.5 text-red-400" /> : <Film className="w-3.5 h-3.5 text-red-400" />}
                      <span className="truncate" title={stream.playlistName || stream.videoTitle || 'No media'}>
                        {stream.playlistName || stream.videoTitle || 'Default Video'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] text-[11px] text-slate-400 flex items-center justify-between mb-4">
                      <span>{stream.quality || '1080p'} • {stream.fps || 30}fps</span>
                      <span className="font-mono text-slate-300">{stream.bitrate || '4000k'}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                    {isLive || isStarting || isReconnecting ? (
                      <button
                        onClick={() => handleStopStream(stream.id)}
                        disabled={isBusy}
                        className="flex-1 py-2.5 rounded-xl bg-red-950 hover:bg-red-900 text-red-300 hover:text-white border border-red-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-current" />}
                        <span>STOP</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartStream(stream.id)}
                        disabled={isBusy}
                        className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>START</span>
                      </button>
                    )}

                    <button
                      onClick={() => onNavigate('stream')}
                      className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 hover:text-white text-xs transition-colors cursor-pointer"
                      title="Open in Stream Center"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3 STATS / SHORTCUT TILES */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Videos Tile */}
        <div
          onClick={() => onNavigate('videos')}
          className="group p-6 rounded-3xl bg-[#0e0e12] border border-white/[0.08] hover:border-red-500/40 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-[0_10px_30px_rgba(255,20,20,0.15)] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-red-600/15 text-red-500 border border-red-500/30">
              <Film className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-red-400 transition-colors flex items-center gap-1">
              Library →
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-white mb-1">{videos.length} Videos</div>
            <div className="text-xs text-slate-400">
              Uploaded files & Google Drive imports
            </div>
          </div>
        </div>

        {/* Playlists Tile */}
        <div
          onClick={() => onNavigate('playlist')}
          className="group p-6 rounded-3xl bg-[#0e0e12] border border-white/[0.08] hover:border-red-500/40 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-[0_10px_30px_rgba(255,20,20,0.15)] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-red-600/15 text-red-500 border border-red-500/30">
              <ListVideo className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-red-400 transition-colors flex items-center gap-1">
              Playlists →
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-white mb-1">{playlists.length} Playlists</div>
            <div className="text-xs text-slate-400">
              Multi-video seamless 24/7 loops
            </div>
          </div>
        </div>

        {/* Multi-Stream Center Tile */}
        <div
          onClick={() => onNavigate('stream')}
          className="group p-6 rounded-3xl bg-[#0e0e12] border border-white/[0.08] hover:border-red-500/40 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-[0_10px_30px_rgba(255,20,20,0.15)] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-red-600/15 text-red-500 border border-red-500/30">
              <Radio className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-red-400 transition-colors flex items-center gap-1">
              Live Center →
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-white mb-1">Multi-Stream Engine</div>
            <div className="text-xs text-slate-400">
              Real-time terminal logs & diagnostics
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RECENT BROADCASTS HISTORY */}
      {/* ========================================================= */}
      <div className="p-6 rounded-3xl bg-[#0e0e12] border border-white/[0.08]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-red-500" />
            <h3 className="text-base font-bold text-white">Recent Broadcast Sessions</h3>
          </div>
          <button
            onClick={() => onNavigate('stream')}
            className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
          >
            View all logs
          </button>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No previous broadcast sessions recorded yet. Start your first 24/7 stream above!
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {history.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${item.status === 'completed' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <div>
                    <div className="font-semibold text-white">{item.videoTitle}</div>
                    <div className="text-[10px] text-slate-400">{new Date(item.startTime).toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-slate-300">
                    {Math.floor(item.durationSeconds / 60)}m {item.durationSeconds % 60}s
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase">{item.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
