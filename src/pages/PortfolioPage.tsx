import React, { useState, useEffect } from 'react';
import { PageRoute, PortfolioMediaItem } from '../types';
import { getPortfolioMediaBySection, PORTFOLIO_MEDIA_EVENT } from '../utils/portfolioMediaStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Briefcase, Film, Calendar, CheckCircle, Play, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

interface PortfolioPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ onNavigate }) => {
  const [portfolioMedia, setPortfolioMedia] = useState<PortfolioMediaItem[]>(() => getPortfolioMediaBySection('portfolio'));
  const [ceoReelMedia, setCeoReelMedia] = useState<PortfolioMediaItem[]>(() => getPortfolioMediaBySection('ceo-reel'));

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxItem, setLightboxItem] = useState<PortfolioMediaItem | null>(null);

  // Sync with store updates
  useEffect(() => {
    const handleUpdate = () => {
      setPortfolioMedia(getPortfolioMediaBySection('portfolio'));
      setCeoReelMedia(getPortfolioMediaBySection('ceo-reel'));
    };
    window.addEventListener(PORTFOLIO_MEDIA_EVENT, handleUpdate);
    return () => window.removeEventListener(PORTFOLIO_MEDIA_EVENT, handleUpdate);
  }, []);

  // Profile images for the rotating hero — use portfolio images
  const profileImages = portfolioMedia.filter((m) => m.type === 'image').map((m) => m.url);

  // Auto-cycle profile images every 2.5 seconds
  useEffect(() => {
    if (profileImages.length === 0) return;
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % profileImages.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [profileImages.length]);

  // Reset index if it's out of range
  useEffect(() => {
    if (currentImageIndex >= profileImages.length && profileImages.length > 0) {
      setCurrentImageIndex(0);
    }
  }, [profileImages.length, currentImageIndex]);

  const skills = [
    "Portrait Photography",
    "Landscape Photography",
    "Event Photography",
    "Photo Editing & Retouching",
    "Studio Lighting",
    "Cinematography",
    "Graphics Editing",
    "UI & UX Designer",
    "IT Personnel",
    "Motion Image Colorist"
  ];

  const experience = [
    {
      role: "Senior Photographer",
      company: "BUGEMA UNIVERSITY MEDIA",
      period: "2023 - Present",
      description: "Directing high-profile university events, official media documentation, and visual brand identity."
    },
    {
      role: "Cinematographer",
      company: "Nezer Studio",
      period: "2016 - Present",
      description: "Crafting cinematic commercials, music reels, high-end wedding films, and color grading."
    },
    {
      role: "Freelance Creative Director",
      company: "Independent",
      period: "2016 - 2022",
      description: "Delivered over 500 bespoke portraits, weddings, fashion shoots, and corporate coverage."
    },
    {
      role: "Photography Workshop Instructor",
      company: "Media Arts Initiative",
      period: "2016 - 2020",
      description: "Mentoring emerging photographers in manual exposure, lighting setups, and post-production."
    }
  ];

  // Lightbox navigation for portfolio gallery
  const portfolioGalleryItems = portfolioMedia.filter((m) => m.type === 'image' || m.type === 'video');

  const handleLightboxPrev = () => {
    if (!lightboxItem) return;
    const idx = portfolioGalleryItems.findIndex((m) => m.id === lightboxItem.id);
    if (idx > 0) setLightboxItem(portfolioGalleryItems[idx - 1]);
    else setLightboxItem(portfolioGalleryItems[portfolioGalleryItems.length - 1]);
  };

  const handleLightboxNext = () => {
    if (!lightboxItem) return;
    const idx = portfolioGalleryItems.findIndex((m) => m.id === lightboxItem.id);
    if (idx < portfolioGalleryItems.length - 1) setLightboxItem(portfolioGalleryItems[idx + 1]);
    else setLightboxItem(portfolioGalleryItems[0]);
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Background ambient gradient */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/20 via-neutral-950 to-black pointer-events-none" />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden"
      >
        {/* Header Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
            KIBALAMA PAUL <span className="text-purple-400">(CEO)</span>
          </h1>
          <p className="text-sm text-gray-400 mt-2 font-light">
            Bugema University Media Senior Photographer • 10+ Years Industry Excellence
          </p>
        </div>

        {/* Profile Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center mb-14">
          {/* Dynamic Profile Image Rotator */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="relative w-64 h-80 sm:w-72 sm:h-96 rounded-3xl overflow-hidden shadow-2xl border-2 border-purple-500/30 group">
              {profileImages.length > 0 ? (
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentImageIndex}
                    src={profileImages[currentImageIndex]}
                    alt="Kibalama Paul"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full h-full object-cover"
                  />
                </AnimatePresence>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                  No images added yet
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                <span className="font-semibold bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-md">
                  Kibalama Paul
                </span>
                {profileImages.length > 0 && (
                  <span className="text-[10px] text-gray-300 bg-purple-900/60 px-2 py-0.5 rounded-md">
                    {currentImageIndex + 1} / {profileImages.length}
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail dots selector */}
            {profileImages.length > 1 && (
              <div className="flex gap-2 mt-4">
                {profileImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIndex(i)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      i === currentImageIndex ? 'w-6 bg-cyan-400' : 'w-2 bg-white/20 hover:bg-white/40'
                    }`}
                    aria-label={`Photo ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bio text */}
          <div className="md:col-span-7">
            <div className="glass-panel-light p-6 sm:p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span>About Me</span>
                <span className="w-12 h-0.5 bg-gradient-to-r from-cyan-400 to-transparent" />
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4 text-base">
                Hello! I'm <strong className="text-white font-semibold">Kibalama Paul</strong>, a passionate visual artist and cinematographer with over a decade of hands-on experience capturing life's most unforgettable moments.
              </p>
              <p className="text-gray-300 leading-relaxed mb-6 text-base">
                From high-fashion studio portraits to documentary-grade university ceremonies and commercial productions, I bring meticulous lighting, intentional composition, and premium color grading to every frame.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={() => onNavigate('booking')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-purple-900/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book with Kibalama Paul</span>
                </button>
                <button
                  onClick={() => onNavigate('gallery')}
                  className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span>View All 100+ Works</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Skills & Capabilities */}
        <div className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Award className="w-6 h-6 text-purple-400" />
            <span>Core Expertise & Skills</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {skills.map((skill, index) => (
              <motion.div
                key={skill}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index % 5), duration: 0.4 }}
                className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-purple-400/40 hover:bg-white/10 transition-all flex items-center gap-2.5 text-xs sm:text-sm font-medium text-gray-200"
              >
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{skill}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Work Experience */}
        <div className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-cyan-400" />
            <span>Work Experience & Milestones</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {experience.map((exp, idx) => (
              <motion.div
                key={exp.role + exp.company}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx, duration: 0.4 }}
                className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/30 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-bold text-white">{exp.role}</h3>
                  <span className="text-[11px] font-semibold text-purple-300 bg-purple-900/40 border border-purple-500/30 px-2 py-0.5 rounded-full">
                    {exp.period}
                  </span>
                </div>
                <div className="text-xs font-semibold text-cyan-300 mb-2">{exp.company}</div>
                <p className="text-xs text-gray-400 leading-relaxed">{exp.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── PORTFOLIO SHOWCASE GALLERY ─────────────────────────── */}
        {portfolioMedia.length > 0 && (
          <div className="mb-14 pt-8 border-t border-white/10">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">PORTFOLIO SHOWCASE</h2>
              <p className="text-xs text-gray-400 mt-1">A curated collection of signature images & video work</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {portfolioMedia.map((media, index) => (
                <motion.div
                  key={media.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.05, 0.5), duration: 0.4 }}
                  className="relative group rounded-2xl overflow-hidden border border-white/15 bg-neutral-900 aspect-[3/4] cursor-pointer shadow-xl hover:border-purple-400/40 transition-all"
                  onClick={() => setLightboxItem(media)}
                >
                  {media.type === 'image' ? (
                    <img
                      src={media.url}
                      alt={media.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <video
                        src={media.url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20">
                          <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                  {/* Title overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white drop-shadow-lg truncate">{media.title}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      media.type === 'video'
                        ? 'bg-red-600/80 text-white'
                        : 'bg-purple-600/80 text-purple-100'
                    }`}>
                      {media.type === 'video' ? '▶ Video' : 'Photo'}
                    </span>
                  </div>

                  {/* Hover zoom icon */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="p-1.5 rounded-full bg-white/20 backdrop-blur-md">
                      <ZoomIn className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── THE CEO REEL Video Section ─────────────────────────── */}
        <div className="pt-8 border-t border-white/10">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">THE CEO REEL</h2>
            <p className="text-xs text-gray-400 mt-1">Official portrait video showreel featuring Kibalama Paul</p>
          </div>

          {ceoReelMedia.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <Film className="w-12 h-12 mx-auto mb-3 stroke-1" />
              <p className="text-sm">No CEO reel media added yet. Add items from the Admin Dashboard.</p>
            </div>
          ) : (
            <div className={`grid gap-6 ${
              ceoReelMedia.length === 1
                ? 'max-w-xs sm:max-w-sm mx-auto'
                : ceoReelMedia.length === 2
                  ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto'
            }`}>
              {ceoReelMedia.map((media) => (
                <div key={media.id} className="rounded-3xl overflow-hidden border-2 border-purple-500/40 shadow-2xl bg-black relative aspect-[9/16] group">
                  {media.type === 'video' ? (
                    <>
                      <video
                        controls
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      >
                        <source src={media.url} type="video/mp4" />
                        Your browser does not support HTML5 video.
                      </video>
                      {/* Reel Badge Header */}
                      <div className="absolute top-3 left-3 right-3 flex justify-between items-center pointer-events-none">
                        <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                          REEL • 9:16 PORTRAIT
                        </span>
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      </div>
                    </>
                  ) : (
                    <>
                      <img
                        src={media.url}
                        alt={media.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    </>
                  )}
                  {/* Title at the bottom */}
                  <div className="absolute bottom-3 left-3 right-3 text-center pointer-events-none">
                    <span className="text-xs font-bold text-white bg-black/50 backdrop-blur-md px-3 py-1 rounded-full">
                      {media.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── LIGHTBOX MODAL ──────────────────────────────── */}
      <AnimatePresence>
        {lightboxItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6"
            onClick={() => setLightboxItem(null)}
          >
            {/* Top bar */}
            <div
              className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-sm font-bold text-white bg-white/10 px-3 py-1 rounded-lg">
                {lightboxItem.title}
              </span>
              <button
                onClick={() => setLightboxItem(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Nav arrows */}
            {portfolioGalleryItems.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handleLightboxPrev(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer z-10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleLightboxNext(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer z-10"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Media content */}
            <motion.div
              key={lightboxItem.id}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[82vh] flex items-center justify-center rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black"
            >
              {lightboxItem.type === 'image' ? (
                <img
                  src={lightboxItem.url}
                  alt={lightboxItem.title}
                  className="max-h-[80vh] w-auto max-w-full object-contain rounded-2xl"
                />
              ) : (
                <video
                  controls
                  autoPlay
                  className="max-h-[80vh] w-auto max-w-full rounded-2xl"
                >
                  <source src={lightboxItem.url} type="video/mp4" />
                </video>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
