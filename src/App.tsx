import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext.js';
import { StreamProvider } from './context/StreamContext.js';
import { Navbar } from './components/Navbar.js';
import { UserDashboardPage } from './pages/UserDashboardPage.js';
import { VideosPage } from './pages/VideosPage.js';
import { PlaylistPage } from './pages/PlaylistPage.js';
import { StreamControlPage } from './pages/StreamControlPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { AdminPage } from './pages/AdminPage.js';
import { LiveStreamsPage } from './pages/LiveStreamsPage.js';
import { PopularPage } from './pages/PopularPage.js';
import { CategoriesPage } from './pages/CategoriesPage.js';
import { AboutPage } from './pages/AboutPage.js';

const parseUrlTab = (): string => {
  const hash = window.location.hash.toLowerCase().replace('#', '').trim();
  const path = window.location.pathname.toLowerCase().trim();

  if (hash === 'admin' || path.includes('/admin')) return 'admin';
  if (hash === 'videos' || path.includes('/videos')) return 'videos';
  if (hash === 'playlist' || path.includes('/playlist')) return 'playlist';
  if (hash === 'stream' || path.includes('/stream')) return 'stream';
  if (hash === 'profile' || hash === 'settings' || path.includes('/settings') || path.includes('/profile')) return 'profile';
  if (hash === 'live-streams' || path.includes('/live-streams')) return 'live-streams';
  if (hash === 'popular' || path.includes('/popular')) return 'popular';
  if (hash === 'categories' || path.includes('/categories')) return 'categories';
  if (hash === 'about' || path.includes('/about')) return 'about';
  
  // Default to dashboard directly
  return 'dashboard';
};

const MainLayout: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>(parseUrlTab());

  // Listen to hash/back-forward navigation events
  useEffect(() => {
    const handleHashChange = () => {
      const newTab = parseUrlTab();
      setCurrentTab(newTab);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectTab = (tab: string) => {
    const finalTab = tab === 'home' ? 'dashboard' : tab;
    setCurrentTab(finalTab);
    window.location.hash = finalTab === 'dashboard' ? '' : finalTab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderActivePage = () => {
    switch (currentTab) {
      case 'videos':
        return <VideosPage onNavigate={handleSelectTab} />;
      case 'playlist':
        return <PlaylistPage onNavigate={handleSelectTab} />;
      case 'stream':
        return <StreamControlPage />;
      case 'profile':
      case 'settings':
        return <ProfilePage />;
      case 'admin':
        return <AdminPage />;
      case 'live-streams':
        return <LiveStreamsPage />;
      case 'popular':
        return <PopularPage />;
      case 'categories':
        return <CategoriesPage />;
      case 'about':
        return <AboutPage />;
      case 'dashboard':
      default:
        return <UserDashboardPage onNavigate={handleSelectTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col selection:bg-red-500/30 selection:text-red-200">
      {/* Top Floating Glass Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {renderActivePage()}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StreamProvider>
        <MainLayout />
      </StreamProvider>
    </AuthProvider>
  );
}
