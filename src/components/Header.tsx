import React from 'react';
import { Menu, RefreshCw, Radio, CheckCircle2, Square, Play, ShieldCheck } from 'lucide-react';
import { useStream } from '../context/StreamContext.js';
import { StatusBadge } from './StatusBadge.js';
import { NavTab } from './Sidebar.js';

interface HeaderProps {
  currentTab?: NavTab;
  onOpenMobile?: () => void;
  onOpenSidebar?: () => void;
  onNavigate?: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab = 'dashboard', onOpenMobile, onOpenSidebar, onNavigate }) => {
  const handleOpenMobile = onOpenMobile || onOpenSidebar || (() => {});
  const handleNavigate = onNavigate || (() => {});
  const { status, refreshStatus, isLoading, stopStream, isActionPending } = useStream();

  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return { title: 'Dashboard Overview', subtitle: 'Live RTMP broadcast status and resource metrics' };
      case 'library':
        return { title: 'Video Library', subtitle: 'Manage, probe, and select loop video assets' };
      case 'start-stream':
        return { title: 'Start 24/7 RTMP Stream', subtitle: 'Configure YouTube RTMP endpoint and encoding params' };
      case 'active-stream':
        return { title: 'Active Stream Monitor', subtitle: 'Real-time telemetry and process controls' };
      case 'logs':
        return { title: 'FFmpeg Real-Time Console', subtitle: 'Raw encoder logs and stdout/stderr stream' };
      case 'history':
        return { title: 'Stream Session History', subtitle: 'Audit log of past livestream sessions' };
      case 'system':
        return { title: 'System Status & Diagnostics', subtitle: 'FFmpeg, FFprobe, and host server diagnostics' };
      case 'settings':
        return { title: 'Admin Settings', subtitle: 'Default stream configurations and recovery options' };
      default:
        return { title: 'CastLoop Dashboard', subtitle: '24/7 YouTube RTMP Looper' };
    }
  };

  const page = getPageTitle();
  const isLive = status?.status === 'LIVE' || status?.status === 'STARTING' || status?.status === 'RECONNECTING';

  return (
    <header className="h-16 bg-[#080B12]/90 backdrop-blur-md border-b border-[#1B2333] sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shrink-0">
      {/* Left section: mobile hamburger & page title */}
      <div className="flex items-center gap-3">
        <button
          id="btn-mobile-menu"
          onClick={handleOpenMobile}
          className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#131926] lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
            {page.title}
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block">{page.subtitle}</p>
        </div>
      </div>

      {/* Right section: System health indicators & stream controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Stream Status Badge */}
        {status && <StatusBadge status={status.status} size="md" />}

        {/* FFmpeg Engine Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0D121E] border border-[#1B2436] text-[11px] text-slate-300 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>FFmpeg Ready</span>
        </div>

        {/* Quick Action Button */}
        {isLive ? (
          <button
            id="btn-header-stop-stream"
            onClick={() => stopStream()}
            disabled={isActionPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition-all duration-150 shadow-sm"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Stop Stream</span>
          </button>
        ) : (
          <button
            id="btn-header-start-stream"
            onClick={() => handleNavigate('start-stream')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold transition-all duration-150 shadow-sm shadow-indigo-600/25"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Start Stream</span>
          </button>
        )}

        {/* Manual Refresh Button */}
        <button
          id="btn-header-refresh"
          onClick={() => refreshStatus()}
          disabled={isLoading}
          title="Refresh Status"
          className="p-2 rounded-lg bg-[#0D121E] border border-[#1B2436] text-slate-400 hover:text-white hover:bg-[#131926] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>
    </header>
  );
};
