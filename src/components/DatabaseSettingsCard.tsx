import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { DatabaseConfig, DatabaseTestResult, DatabaseDiagnostics } from '../types.js';
import {
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
  Table,
  Copy,
  Terminal,
  Activity,
  Layers,
} from 'lucide-react';

interface DatabaseSettingsCardProps {
  onSaved?: () => void;
}

export const DatabaseSettingsCard: React.FC<DatabaseSettingsCardProps> = ({ onSaved }) => {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [supabaseServiceRoleKey, setSupabaseServiceRoleKey] = useState('');
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [showServiceKey, setShowServiceKey] = useState(false);

  const [dbConfig, setDbConfig] = useState<DatabaseConfig | null>(null);
  const [diagnostics, setDiagnostics] = useState<DatabaseDiagnostics | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<DatabaseTestResult | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const coreSqlMigration = `-- Supabase Core Tables for CastLoop 24/7 RTMP Streaming Engine
-- Run this in Supabase Dashboard -> SQL Editor

CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    original_name TEXT,
    stored_name TEXT,
    file_path TEXT,
    thumbnail_url TEXT,
    size_bytes BIGINT DEFAULT 0,
    duration_seconds DOUBLE PRECISION DEFAULT 0,
    resolution TEXT DEFAULT '1080p',
    fps DOUBLE PRECISION DEFAULT 30,
    codec TEXT DEFAULT 'h264',
    bitrate TEXT DEFAULT '4000k',
    r2_object_key TEXT,
    r2_bucket TEXT,
    storage_provider TEXT DEFAULT 'cloudflare_r2',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlist_videos (
    id BIGSERIAL PRIMARY KEY,
    playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    position INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(playlist_id, video_id)
);

CREATE TABLE IF NOT EXISTS streams (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    rtmp_url TEXT NOT NULL,
    stream_key TEXT,
    video_id TEXT REFERENCES videos(id) ON DELETE SET NULL,
    playlist_id TEXT REFERENCES playlists(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'IDLE',
    loop BOOLEAN DEFAULT TRUE,
    quality TEXT DEFAULT '1080p',
    bitrate TEXT DEFAULT '4000k',
    fps INT DEFAULT 30,
    audio BOOLEAN DEFAULT TRUE,
    auto_reconnect BOOLEAN DEFAULT TRUE,
    ffmpeg_pid INT,
    started_at TIMESTAMPTZ,
    stopped_at TIMESTAMPTZ,
    last_error TEXT,
    reconnect_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stream_logs (
    id BIGSERIAL PRIMARY KEY,
    stream_id TEXT REFERENCES streams(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    level TEXT DEFAULT 'info',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_logs ENABLE ROW LEVEL SECURITY;

-- Allow Public/Anon read-write for application service queries
CREATE POLICY "Allow public read-write for videos" ON videos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for playlists" ON playlists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for playlist_videos" ON playlist_videos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for streams" ON streams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for stream_logs" ON stream_logs FOR ALL USING (true) WITH CHECK (true);
`;

  useEffect(() => {
    loadDatabaseConfig();
  }, []);

  const loadDatabaseConfig = async () => {
    try {
      const res = await api.getDatabaseConfig();
      if (res.config) {
        setDbConfig(res.config);
        setSupabaseUrl(res.config.supabaseUrl || '');
        setSupabaseAnonKey(res.config.supabaseAnonKey || '');
      }
      if (res.diagnostics) {
        setDiagnostics(res.diagnostics);
      }
    } catch (e: any) {
      console.warn('Notice loading database config:', e.message);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!supabaseUrl.trim()) {
      setErrorMsg('Supabase Project URL is required.');
      return;
    }
    if (!supabaseAnonKey.trim()) {
      setErrorMsg('Supabase Anon/Public Key is required.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      const payload: Partial<DatabaseConfig> = {
        supabaseUrl: supabaseUrl.trim(),
        supabaseAnonKey: supabaseAnonKey.trim(),
      };

      if (supabaseServiceRoleKey.trim() && !supabaseServiceRoleKey.includes('••••')) {
        payload.supabaseServiceRoleKey = supabaseServiceRoleKey.trim();
      }

      const res = await api.saveDatabaseConfig(payload);
      if (res.success) {
        setDbConfig(res.database);
        setSaveSuccessMsg('Supabase PostgreSQL database configuration saved successfully.');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
        if (onSaved) onSaved();
        // Run test after save
        handleTestConnection(payload);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save database configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (overrideData?: Partial<DatabaseConfig>) => {
    setTesting(true);
    setTestResult(null);
    setErrorMsg(null);

    try {
      const payload = overrideData || {
        supabaseUrl: supabaseUrl.trim(),
        supabaseAnonKey: supabaseAnonKey.trim(),
        supabaseServiceRoleKey: supabaseServiceRoleKey.trim() && !supabaseServiceRoleKey.includes('••••') ? supabaseServiceRoleKey.trim() : undefined,
      };

      const result = await api.testDatabaseConnection(payload);
      setTestResult(result);
      if (result.diagnostics) {
        setDiagnostics(result.diagnostics);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        connected: false,
        databaseProvider: 'supabase_postgres',
        error: err.message || 'Database test request failed.',
        testedAt: new Date().toISOString(),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(coreSqlMigration);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const isConfigured = dbConfig?.configured || (supabaseUrl && supabaseAnonKey);

  return (
    <div id="supabase-database-settings-card" className="p-6 sm:p-8 rounded-3xl bg-[#111622] border border-zinc-800 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Database className="w-4 h-4" />
            <span>Primary Relational Database</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Supabase PostgreSQL Database</span>
            {isConfigured ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" /> Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-3 h-3" /> Not Configured (Using Local Cache)
              </span>
            )}
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Supabase stores all application data, playlist order, stream statuses, and audit logs. Video binary files are stored separately in <strong>Cloudflare R2 Object Storage</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleTestConnection()}
            disabled={testing || (!supabaseUrl && !dbConfig?.supabaseUrl)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-xs font-semibold text-zinc-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{testing ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Connection Test Diagnostics Alert */}
      {testResult && (
        <div
          className={`p-4 rounded-2xl border ${
            testResult.connected
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
          } space-y-2`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold">
              {testResult.connected ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Database Connected Successfully</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Database Connection Failed</span>
                </>
              )}
            </div>
            {testResult.latencyMs !== undefined && (
              <span className="text-[11px] font-mono opacity-80">
                Latency: {testResult.latencyMs}ms
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-300">
            {testResult.message || testResult.error}
          </p>

          {/* Tables Checklist */}
          {testResult.tables && (
            <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
              {Object.entries(testResult.tables).map(([tableName, exists]) => (
                <div
                  key={tableName}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                    exists ? 'bg-emerald-900/30 text-emerald-300' : 'bg-rose-900/30 text-rose-300'
                  }`}
                >
                  {exists ? <Check className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-rose-400" />}
                  <span className="font-mono">{tableName}</span>
                </div>
              ))}
            </div>
          )}

          {!testResult.connected && (
            <div className="text-[11px] text-amber-300/90 pt-1 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                Note: When Supabase is unavailable, CastLoop safely falls back to local cache so streaming remains operational.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* Supabase Project URL */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-300">
            Supabase URL <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://xyzprojectid.supabase.co"
              className="w-full bg-[#0a0d14] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono transition"
            />
          </div>
          <p className="text-[11px] text-zinc-500">
            Found in your Supabase Project Settings &rarr; API &rarr; Project URL.
          </p>
        </div>

        {/* Supabase Anon Key */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-zinc-300">
            Supabase Anon/Public Key <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showAnonKey ? 'text' : 'password'}
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full bg-[#0a0d14] border border-zinc-800 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono transition"
            />
            <button
              type="button"
              onClick={() => setShowAnonKey(!showAnonKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
            >
              {showAnonKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">
            Client-safe public anon API key used for executing application database queries with Row Level Security.
          </p>
        </div>

        {/* Supabase Service Role Key (Backend Server Only) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Supabase Service Role Key (Optional / Backend Only)</span>
            </label>
            <span className="text-[10px] text-zinc-500 font-mono">Server Proxy Protected</span>
          </div>
          <div className="relative">
            <input
              type={showServiceKey ? 'text' : 'password'}
              value={supabaseServiceRoleKey}
              onChange={(e) => setSupabaseServiceRoleKey(e.target.value)}
              placeholder={dbConfig?.configured ? '••••••••••••••••••••••••' : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'}
              className="w-full bg-[#0a0d14] border border-zinc-800 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono transition"
            />
            <button
              type="button"
              onClick={() => setShowServiceKey(!showServiceKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
            >
              {showServiceKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">
            Never exposed in frontend code. Kept exclusively in server-side memory for schema migrations and administrative operations.
          </p>
        </div>
      </form>

      {/* Live Diagnostics Section */}
      {diagnostics && (
        <div className="rounded-2xl bg-[#0a0d14] border border-zinc-800 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-300 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Database Table Diagnostics</span>
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              Status: {diagnostics.connected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Videos Table</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono font-bold text-zinc-200">
                  {diagnostics.recordCounts?.videos !== undefined ? `${diagnostics.recordCounts.videos} rows` : '0 rows'}
                </span>
                {diagnostics.tables?.videos ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Playlists Table</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono font-bold text-zinc-200">
                  {diagnostics.recordCounts?.playlists !== undefined ? `${diagnostics.recordCounts.playlists} rows` : '0 rows'}
                </span>
                {diagnostics.tables?.playlists ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Streams Table</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono font-bold text-zinc-200">
                  {diagnostics.recordCounts?.streams !== undefined ? `${diagnostics.recordCounts.streams} rows` : '0 rows'}
                </span>
                {diagnostics.tables?.streams ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Stream Logs Table</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono font-bold text-zinc-200">
                  {diagnostics.recordCounts?.stream_logs !== undefined ? `${diagnostics.recordCounts.stream_logs} rows` : '0 rows'}
                </span>
                {diagnostics.tables?.stream_logs ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SQL Migration Script Accordion */}
      <div className="border border-zinc-800/80 rounded-2xl bg-[#0d111a] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSqlSchema(!showSqlSchema)}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white transition"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Database Setup Script (SQL Schema & RLS Policies)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span>{showSqlSchema ? 'Hide SQL' : 'View SQL Migration'}</span>
            {showSqlSchema ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {showSqlSchema && (
          <div className="p-4 border-t border-zinc-800/80 space-y-3 bg-[#080b11]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-zinc-400">
                Execute this script once in your <strong>Supabase Dashboard &rarr; SQL Editor</strong> to create tables and policies.
              </p>
              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-black/60 border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-60">
              {coreSqlMigration}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
