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
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Camera } from 'lucide-react';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageRoute>('home');
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Sync with URL hash if provided
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (['home', 'gallery', 'portfolio', 'packages', 'booking', 'contact', 'admin'].includes(hash)) {
        setCurrentPage(hash as PageRoute);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Monitor scroll for back to top button
  useEffect(() => {
    const checkScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', checkScroll);
    return () => window.removeEventListener('scroll', checkScroll);
  }, []);

  const handleNavigate = (page: PageRoute) => {
    setCurrentPage(page);
    window.location.hash = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-slate-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white relative">
      {/* Opening Intro Animation */}
      <IntroOverlay />

      {/* Navigation */}
      {currentPage !== 'admin' && <Navbar currentPage={currentPage} onNavigate={handleNavigate} />}

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
            {currentPage === 'home' && <HomePage onNavigate={handleNavigate} />}
            {currentPage === 'gallery' && <GalleryPage />}
            {currentPage === 'portfolio' && <PortfolioPage onNavigate={handleNavigate} />}
            {currentPage === 'packages' && <PackagesPage onNavigate={handleNavigate} />}
            {currentPage === 'booking' && <BookingPage />}
            {currentPage === 'contact' && <ContactPage />}
            {currentPage === 'admin' && <AdminDashboardPage onNavigate={handleNavigate} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Smooth Scroll to Top floating button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
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
