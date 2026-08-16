import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Trash2,
  Download,
  Search,
  Filter,
  ArrowDown,
  RefreshCw,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { FFmpegLogEntry } from '../types.js';
import { api, getStoredToken } from '../services/api.js';

export const StreamLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<FFmpegLogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<'all' | 'error' | 'warn' | 'info' | 'stats'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Initial load + SSE connection
  useEffect(() => {
    const loadInitialLogs = async () => {
      try {
        const res = await api.getLogs();
        setLogs(res.logs || []);
      } catch (e) {
        console.error('Error loading logs:', e);
      }
    };

    loadInitialLogs();

    const token = getStoredToken();
    if (!token) return;

    try {
      const sse = new EventSource(`/api/stream/logs/live?token=${encodeURIComponent(token)}`);
      eventSourceRef.current = sse;

      sse.onopen = () => {
        setIsConnected(true);
      };

      sse.onmessage = (event) => {
        try {
          const logEntry = JSON.parse(event.data) as FFmpegLogEntry;
          setLogs((prev) => {
            // Avoid duplicate log IDs
            if (prev.some((l) => l.id === logEntry.id)) return prev;
            const updated = [...prev, logEntry];
            return updated.slice(-500); // keep last 500 lines
          });
        } catch (e) {
          // ignore
        }
      };

      sse.onerror = () => {
        setIsConnected(false);
      };
    } catch (e) {
      console.warn('Logs SSE error:', e);
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleClearLogs = async () => {
    if (!window.confirm('Clear the current log buffer?')) return;
    try {
      await api.clearLogs();
      setLogs([]);
    } catch (err: any) {
      alert('Failed to clear logs');
    }
  };

  const handleDownloadLogs = () => {
    const textContent = logs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `castloop-ffmpeg-logs-${new Date().toISOString().slice(0, 19)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (searchQuery.trim()) {
      return log.message.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-16">
      {/* Top Bar Controls */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#111622] border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Connection Status & Summary */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-zinc-900 text-emerald-400 border border-zinc-800">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">FFmpeg Live Telemetry Console</h2>
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>{isConnected ? 'Real-Time SSE Connected' : 'Connecting Stream...'}</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Capturing stdout, stderr, and RTMP packet frame rates in real time
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto-scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
              autoScroll
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}</span>
          </button>

          {/* Download Logs */}
          <button
            onClick={handleDownloadLogs}
            disabled={logs.length === 0}
            title="Download logs"
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export TXT</span>
          </button>

          {/* Clear Logs */}
          <button
            onClick={handleClearLogs}
            disabled={logs.length === 0}
            title="Clear current log buffer"
            className="px-3 py-1.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Level Filters */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-full sm:w-auto">
          {(['all', 'info', 'warn', 'error'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase transition-colors ${
                filterLevel === lvl
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Search Filter */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter log keywords (e.g. fps, speed, error)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#111622] border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Terminal Display */}
      <div className="bg-black/95 rounded-2xl border border-zinc-800 p-4 font-mono text-xs text-zinc-300 min-h-[500px] max-h-[680px] overflow-y-auto custom-scrollbar flex flex-col justify-between shadow-2xl">
        <div className="space-y-1.5">
          {filteredLogs.length === 0 ? (
            <div className="text-zinc-600 text-center py-24 select-none">
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No log messages matching current filter.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const dateStr = new Date(log.timestamp).toLocaleTimeString();
              let textClass = 'text-zinc-300';
              let badgeClass = 'text-zinc-500';

              if (log.level === 'error') {
                textClass = 'text-rose-400 font-semibold';
                badgeClass = 'text-rose-500 font-bold';
              } else if (log.level === 'warn') {
                textClass = 'text-amber-300';
                badgeClass = 'text-amber-500 font-bold';
              }

              return (
                <div key={log.id} className="leading-relaxed break-all flex items-start gap-2 hover:bg-zinc-900/50 px-1 rounded transition-colors">
                  <span className="text-zinc-600 select-none text-[10px] shrink-0 font-mono pt-0.5">
                    [{dateStr}]
                  </span>
                  <span className={`select-none text-[10px] uppercase shrink-0 pt-0.5 ${badgeClass}`}>
                    [{log.level}]
                  </span>
                  <span className={`flex-1 font-mono text-[11px] ${textClass}`}>
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};
