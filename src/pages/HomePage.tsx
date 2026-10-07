import React, { useState, useEffect } from 'react';
import { PageRoute } from '../types';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, MessageCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { getFeaturedGalleryItems } from '../utils/galleryStore';

interface HomePageProps {
  onNavigate: (page: PageRoute) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [sampleCards, setSampleCards] = useState(() => getFeaturedGalleryItems());
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const handleUpdate = () => setSampleCards(getFeaturedGalleryItems());
    window.addEventListener('paul_gallery_updated', handleUpdate);
    return () => window.removeEventListener('paul_gallery_updated', handleUpdate);
  }, []);

  const toggleFlip = (id: number) => {
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between pt-24 pb-12 overflow-hidden">
      {/* Background Video */}
      <div className="fixed inset-0 w-full h-full -z-20 overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover scale-105"
        >
          <source
            src="https://res.cloudinary.com/dirfcqs1f/video/upload/v1748599923/0527_vf9mcb.mp4"
            type="video/mp4"
          />
        </video>
      </div>

      {/* Frosted Glass Overlay */}
      <div className="fixed inset-0 -z-10 bg-black/45 backdrop-blur-[8px]" />

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 w-full flex flex-col items-center my-auto">
        {/* Main Glassmorphic Welcome Card */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-3xl glass-panel-light rounded-3xl p-6 sm:p-10 text-center shadow-2xl relative overflow-hidden"
        >
          {/* Subtle decorative glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Heading */}

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-4 drop-shadow-md"
          >
            Welcome to <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-purple-300 via-white to-cyan-300 bg-clip-text text-transparent">
              Paul Photography
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-base sm:text-lg text-gray-200 max-w-xl mx-auto mb-8 font-light"
          >
            Capturing moments, preserving memories. High-definition portraits, cinematic events, studio sessions, and creative direction.
          </motion.p>

          {/* Primary Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
          >
            <button
              onClick={() => onNavigate('portfolio')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 neu-button flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105"
            >
              <span>View Portfolio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('packages')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 neu-button flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105"
            >
              <span>Packages & Pricing</span>
            </button>
            <button
              onClick={() => onNavigate('booking')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-semibold text-slate-900 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 neu-button flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105"
            >
              <span>Book for a Shoot</span>
              <Sparkles className="w-4 h-4 text-slate-900" />
            </button>
          </motion.div>

          {/* Glass Navigation Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-white/10"
          >
            <button
              onClick={() => onNavigate('gallery')}
              className="glass-button px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 cursor-pointer"
            >
              <span>Photos by Paul</span>
              <span className="px-1.5 py-0.5 rounded-md bg-purple-500/30 text-[10px] text-purple-200">100+</span>
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className="glass-button px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white uppercase tracking-wider cursor-pointer"
            >
              Contacts
            </button>
            <a
              href="https://whatsapp.com/channel/0029VauzDn7BVJl79HfkFx0h"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-button px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-emerald-300 hover:text-emerald-200 uppercase tracking-wider flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Channel</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </motion.div>
        </motion.div>

        {/* Interactive 3D Flip Card Sampler Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="w-full mt-12 text-center"
        >
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="text-left">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>Featured Flip Cards</span>
                <span className="text-xs font-normal text-purple-300 px-2 py-0.5 rounded-full bg-purple-900/40 border border-purple-500/30">
                  Hover or tap to flip 3D
                </span>
              </h2>
              <p className="text-xs text-gray-400">See original shoot vs edited/back perspective</p>
            </div>
            <button
              onClick={() => onNavigate('gallery')}
              className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Explore All 100+</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {sampleCards.map((card) => {
              const isFlipped = flippedCards[card.id] || false;
              return (
                <div
                  key={card.id}
                  onClick={() => toggleFlip(card.id)}
                  className="perspective-1000 h-64 sm:h-72 w-full cursor-pointer group"
                >
                  <div
                    className={`relative w-full h-full duration-700 preserve-3d transition-transform rounded-2xl shadow-xl ${
                      isFlipped ? 'rotate-y-180' : 'group-hover:rotate-y-180'
                    }`}
                  >
                    {/* Front */}
                    <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl overflow-hidden border border-white/15 bg-neutral-900">
                      <img
                        src={card.frontImg}
                        alt="Front"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-[11px]">
                        <span className="font-medium bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm">Front</span>
                        <span className="text-gray-300 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 text-cyan-400" /> Flip
                        </span>
                      </div>
                    </div>

                    {/* Back */}
                    <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl overflow-hidden border border-cyan-400/40 bg-neutral-900">
                      <img
                        src={card.backImg}
                        alt="Back"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-[11px]">
                        <span className="font-medium bg-purple-900/80 px-2 py-0.5 rounded-md backdrop-blur-sm text-purple-200">
                          Back Card
                        </span>
                        <span className="text-xs text-cyan-300 font-bold">Paul Shot</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Social Connect Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-10"
        >
          <a
            href="https://www.instagram.com/paul_photography256?igsh=MWk4MW04b2hreWJwYQ=="
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-full text-xs font-medium text-pink-300 bg-pink-950/40 border border-pink-500/30 hover:bg-pink-900/50 transition-all hover:scale-105"
          >
            Instagram @paul_photography256
          </a>
          <a
            href="https://www.tiktok.com/@paulphotography256?_t=ZM-8whyFA0vtdo&_r=1"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-full text-xs font-medium text-gray-200 bg-neutral-800/60 border border-white/20 hover:bg-neutral-700/60 transition-all hover:scale-105"
          >
            TikTok @paulphotography256
          </a>
          <a
            href="https://wa.me/256757460297"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-full text-xs font-medium text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/50 transition-all hover:scale-105"
          >
            WhatsApp +256 757460297
          </a>
          <a
            href="https://youtube.com/@paulphotography256?si=D0AT51krGUbT07LV"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-full text-xs font-medium text-red-300 bg-red-950/40 border border-red-500/30 hover:bg-red-900/50 transition-all hover:scale-105"
          >
            YouTube Channel
          </a>
        </motion.div>
      </div>
    </div>
  );
};
