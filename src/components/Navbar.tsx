import React from 'react';
import {
  LayoutDashboard,
  Film,
  ListVideo,
  Radio,
  Sliders,
  Shield,
  Activity,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
    { id: 'videos', label: 'Video Library', shortLabel: 'Videos', icon: Film },
    { id: 'playlist', label: 'Playlist Builder', shortLabel: 'Playlist', icon: ListVideo },
    { id: 'stream', label: 'Live Stream Center', shortLabel: 'Streams', icon: Radio },
    { id: 'profile', label: 'RTMP Settings', shortLabel: 'Settings', icon: Sliders },
    { id: 'admin', label: 'Admin Console', shortLabel: 'Admin', icon: Shield },
  ];

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
  };

  const handleBrandClick = () => {
    onSelectTab('dashboard');
  };

  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-50 w-full transition-all duration-300"
      style={{
        background: 'rgba(5, 5, 5, 0.85)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(255, 50, 50, 0.15)',
      }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Brand / Logo (Routes directly to /dashboard) */}
          <button
            id="header-brand-logo"
            onClick={handleBrandClick}
            className="flex items-center gap-2.5 sm:gap-3 group text-left cursor-pointer focus:outline-none shrink-0"
          >
            {/* Iconic 3D Glowing Red Pill Logo */}
            <div className="relative flex items-center justify-center w-9 h-7 sm:w-11 sm:h-8 rounded-xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-[0_0_20px_rgba(255,26,26,0.6)] group-hover:shadow-[0_0_28px_rgba(255,40,40,0.9)] group-hover:scale-105 transition-all duration-300">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-current ml-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="flex flex-col">
              <span className="font-black text-sm sm:text-base lg:text-lg tracking-tight text-white flex items-center gap-1">
                YouTube <span className="text-red-500 font-black drop-shadow-[0_0_12px_rgba(255,26,26,0.8)]">24/7</span> Live
              </span>
              <span className="text-[9px] sm:text-[10px] tracking-wider uppercase text-slate-400 font-semibold -mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                VPS Direct Broadcaster
              </span>
            </div>
          </button>

          {/* Desktop Center Navigation */}
          <nav
            id="desktop-header-nav"
            className="hidden md:flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] px-2.5 py-1.5 rounded-full backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`relative px-3.5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'text-white bg-gradient-to-r from-red-600/90 to-red-700/90 shadow-[0_0_20px_rgba(255,26,26,0.55)] border border-red-500/40'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.06] hover:shadow-[0_0_15px_rgba(255,26,26,0.15)]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-slate-400 group-hover:text-red-400'
                    }`}
                  />
                  <span>{item.label}</span>

                  {/* Active glowing underline indicator */}
                  {isActive && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-red-500 rounded-full shadow-[0_0_8px_#ff2222]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Area: VPS Engine Status Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onSelectTab('stream')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/50 transition-all text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.15)] cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">VPS Engine Ready</span>
              <span className="sm:hidden">Online</span>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Horizontal Scrollable Navigation Strip */}
      <div className="md:hidden w-full px-2 py-1.5 border-t border-white/[0.06] bg-[#07070a]/90 backdrop-blur-md overflow-x-auto no-scrollbar">
        <nav className="flex items-center justify-start sm:justify-center gap-1.5 min-w-max px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={`mobile-${item.id}`}
                id={`mobile-nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`relative px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-white bg-gradient-to-r from-red-600 to-red-700 shadow-[0_0_14px_rgba(255,26,26,0.6)] border border-red-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
