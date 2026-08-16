import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  X,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface GoogleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  targetFeature?: string;
}

export const GoogleLoginModal: React.FC<GoogleLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetFeature,
}) => {
  const {
    loginWithEmailPassword,
    signupWithEmailPassword,
    loginWithGoogle,
    sendPasswordReset,
    isLoading,
  } = useAuth();

  // Mode: 'login' | 'signup' | 'forgot_password'
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot_password'>('login');

  // Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const resetFormState = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const handleSwitchMode = (mode: 'login' | 'signup' | 'forgot_password') => {
    resetFormState();
    setAuthMode(mode);
  };

  // Google Login Handler
  const handleGoogleLogin = async (fallbackProfile?: { email: string; name?: string; avatar?: string }) => {
    setError(null);
    try {
      await loginWithGoogle(fallbackProfile);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    }
  };

  // Manual Email/Password Login Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginWithEmailPassword(cleanEmail, password);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual Signup Handler
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername) {
      setError('Username is required.');
      return;
    }
    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      setError('Username can only contain letters, numbers, underscores, and hyphens.');
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signupWithEmailPassword({
        username: cleanUsername,
        email: cleanEmail,
        password,
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forgot Password Handler
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await sendPasswordReset(cleanEmail);
      setSuccessMessage('Password reset email sent. Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      {/* Background Ambient Red Halo */}
      <div className="absolute w-[500px] h-[500px] bg-red-600/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-glow" />

      <div className="relative w-full max-w-md bg-[#0e0e12]/95 border border-red-500/30 rounded-2xl p-5 sm:p-7 shadow-[0_0_50px_rgba(255,20,20,0.25)] text-slate-100 overflow-hidden my-auto">
        {/* Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600 shadow-[0_0_12px_#ff1a1a]" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/30 mb-2.5 shadow-[0_0_20px_rgba(255,26,26,0.3)]">
            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/40">
              <svg className="w-3.5 h-3.5 text-white fill-current ml-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            {authMode === 'login' && 'WELCOME BACK'}
            {authMode === 'signup' && 'CREATE ACCOUNT'}
            {authMode === 'forgot_password' && 'RESET PASSWORD'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {targetFeature
              ? `Sign in to access ${targetFeature}`
              : 'Sign in to access 24/7 live streams & VPS broadcaster'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/70 border border-red-500/50 rounded-xl text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {authMode === 'login' && (
          <div className="space-y-4">
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="modal-login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-zinc-700/80 focus:border-red-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('forgot_password')}
                    className="text-[11px] text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="modal-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 bg-black/60 border border-zinc-700/80 focus:border-red-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
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

              <button
                id="modal-btn-login-submit"
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(255,26,26,0.4)] hover:shadow-[0_0_30px_rgba(255,30,30,0.7)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Authenticating...' : 'LOGIN'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* OR Divider */}
            <div className="relative flex items-center justify-center py-0.5">
              <div className="border-t border-zinc-800 w-full" />
              <span className="bg-[#0e0e12] px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                OR
              </span>
              <div className="border-t border-zinc-800 w-full" />
            </div>

            {/* Continue with Google */}
            <button
              id="modal-btn-login-google"
              type="button"
              onClick={() => handleGoogleLogin()}
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

            {/* Quick One-Click Google Profiles */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 text-center">
                Quick 1-Click Profiles
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleGoogleLogin({
                      email: 'sanjeevidaa16@gmail.com',
                      name: 'Sanjeevi (Light Gamer)',
                      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sanjeevidaa',
                    })
                  }
                  className="p-2 bg-slate-900/90 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/40 rounded-xl text-left transition-all cursor-pointer"
                >
                  <div className="font-medium text-[11px] text-white truncate">Sanjeevi</div>
                  <div className="text-[9px] text-slate-400 truncate">sanjeevidaa16@gmail.com</div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleGoogleLogin({
                      email: 'streamer.pro@gmail.com',
                      name: 'Pro Broadcaster',
                      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ProStreamer',
                    })
                  }
                  className="p-2 bg-slate-900/90 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/40 rounded-xl text-left transition-all cursor-pointer"
                >
                  <div className="font-medium text-[11px] text-white truncate">Pro Broadcaster</div>
                  <div className="text-[9px] text-slate-400 truncate">streamer.pro@gmail.com</div>
                </button>
              </div>
            </div>

            {/* Switch to Sign Up */}
            <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800/80">
              <span>Don't have an account? </span>
              <button
                type="button"
                onClick={() => handleSwitchMode('signup')}
                className="text-red-400 hover:text-red-300 font-bold underline underline-offset-4 transition-colors cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        {/* SIGNUP FORM */}
        {authMode === 'signup' && (
          <div className="space-y-4">
            <form onSubmit={handleSignupSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Username <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="modal-signup-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. gamer_pro"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-2 bg-black/60 border border-zinc-700/80 focus:border-red-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="modal-signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2 bg-black/60 border border-zinc-700/80 focus:border-red-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="modal-signup-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-10 py-2 bg-black/60 border border-zinc-700/80 focus:border-red-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="modal-signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-10 py-2 bg-black/60 border border-zinc-700/80 focus:border-red-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="modal-btn-signup-submit"
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full mt-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(255,26,26,0.4)] hover:shadow-[0_0_30px_rgba(255,30,30,0.7)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Creating Account...' : 'CREATE ACCOUNT'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Continue with Google */}
            <button
              id="modal-btn-signup-google"
              type="button"
              onClick={() => handleGoogleLogin()}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
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

            {/* Switch to Login */}
            <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800/80">
              <span>Already have an account? </span>
              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className="text-red-400 hover:text-red-300 font-bold underline underline-offset-4 transition-colors cursor-pointer"
              >
                Login
              </button>
            </div>
          </div>
        )}

        {/* FORGOT PASSWORD FORM */}
        {authMode === 'forgot_password' && (
          <div className="space-y-4">
            <form onSubmit={handleForgotSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Your Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="modal-forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-zinc-700/80 focus:border-red-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                id="modal-btn-forgot-submit"
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Sending Link...' : 'Send Password Reset Email'}
              </button>
            </form>

            {/* Back to Login */}
            <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className="text-red-400 hover:text-red-300 font-bold underline underline-offset-4 transition-colors cursor-pointer"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}

        {/* Security Info */}
        <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-center gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-red-400" />
            <span>Firebase Security</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>24/7 Cloud Broadcaster</span>
          </div>
        </div>
      </div>
    </div>
  );
};
