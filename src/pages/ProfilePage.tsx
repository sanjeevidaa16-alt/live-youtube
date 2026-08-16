import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { User, ShieldCheck, Mail, Calendar, Key, HardDrive, LogOut, CheckCircle, AlertTriangle } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const [defaultStreamKey, setDefaultStreamKey] = useState('');
  const [defaultRtmpUrl, setDefaultRtmpUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings().then((res) => {
      if (res.settings) {
        setDefaultStreamKey(res.settings.defaultStreamKey || '');
        setDefaultRtmpUrl(res.settings.defaultRtmpUrl || 'rtmps://a.rtmps.youtube.com/live2');
      }
    }).catch(() => {});
  }, []);

  const handleSaveDefaults = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.updateSettings({
        defaultStreamKey: defaultStreamKey.trim(),
        defaultRtmpUrl: defaultRtmpUrl.trim(),
      });
      setMsg('Default stream preferences saved.');
    } catch (e: any) {
      setMsg('Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Google Broadcaster Profile</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your authenticated identity, preferences, and YouTube RTMP defaults.
        </p>
      </div>

      {/* Profile Card */}
      <div className="p-8 rounded-3xl bg-[#0e0e12] border border-red-500/30 shadow-xl flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <img
          src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`}
          alt="Avatar"
          className="w-24 h-24 rounded-3xl bg-red-950 border-2 border-red-500/50 object-cover shadow-xl shadow-red-600/20"
        />

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {user?.role === 'admin'
                ? 'Authorized System Admin'
                : user?.googleId
                ? 'Google Verified User'
                : 'Firebase Verified User'}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-white">{user?.name || user?.username}</h2>
          <p className="text-xs text-red-400 font-mono">@{user?.username}</p>
          
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              {user?.email || 'google.user@gmail.com'}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Joined: {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
            </span>
          </div>
        </div>

        <button
          onClick={async () => {
            await logout();
            window.location.hash = '';
          }}
          className="py-2.5 px-5 rounded-2xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Stream Preferences */}
      <div className="p-8 rounded-3xl bg-[#0e0e12] border border-white/[0.08] shadow-xl">
        <h3 className="text-base font-bold text-white mb-1">Default YouTube RTMP Credentials</h3>
        <p className="text-xs text-slate-400 mb-6">
          Pre-populate your YouTube stream key and RTMP endpoint for rapid one-click launching.
        </p>

        {msg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{msg}</span>
          </div>
        )}

        <form onSubmit={handleSaveDefaults} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Default RTMP Ingest URL
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-mono font-medium">
                Port 443 (SSL Secure)
              </span>
            </div>
            <input
              type="text"
              value={defaultRtmpUrl}
              onChange={(e) => setDefaultRtmpUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-black/60 border border-slate-700 focus:border-red-500 rounded-xl text-xs font-mono text-white focus:outline-none mb-2"
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setDefaultRtmpUrl('rtmps://a.rtmps.youtube.com/live2')}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  defaultRtmpUrl === 'rtmps://a.rtmps.youtube.com/live2'
                    ? 'bg-red-600/30 text-red-300 border-red-500/50'
                    : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white'
                }`}
              >
                YouTube RTMPS (Recommended)
              </button>
              <button
                type="button"
                onClick={() => setDefaultRtmpUrl('rtmps://b.rtmps.youtube.com/live2')}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  defaultRtmpUrl === 'rtmps://b.rtmps.youtube.com/live2'
                    ? 'bg-red-600/30 text-red-300 border-red-500/50'
                    : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white'
                }`}
              >
                YouTube Backup
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Default Stream Key
            </label>
            <input
              type="password"
              placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
              value={defaultStreamKey}
              onChange={(e) => setDefaultStreamKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-black/60 border border-slate-700 focus:border-red-500 rounded-xl text-xs font-mono text-white focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="py-2.5 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-md shadow-red-600/30 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Default Credentials'}
          </button>
        </form>
      </div>

    </div>
  );
};
