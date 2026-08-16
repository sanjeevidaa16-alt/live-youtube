import React from 'react';
import {
  LayoutDashboard,
  Film,
  PlaySquare,
  Radio,
  Terminal,
  History,
  Cpu,
  Settings,
  LogOut,
  Repeat,
  Sparkles,
} from 'lucide-react';
import { useStream } from '../context/StreamContext.js';
import { useAuth } from '../context/AuthContext.js';

export type NavTab =
  | 'dashboard'
  | 'library'
  | 'start-stream'
  | 'active-stream'
  | 'logs'
  | 'history'
  | 'system'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen?: boolean;
  isOpenMobile?: boolean;
  onClose?: () => void;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  isOpenMobile,
  onClose,
  onCloseMobile,
}) => {
  const isMobileOpen = isOpen ?? isOpenMobile ?? false;
  const handleClose = onClose || onCloseMobile || (() => {});
  const { status } = useStream();
  const { logout, user } = useAuth();
  const isLive = status?.status === 'LIVE' || status?.status === 'STARTING' || status?.status === 'RECONNECTING';

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'library' as NavTab, label: 'Video Library', icon: Film },
    { id: 'start-stream' as NavTab, label: 'Start Stream', icon: PlaySquare },
    {
      id: 'active-stream' as NavTab,
      label: 'Active Stream',
      icon: Radio,
      badge: isLive ? (
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      ) : null,
    },
    { id: 'logs' as NavTab, label: 'Live Logs', icon: Terminal },
    { id: 'history' as NavTab, label: 'Stream History', icon: History },
    { id: 'system' as NavTab, label: 'System Status', icon: Cpu },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    handleClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          id="mobile-sidebar-backdrop"
          onClick={handleClose}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 xl:w-72 bg-[#0A0E17] border-r border-[#1B2333] flex flex-col justify-between transition-transform duration-300 ease-in-out shrink-0 h-screen ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#1B2333]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-600/25 text-white font-black text-xl">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-base tracking-tight">CastLoop</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  24/7
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">YouTube RTMP Engine</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Menu
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-150 group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/20 to-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#111724]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.badge}
              </button>
            );
          })}

          {/* Quick Engine Status Card in Sidebar */}
          <div className="pt-6 px-1">
            <div className="p-3.5 rounded-xl bg-[#0D121E] border border-[#1B2436]">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400 font-medium text-[11px]">Server Process</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Persistent
                </span>
              </div>
              <div className="text-[11px] text-slate-400 leading-relaxed">
                FFmpeg runs 24/7 on the server. Closing this browser will <strong className="text-slate-200">not</strong> stop the live stream.
              </div>
            </div>
          </div>
        </div>

        {/* User Footer / Logout */}
        <div className="p-4 border-t border-[#1B2333] bg-[#070B12]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                {user?.username?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.username || 'Administrator'}</p>
                <p className="text-[10px] text-slate-400 truncate">System Operator</p>
              </div>
            </div>
            <button
              id="sidebar-logout-btn"
              onClick={logout}
              title="Log out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
