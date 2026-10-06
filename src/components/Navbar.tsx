import React, { useState, useEffect } from 'react';
import { PageRoute } from '../types';
import { Camera, Calendar, Phone, Image, User, Menu, X, MessageSquare } from 'lucide-react';

interface NavbarProps {
  currentPage: PageRoute;
  onNavigate: (page: PageRoute) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems: { page: PageRoute; label: string; icon: React.ReactNode }[] = [
    { page: 'home', label: 'Home', icon: <Camera className="w-4 h-4" /> },
    { page: 'gallery', label: 'Photos by Paul', icon: <Image className="w-4 h-4" /> },
    { page: 'portfolio', label: 'Portfolio (CEO)', icon: <User className="w-4 h-4" /> },
    { page: 'booking', label: 'Book Shoot', icon: <Calendar className="w-4 h-4" /> },
    { page: 'contact', label: 'Contact', icon: <Phone className="w-4 h-4" /> },
  ];

  const handleNavClick = (page: PageRoute) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-black/60 backdrop-blur-md border-b border-white/10 shadow-lg shadow-black/40 py-2.5'
          : 'bg-black/25 backdrop-blur-sm py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand logo & name */}
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-3 group text-left focus:outline-none cursor-pointer"
        >
          <div className="relative w-10 h-10 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-purple-600 to-cyan-400 group-hover:scale-105 transition-transform duration-300">
            <img
              src="https://res.cloudinary.com/dirfcqs1f/image/upload/v1748599973/Group_1_tppp56.png"
              alt="Paul Photography"
              className="w-full h-full object-contain rounded-full bg-black/80"
            />
          </div>
          <div>
            <span className="text-base font-bold tracking-wider text-white group-hover:text-cyan-300 transition-colors">
              PAUL PHOTOGRAPHY
            </span>
            <span className="block text-[10px] tracking-widest text-gray-400 font-light uppercase">
              Moments Preserved
            </span>
          </div>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {navItems.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => handleNavClick(item.page)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600/90 to-cyan-600/90 text-white shadow-md shadow-purple-900/30 font-semibold'
                    : 'text-gray-200 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Direct WhatsApp CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <a
            href="https://wa.me/256757460297"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition-all hover:scale-105"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat on WhatsApp</span>
          </a>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <a
            href="https://wa.me/256757460297"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-emerald-600/80 text-white text-xs"
            aria-label="WhatsApp"
          >
            <MessageSquare className="w-4 h-4" />
          </a>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 focus:outline-none cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-neutral-950/95 backdrop-blur-xl border-b border-white/10 px-4 pt-3 pb-6 animate-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = currentPage === item.page;
              return (
                <button
                  key={item.page}
                  onClick={() => handleNavClick(item.page)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-600 text-white font-semibold'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
            <a
              href="https://wa.me/256757460297"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 mt-2 px-4 py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Direct (+256 757460297)</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
