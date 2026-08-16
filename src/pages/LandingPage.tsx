import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useStream } from '../context/StreamContext.js';
import {
  Radio,
  Tv,
  Flame,
  Layers,
  ShieldCheck,
  Clock,
  Zap,
  Globe,
  Film,
  Heart,
  Play,
  Sparkles,
  Server,
  Cloud,
  CheckCircle2,
  ExternalLink,
  ListVideo,
  Sliders,
  Cpu,
  ArrowRight,
  Activity,
} from 'lucide-react';

interface LandingPageProps {
  onOpenLoginModal: (targetTab?: string) => void;
  onNavigate: (tab: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLoginModal,
  onNavigate,
}) => {
  const { isAuthenticated } = useAuth();
  const { status } = useStream();
  const [selectedPreviewStream, setSelectedPreviewStream] = useState<any | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      onNavigate('dashboard');
    }
  }, [isAuthenticated, onNavigate]);

  const isLive = status?.status === 'LIVE' || status?.status === 'STARTING' || status?.status === 'RECONNECTING';

  const featuredStreams = [
    {
      id: 's1',
      title: 'Lofi Hip Hop Radio — 24/7 Beats to Relax/Study to',
      category: 'Music & Lo-Fi',
      viewers: '14.2K',
      uptime: '412h 18m',
      thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&auto=format&fit=crop&q=80',
      badge: 'POPULAR',
      channel: 'Chillhop Music 24/7',
    },
    {
      id: 's2',
      title: 'Cyberpunk & Synthwave Radio 24/7 Chill Live Stream',
      category: 'Synthwave & Electronic',
      viewers: '8.7K',
      uptime: '189h 42m',
      thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
      badge: 'FEATURED',
      channel: 'RetroSynth Live',
    },
    {
      id: 's3',
      title: 'Deep Space Relaxing Ambience & Cosmic Visuals 24/7',
      category: 'Relaxation & Sleep',
      viewers: '6.1K',
      uptime: '560h 10m',
      thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80',
      badge: 'NON-STOP',
      channel: 'Cosmic Journey 24/7',
    },
    {
      id: 's4',
      title: 'Retro Gaming Highlights & Speedruns 24/7 Non-Stop',
      category: 'Gaming',
      viewers: '11.5K',
      uptime: '92h 15m',
      thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
      badge: 'TOP RATED',
      channel: 'Retro Arcade 24/7',
    },
  ];

  const handleStartStreaming = () => {
    if (isAuthenticated) {
      onNavigate('stream');
    } else {
      onOpenLoginModal('stream');
    }
  };

  const handleExploreVideos = () => {
    if (isAuthenticated) {
      onNavigate('videos');
    } else {
      onOpenLoginModal('videos');
    }
  };

  const handleStreamClick = (stream: any) => {
    setSelectedPreviewStream(stream);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 selection:bg-red-500/30 selection:text-red-200 overflow-x-hidden">
      
      {/* ========================================================= */}
      {/* 1. HERO SECTION — CINEMATIC 3D VISUAL & CALLS TO ACTION */}
      {/* ========================================================= */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-8 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        
        {/* Cinematic Ambient Red Radial Glow Halos */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] sm:w-[900px] h-[500px] bg-gradient-to-b from-red-600/25 via-red-900/10 to-transparent rounded-full blur-[130px] pointer-events-none -z-10 animate-pulse-glow" />
        <div className="absolute top-12 left-1/4 w-[380px] h-[380px] bg-red-500/10 rounded-full blur-[110px] pointer-events-none -z-10" />
        <div className="absolute top-20 right-1/4 w-[380px] h-[380px] bg-red-600/10 rounded-full blur-[110px] pointer-events-none -z-10" />

        {/* Subtle Ambient Grid & Vignette Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.035] pointer-events-none -z-10"
          style={{
            backgroundImage: `linear-gradient(to right, #ff0000 1px, transparent 1px), linear-gradient(to bottom, #ff0000 1px, transparent 1px)`,
            backgroundSize: '48px 48px'
          }}
        />

        {/* Small Tag Label */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/15 border border-red-500/35 text-red-400 text-xs font-extrabold uppercase tracking-widest mb-6 shadow-[0_0_20px_rgba(255,26,26,0.3)]">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          24/7 LIVE STREAMING
        </div>

        {/* Large Primary Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight text-center text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-red-500 drop-shadow-[0_0_40px_rgba(255,26,26,0.5)] max-w-5xl">
          STREAM WITHOUT LIMITS
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base lg:text-lg font-medium text-slate-400 text-center mt-3 sm:mt-4 max-w-2xl leading-relaxed">
          Professional 24/7 YouTube livestreaming powered by your VPS. Broadcast continuously without keeping your computer or browser open.
        </p>

        {/* Dual Primary Call-To-Actions */}
        <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-4 z-20">
          {/* Primary CTA */}
          <button
            id="hero-primary-cta"
            onClick={handleStartStreaming}
            className="relative group py-3.5 sm:py-4 px-8 sm:px-10 rounded-full font-extrabold text-sm sm:text-base text-white bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:to-red-600 border border-red-400/50 shadow-[0_0_35px_rgba(255,30,30,0.7)] hover:shadow-[0_0_50px_rgba(255,40,40,1)] transition-all duration-300 active:scale-95 flex items-center gap-3 cursor-pointer"
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            <span className="tracking-wider uppercase">START STREAMING</span>
            <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Secondary CTA */}
          <button
            id="hero-secondary-cta"
            onClick={handleExploreVideos}
            className="py-3.5 sm:py-4 px-7 sm:px-8 rounded-full font-bold text-sm sm:text-base text-slate-200 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] hover:border-red-500/40 backdrop-blur-md transition-all duration-300 active:scale-95 flex items-center gap-2.5 cursor-pointer shadow-lg"
          >
            <Film className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
            <span className="tracking-wide">EXPLORE VIDEOS</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* CENTRAL 3D GLOSSY YOUTUBE PLAY ICON WITH FLOATING BADGES */}
        {/* ========================================================= */}
        <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center mt-12 mb-6">
          
          {/* Top-Left Floating Badge: 24/7 LIVE NOW */}
          <div className="hidden lg:flex absolute -top-2 -left-4 z-20 items-center gap-3 px-4 py-3 rounded-2xl glass-card-glow animate-float-slow">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 text-red-500 shadow-[0_0_15px_rgba(255,26,26,0.5)]">
              <Radio className="w-4 h-4 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black tracking-wider uppercase text-red-500">LIVE NOW</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              </div>
              <div className="text-[10px] font-medium text-slate-300">24/7 Cloud RTMP</div>
            </div>
          </div>

          {/* Bottom-Left Floating Badge: 100% SAFE */}
          <div className="hidden lg:flex absolute bottom-16 -left-8 z-20 items-center gap-3 px-4 py-3 rounded-2xl glass-card-glow animate-float-reverse">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-black tracking-wider uppercase text-white">100% SAFE</div>
              <div className="text-[10px] font-medium text-slate-400">SSL Port 443 Compliant</div>
            </div>
          </div>

          {/* Top-Right Floating Badge: ALWAYS ON */}
          <div className="hidden lg:flex absolute -top-2 -right-4 z-20 items-center gap-3 px-4 py-3 rounded-2xl glass-card-glow animate-float-reverse">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 shadow-[0_0_15px_rgba(255,26,26,0.5)]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-black tracking-wider uppercase text-white">ALWAYS ON</div>
              <div className="text-[10px] font-medium text-slate-300">Day & Night VPS Looper</div>
            </div>
          </div>

          {/* Bottom-Right Floating Badge: HIGH QUALITY */}
          <div className="hidden lg:flex absolute bottom-16 -right-8 z-20 items-center gap-3 px-4 py-3 rounded-2xl glass-card-glow animate-float-slow">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-black tracking-wider uppercase text-white">HIGH QUALITY</div>
              <div className="text-[10px] font-medium text-slate-400">1080p 60fps Crystal Stream</div>
            </div>
          </div>

          {/* 3D Glossy YouTube Pill Centerpiece */}
          <div className="relative group cursor-pointer" onClick={handleStartStreaming}>
            {/* Outer Neon Aura */}
            <div className="absolute -inset-4 bg-gradient-to-r from-red-600 via-red-500 to-red-600 rounded-[38px] blur-2xl opacity-75 group-hover:opacity-100 transition duration-500 group-hover:scale-105" />

            {/* Main 3D Glossy YouTube Pill */}
            <div className="relative w-44 sm:w-56 h-28 sm:h-36 rounded-[28px] sm:rounded-[36px] bg-gradient-to-b from-[#ff3333] via-[#e60000] to-[#990000] border-t-2 border-white/40 border-b-4 border-black/50 shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_4px_12px_rgba(255,255,255,0.6),inset_0_-8px_20px_rgba(0,0,0,0.6)] flex items-center justify-center transform transition-transform duration-300 group-hover:-translate-y-2">
              
              {/* Specular Highlight Reflection */}
              <div className="absolute top-1 left-4 right-4 h-10 sm:h-12 bg-gradient-to-b from-white/35 to-transparent rounded-t-[24px] sm:rounded-t-[28px] pointer-events-none" />

              {/* Inner Triangle */}
              <div className="relative flex items-center justify-center w-14 sm:w-20 h-14 sm:h-20 rounded-full bg-transparent">
                <svg
                  className="w-10 sm:w-14 h-10 sm:h-14 text-white fill-current ml-2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Tiered Ground Stage Glow */}
          <div className="relative w-64 sm:w-96 h-10 -mt-3 flex items-center justify-center pointer-events-none">
            <div className="absolute w-64 sm:w-96 h-8 rounded-[100%] bg-gradient-to-r from-red-600/30 via-red-500/60 to-red-600/30 border border-red-500/60 blur-[1px] shadow-[0_0_30px_#ff1a1a]" />
            <div className="absolute w-44 sm:w-64 h-5 rounded-[100%] bg-red-500/40 blur-[2px] shadow-[0_0_20px_#ff0000]" />
          </div>

        </div>

      </section>

      {/* ========================================================= */}
      {/* 2. CORE STREAMING FEATURES (4 REQUIRED GLASS CARDS) */}
      {/* ========================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          
          {/* Card 1: 24/7 STREAMING */}
          <div
            onClick={() => onNavigate(isAuthenticated ? 'stream' : 'home')}
            className="group relative p-6 rounded-3xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
            }}
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-red-600/15 border border-red-500/30 text-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(255,26,26,0.3)] group-hover:scale-110 transition-transform mb-4">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-base font-extrabold text-white tracking-wide uppercase group-hover:text-red-400 transition-colors">
                24/7 STREAMING
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Always-on server-side streaming. Non-stop broadcast loops without relying on local hardware.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-semibold text-red-400">
              <span>Always Online</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: MULTI-VIDEO PLAYLIST */}
          <div
            onClick={() => {
              if (isAuthenticated) onNavigate('playlist');
              else onOpenLoginModal('playlist');
            }}
            className="group relative p-6 rounded-3xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
            }}
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-red-600/15 border border-red-500/30 text-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(255,26,26,0.3)] group-hover:scale-110 transition-transform mb-4">
                <ListVideo className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white tracking-wide uppercase group-hover:text-red-400 transition-colors">
                MULTI-VIDEO PLAYLIST
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Loop multiple videos continuously. Build complex schedules and concatenated video sequences.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-semibold text-red-400">
              <span>Infinite Looping</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: VPS POWERED */}
          <div
            onClick={() => {
              if (isAuthenticated) onNavigate('dashboard');
              else onOpenLoginModal('dashboard');
            }}
            className="group relative p-6 rounded-3xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
            }}
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-red-600/15 border border-red-500/30 text-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(255,26,26,0.3)] group-hover:scale-110 transition-transform mb-4">
                <Server className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white tracking-wide uppercase group-hover:text-red-400 transition-colors">
                VPS POWERED
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Server-side streaming that continues independently. Zero bandwidth or CPU load on your device.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-semibold text-red-400">
              <span>Zero Local Load</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: LIVE CONTROL */}
          <div
            onClick={() => {
              if (isAuthenticated) onNavigate('stream');
              else onOpenLoginModal('stream');
            }}
            className="group relative p-6 rounded-3xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
            }}
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-red-600/15 border border-red-500/30 text-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(255,26,26,0.3)] group-hover:scale-110 transition-transform mb-4">
                <Sliders className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white tracking-wide uppercase group-hover:text-red-400 transition-colors">
                LIVE CONTROL
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Start and stop your livestream from one place. Real-time encoder telemetry, bitrate, and status.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-semibold text-red-400">
              <span>Instant Toggle</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. REAL TELEMETRY & ACTIVE STREAM STATUS BAR */}
      {/* ========================================================= */}
      {isAuthenticated && status && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div
            className="p-6 rounded-3xl relative overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 50, 50, 0.2)',
              backdropFilter: 'blur(18px)',
            }}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-3.5 h-3.5 rounded-full ${isLive ? 'bg-red-500 animate-ping' : 'bg-slate-600'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      ENGINE STATUS:
                    </span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                      isLive ? 'bg-red-600/30 text-red-300 border border-red-500/50' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {status.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {status.videoTitle ? `Current Loop: ${status.videoTitle}` : 'Ready for YouTube Live streaming'}
                  </p>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.08]">
                  <span className="text-slate-500 mr-1.5">UPTIME:</span>
                  <span className="text-white font-bold">{status.uptimeFormatted || '00:00:00'}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.08]">
                  <span className="text-slate-500 mr-1.5">BITRATE:</span>
                  <span className="text-emerald-400 font-bold">{status.bitrate || '4000k'}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.08]">
                  <span className="text-slate-500 mr-1.5">FPS:</span>
                  <span className="text-white font-bold">{status.fps || 30}</span>
                </div>
                <button
                  onClick={() => onNavigate('stream')}
                  className="px-4 py-1.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer"
                >
                  Manage Stream
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 4. FEATURED 24/7 LIVE BROADCASTS SHOWCASE */}
      {/* ========================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-red-950/20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-500/30 text-red-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              Featured Broadcasts
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Active 24/7 Live Streams
            </h2>
          </div>

          <button
            onClick={() => {
              if (isAuthenticated) onNavigate('videos');
              else onOpenLoginModal('videos');
            }}
            className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Explore Video Assets</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredStreams.map((stream) => (
            <div
              key={stream.id}
              onClick={() => handleStreamClick(stream)}
              className="group relative rounded-2xl overflow-hidden shadow-lg transition-all duration-300 cursor-pointer flex flex-col"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(16px)',
              }}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                <img
                  src={stream.thumbnail}
                  alt={stream.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Live Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                  LIVE
                </div>

                {/* Viewers & Uptime */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-medium text-white/90 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg">
                  <span className="flex items-center gap-1">
                    <Radio className="w-3 h-3 text-red-400" />
                    {stream.viewers} watching
                  </span>
                  <span>{stream.uptime}</span>
                </div>

                {/* Play Hover Overlay */}
                <div className="absolute inset-0 bg-red-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/50 transform scale-75 group-hover:scale-100 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div className="p-4 flex flex-col flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">
                  {stream.category}
                </div>
                <h3 className="text-sm font-semibold text-white line-clamp-2 mb-2 group-hover:text-red-300 transition-colors">
                  {stream.title}
                </h3>
                <div className="mt-auto pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                  <span className="truncate">{stream.channel}</span>
                  <span className="text-[10px] text-slate-500 font-medium">1080p 60fps</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. CLOUD VPS SERVER ARCHITECTURE */}
      {/* ========================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="p-8 sm:p-12 rounded-3xl relative overflow-hidden shadow-[0_15px_50px_rgba(0,0,0,0.8)]"
          style={{
            background: 'linear-gradient(180deg, rgba(18, 15, 20, 0.9) 0%, rgba(10, 10, 12, 0.95) 100%)',
            border: '1px solid rgba(255, 50, 50, 0.25)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 text-red-400 text-xs font-bold uppercase tracking-wider mb-4 border border-red-500/30">
              <Server className="w-3.5 h-3.5 text-red-500" />
              Independent 24/7 Cloud Architecture
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              Real Server-Side 24/7 Streaming Engine
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
              Unlike client-based streaming software, your live streams are rendered and dispatched by dedicated server-side <strong className="text-white">FFmpeg processes on high-performance Cloud VPS</strong>. You can completely shut down your laptop, turn off your phone, or disconnect your internet—your YouTube live stream will continuously run <strong className="text-red-400">24 hours a day, 7 days a week non-stop</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08]">
                <CheckCircle2 className="w-5 h-5 text-red-500 mb-2" />
                <div className="font-bold text-sm text-white">Browser-Free Streaming</div>
                <div className="text-xs text-slate-400 mt-1">Close your tab or shut down PC without interrupting the live stream.</div>
              </div>
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08]">
                <CheckCircle2 className="w-5 h-5 text-red-500 mb-2" />
                <div className="font-bold text-sm text-white">Multi-Video Continuous Loop</div>
                <div className="text-xs text-slate-400 mt-1">Seamlessly string multiple videos into an infinite playlist sequence.</div>
              </div>
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08]">
                <CheckCircle2 className="w-5 h-5 text-red-500 mb-2" />
                <div className="font-bold text-sm text-white">Google Drive Direct Sync</div>
                <div className="text-xs text-slate-400 mt-1">Directly import cloud video files without downloading to local storage.</div>
              </div>
            </div>

            <button
              onClick={handleStartStreaming}
              className="py-3.5 px-8 rounded-full font-bold text-sm text-white bg-red-600 hover:bg-red-500 border border-red-400/40 shadow-[0_0_25px_rgba(255,26,26,0.6)] transition-all cursor-pointer"
            >
              {isAuthenticated ? 'Open Broadcaster Dashboard' : 'Get Started with Google'}
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. STREAM PREVIEW MODAL */}
      {/* ========================================================= */}
      {selectedPreviewStream && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-3xl bg-[#0e0e12] border border-red-500/40 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(255,20,20,0.3)]">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-black/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                <span className="font-bold text-sm text-white truncate max-w-md">
                  {selectedPreviewStream.title}
                </span>
              </div>
              <button
                onClick={() => setSelectedPreviewStream(null)}
                className="text-slate-400 hover:text-white px-2.5 py-1 rounded-lg text-xs hover:bg-white/10 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              <img
                src={selectedPreviewStream.thumbnail}
                alt="Preview"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/50">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-red-400">NOW BROADCASTING 24/7</div>
                    <div className="text-sm font-bold text-white">{selectedPreviewStream.channel}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#0a0a0c] flex items-center justify-between text-xs text-slate-400">
              <div>Uptime: <strong className="text-white">{selectedPreviewStream.uptime}</strong></div>
              <div>Viewers: <strong className="text-red-400">{selectedPreviewStream.viewers}</strong></div>
              <div>Quality: <strong className="text-white">1080p 60fps RTMPS</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. CLEAN MINIMAL FOOTER (NO ADMIN LINKS) */}
      {/* ========================================================= */}
      <footer className="border-t border-white/[0.08] bg-[#030304] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-4.5 rounded bg-red-600 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white fill-current ml-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-300">YouTube 24/7 Live</span>
            <span>— Continuous Cloud Streaming Engine</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('home')} className="hover:text-slate-300 transition-colors">Home</button>
            <button onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'home')} className="hover:text-slate-300 transition-colors">Dashboard</button>
            <button onClick={() => onNavigate(isAuthenticated ? 'videos' : 'home')} className="hover:text-slate-300 transition-colors">Videos</button>
            <button onClick={() => onNavigate(isAuthenticated ? 'stream' : 'home')} className="hover:text-slate-300 transition-colors">Live Stream</button>
          </div>

          <div>
            © 2026 YouTube 24/7 Live. All Rights Reserved.
          </div>
        </div>
      </footer>

    </div>
  );
};
