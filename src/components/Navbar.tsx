import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  Home,
  LayoutDashboard,
  Film,
  ListVideo,
  Radio,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenLoginModal: (targetTab?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenLoginModal,
}) => {
  const { user, isAuthenticated, logout } = useAuth();

  // Navigation Items: Unauthenticated users see Home + Protected shortcuts; Authenticated users see Dashboard as starting base
  const navItems = isAuthenticated
    ? [
        { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard, protected: true },
        { id: 'videos', label: 'Video Library', shortLabel: 'Videos', icon: Film, protected: true },
        { id: 'playlist', label: 'Playlist Builder', shortLabel: 'Playlist', icon: ListVideo, protected: true },
        { id: 'stream', label: 'Live Stream Center', shortLabel: 'Live', icon: Radio, protected: true },
      ]
    : [
        { id: 'home', label: 'Home', shortLabel: 'Home', icon: Home, protected: false },
        { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard, protected: true },
        { id: 'videos', label: 'Video Library', shortLabel: 'Videos', icon: Film, protected: true },
        { id: 'playlist', label: 'Playlist Builder', shortLabel: 'Playlist', icon: ListVideo, protected: true },
        { id: 'stream', label: 'Live Stream Center', shortLabel: 'Live', icon: Radio, protected: true },
      ];

  const handleNavClick = (tabId: string, isProtected: boolean) => {
    if (tabId === 'home') {
      if (isAuthenticated) {
        onSelectTab('dashboard');
      } else {
        onSelectTab('home');
      }
      return;
    }

    if (isProtected && !isAuthenticated) {
      onOpenLoginModal(tabId);
      return;
    }

    onSelectTab(tabId);
  };

  const handleBrandClick = () => {
    if (isAuthenticated) {
      onSelectTab('dashboard');
    } else {
      onSelectTab('home');
    }
  };

  const handleSignOut = async () => {
    await logout();
    window.location.hash = '';
    onSelectTab('home');
  };

  const handleProfileClick = () => {
    if (!isAuthenticated) {
      onOpenLoginModal('profile');
    } else {
      onSelectTab('profile');
    }
  };

  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-50 w-full transition-all duration-300"
      style={{
        background: 'rgba(5, 5, 5, 0.75)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(255, 50, 50, 0.15)',
      }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Brand / Logo (Routes to /dashboard if logged in, / if logged out) */}
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
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                Cloud Broadcaster
              </span>
            </div>
          </button>

          {/* Desktop Center Navigation */}
          <nav
            id="desktop-header-nav"
            className="hidden lg:flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] px-2.5 py-1.5 rounded-full backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => handleNavClick(item.id, item.protected)}
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

          {/* Right Area: Google Profile & Sign Out / Login */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {!isAuthenticated ? (
              <button
                id="header-login-btn"
                onClick={() => onOpenLoginModal('dashboard')}
                className="relative group py-2 px-4 sm:px-5 rounded-full font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:to-red-600 border border-red-400/50 shadow-[0_0_20px_rgba(255,26,26,0.5)] hover:shadow-[0_0_30px_rgba(255,30,30,0.8)] transition-all duration-300 active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <div className="p-0.5 rounded-full bg-white text-slate-900 shadow">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                </div>
                <span>Login</span>
                <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ) : (
              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Google Profile Button */}
                <button
                  id="header-profile-btn"
                  onClick={handleProfileClick}
                  title="View Google Profile & Settings"
                  className={`flex items-center gap-2 p-1 sm:p-1.5 sm:pr-3 rounded-full transition-all cursor-pointer border ${
                    currentTab === 'profile'
                      ? 'bg-red-600/20 border-red-500/60 shadow-[0_0_15px_rgba(255,26,26,0.35)]'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.1] hover:border-red-500/40'
                  }`}
                >
                  <img
                    src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`}
                    alt="Google Profile"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-950 border border-red-500/50 object-cover shadow-sm"
                  />
                  <span className="hidden sm:inline text-xs font-semibold text-white max-w-[100px] lg:max-w-[130px] truncate">
                    {user?.name || user?.username || 'Sanjeevi'}
                  </span>
                </button>

                {/* Visible Sign Out Button */}
                <button
                  id="header-signout-btn"
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs font-semibold text-red-400 hover:text-white bg-red-950/30 hover:bg-red-600/80 border border-red-500/30 hover:border-red-400 shadow-[0_0_15px_rgba(255,26,26,0.15)] hover:shadow-[0_0_20px_rgba(255,26,26,0.5)] transition-all duration-200 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Horizontal Scrollable Navigation Strip */}
      <div className="lg:hidden w-full px-2 py-1.5 border-t border-white/[0.06] bg-[#07070a]/90 backdrop-blur-md overflow-x-auto no-scrollbar">
        <nav className="flex items-center justify-start sm:justify-center gap-1.5 min-w-max px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={`mobile-${item.id}`}
                id={`mobile-nav-${item.id}`}
                onClick={() => handleNavClick(item.id, item.protected)}
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
