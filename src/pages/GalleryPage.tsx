import React, { useState, useMemo, useEffect } from 'react';
import { getGalleryItems } from '../utils/galleryStore';
import { GalleryItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, RefreshCw, ChevronLeft, ChevronRight, Filter, Sparkles } from 'lucide-react';

export const GalleryPage: React.FC = () => {
  const [items, setItems] = useState<GalleryItem[]>(() => getGalleryItems());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeLightboxItem, setActiveLightboxItem] = useState<GalleryItem | null>(null);
  const [lightboxSide, setLightboxSide] = useState<'front' | 'back'>('front');
  const [mobileFlipped, setMobileFlipped] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const handleUpdate = () => setItems(getGalleryItems());
    window.addEventListener('paul_gallery_updated', handleUpdate);
    return () => window.removeEventListener('paul_gallery_updated', handleUpdate);
  }, []);

  const categories = [
    { id: 'all', label: 'All Shoots' },
    { id: 'portrait', label: 'Portraits' },
    { id: 'studio', label: 'Studio & Lighting' },
    { id: 'events', label: 'Events & Weddings' },
    { id: 'monochrome', label: 'B & W' },
  ];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toString().includes(searchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  const toggleMobileFlip = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setMobileFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openLightbox = (item: GalleryItem, side: 'front' | 'back' = 'front') => {
    setActiveLightboxItem(item);
    setLightboxSide(side);
  };

  const handleNextLightbox = () => {
    if (!activeLightboxItem) return;
    const currentIndex = filteredItems.findIndex((it) => it.id === activeLightboxItem.id);
    if (currentIndex !== -1 && currentIndex < filteredItems.length - 1) {
      setActiveLightboxItem(filteredItems[currentIndex + 1]);
    } else {
      setActiveLightboxItem(filteredItems[0]);
    }
  };

  const handlePrevLightbox = () => {
    if (!activeLightboxItem) return;
    const currentIndex = filteredItems.findIndex((it) => it.id === activeLightboxItem.id);
    if (currentIndex > 0) {
      setActiveLightboxItem(filteredItems[currentIndex - 1]);
    } else {
      setActiveLightboxItem(filteredItems[filteredItems.length - 1]);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header section with load animation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-3">
          PHOTOS BY PAUL
        </h1>
        <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto font-light">
          Explore over 100 signature shoots. Hover or tap each card to flip into the back angle, or click to enlarge.
        </p>

        {/* Filter and Search Bar */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-3 rounded-2xl max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-md shadow-purple-900/30 font-semibold'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-48">
            <input
              type="text"
              placeholder="Search by # or id..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <div className="text-xs text-gray-400 mt-3">
          Showing <span className="font-semibold text-white">{filteredItems.length}</span> photographs
        </div>
      </motion.div>

      {/* 3D Flip Card Gallery Grid */}
      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8"
      >
        {filteredItems.map((item, index) => {
          const isFlipped = mobileFlipped[item.id] || false;
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.6) }}
              className="perspective-1000 h-[380px] w-full group relative"
            >
              <div
                className={`relative w-full h-full duration-700 preserve-3d transition-transform rounded-2xl shadow-xl ${
                  isFlipped ? 'rotate-y-180' : 'group-hover:rotate-y-180'
                }`}
              >
                {/* Front Side */}
                <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl overflow-hidden border border-white/15 bg-neutral-900 flex flex-col justify-between">
                  <div className="relative w-full h-full">
                    <img
                      src={item.frontImg}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  </div>

                  {/* Overlay header & footer */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-white">
                    <span className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-semibold border border-white/10">
                      Front #{item.id}
                    </span>
                    <button
                      onClick={() => openLightbox(item, 'front')}
                      className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-all cursor-pointer"
                      title="Enlarge Photo"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-white drop-shadow">
                        Paul Photography
                      </p>
                      <span className="text-[10px] text-gray-300 capitalize">{item.category}</span>
                    </div>
                    <button
                      onClick={(e) => toggleMobileFlip(item.id, e)}
                      className="flex sm:hidden items-center gap-1 text-[11px] text-cyan-300 bg-black/60 px-2 py-1 rounded-lg backdrop-blur-md"
                    >
                      <RefreshCw className="w-3 h-3" /> Flip
                    </button>
                  </div>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl overflow-hidden border border-cyan-400/40 bg-neutral-900 flex flex-col justify-between">
                  <div className="relative w-full h-full">
                    <img
                      src={item.backImg}
                      alt={`${item.title} back`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  </div>

                  {/* Overlay header & footer */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-white">
                    <span className="px-2 py-1 rounded-md bg-cyan-950/80 backdrop-blur-md text-[11px] font-semibold text-cyan-300 border border-cyan-500/30">
                      Back #{item.id}
                    </span>
                    <button
                      onClick={() => openLightbox(item, 'back')}
                      className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-all cursor-pointer"
                      title="Enlarge Photo"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-cyan-200 drop-shadow">
                        Alternative Perspective
                      </p>
                      <span className="text-[10px] text-gray-300">Curated Edit</span>
                    </div>
                    <button
                      onClick={(e) => toggleMobileFlip(item.id, e)}
                      className="flex sm:hidden items-center gap-1 text-[11px] text-purple-300 bg-black/60 px-2 py-1 rounded-lg backdrop-blur-md"
                    >
                      <RefreshCw className="w-3 h-3" /> Flip
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activeLightboxItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6"
            onClick={() => setActiveLightboxItem(null)}
          >
            {/* Top Toolbar */}
            <div
              className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-white bg-white/10 px-3 py-1 rounded-lg">
                  Shoot #{activeLightboxItem.id}
                </span>
                <div className="flex bg-white/10 rounded-lg p-0.5">
                  <button
                    onClick={() => setLightboxSide('front')}
                    className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer ${
                      lightboxSide === 'front'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Front View
                  </button>
                  <button
                    onClick={() => setLightboxSide('back')}
                    className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer ${
                      lightboxSide === 'back'
                        ? 'bg-cyan-600 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Back View
                  </button>
                </div>
              </div>

              <button
                onClick={() => setActiveLightboxItem(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Navigation arrows */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevLightbox();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer z-10"
              aria-label="Previous"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextLightbox();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer z-10"
              aria-label="Next"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Main Lightbox Image */}
            <motion.div
              key={`${activeLightboxItem.id}-${lightboxSide}`}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[82vh] flex items-center justify-center rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black"
            >
              <img
                src={
                  lightboxSide === 'front'
                    ? activeLightboxItem.frontImg
                    : activeLightboxItem.backImg
                }
                alt="Paul Photography Enlarged"
                className="max-h-[80vh] w-auto max-w-full object-contain rounded-2xl"
              />
            </motion.div>

            {/* Bottom info */}
            <div
              className="absolute bottom-4 text-center text-xs text-gray-400"
              onClick={(e) => e.stopPropagation()}
            >
              <p>Paul Photography • Use left / right arrows to navigate all 100+ captures</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
