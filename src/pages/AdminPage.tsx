import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { User, SystemStatus, StreamInstance, VideoItem } from '../types.js';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Server,
  Radio,
  HardDrive,
  Cpu,
  Trash2,
  Square,
  Play,
  RefreshCw,
  Terminal,
  Lock,
  Key,
  AlertTriangle,
  CheckCircle,
  Activity,
  Sliders,
  Tv,
  Loader2,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { user, isAdmin, adminLogin } = useAuth();
  
  // Admin Login State
  const [adminUser, setAdminUser] = useState('LIGHT GAMING 4M');
  const [adminPass, setAdminPass] = useState('admin123456');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Admin Dashboard Data
  const [users, setUsers] = useState<User[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [streams, setStreams] = useState<StreamInstance[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyStreamId, setBusyStreamId] = useState<string | null>(null);

  const fetchAdminData = async () => {
    if (!isAdmin) return;
    try {
      const [uRes, sRes, strRes, vRes] = await Promise.allSettled([
        api.getUsers(),
        api.getSystemStatus(),
        api.getStreams(),
        api.getVideos(),
      ]);

      if (uRes.status === 'fulfilled') setUsers(uRes.value.users || []);
      if (sRes.status === 'fulfilled') setSystemStatus(sRes.value.status);
      if (strRes.status === 'fulfilled') setStreams(strRes.value.streams || []);
      if (vRes.status === 'fulfilled') setVideos(vRes.value.videos || []);
    } catch (e) {
      console.error('Error loading admin data:', e);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
      const interval = setInterval(fetchAdminData, 3000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      await adminLogin(adminUser.trim(), adminPass.trim());
    } catch (err: any) {
      setLoginError(err.message || 'Admin authentication failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) return;
    try {
      await api.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setMsg(`User "${username}" deleted.`);
    } catch (e: any) {
      setErrorMsg('Failed to delete user.');
    }
  };

  const handleAdminStartStream = async (streamId: string) => {
    setBusyStreamId(streamId);
    setErrorMsg(null);
    try {
      await api.startStreamInstance(streamId);
      setMsg('Stream initiated on VPS.');
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
      setMsg('Stream stopped.');
      await fetchAdminData();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to stop stream.');
    } finally {
      setBusyStreamId(null);
    }
  };

  const handleAdminRestartStream = async (streamId: string) => {
    setBusyStreamId(streamId);
    setErrorMsg(null);
    try {
      await api.restartStreamInstance(streamId);
      setMsg('Stream restarted.');
      await fetchAdminData();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to restart stream.');
    } finally {
      setBusyStreamId(null);
    }
  };

  // If not authenticated as Admin, show Admin Gate
  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-[#0e0e12] border border-red-500/40 rounded-3xl p-8 shadow-[0_0_50px_rgba(255,20,20,0.25)] text-slate-100">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-500 flex items-center justify-center shadow-lg shadow-red-600/30">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white">Master Administrator Gate</h1>
            <p className="text-xs text-slate-400 mt-1">
              This panel is restricted to authorized identities (<strong>LIGHT GAMING 4M</strong>).
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Admin Username / Identity
              </label>
              <input
                type="text"
                required
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-black/60 border border-slate-700 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Admin Security Password
              </label>
              <input
                type="password"
                required
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-black/60 border border-slate-700 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/40 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loginLoading ? 'Verifying Admin Credentials...' : 'Authenticate as Admin'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const liveStreamsCount = streams.filter(
    (s) => s.status === 'LIVE' || s.status === 'STARTING' || s.status === 'RECONNECTING'
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-red-950/40 via-[#0e0e12] to-[#0a0a0c] border border-red-500/40 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/30 text-red-300 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-red-400" />
            <span>Authorized Administrator: LIGHT GAMING 4M</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Master VPS Supervisor & Admin
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global system management, multi-stream process supervisor, registered accounts, and VPS storage.
          </p>
        </div>

        <div className="px-4 py-2.5 rounded-2xl bg-black/60 border border-red-500/30 text-xs font-mono text-emerald-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>VPS SUPERVISOR ONLINE</span>
        </div>
      </div>

      {msg && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{msg}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-emerald-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-3xl bg-[#0e0e12] border border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Registered Users</span>
            <Users className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-white">{users.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Google & Local Accounts</div>
        </div>

        <div className="p-6 rounded-3xl bg-[#0e0e12] border border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Multi-Streams</span>
            <Radio className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {liveStreamsCount} / {streams.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {liveStreamsCount} active 24/7 RTMP pipelines
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-[#0e0e12] border border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Video Files</span>
            <HardDrive className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-white">{videos.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Stored on Cloud VPS</div>
        </div>

        <div className="p-6 rounded-3xl bg-[#0e0e12] border border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">FFmpeg Daemon</span>
            <Cpu className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">READY</div>
          <div className="text-[11px] text-slate-500 mt-1">H.264 & AAC Hardware/Software</div>
        </div>
      </div>

      {/* Global Multi-Stream Supervisor Table */}
      <div className="p-6 rounded-3xl bg-[#0e0e12] border border-red-500/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-white">All Multi-Stream Instances Across Platform</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {liveStreamsCount} streams broadcasting simultaneously
          </span>
        </div>

        {streams.length === 0 ? (
          <div className="text-xs text-slate-500 py-6 text-center">
            No stream configurations exist on the server.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400">
                  <th className="pb-3 font-semibold">Stream / Channel</th>
                  <th className="pb-3 font-semibold">Owner</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Media Source</th>
                  <th className="pb-3 font-semibold">Uptime</th>
                  <th className="pb-3 font-semibold text-right">Supervisor Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {streams.map((s) => {
                  const isLive = s.status === 'LIVE';
                  const isStarting = s.status === 'STARTING';
                  const isReconnecting = s.status === 'RECONNECTING';
                  const isBusy = busyStreamId === s.id;

                  return (
                    <tr key={s.id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5">
                        <div className="font-bold text-white">{s.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{s.rtmpUrl}</div>
                      </td>
                      <td className="py-3.5 text-slate-300">
                        {s.userName || 'System'}
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isLive
                              ? 'bg-red-600/30 text-red-400 border border-red-500/40'
                              : isStarting
                              ? 'bg-amber-500/20 text-amber-300'
                              : isReconnecting
                              ? 'bg-purple-600/20 text-purple-300'
                              : 'bg-white/5 text-slate-400'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-300 truncate max-w-[150px]">
                        {s.playlistName || s.videoTitle || 'No media'}
                      </td>
                      <td className="py-3.5 font-mono text-slate-400">
                        {s.uptimeFormatted || '00:00:00'}
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isLive || isStarting || isReconnecting ? (
                            <button
                              onClick={() => handleAdminStopStream(s.id)}
                              disabled={isBusy}
                              className="px-3 py-1.5 rounded-lg bg-red-950 text-red-300 hover:bg-red-900 text-xs font-bold border border-red-500/30 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Force Stop Stream"
                            >
                              <Square className="w-3 h-3 fill-current" />
                              <span>Stop</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAdminStartStream(s.id)}
                              disabled={isBusy}
                              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Start Stream"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Start</span>
                            </button>
                          )}

                          {isLive && (
                            <button
                              onClick={() => handleAdminRestartStream(s.id)}
                              disabled={isBusy}
                              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-slate-300 hover:text-white"
                              title="Restart Stream"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Registered Users Table */}
      <div className="p-6 rounded-3xl bg-[#0e0e12] border border-white/[0.08]">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-red-500" />
          <h2 className="text-base font-bold text-white">User Accounts Management</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400">
                <th className="pb-3 font-semibold">User</th>
                <th className="pb-3 font-semibold">Email</th>
                <th className="pb-3 font-semibold">Role</th>
                <th className="pb-3 font-semibold">Registered</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 flex items-center gap-3">
                    <img
                      src={u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.username)}`}
                      alt="Avatar"
                      className="w-7 h-7 rounded-full bg-slate-800 object-cover"
                    />
                    <span className="font-bold text-white">{u.name || u.username}</span>
                  </td>
                  <td className="py-3 text-slate-400">{u.email || 'N/A'}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      u.role === 'admin' ? 'bg-red-600/30 text-red-300' : 'bg-white/10 text-slate-300'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 text-right">
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        className="p-1.5 rounded-lg bg-red-950/40 text-red-400 hover:text-white transition-colors cursor-pointer"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
