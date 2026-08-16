import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  HardDrive,
  Repeat,
} from 'lucide-react';
import { SystemSettings, StreamQuality, StreamBitrate, StreamFps } from '../types.js';
import { api } from '../services/api.js';
import { DatabaseSettingsCard } from '../components/DatabaseSettingsCard.js';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.getSettings();
        setSettings(res.settings);
      } catch (e) {
        console.error('Fetch settings error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const res = await api.updateSettings(settings);
      setSettings(res.settings);
      setSaveSuccess('Streaming parameters and server settings updated successfully.');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setPasswordSuccess('Admin password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading || !settings) {
    return <div className="p-12 text-center text-xs text-zinc-500">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="p-6 sm:p-8 rounded-3xl bg-[#111622] border border-zinc-800 shadow-xl space-y-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" />
            <span>Server Configuration</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Stream Defaults & Automation</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Set global defaults for new stream sessions and crash recovery behavior.
          </p>
        </div>

        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {saveError && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{saveError}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Default RTMP URL */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Default RTMP Server Ingestion URL
            </label>
            <input
              type="text"
              value={settings.defaultRtmpUrl}
              onChange={(e) => setSettings({ ...settings, defaultRtmpUrl: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Default Quality */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Default Quality</label>
              <select
                value={settings.defaultQuality}
                onChange={(e) => setSettings({ ...settings, defaultQuality: e.target.value as StreamQuality })}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="1080p">1080p (Full HD)</option>
                <option value="720p">720p (HD)</option>
                <option value="source">Source Quality</option>
              </select>
            </div>

            {/* Default Bitrate */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Default Bitrate</label>
              <select
                value={settings.defaultBitrate}
                onChange={(e) => setSettings({ ...settings, defaultBitrate: e.target.value as StreamBitrate })}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="2500k">2500 kbps</option>
                <option value="4000k">4000 kbps</option>
                <option value="6000k">6000 kbps</option>
                <option value="auto">Auto</option>
              </select>
            </div>

            {/* Default FPS */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Default Frame Rate</label>
              <select
                value={String(settings.defaultFps)}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultFps: e.target.value === 'source' ? 'source' : parseInt(e.target.value, 10) as StreamFps,
                  })
                }
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="30">30 FPS</option>
                <option value="60">60 FPS</option>
                <option value="source">Source FPS</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Reconnect Delay */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Auto-Reconnect Delay (Seconds)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.reconnectDelay}
                onChange={(e) =>
                  setSettings({ ...settings, reconnectDelay: parseInt(e.target.value, 10) || 5 })
                }
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Max Upload Size */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  Max Video Upload Size (MB)
                </label>
                <span className="text-[11px] font-mono text-indigo-400">
                  {((settings.maxUploadSizeMb || 25600) / 1024).toFixed(1)} GB
                </span>
              </div>
              <input
                type="number"
                min="100"
                max="51200"
                step="512"
                value={settings.maxUploadSizeMb}
                onChange={(e) =>
                  setSettings({ ...settings, maxUploadSizeMb: Math.min(51200, Math.max(100, parseInt(e.target.value, 10) || 1024)) })
                }
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="flex gap-1.5 mt-1.5">
                {[5120, 10240, 25600, 51200].map((mb) => (
                  <button
                    key={mb}
                    type="button"
                    onClick={() => setSettings({ ...settings, maxUploadSizeMb: mb })}
                    className={`text-[10px] px-2 py-0.5 rounded-md border font-mono transition-colors ${
                      settings.maxUploadSizeMb === mb
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                        : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {mb / 1024}GB
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Auto Restart on Server Reboot Toggle */}
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-between mt-2">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Repeat className="w-4 h-4 text-emerald-400" />
                <span>Auto-Restore Active Stream on Server Reboot</span>
              </span>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                If the VPS/container reboots while a 24/7 stream was active, automatically resume FFmpeg upon boot.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSettings({
                  ...settings,
                  autoRestartOnServerBoot: !settings.autoRestartOnServerBoot,
                })
              }
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                settings.autoRestartOnServerBoot ? 'bg-emerald-600' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.autoRestartOnServerBoot ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {/* Supabase Primary Database Configuration */}
      <DatabaseSettingsCard onSaved={() => setSaveSuccess('Supabase PostgreSQL database configuration updated.')} />

      {/* Security & Password Form */}
      <form onSubmit={handleChangePassword} className="p-6 sm:p-8 rounded-3xl bg-[#111622] border border-zinc-800 shadow-xl space-y-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Key className="w-4 h-4" />
            <span>Admin Authentication</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Change Admin Password</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Update your dashboard access password.
          </p>
        </div>

        {passwordSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{passwordError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isChangingPassword || !currentPassword || !newPassword}
            className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Shield className="w-4 h-4" />
            <span>{isChangingPassword ? 'Updating...' : 'Update Password'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
