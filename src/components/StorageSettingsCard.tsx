import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { R2StorageConfig, StorageTestResult, R2StorageDiagnostics } from '../types.js';
import {
  Cloud,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Check,
  XCircle,
  ShieldCheck,
  Info,
  ExternalLink,
  Key,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  HardDrive,
  Layers,
} from 'lucide-react';

interface StorageSettingsCardProps {
  onSaved?: () => void;
}

export const StorageSettingsCard: React.FC<StorageSettingsCardProps> = ({ onSaved }) => {
  const [accountId, setAccountId] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [bucketName, setBucketName] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const [maxStorageGb, setMaxStorageGb] = useState(10);
  const [showSecretKey, setShowSecretKey] = useState(false);

  const [storageConfig, setStorageConfig] = useState<R2StorageConfig | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<StorageTestResult | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res.settings && res.settings.r2) {
        const r2 = res.settings.r2;
        setStorageConfig(r2);
        setAccountId(r2.accountId || '');
        setAccessKeyId(r2.accessKeyId || '');
        setBucketName(r2.bucketName || '');
        setPublicUrl(r2.publicUrl || '');
        setMaxStorageGb(r2.maxStorageGb || 10);
        // Note: secretAccessKey is masked by backend as ••••••••
      }
    } catch (e: any) {
      console.warn('Failed to load R2 storage configuration:', e.message);
    }
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!accountId.trim()) {
      setErrorMsg('Cloudflare R2 Account ID is required.');
      return;
    }
    if (!accessKeyId.trim()) {
      setErrorMsg('Cloudflare R2 Access Key ID is required.');
      return;
    }
    if (!bucketName.trim()) {
      setErrorMsg('Cloudflare R2 Bucket Name is required.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      const payload: Partial<R2StorageConfig> = {
        accountId: accountId.trim(),
        accessKeyId: accessKeyId.trim(),
        bucketName: bucketName.trim(),
        publicUrl: publicUrl.trim(),
        maxStorageGb: Number(maxStorageGb) || 10,
      };

      // Only send secret key if user typed a new one
      if (secretAccessKey.trim() && !secretAccessKey.includes('••••')) {
        payload.secretAccessKey = secretAccessKey.trim();
      }

      const res = await api.saveStorageSettings(payload);
      if (res.success) {
        setStorageConfig(res.r2);
        setSaveSuccessMsg('✓ Cloudflare R2 configuration saved successfully.');
        setSecretAccessKey('');
        if (onSaved) onSaved();
      }
    } catch (err: any) {
      setErrorMsg(`Failed to save configuration: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!accountId.trim() || !accessKeyId.trim() || !bucketName.trim()) {
      setErrorMsg('Please enter your Cloudflare R2 Account ID, Access Key ID, and Bucket Name first.');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setErrorMsg(null);
    setSaveSuccessMsg(null);
    setShowDiagnostics(true);

    try {
      const payload: Partial<R2StorageConfig> = {
        accountId: accountId.trim(),
        accessKeyId: accessKeyId.trim(),
        bucketName: bucketName.trim(),
        publicUrl: publicUrl.trim(),
        maxStorageGb: Number(maxStorageGb) || 10,
      };

      if (secretAccessKey.trim() && !secretAccessKey.includes('••••')) {
        payload.secretAccessKey = secretAccessKey.trim();
      }

      const res = await api.testStorageConnection(payload);
      setTestResult(res);

      if (res.success && res.connected) {
        setSaveSuccessMsg(res.message || '✓ Cloudflare R2 Connected');
      } else {
        setErrorMsg(res.error || 'Cloudflare R2 connection test failed.');
      }
      await loadSettings();
    } catch (err: any) {
      const failResult: StorageTestResult = {
        success: false,
        connected: false,
        storageProvider: 'cloudflare_r2',
        error: err.message || 'Connection test failed',
        testedAt: new Date().toISOString(),
      };
      setTestResult(failResult);
      setErrorMsg(`Connection failed: ${err.message || 'Network error'}`);
    } finally {
      setTesting(false);
    }
  };

  const isConnected = storageConfig?.lastTestStatus === 'connected' || (testResult && testResult.connected);
  const isError = storageConfig?.lastTestStatus === 'error' && !isConnected;

  // Format bytes helper
  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 MB';
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const usedBytes = storageConfig?.storageUsedBytes || testResult?.storageUsedBytes || 0;
  const maxBytes = (storageConfig?.maxStorageGb || 10) * 1024 * 1024 * 1024;
  const usedPercentage = Math.min(100, Math.round((usedBytes / maxBytes) * 100));

  const diagnostics: R2StorageDiagnostics | undefined =
    testResult?.diagnostics || storageConfig?.diagnostics;

  return (
    <div id="cloudflare-r2-storage-card" className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-wide">Cloudflare R2 Object Storage</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                S3-Compatible
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Permanent external video storage with zero egress fees & 10 GB free tier
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>✓ R2 CONNECTED</span>
            </div>
          ) : isError ? (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>CONNECTION ERROR</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>NOT CONFIGURED</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {saveSuccessMsg && (
        <div className="mt-4 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start space-x-3 text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{saveSuccessMsg}</div>
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-300 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMsg}</div>
        </div>
      )}

      {/* Storage Usage Bar */}
      {isConnected && (
        <div className="mt-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              Cloudflare R2 Bucket Storage Used
            </span>
            <span className="text-amber-400 font-mono font-medium">
              {formatBytes(usedBytes)} / {storageConfig?.maxStorageGb || 10} GB ({usedPercentage}%)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                usedPercentage > 85 ? 'bg-rose-500' : usedPercentage > 60 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(3, usedPercentage)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span>Objects in Bucket: <strong className="text-white">{storageConfig?.objectCount || testResult?.objectCount || 0} videos</strong></span>
            <span>Cloudflare Free Tier: <strong>10 GB/month included</strong></span>
          </div>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleSaveSettings} className="mt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Account ID */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Cloudflare Account ID <span className="text-rose-400">*</span>
            </label>
            <input
              id="r2-account-id-input"
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="e.g. e0a1b2c3d4e5f67890abcdef12345678"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Found in Cloudflare Dashboard → R2 Overview (right sidebar).
            </p>
          </div>

          {/* Bucket Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              R2 Bucket Name <span className="text-rose-400">*</span>
            </label>
            <input
              id="r2-bucket-name-input"
              type="text"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="e.g. castloop-stream-videos"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              The exact name of your Cloudflare R2 bucket.
            </p>
          </div>

          {/* Access Key ID */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              R2 Access Key ID <span className="text-rose-400">*</span>
            </label>
            <input
              id="r2-access-key-id-input"
              type="text"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              placeholder="e.g. 748b9c2d1e0f3a4b5c6d"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Generated under R2 → Manage R2 API Tokens (Object Read & Write).
            </p>
          </div>

          {/* Secret Access Key */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              R2 Secret Access Key <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                id="r2-secret-access-key-input"
                type={showSecretKey ? 'text' : 'password'}
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value)}
                placeholder={storageConfig?.secretAccessKey ? '•••••••••••••••••••••••• (Saved)' : 'Enter R2 Secret Access Key'}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Stored securely on backend. Never exposed to browser.
            </p>
          </div>

          {/* Optional Public URL / Custom Domain */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Public Domain / URL <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              id="r2-public-url-input"
              type="text"
              value={publicUrl}
              onChange={(e) => setPublicUrl(e.target.value)}
              placeholder="e.g. https://pub-xxxxxx.r2.dev or https://media.yourdomain.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Optional custom domain or r2.dev public access URL.
            </p>
          </div>

          {/* Max Storage Limit */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Max Storage Limit (GB)
            </label>
            <input
              id="r2-max-storage-input"
              type="number"
              min="1"
              max="5000"
              value={maxStorageGb}
              onChange={(e) => setMaxStorageGb(parseInt(e.target.value, 10) || 10)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Soft quota alert limit (Cloudflare R2 provides 10 GB free).
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
          <div className="text-xs text-slate-400">
            {storageConfig?.lastTestedAt && (
              <span>
                Last tested: <strong className="text-slate-300">{new Date(storageConfig.lastTestedAt).toLocaleString()}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              id="r2-test-connection-btn"
              type="button"
              onClick={handleTestConnection}
              disabled={testing || saving}
              className="px-4 py-2.5 rounded-lg border border-amber-500/40 hover:bg-amber-500/10 text-amber-300 text-sm font-semibold flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Verifying R2...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>TEST R2 CONNECTION</span>
                </>
              )}
            </button>

            <button
              id="r2-save-settings-btn"
              type="submit"
              disabled={saving || testing}
              className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-slate-950" />
                  <span>SAVE CONFIGURATION</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Diagnostics Accordion */}
      {(diagnostics || testResult) && (
        <div className="mt-6 border-t border-slate-800/80 pt-4">
          <button
            type="button"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="flex items-center justify-between w-full text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Cloudflare R2 Verification Diagnostics
            </span>
            {showDiagnostics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showDiagnostics && diagnostics && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-300">Credentials Format:</span>
                <span className={diagnostics.credentialsLoaded ? 'text-emerald-400 font-semibold flex items-center gap-1' : 'text-slate-500'}>
                  {diagnostics.credentialsLoaded ? <Check className="w-3.5 h-3.5" /> : '—'} Valid
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-300">Endpoint Reachable:</span>
                <span className={diagnostics.endpointReachable ? 'text-emerald-400 font-semibold flex items-center gap-1' : 'text-rose-400 font-semibold'}>
                  {diagnostics.endpointReachable ? <Check className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} {diagnostics.endpointReachable ? 'Verified' : 'Failed'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-300">Bucket Accessible:</span>
                <span className={diagnostics.bucketAccessible ? 'text-emerald-400 font-semibold flex items-center gap-1' : 'text-rose-400 font-semibold'}>
                  {diagnostics.bucketAccessible ? <Check className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />} {diagnostics.bucketAccessible ? 'Verified' : 'Failed'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-300">Write Permission:</span>
                <span className={diagnostics.writePermission ? 'text-emerald-400 font-semibold flex items-center gap-1' : 'text-slate-500'}>
                  {diagnostics.writePermission ? <Check className="w-3.5 h-3.5" /> : '—'} {diagnostics.writePermission ? 'Verified (PutObject)' : 'Untested'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-300">Read Permission:</span>
                <span className={diagnostics.readPermission ? 'text-emerald-400 font-semibold flex items-center gap-1' : 'text-slate-500'}>
                  {diagnostics.readPermission ? <Check className="w-3.5 h-3.5" /> : '—'} {diagnostics.readPermission ? 'Verified (HeadObject)' : 'Untested'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-300">Delete Permission:</span>
                <span className={diagnostics.deletePermission ? 'text-emerald-400 font-semibold flex items-center gap-1' : 'text-slate-500'}>
                  {diagnostics.deletePermission ? <Check className="w-3.5 h-3.5" /> : '—'} {diagnostics.deletePermission ? 'Verified (DeleteObject)' : 'Untested'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Callout */}
      <div className="mt-6 p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-start space-x-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-300">How Cloudflare R2 works with this 24/7 Live Streamer:</p>
          <p>
            When you upload videos, they stream through your server directly into your Cloudflare R2 bucket.
            The temporary server file is deleted immediately after upload to keep your VPS disk empty.
            During live broadcasts, the streaming engine streams video chunks directly from Cloudflare R2 to YouTube RTMP with zero egress fees.
          </p>
        </div>
      </div>
    </div>
  );
};
