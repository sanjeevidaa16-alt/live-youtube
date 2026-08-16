import React, { useState, useEffect } from 'react';
import {
  History,
  Trash2,
  Clock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Film,
  Calendar,
} from 'lucide-react';
import { StreamSessionHistory } from '../types.js';
import { api } from '../services/api.js';

export const StreamHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<StreamSessionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await api.getHistory();
      setHistory(res.history || []);
    } catch (e) {
      console.error('Fetch history error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleClear = async () => {
    if (!window.confirm('Clear all historical streaming records?')) return;
    try {
      await api.clearHistory();
      setHistory([]);
    } catch (err: any) {
      alert('Failed to clear history');
    }
  };

  const totalStreamSeconds = history.reduce((acc, h) => acc + (h.durationSeconds || 0), 0);
  const totalHours = (totalStreamSeconds / 3600).toFixed(1);

  const getStatusBadge = (status: StreamSessionHistory['status']) => {
    switch (status) {
      case 'SUCCESS':
      case 'STOPPED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
            {status}
          </span>
        );
      case 'CRASHED':
      case 'ERROR':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase tracking-wider">
            {status}
          </span>
        );
      case 'RECONNECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
            {status}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-800 text-zinc-400 uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#111622] border border-zinc-800">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Total Broadcast Sessions
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{history.length}</span>
            <span className="text-xs text-zinc-500">recorded</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111622] border border-zinc-800">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Cumulative Uptime Streamed
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{totalHours}</span>
            <span className="text-xs text-zinc-500">hours total</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#111622] border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Audit Logs
            </span>
            <p className="text-xs text-zinc-400 mt-1">Automatic session recording</p>
          </div>
          {history.length > 0 && (
            <button
              onClick={handleClear}
              className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="p-6 rounded-3xl bg-[#111622] border border-zinc-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-white">Livestream Session Logs</h3>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-zinc-500">Loading stream history...</div>
        ) : history.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <History className="w-10 h-10 text-zinc-600 mx-auto" />
            <h4 className="text-sm font-bold text-white">No historical stream sessions</h4>
            <p className="text-xs text-zinc-400">
              When you launch and complete 24/7 RTMP stream sessions, their telemetry records will be listed here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="pb-3 px-3">Video Asset</th>
                  <th className="pb-3 px-3">Started At</th>
                  <th className="pb-3 px-3">Ended At</th>
                  <th className="pb-3 px-3">Total Duration</th>
                  <th className="pb-3 px-3">Reconnects</th>
                  <th className="pb-3 px-3">Exit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {history.map((session) => (
                  <tr key={session.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <Film className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="font-bold text-white truncate max-w-xs" title={session.videoName}>
                          {session.videoName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-zinc-300 font-mono">
                      {new Date(session.startedAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-zinc-300 font-mono">
                      {new Date(session.stoppedAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-emerald-400">
                      {session.durationFormatted}
                    </td>
                    <td className="py-3.5 px-3 text-zinc-300">
                      {session.reconnectCount}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-1">
                        <div>{getStatusBadge(session.status)}</div>
                        {session.errorMessage && (
                          <span className="text-[10px] text-rose-400 font-mono truncate max-w-xs" title={session.errorMessage}>
                            {session.errorMessage}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
