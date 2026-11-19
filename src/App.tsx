import React, { useState, useEffect } from 'react';
import { PageRoute } from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { IntroOverlay } from './components/IntroOverlay';
import { HomePage } from './pages/HomePage';
import { GalleryPage } from './pages/GalleryPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { BookingPage } from './pages/BookingPage';
import { ContactPage } from './pages/ContactPage';
import { PackagesPage } from './pages/PackagesPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ProofingPage } from './pages/ProofingPage';
import { initCloudSync, subscribeToGalleryUpdates, subscribeToPortfolioUpdates } from './utils/cloudSync';
import { syncGalleryFromCloud } from './utils/galleryStore';
import { syncPortfolioFromCloud } from './utils/portfolioMediaStore';
import { trackPageView } from './utils/visitorTracker';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

function parseRoute(): { page: PageRoute; sessionId?: string; isAdmin?: boolean } {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);

  // 1. Dedicated Admin routes (/admin-selection and /admin-selction)
  if (
    pathname === '/admin-selection' ||
    pathname.startsWith('/admin-selection/') ||
    pathname === '/admin-selction' ||
    pathname.startsWith('/admin-selction/') ||
    hash === 'admin-selection' ||
    hash === 'admin-selction'
  ) {
    return { page: 'proofing', sessionId: undefined, isAdmin: true };
  }

  // 2. Client Selection routes (/client-selection and /client-selection/:sessionId)
  if (
    pathname === '/client-selection' ||
    pathname.startsWith('/client-selection/') ||
    hash === 'client-selection' ||
    hash.startsWith('client-selection/')
  ) {
    const raw = pathname.startsWith('/client-selection') ? pathname : hash;
    const parts = raw.split('/').filter(Boolean);
    const sessionId = parts[1] || searchParams.get('session') || searchParams.get('gallery') || undefined;
    const isAdmin = searchParams.get('admin') === '1';
    return { page: 'proofing', sessionId, isAdmin };
  }

  // 3. Backward-compatible /proofing and /proofing/:sessionId route
  if (pathname === '/proofing' || pathname.startsWith('/proofing/')) {
    const parts = pathname.split('/').filter(Boolean);
    const sessionId = parts[1] || searchParams.get('session') || searchParams.get('gallery') || undefined;
    const isAdmin = searchParams.get('admin') === '1';
    return { page: 'proofing', sessionId, isAdmin };
  }

  // 4. Backward-compatible #proofing routes
  if (hash === 'proofing' || hash.startsWith('proofing/')) {
    const parts = hash.split('/').filter(Boolean);
    const sessionId = parts[1] || searchParams.get('session') || searchParams.get('gallery') || undefined;
    const isAdmin = searchParams.get('admin') === '1';
    return { page: 'proofing', sessionId, isAdmin };
  }

  // 5. Standard hash routes
  if (['home', 'gallery', 'portfolio', 'packages', 'booking', 'contact', 'admin'].includes(hash)) {
    return { page: hash as PageRoute };
  }

  // 6. Query parameter fallback
  if (searchParams.get('gallery')) {
    return {
      page: 'proofing',
      sessionId: searchParams.get('gallery') || undefined,
      isAdmin: searchParams.get('admin') === '1',
    };
  }

  return { page: 'home' };
}

export const App: React.FC = () => {
  const initialRoute = parseRoute();
  const [currentPage, setCurrentPage] = useState<PageRoute>(initialRoute.page);
  const [proofingSessionId, setProofingSessionId] = useState<string | undefined>(initialRoute.sessionId);
  const [isProofingAdmin, setIsProofingAdmin] = useState<boolean>(Boolean(initialRoute.isAdmin));
  const [showScrollTop, setShowScrollTop] = useState(false);

  // ── Theme: dark (default) | light ──────────────────────────────
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('paul_theme') as 'dark' | 'light') || 'dark';
  });

  // Apply theme class to <html> whenever it changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('paul_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // ── Permanent Cross-Device Real-Time Sync Engine ───────────────
  // Hydrates this device on start + listens for real-time cloud updates
  // so all updates made in the admin dashboard reflect on all devices & browsers instantly.
  useEffect(() => {
    initCloudSync();

    const unsubGallery = subscribeToGalleryUpdates(() => {
      console.log('[App] Received real-time gallery cloud update, syncing...');
      syncGalleryFromCloud();
    });

    const unsubPortfolio = subscribeToPortfolioUpdates(() => {
      console.log('[App] Received real-time portfolio cloud update, syncing...');
      syncPortfolioFromCloud();
    });

    return () => {
      unsubGallery();
      unsubPortfolio();
    };
  }, []);

  // ── Visitor Analytics Tracking ─────────────────────────────────
  // Automatically logs device, location & page view to admin dashboard
  useEffect(() => {
    trackPageView(currentPage);
  }, [currentPage]);

  // Sync with URL pathname and hash changes
  useEffect(() => {
    const handleRouteChange = () => {
      const route = parseRoute();
      setCurrentPage(route.page);
      setProofingSessionId(route.sessionId);
      setIsProofingAdmin(Boolean(route.isAdmin));
    };
    handleRouteChange();
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Monitor scroll for back to top button
  useEffect(() => {
    const checkScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', checkScroll);
    return () => window.removeEventListener('scroll', checkScroll);
  }, []);

  const handleNavigate = (page: PageRoute) => {
    setCurrentPage(page);
    if (page === 'proofing') {
      window.history.pushState({}, '', '/client-selection');
    } else {
      window.location.hash = page;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      id="app-root"
      className="min-h-screen bg-[#0a0a0e] text-slate-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white relative"
    >
      {/* Opening Intro Animation */}
      <IntroOverlay />

      {/* Navigation */}
      {currentPage !== 'admin' && (
        <Navbar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {/* Main Page Area with AnimatePresence Page Transition */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            {currentPage === 'home'      && <HomePage onNavigate={handleNavigate} />}
            {currentPage === 'gallery'   && <GalleryPage />}
            {currentPage === 'portfolio' && <PortfolioPage onNavigate={handleNavigate} />}
            {currentPage === 'packages'  && <PackagesPage onNavigate={handleNavigate} />}
            {currentPage === 'booking'   && <BookingPage />}
            {currentPage === 'contact'   && <ContactPage />}
            {currentPage === 'admin'     && <AdminDashboardPage onNavigate={handleNavigate} />}
            {currentPage === 'proofing'  && <ProofingPage sessionId={proofingSessionId} initialAdmin={isProofingAdmin} onNavigate={handleNavigate} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Smooth Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-30 p-3 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-xl shadow-purple-900/40 hover:scale-110 active:scale-95 transition-all cursor-pointer border border-white/20"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
