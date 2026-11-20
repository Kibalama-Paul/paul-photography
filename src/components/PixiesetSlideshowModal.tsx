import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { PhotoItem } from '../types/gallery';

interface PixiesetSlideshowModalProps {
  isOpen: boolean;
  photos: PhotoItem[];
  initialPhotoId?: string | null;
  favoriteSet: Set<string>;
  onToggleFavorite: (photoId: string) => void;
  onClose: () => void;
}

export const PixiesetSlideshowModal: React.FC<PixiesetSlideshowModalProps> = ({
  isOpen,
  photos,
  initialPhotoId,
  favoriteSet,
  onToggleFavorite,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [intervalSec, setIntervalSec] = useState(4);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    if (initialPhotoId && photos.length > 0) {
      const idx = photos.findIndex((p) => p.id === initialPhotoId);
      if (idx >= 0) setCurrentIndex(idx);
    }
  }, [initialPhotoId, photos]);

  // Slideshow auto-advance timer
  useEffect(() => {
    if (!isOpen || !isPlaying || photos.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, intervalSec * 1000);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, intervalSec, photos.length]);

  // Auto-hide controls after inactivity
  useEffect(() => {
    if (!isOpen) return;
    let hideTimer: ReturnType<typeof setTimeout>;

    const handleActivity = () => {
      setShowControls(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3500);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    return () => {
      clearTimeout(hideTimer);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [isOpen, isPlaying]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((i) => (i + 1) % photos.length);
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((i) => (i - 1 + photos.length) % photos.length);
      } else if (e.key.toLowerCase() === 'f' && photos[currentIndex]) {
        onToggleFavorite(photos[currentIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, photos, currentIndex, onClose, onToggleFavorite]);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];
  const isFavorite = favoriteSet.has(currentPhoto.id);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Top Bar - Fades out during playback */}
      <div
        className={`absolute top-0 inset-x-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent px-6 py-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="font-serif text-sm tracking-widest text-zinc-300 uppercase">
            PAUL PHOTOGRAPHY 256
          </span>
          <span className="text-zinc-500">&middot;</span>
          <span className="font-mono text-xs text-zinc-400">
            {currentIndex + 1} of {photos.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Speed picker */}
          <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1 text-xs">
            {[3, 5, 8].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setIntervalSec(sec)}
                className={`rounded px-2 py-0.5 font-mono text-[11px] transition-colors ${
                  intervalSec === sec
                    ? 'bg-white text-zinc-950 font-bold'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Exit slideshow (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Full-Bleed Slideshow Image */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <img
          key={currentPhoto.id}
          src={currentPhoto.fullUrl || currentPhoto.thumbnailUrl}
          alt={currentPhoto.filename}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          className="max-h-full max-w-full object-contain transition-all duration-700 ease-in-out pointer-events-none select-none"
        />

        {/* Previous Button */}
        <button
          type="button"
          onClick={() => setCurrentIndex((i) => (i - 1 + photos.length) % photos.length)}
          className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition-opacity duration-300 hover:bg-black/70 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <ChevronLeft size={28} />
        </button>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => setCurrentIndex((i) => (i + 1) % photos.length)}
          className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition-opacity duration-300 hover:bg-black/70 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <ChevronRight size={28} />
        </button>
      </div>

      {/* Bottom Bar - Controls & Favorite CTA */}
      <div
        className={`absolute bottom-0 inset-x-0 z-20 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/40 to-transparent px-6 py-5 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2">
          <p className="font-mono text-xs text-zinc-300">{currentPhoto.filename}</p>
          {currentPhoto.set && (
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] text-zinc-300">
              {currentPhoto.set}
            </span>
          )}
        </div>

        {/* Center Play / Pause */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-zinc-950 shadow-lg hover:scale-105 active:scale-95 transition-all"
            title={isPlaying ? 'Pause slideshow (Space)' : 'Play slideshow (Space)'}
          >
            {isPlaying ? <Pause size={20} className="fill-zinc-950" /> : <Play size={20} className="fill-zinc-950 ml-0.5" />}
          </button>
        </div>

        {/* Favorite Heart */}
        <div>
          <button
            type="button"
            onClick={() => onToggleFavorite(currentPhoto.id)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold backdrop-blur-md transition-all ${
              isFavorite
                ? 'border-rose-500 bg-rose-600 text-white shadow-lg shadow-rose-900/40'
                : 'border-white/20 bg-black/50 text-white hover:bg-black/70'
            }`}
          >
            <Heart size={16} className={isFavorite ? 'fill-white' : ''} />
            <span>{isFavorite ? 'Favorited' : 'Favorite (F)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
