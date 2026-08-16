import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { SystemStatus, StreamInstance, VideoItem } from '../types.js';
import {
  ShieldCheck,
  Server,
  Radio,
  HardDrive,
  Cpu,
  Trash2,
  Square,
  Play,
  RefreshCw,
  Terminal,
  AlertTriangle,
  CheckCircle,
  Activity,
  Sliders,
  Tv,
  Loader2,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [streams, setStreams] = useState<StreamInstance[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyStreamId, setBusyStreamId] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      const [sRes, strRes, vRes] = await Promise.allSettled([
        api.getSystemStatus(),
        api.getStreams(),
        api.getVideos(),
      ]);

      if (sRes.status === 'fulfilled') setSystemStatus(sRes.value.status);
      if (strRes.status === 'fulfilled') setStreams(strRes.value.streams || []);
      if (vRes.status === 'fulfilled') setVideos(vRes.value.videos || []);
    } catch (e) {
      console.error('Error loading admin data:', e);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAdminStartStream = async (streamId: string) => {
    setBusyStreamId(streamId);
    setErrorMsg(null);
    try {
      await api.startStreamInstance(streamId);
      setMsg('Stream instance started.');
      await fetchAdminData();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to start stream.');
    } finally {
      setBusyStreamId(null);
    }
  };

  const handleAdminStopStream = async (streamId: string) => {
    setBusyStreamId(streamId);
    setErrorMsg(null);
    try {
      await api.stopStreamInstance(streamId);
      setMsg('Stream instance stopped.');
      await fetchAdminData();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to stop stream.');
    } finally {
      setBusyStreamId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/15 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
            VPS Host Operator Console
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">System & Engine Administration</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time VPS telemetry, hardware performance metrics, FFmpeg processes, and storage overview.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-red-400" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {msg && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{msg}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-emerald-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Real-time System Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* CPU */}
        <div className="p-6 rounded-3xl bg-[#0e0e12] border border-white/[0.08] shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-red-500" /> CPU Load
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {systemStatus?.cpuUsage?.toFixed(1) || '0.0'}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300 shadow-[0_0_8px_#ff2222]"
              style={{ width: `${Math.min(100, systemStatus?.cpuUsage || 0)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-500 font-mono flex justify-between">
            <span>Cores: {systemStatus?.cpuCount || 4}</span>
            <span>Arch: {systemStatus?.platform || 'Linux x64'}</span>
          </div>
        </div>

        {/* RAM */}
        <div className="p-6 rounded-3xl bg-[#0e0e12] border border-white/[0.08] shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" /> Memory (RAM)
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {systemStatus?.memoryUsagePercent?.toFixed(1) || '0.0'}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300 shadow-[0_0_8px_#3b82f6]"
              style={{ width: `${Math.min(100, systemStatus?.memoryUsagePercent || 0)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-500 font-mono flex justify-between">
            <span>Used: {(systemStatus?.memoryUsageMb || 0) > 1024 ? `${((systemStatus?.memoryUsageMb || 0) / 1024).toFixed(1)} GB` : `${systemStatus?.memoryUsageMb || 0} MB`}</span>
            <span>Total: {((systemStatus?.totalMemoryMb || 0) / 1024).toFixed(1)} GB</span>
          </div>
        </div>

        {/* VPS Video Storage */}
        <div className="p-6 rounded-3xl bg-[#0e0e12] border border-white/[0.08] shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-500" /> VPS Storage
            </span>
            <span className="text-xs font-mono font-bold text-purple-400">
              {videos.length} Files
            </span>
          </div>
          <div className="text-lg font-bold text-white">
            {systemStatus?.storageUsedFormatted || '0 MB'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Direct local storage at <code className="text-slate-400 font-bold">/storage/videos</code>
          </div>
        </div>

        {/* FFmpeg Engine */}
        <div className="p-6 rounded-3xl bg-[#0e0e12] border border-white/[0.08] shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-500" /> FFmpeg Engine
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${systemStatus?.ffmpegAvailable ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-red-950 text-red-400 border border-red-500/40'}`}>
              {systemStatus?.ffmpegAvailable ? 'INSTALLED' : 'NATIVE'}
            </span>
          </div>
          <div className="text-xs text-slate-300 font-mono">
            {systemStatus?.ffmpegVersion || 'FFmpeg Native Hardware Acceleration'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Auto-reconnect & loop enabled
          </div>
        </div>

      </div>

      {/* Active Broadcast Processes */}
      <div className="p-8 rounded-3xl bg-[#0e0e12] border border-white/[0.08] shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500" />
            Background Broadcast Instances ({streams.length})
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Active: <strong className="text-red-400">{streams.filter((s) => s.status === 'LIVE' || s.status === 'STARTING').length}</strong>
          </span>
        </div>

        {streams.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">No stream instances created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Channel Name</th>
                  <th className="pb-3 px-3">Media Source</th>
                  <th className="pb-3 px-3">Bitrate / FPS</th>
                  <th className="pb-3 px-3">Uptime</th>
                  <th className="pb-3 px-3 text-right">Process Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {streams.map((stream) => {
                  const isLive = stream.status === 'LIVE';
                  const isBusy = busyStreamId === stream.id;

                  return (
                    <tr key={stream.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isLive
                            ? 'bg-red-600 text-white shadow-[0_0_8px_rgba(255,26,26,0.6)]'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {stream.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-white truncate max-w-[160px]">
                        {stream.name}
                      </td>
                      <td className="py-3.5 px-3 text-slate-400 truncate max-w-[160px]">
                        {stream.playlistName || stream.videoTitle || 'None'}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-400">
                        {stream.bitrate || '4000k'} • {stream.fps || 30}fps
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-400">
                        {stream.uptimeFormatted || '00:00:00'}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {isLive ? (
                          <button
                            onClick={() => handleAdminStopStream(stream.id)}
                            disabled={isBusy}
                            className="px-3 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                          >
                            {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3 fill-current" />}
                            <span>Stop</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAdminStartStream(stream.id)}
                            disabled={isBusy}
                            className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                          >
                            {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                            <span>Start</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
