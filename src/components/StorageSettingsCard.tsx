import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { StorageTestResult } from '../types.js';
import { HardDrive, CheckCircle2, XCircle, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';

export const StorageSettingsCard: React.FC = () => {
  const [health, setHealth] = useState<{
    supabaseConfigured: boolean;
    storageConfigured: boolean;
    bucketConfigured: boolean;
    bucket: string;
    environment: string;
  } | null>(null);

  const [loadingHealth, setLoadingHealth] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<StorageTestResult | null>(null);

  const fetchHealth = async () => {
    try {
      setLoadingHealth(true);
      const res = await api.getStorageHealth();
      setHealth(res);
    } catch (err) {
      console.error('Failed to fetch storage health:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleTestStorage = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.testStorageConnection();
      setTestResult(result);
      await fetchHealth();
    } catch (err: any) {
      setTestResult({
        success: false,
        connected: false,
        bucketFound: false,
        writeTestPassed: false,
        readTestPassed: false,
        deleteTestPassed: false,
        message: `Storage test failed: ${err.message || 'Unknown network error'}`,
        error: err.message,
        testedAt: new Date().toISOString(),
      });
    } finally {
      setTesting(false);
    }
  };

  const isConnected = health?.storageConfigured && health?.bucketConfigured;

  return (
    <div className="p-6 rounded-3xl bg-[#0e0e12] border border-white/[0.08] shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-red-600/15 border border-red-500/30 text-red-400">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Supabase Storage</h2>
            <p className="text-xs text-slate-400">Dedicated cloud object storage for video uploads & media files</p>
          </div>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loadingHealth}
          className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300 transition-all cursor-pointer"
          title="Refresh storage status"
        >
          <RefreshCw className={`w-4 h-4 ${loadingHealth ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Storage Bucket</span>
          <div className="text-sm font-mono font-bold text-white flex items-center gap-2">
            <span>videos</span>
            <span className="px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-[10px]">
              Production
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span>
          <div className="flex items-center gap-2">
            {loadingHealth ? (
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking...
              </span>
            ) : isConnected ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                ● Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                ● Not Connected / Missing Bucket
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Test Storage Action & Results */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            Performs a real test upload, verification, and deletion of <code className="text-red-400 font-mono">.system/storage-connection-test.txt</code>.
          </div>
          <button
            onClick={handleTestStorage}
            disabled={testing}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Testing Storage...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>[ TEST STORAGE ]</span>
              </>
            )}
          </button>
        </div>

        {testResult && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-3 animate-fadeIn ${
              testResult.success
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/40 border-red-500/50 text-red-300'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span className={testResult.success ? 'text-emerald-400' : 'text-red-400'}>
                  {testResult.success ? '✓ SUPABASE STORAGE CONNECTED' : 'Storage Connection Test Failed'}
                </span>
              </div>
              <span className="text-[10px] opacity-70 font-mono">
                {new Date(testResult.testedAt).toLocaleTimeString()}
              </span>
            </div>

            <p className="text-slate-300 leading-relaxed font-mono text-[11px] bg-black/30 p-2.5 rounded-xl border border-white/5">
              {testResult.message}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[10px]">
              <div className={`p-2 rounded-lg border ${testResult.bucketFound ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-red-900/20 border-red-500/30 text-red-400'}`}>
                {testResult.bucketFound ? '✓' : '✗'} Bucket Found
              </div>
              <div className={`p-2 rounded-lg border ${testResult.writeTestPassed ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-red-900/20 border-red-500/30 text-red-400'}`}>
                {testResult.writeTestPassed ? '✓' : '✗'} Write Test
              </div>
              <div className={`p-2 rounded-lg border ${testResult.readTestPassed ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-red-900/20 border-red-500/30 text-red-400'}`}>
                {testResult.readTestPassed ? '✓' : '✗'} Read Test
              </div>
              <div className={`p-2 rounded-lg border ${testResult.deleteTestPassed ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-red-900/20 border-red-500/30 text-red-400'}`}>
                {testResult.deleteTestPassed ? '✓' : '✗'} Delete Test
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
