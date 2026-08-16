import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { StreamProvider } from './context/StreamContext.js';
import { Navbar } from './components/Navbar.js';
import { GoogleLoginModal } from './components/GoogleLoginModal.js';
import { LandingPage } from './pages/LandingPage.js';
import { LiveStreamsPage } from './pages/LiveStreamsPage.js';
import { PopularPage } from './pages/PopularPage.js';
import { CategoriesPage } from './pages/CategoriesPage.js';
import { AboutPage } from './pages/AboutPage.js';
import { UserDashboardPage } from './pages/UserDashboardPage.js';
import { VideosPage } from './pages/VideosPage.js';
import { PlaylistPage } from './pages/PlaylistPage.js';
import { StreamControlPage } from './pages/StreamControlPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { AdminPage } from './pages/AdminPage.js';

const PROTECTED_TABS = ['dashboard', 'videos', 'playlist', 'stream', 'profile'];

const parseUrlTab = (): string | null => {
  const hash = window.location.hash.toLowerCase().replace('#', '').trim();
  const path = window.location.pathname.toLowerCase().trim();

  if (hash === 'admin' || path.includes('/admin')) return 'admin';
  if (hash === 'dashboard' || path.includes('/dashboard')) return 'dashboard';
  if (hash === 'videos' || path.includes('/videos')) return 'videos';
  if (hash === 'playlist' || path.includes('/playlist')) return 'playlist';
  if (hash === 'stream' || path.includes('/stream')) return 'stream';
  if (hash === 'profile' || path.includes('/profile')) return 'profile';
  if (hash === 'live-streams' || path.includes('/live-streams')) return 'live-streams';
  if (hash === 'popular' || path.includes('/popular')) return 'popular';
  if (hash === 'categories' || path.includes('/categories')) return 'categories';
  if (hash === 'about' || path.includes('/about')) return 'about';
  if (hash === 'home' || hash === '') return 'home';

  return null;
};

const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [targetTabAfterLogin, setTargetTabAfterLogin] = useState<string>('dashboard');
  const hasInitialized = useRef(false);

  // Synchronize route once authentication state is determined
  useEffect(() => {
    if (isLoading) return;

    const requestedTab = parseUrlTab();

    if (isAuthenticated) {
      // Authenticated User:
      // If user is visiting root '/', '#home', or an empty tab -> ALWAYS redirect to 'dashboard'
      if (!requestedTab || requestedTab === 'home') {
        setCurrentTab('dashboard');
        window.location.hash = 'dashboard';
      } else {
        // User requested a valid tab (e.g. #videos, #playlist, #stream, #profile, #admin)
        setCurrentTab(requestedTab);
        window.location.hash = requestedTab;
      }
    } else {
      // Unauthenticated User:
      // If user attempted to access a protected tab (e.g. #dashboard, #videos)
      if (requestedTab && PROTECTED_TABS.includes(requestedTab)) {
        setTargetTabAfterLogin(requestedTab);
        setCurrentTab('home');
        window.location.hash = '';
        setLoginModalOpen(true);
      } else if (requestedTab && requestedTab !== 'home') {
        setCurrentTab(requestedTab);
      } else {
        setCurrentTab('home');
        window.location.hash = '';
      }
    }

    hasInitialized.current = true;
  }, [isAuthenticated, isLoading]);

  // Listen to hash/back-forward navigation events
  useEffect(() => {
    const handleHashChange = () => {
      if (isLoading) return;
      const newTab = parseUrlTab() || 'home';

      if (isAuthenticated) {
        // Authenticated user navigating to home -> Redirect to dashboard immediately
        if (newTab === 'home') {
          setCurrentTab('dashboard');
          window.location.hash = 'dashboard';
        } else {
          setCurrentTab(newTab);
        }
      } else {
        // Unauthenticated user navigating to protected tab
        if (PROTECTED_TABS.includes(newTab)) {
          setTargetTabAfterLogin(newTab);
          setLoginModalOpen(true);
          setCurrentTab('home');
          window.location.hash = '';
        } else {
          setCurrentTab(newTab);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated, isLoading]);

  // Tab Selection Handler
  const handleSelectTab = (tab: string) => {
    // If authenticated and user clicked home or logo -> Route to dashboard
    if (isAuthenticated && tab === 'home') {
      setCurrentTab('dashboard');
      window.location.hash = 'dashboard';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // If unauthenticated and tab is protected -> Open login modal and keep target
    if (!isAuthenticated && PROTECTED_TABS.includes(tab)) {
      setTargetTabAfterLogin(tab);
      setLoginModalOpen(true);
      return;
    }

    setCurrentTab(tab);
    window.location.hash = tab === 'home' ? '' : tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLoginModal = (targetTab = 'dashboard') => {
    setTargetTabAfterLogin(targetTab);
    setLoginModalOpen(true);
  };

  // Google Login / Auth Success Callback
  const handleLoginSuccess = () => {
    // Default to 'dashboard' if target was home or unset
    const destination = targetTabAfterLogin && targetTabAfterLogin !== 'home' ? targetTabAfterLogin : 'dashboard';
    setCurrentTab(destination);
    window.location.hash = destination;
    setLoginModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Minimal loading screen while resolving authentication state to prevent any homepage flash
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-slate-400 text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
          <span className="font-semibold tracking-wider text-slate-300">
            CONNECTING TO YOUTUBE 24/7 VPS...
          </span>
        </div>
      </div>
    );
  }

  const renderActivePage = () => {
    // Strict Route Guard:
    // If authenticated and currentTab is 'home', never render LandingPage, render Dashboard instead.
    if (isAuthenticated && currentTab === 'home') {
      return <UserDashboardPage onNavigate={handleSelectTab} />;
    }

    switch (currentTab) {
      case 'home':
        return (
          <LandingPage
            onOpenLoginModal={handleOpenLoginModal}
            onNavigate={handleSelectTab}
          />
        );
      case 'live-streams':
        return <LiveStreamsPage />;
      case 'popular':
        return <PopularPage />;
      case 'categories':
        return <CategoriesPage />;
      case 'about':
        return <AboutPage />;
      case 'dashboard':
        return isAuthenticated ? (
          <UserDashboardPage onNavigate={handleSelectTab} />
        ) : (
          <LandingPage onOpenLoginModal={handleOpenLoginModal} onNavigate={handleSelectTab} />
        );
      case 'videos':
        return isAuthenticated ? (
          <VideosPage onNavigate={handleSelectTab} />
        ) : (
          <LandingPage onOpenLoginModal={handleOpenLoginModal} onNavigate={handleSelectTab} />
        );
      case 'playlist':
        return isAuthenticated ? (
          <PlaylistPage onNavigate={handleSelectTab} />
        ) : (
          <LandingPage onOpenLoginModal={handleOpenLoginModal} onNavigate={handleSelectTab} />
        );
      case 'stream':
        return isAuthenticated ? (
          <StreamControlPage />
        ) : (
          <LandingPage onOpenLoginModal={handleOpenLoginModal} onNavigate={handleSelectTab} />
        );
      case 'profile':
        return isAuthenticated ? (
          <ProfilePage />
        ) : (
          <LandingPage onOpenLoginModal={handleOpenLoginModal} onNavigate={handleSelectTab} />
        );
      case 'admin':
        return <AdminPage />;
      default:
        return isAuthenticated ? (
          <UserDashboardPage onNavigate={handleSelectTab} />
        ) : (
          <LandingPage onOpenLoginModal={handleOpenLoginModal} onNavigate={handleSelectTab} />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col selection:bg-red-500/30 selection:text-red-200">
      {/* Top Floating Glass Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenLoginModal={handleOpenLoginModal}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {renderActivePage()}
      </main>

      {/* Google Login Modal */}
      <GoogleLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
        targetFeature={targetTabAfterLogin}
      />
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
