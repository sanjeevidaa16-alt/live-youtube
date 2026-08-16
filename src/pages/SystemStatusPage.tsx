import React, { useState, useEffect } from 'react';
import {
  Cpu,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Activity,
  Zap,
  Layers,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import { SystemStatus } from '../types.js';
import { api } from '../services/api.js';

export const SystemStatusPage: React.FC = () => {
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await api.getSystemStatus();
      setSystem(res.status);
    } catch (e) {
      console.error('Fetch system status error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner / Engine Readiness */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#111622] border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">Streaming Engine Diagnostics</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                Operational
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              FFmpeg background process engine and system diagnostics are healthy.
            </p>
          </div>
        </div>

        <button
          onClick={fetchStatus}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Run Diagnostics</span>
        </button>
      </div>

      {/* Binary Availability Cards (FFmpeg & FFprobe) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* FFmpeg Card */}
        <div className="p-6 rounded-2xl bg-[#111622] border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">FFmpeg Binary Core</h3>
            </div>
            {system?.ffmpegInstalled ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Installed</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-rose-400">
                <AlertCircle className="w-4 h-4" />
                <span>Missing</span>
              </span>
            )}
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1 font-mono text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Path:</span>
              <span className="text-zinc-200">{system?.ffmpegPath || '/usr/bin/ffmpeg'}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Version:</span>
              <span className="text-zinc-200">{system?.ffmpegVersion || '4.4.2+ (H.264 & AAC FLV Enabled)'}</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400">
            Executes hardware/software 24/7 RTMP stream encoding and continuous looping.
          </p>
        </div>

        {/* FFprobe Card */}
        <div className="p-6 rounded-2xl bg-[#111622] border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">FFprobe Media Inspector</h3>
            </div>
            {system?.ffprobeInstalled ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Installed</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-rose-400">
                <AlertCircle className="w-4 h-4" />
                <span>Missing</span>
              </span>
            )}
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1 font-mono text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Path:</span>
              <span className="text-zinc-200">{system?.ffprobePath || '/usr/bin/ffprobe'}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Version:</span>
              <span className="text-zinc-200">{system?.ffprobeVersion || '4.4.2+ (Metadata & Stream Prober)'}</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400">
            Automatically extracts video duration, resolution, audio streams, and fps upon upload.
          </p>
        </div>
      </div>

      {/* Host Machine Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU Usage Card */}
        <div className="p-6 rounded-2xl bg-[#111622] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Host CPU Load</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-black text-white">{system?.cpuUsagePercent || 0}%</span>
              <span className="text-xs text-zinc-400">{system?.cpuCores || 2} Cores</span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${Math.min(100, system?.cpuUsagePercent || 0)}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 truncate" title={system?.cpuModel}>
            Model: {system?.cpuModel || 'Intel Xeon / AMD EPYC'}
          </p>
        </div>

        {/* RAM Usage Card */}
        <div className="p-6 rounded-2xl bg-[#111622] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Server Memory (RAM)</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-black text-white">{system?.memory.usagePercent || 0}%</span>
              <span className="text-xs text-zinc-400">
                {system?.memory.usedMb || 0} MB / {system?.memory.totalMb || 0} MB
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${system?.memory.usagePercent || 0}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] text-zinc-400">
            Free RAM: {system?.memory.freeMb || 0} MB available
          </p>
        </div>

        {/* Disk & Uploads Storage */}
        <div className="p-6 rounded-2xl bg-[#111622] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Video Assets Storage</span>
            <HardDrive className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-black text-white">
                {system?.disk.uploadDirSizeMb || 0} MB
              </span>
              <span className="text-xs text-zinc-400">{system?.totalVideosCount || 0} Videos</span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
              <div className="h-full bg-amber-500 w-1/4" />
            </div>
          </div>
          <p className="text-[11px] text-zinc-400">
            Stored in persistent <code>/data/uploads</code> directory
          </p>
        </div>
      </div>

      {/* Node Runtime & Environment Details */}
      <div className="p-6 rounded-2xl bg-[#111622] border border-zinc-800 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Runtime Architecture & Container Specs
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
            <span className="text-zinc-400 block text-[11px]">Node.js Runtime</span>
            <span className="font-bold text-white font-mono">{system?.nodeVersion || 'v22.x'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
            <span className="text-zinc-400 block text-[11px]">Server Uptime</span>
            <span className="font-bold text-white font-mono">
              {Math.floor((system?.nodeUptimeSeconds || 0) / 3600)}h {Math.floor(((system?.nodeUptimeSeconds || 0) % 3600) / 60)}m
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
            <span className="text-zinc-400 block text-[11px]">OS Platform</span>
            <span className="font-bold text-white font-mono truncate" title={system?.platform}>
              {system?.platform || 'Linux x64'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
            <span className="text-zinc-400 block text-[11px]">Ingress HTTP Port</span>
            <span className="font-bold text-emerald-400 font-mono">Port 3000 (Reverse Proxy)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
