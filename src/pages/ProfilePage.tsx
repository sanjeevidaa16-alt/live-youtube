import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Sliders, Key, Server, CheckCircle, Radio, Shield, HardDrive, AlertTriangle } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const [defaultStreamKey, setDefaultStreamKey] = useState('');
  const [defaultRtmpUrl, setDefaultRtmpUrl] = useState('');
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [defaultQuality, setDefaultQuality] = useState('1080p');
  const [defaultFps, setDefaultFps] = useState(30);
  const [defaultBitrate, setDefaultBitrate] = useState('4000k');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings().then((res) => {
      if (res.settings) {
        setDefaultStreamKey(res.settings.defaultStreamKey || '');
        setDefaultRtmpUrl(res.settings.defaultRtmpUrl || 'rtmps://a.rtmps.youtube.com/live2');
        if (res.settings.autoReconnect !== undefined) setAutoReconnect(res.settings.autoReconnect);
        if (res.settings.defaultQuality) setDefaultQuality(res.settings.defaultQuality);
        if (res.settings.defaultFps) setDefaultFps(res.settings.defaultFps);
        if (res.settings.defaultBitrate) setDefaultBitrate(res.settings.defaultBitrate);
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
        autoReconnect,
        defaultQuality,
        defaultFps,
        defaultBitrate,
      });
      setMsg('System broadcast settings saved successfully.');
    } catch (e: any) {
      setMsg('Failed to save settings: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Sliders className="w-3.5 h-3.5 text-red-500" />
          Broadcast Configuration
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">RTMP & Streaming Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure your VPS streaming engine defaults, RTMP endpoints, stream keys, and video encoding parameters.
        </p>
      </div>

      {/* VPS Hardware Card */}
      <div className="p-6 rounded-3xl bg-[#0e0e12] border border-white/[0.08] shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">VPS Direct Streaming Engine</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-bold uppercase">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Processes run independently as native background services on your VPS host.
            </p>
          </div>
        </div>
      </div>

      {/* Stream Preferences */}
      <div className="p-8 rounded-3xl bg-[#0e0e12] border border-red-500/30 shadow-xl">
        <h3 className="text-base font-bold text-white mb-1">YouTube RTMP Ingest & Stream Defaults</h3>
        <p className="text-xs text-slate-400 mb-6">
          Pre-populate your default YouTube stream key and RTMP endpoint for rapid one-click launching.
        </p>

        {msg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{msg}</span>
          </div>
        )}

        <form onSubmit={handleSaveDefaults} className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Default RTMP Ingest URL
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-mono font-medium">
                Port 443 (SSL Secure RTMPS)
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
                YouTube Primary RTMPS (Recommended)
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
                YouTube Backup RTMPS
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Default Quality
              </label>
              <select
                value={defaultQuality}
                onChange={(e) => setDefaultQuality(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-black/60 border border-slate-700 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="1080p">1080p (Full HD)</option>
                <option value="720p">720p (HD)</option>
                <option value="480p">480p (SD)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Default Framerate (FPS)
              </label>
              <select
                value={defaultFps}
                onChange={(e) => setDefaultFps(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-black/60 border border-slate-700 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value={60}>60 FPS (Ultra Smooth)</option>
                <option value={30}>30 FPS (Standard)</option>
                <option value={24}>24 FPS (Cinematic)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Default Bitrate
              </label>
              <input
                type="text"
                value={defaultBitrate}
                onChange={(e) => setDefaultBitrate(e.target.value)}
                placeholder="4000k"
                className="w-full px-3.5 py-2.5 bg-black/60 border border-slate-700 focus:border-red-500 rounded-xl text-xs font-mono text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="autoReconnect"
              checked={autoReconnect}
              onChange={(e) => setAutoReconnect(e.target.checked)}
              className="w-4 h-4 rounded text-red-600 bg-black border-slate-700 focus:ring-red-500 cursor-pointer"
            />
            <label htmlFor="autoReconnect" className="text-xs font-medium text-slate-300 cursor-pointer">
              Enable automatic reconnection on transient network drops
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="py-2.5 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-md shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>

    </div>
  );
};
