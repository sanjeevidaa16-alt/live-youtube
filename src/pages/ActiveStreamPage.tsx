import React, { useState, useEffect } from 'react';
import {
  Radio,
  Clock,
  Repeat,
  RefreshCw,
  Square,
  Layers,
  Zap,
  Cpu,
  Film,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Terminal,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useStream } from '../context/StreamContext.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { NavTab } from '../components/Sidebar.js';

interface ActiveStreamPageProps {
  onNavigate: (tab: NavTab) => void;
}

export const ActiveStreamPage: React.FC<ActiveStreamPageProps> = ({ onNavigate }) => {
  const { status, stopStream, restartStream, isActionPending } = useStream();

  const isLive = status?.status === 'LIVE';
  const isStarting = status?.status === 'STARTING' || status?.status === 'RECONNECTING';
  const isRunning = isLive || isStarting;

  return (
    <div className="space-y-6 pb-16">
      {/* Active Broadcast Master Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#111622] border border-zinc-800 shadow-xl relative overflow-hidden">
        {/* Background ambient glow when live */}
        {isLive && (
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <StatusBadge status={status?.status || 'IDLE'} size="lg" />
              {status?.pid && (
                <span className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
                  Process PID: {status.pid}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {isRunning ? status?.videoTitle || 'Active 24/7 RTMP Broadcast' : 'Streaming Engine Standby'}
            </h2>

            <p className="text-xs text-zinc-400 max-w-xl">
              {isRunning
                ? 'Your video is actively looping in the background on the server and being transcoded directly to YouTube Live via RTMP.'
                : 'No active stream running. You can start a new loop stream anytime.'}
            </p>
          </div>

          {/* Action Control Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {isRunning ? (
              <>
                <button
                  id="active-page-restart-btn"
                  onClick={() => restartStream()}
                  disabled={isActionPending}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isActionPending ? 'animate-spin' : ''}`} />
                  <span>Restart Stream</span>
                </button>

                <button
                  id="active-page-stop-btn"
                  onClick={() => stopStream()}
                  disabled={isActionPending}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black tracking-wide flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>STOP STREAM</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => onNavigate('start-stream')}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
              >
                <span>Launch New Stream</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Live Uptime Big Display */}
        {isRunning && (
          <div className="mt-8 pt-6 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-zinc-400 text-xs flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Stream Uptime</span>
              </span>
              <span className="text-2xl sm:text-3xl font-mono font-black text-white">
                {status?.uptimeFormatted || '00:00:00'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-zinc-400 text-xs flex items-center gap-1.5 mb-1">
                <Repeat className="w-3.5 h-3.5 text-indigo-400" />
                <span>Current Loop</span>
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  #{status?.currentLoopCount || 1}
                </span>
                <span className="text-xs text-indigo-400 font-semibold">24×7 Continuous</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-zinc-400 text-xs flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Output Bitrate</span>
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white">
                {status?.encoderStats?.bitrate || status?.bitrate || '4000k'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
              <span className="text-zinc-400 text-xs flex items-center gap-1.5 mb-1">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                <span>Reconnections</span>
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white">
                {status?.reconnectCount || 0}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Telemetry & Stream Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stream Source & Target Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Specs */}
          <div className="p-6 rounded-2xl bg-[#111622] border border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Livestream Target Endpoint
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <span className="text-zinc-400">RTMP Ingest Server</span>
                <p className="font-mono text-zinc-200 font-semibold break-all">
                  {status?.rtmpUrl || 'rtmps://a.rtmps.youtube.com/live2'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <span className="text-zinc-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Stream Key (Masked)</span>
                </span>
                <p className="font-mono text-zinc-200 font-semibold">
                  {status?.maskedStreamKey || '••••••••'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href="https://studio.youtube.com/channel/live/livestreaming"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
              >
                <span>Open YouTube Live Control Room</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Real-time Encoder Gauge Specs */}
          <div className="p-6 rounded-2xl bg-[#111622] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Live FFmpeg Encoder Gauges
              </h3>
              <button
                onClick={() => onNavigate('logs')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>View Full Log Stream</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400 block text-[11px] mb-1">Encoded Frames</span>
                <span className="text-lg font-mono font-bold text-white">
                  {status?.encoderStats?.frame || 0}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400 block text-[11px] mb-1">Instant FPS</span>
                <span className="text-lg font-mono font-bold text-emerald-400">
                  {status?.encoderStats?.fps || 30} FPS
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400 block text-[11px] mb-1">Encoding Speed</span>
                <span className="text-lg font-mono font-bold text-indigo-400">
                  {status?.encoderStats?.speed || '1.00x'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400 block text-[11px] mb-1">Quantizer (q)</span>
                <span className="text-lg font-mono font-bold text-zinc-300">
                  {status?.encoderStats?.q || '24.0'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400 block text-[11px] mb-1">Payload Output</span>
                <span className="text-lg font-mono font-bold text-amber-400">
                  {status?.encoderStats?.size || '0kB'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400 block text-[11px] mb-1">Audio Transcode</span>
                <span className="text-lg font-bold text-emerald-400">
                  AAC 128k 44.1k
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Persistence Reminder & Quick Status */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#111622] border border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              24×7 Background Protection
            </h3>

            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-3 text-xs text-zinc-300">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <strong className="text-white">Independent Server Process</strong>
                  <p className="text-zinc-400 mt-0.5">
                    This stream is hosted completely on the backend. You can close your laptop or browser tab at any time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <strong className="text-white">Auto-Reconnect Shield</strong>
                  <p className="text-zinc-400 mt-0.5">
                    If YouTube RTMP drops the socket or network blips occur, FFmpeg will automatically reconnect.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <strong className="text-white">Infinite Seamless Looping</strong>
                  <p className="text-zinc-400 mt-0.5">
                    FFmpeg re-reads frame 0 immediately upon reaching the end without dropping RTMP stream sync.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
