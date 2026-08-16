import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface LoginPageProps {
  onNavigateToSignup?: () => void;
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateToSignup, onSuccess }) => {
  const { loginWithEmailPassword, loginWithGoogle, sendPasswordReset, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password modal/state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Email address is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginWithEmailPassword(cleanEmail, password);
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.hash = 'dashboard';
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      await loginWithGoogle();
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.hash = 'dashboard';
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage(null);
    const clean = resetEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setResetStatus('error');
      setResetMessage('Please enter a valid email address.');
      return;
    }

    setResetStatus('loading');
    try {
      await sendPasswordReset(clean);
      setResetStatus('success');
      setResetMessage('Password reset email sent. Please check your inbox.');
    } catch (err: any) {
      setResetStatus('error');
      setResetMessage(err.message || 'Failed to send password reset email.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-red-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-red-800/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-700 via-red-600 to-red-500 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(255,26,26,0.5)] text-white font-black text-2xl">
            <svg className="w-7 h-7 fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              YouTube <span className="text-red-500 drop-shadow-[0_0_12px_rgba(255,26,26,0.8)]">24/7</span> Live
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Cloud VPS RTMP Broadcaster & Video Loop Engine
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0e0e12]/95 backdrop-blur-2xl border border-red-500/25 shadow-[0_0_50px_rgba(255,20,20,0.2)] space-y-6">
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold tracking-tight text-white">WELCOME BACK</h2>
            <p className="text-xs text-slate-400 mt-1">
              Sign in to manage your 24/7 YouTube live streams & video loops
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 text-xs text-red-300 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span className="leading-relaxed font-medium">{error}</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-red-900/60 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToSignup) onNavigateToSignup();
                    else window.location.hash = 'signup';
                  }}
                  className="px-2.5 py-1 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-200 font-semibold transition-colors cursor-pointer"
                >
                  Create New Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin');
                    setPassword('Admin@123456');
                    setError(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-slate-300 font-medium transition-colors cursor-pointer"
                >
                  Fill Admin Credentials
                </button>
              </div>
            </div>
          )}

          {/* Quick Demo Access Chips */}
          <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
              <span className="flex items-center gap-1.5 text-red-400">
                <Sparkles className="w-3.5 h-3.5" />
                Quick Test Credentials
              </span>
              <span className="text-[10px] text-slate-500 font-normal">Click to autofill</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin');
                  setPassword('Admin@123456');
                  setError(null);
                }}
                className="py-1.5 px-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-red-500/50 text-left transition-all cursor-pointer group"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-red-400 flex items-center justify-between">
                  <span>Admin</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-normal">Root</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">admin / Admin@123456</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('demo');
                  setPassword('Demo@123456');
                  setError(null);
                }}
                className="py-1.5 px-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-red-500/50 text-left transition-all cursor-pointer group"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-red-400 flex items-center justify-between">
                  <span>Demo Streamer</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">User</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">demo / Demo@123456</div>
              </button>
            </div>
          </div>

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-300 flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address or Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com or username"
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 focus:border-red-500 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setResetEmail(email);
                    setResetMessage(null);
                    setResetStatus('idle');
                  }}
                  className="text-[11px] text-red-400 hover:text-red-300 font-medium transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 focus:border-red-500 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_25px_rgba(255,26,26,0.45)] hover:shadow-[0_0_35px_rgba(255,30,30,0.7)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'LOGIN'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-zinc-800 w-full" />
            <span className="bg-[#0e0e12] px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              OR
            </span>
            <div className="border-t border-zinc-800 w-full" />
          </div>

          {/* Continue with Google */}
          <button
            id="btn-login-google"
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Switch to Sign Up */}
          <div className="text-center text-xs text-slate-400 space-y-2">
            <div>
              <span>Don't have an account? </span>
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToSignup) {
                    onNavigateToSignup();
                  } else {
                    window.location.hash = 'signup';
                  }
                }}
                className="text-red-400 hover:text-red-300 font-bold underline underline-offset-4 transition-colors cursor-pointer"
              >
                Sign Up Now
              </button>
            </div>
            <div className="pt-2 border-t border-zinc-900 flex flex-col items-center justify-center gap-1 text-[11px] text-zinc-500">
              <span>Admin default login: <span className="text-zinc-400 font-mono">admin</span> / <span className="text-zinc-400 font-mono">Admin@123456</span></span>
            </div>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="text-center flex items-center justify-center gap-2 text-slate-500 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Firebase Authentication • Cloud VPS RTMP Broadcasts</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#0e0e12] border border-red-500/30 rounded-2xl p-6 sm:p-7 shadow-[0_0_50px_rgba(255,20,20,0.3)] text-slate-100 space-y-5">
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Reset Password</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your account email to receive a password reset link from Firebase.
              </p>
            </div>

            {resetMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  resetStatus === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                    : 'bg-red-950/80 border border-red-500/50 text-red-300'
                }`}
              >
                {resetStatus === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                )}
                <span>{resetMessage}</span>
              </div>
            )}

            <form onSubmit={handleSendResetEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-red-500 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetStatus === 'loading'}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition-all disabled:opacity-50"
                >
                  {resetStatus === 'loading' ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
