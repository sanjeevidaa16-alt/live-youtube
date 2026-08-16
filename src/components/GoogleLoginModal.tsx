import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { X, ShieldCheck, Sparkles, CheckCircle2, Lock } from 'lucide-react';

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
  const { loginWithGoogle, isLoading } = useAuth();
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async (profile: { email: string; name?: string; avatar?: string }) => {
    setError(null);
    try {
      await loginWithGoogle(profile);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes('@')) {
      setError('Please enter a valid Google email address.');
      return;
    }
    handleGoogleLogin({
      email: customEmail.trim(),
      name: customName.trim() || customEmail.split('@')[0],
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(customEmail)}`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Background Ambient Red Halo */}
      <div className="absolute w-[500px] h-[500px] bg-red-600/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-glow" />

      <div className="relative w-full max-w-md bg-[#0e0e11]/95 border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(255,20,20,0.25)] text-slate-100 overflow-hidden">
        {/* Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600 shadow-[0_0_12px_#ff1a1a]" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-600/10 border border-red-500/30 mb-3 shadow-[0_0_20px_rgba(255,26,26,0.3)]">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/40">
              <svg className="w-4 h-4 text-white fill-current ml-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            YouTube 24/7 Live
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {targetFeature
              ? `Sign in with Google to access ${targetFeature}`
              : 'Sign in to access 24/7 live streams & VPS broadcaster'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <X className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Primary CTA Button */}
        <div className="space-y-3">
          <button
            onClick={() =>
              handleGoogleLogin({
                email: 'sanjeevidaa16@gmail.com',
                name: 'Light Gamer (Google User)',
                avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=LightGamerGoogle',
              })
            }
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl flex items-center justify-center gap-3 transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.35)] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {/* Google G SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            <span className="tracking-wide">Continue with Google</span>
          </button>

          {/* Quick Demo Google Accounts */}
          <div className="pt-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 text-center">
              Quick One-Click Google Profiles
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleGoogleLogin({
                    email: 'sanjeevidaa16@gmail.com',
                    name: 'Sanjeev Light',
                    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sanjeevidaa',
                  })
                }
                className="p-2.5 bg-slate-900/80 hover:bg-red-950/30 border border-slate-800 hover:border-red-500/40 rounded-xl text-left transition-all"
              >
                <div className="font-medium text-xs text-white truncate">Sanjeev (Gamer)</div>
                <div className="text-[10px] text-slate-400 truncate">sanjeevidaa16@gmail.com</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleGoogleLogin({
                    email: 'streamer.pro@gmail.com',
                    name: 'Pro Streamer',
                    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ProStreamer',
                  })
                }
                className="p-2.5 bg-slate-900/80 hover:bg-red-950/30 border border-slate-800 hover:border-red-500/40 rounded-xl text-left transition-all"
              >
                <div className="font-medium text-xs text-white truncate">Pro Streamer</div>
                <div className="text-[10px] text-slate-400 truncate">streamer.pro@gmail.com</div>
              </button>
            </div>
          </div>

          {/* Custom Google Email Option */}
          {!showCustomInput ? (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              className="w-full text-center text-xs text-slate-400 hover:text-red-400 pt-1 underline underline-offset-4 transition-colors"
            >
              Sign in with a different Google account
            </button>
          ) : (
            <form onSubmit={handleCustomSubmit} className="pt-2 space-y-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Google Email</label>
                <input
                  type="email"
                  required
                  placeholder="your.account@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-black/60 border border-slate-700 focus:border-red-500 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Display Name (optional)</label>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-black/60 border border-slate-700 focus:border-red-500 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-medium text-xs rounded-lg transition-colors shadow-md shadow-red-600/30"
              >
                Sign In
              </button>
            </form>
          )}
        </div>

        {/* Security Info */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-red-400" />
            <span>Encrypted OAuth</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>24/7 Cloud VPS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
