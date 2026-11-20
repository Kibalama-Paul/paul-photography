import React, { useEffect, useState } from 'react';
import {
  Check,
  Columns2,
  Heart,
  ImageOff,
  Maximize2,
  Minimize2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { PhotoItem } from '../types/gallery';

interface PixiesetCompareModalProps {
  isOpen: boolean;
  photos: PhotoItem[];
  initialLeftPhotoId?: string | null;
  initialRightPhotoId?: string | null;
  favoriteSet: Set<string>;
  notesByPhotoId: Record<string, string>;
  onToggleFavorite: (photoId: string) => void;
  onClose: () => void;
}

export const PixiesetCompareModal: React.FC<PixiesetCompareModalProps> = ({
  isOpen,
  photos,
  initialLeftPhotoId,
  initialRightPhotoId,
  favoriteSet,
  notesByPhotoId,
  onToggleFavorite,
  onClose,
}) => {
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(1);
  const [activeSlot, setActiveSlot] = useState<'left' | 'right'>('right');
  const [zoomScale, setZoomScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (photos.length >= 2) {
      const lIdx = initialLeftPhotoId ? photos.findIndex((p) => p.id === initialLeftPhotoId) : 0;
      const rIdx = initialRightPhotoId ? photos.findIndex((p) => p.id === initialRightPhotoId) : (lIdx === 0 ? 1 : 0);
      setLeftIndex(lIdx >= 0 ? lIdx : 0);
      setRightIndex(rIdx >= 0 ? rIdx : Math.min(1, photos.length - 1));
    }
  }, [initialLeftPhotoId, initialRightPhotoId, photos]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || photos.length < 2) return null;

  const leftPhoto = photos[leftIndex] || photos[0];
  const rightPhoto = photos[rightIndex] || photos[1] || photos[0];

  const isLeftFavorite = favoriteSet.has(leftPhoto.id);
  const isRightFavorite = favoriteSet.has(rightPhoto.id);

  const handleSelectThumbnail = (idx: number) => {
    if (activeSlot === 'left') {
      setLeftIndex(idx);
    } else {
      setRightIndex(idx);
    }
  };

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
      className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 text-white backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
            <Columns2 size={18} />
          </div>
          <div>
            <h3 className="font-serif text-sm sm:text-base font-medium">Side-by-Side Compare</h3>
            <p className="text-[11px] text-zinc-400">
              Select slot to replace, compare facial expressions and sharpness, and click heart to favorite.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom toggle */}
          <button
            type="button"
            onClick={() => setZoomScale((z) => (z === 1 ? 1.75 : 1))}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 text-xs font-medium text-white hover:bg-white/20"
          >
            {zoomScale === 1 ? <ZoomIn size={14} /> : <ZoomOut size={14} />}
            <span>{zoomScale === 1 ? 'Zoom In' : 'Reset Zoom'}</span>
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white hover:bg-white/20"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white hover:bg-white/20"
            title="Close compare (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Split Screen Area */}
      <div className="grid flex-1 grid-cols-1 divide-y divide-white/10 overflow-hidden md:grid-cols-2 md:divide-x md:divide-y-0">
        {/* Left Photo View */}
        <div
          onClick={() => setActiveSlot('left')}
          className={`relative flex flex-col items-center justify-center overflow-hidden p-4 transition-all ${
            activeSlot === 'left' ? 'ring-2 ring-inset ring-purple-500/80 bg-white/[0.02]' : ''
          }`}
        >
          {/* Slot Label & Favorite Button */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                activeSlot === 'left' ? 'bg-purple-600 text-white shadow-xs' : 'bg-black/60 text-zinc-300'
              }`}
            >
              Photo A {activeSlot === 'left' ? '(Active Slot)' : ''}
            </span>
          </div>

          <div className="absolute top-4 right-4 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(leftPhoto.id);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition-all ${
                isLeftFavorite
                  ? 'border-rose-500 bg-rose-600 text-white shadow-md'
                  : 'border-white/20 bg-black/50 text-white hover:bg-black/70'
              }`}
            >
              <Heart size={14} className={isLeftFavorite ? 'fill-white' : ''} />
              <span>{isLeftFavorite ? 'Favorited' : 'Favorite'}</span>
            </button>
          </div>

          <div className="flex h-full w-full items-center justify-center overflow-hidden">
            <img
              src={leftPhoto.fullUrl || leftPhoto.thumbnailUrl}
              alt={leftPhoto.filename}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              className="max-h-[calc(100vh-220px)] max-w-full select-none object-contain transition-transform duration-200 pointer-events-none"
              style={{ transform: `scale(${zoomScale})` }}
            />
          </div>

          <div className="mt-2 text-center">
            <p className="font-mono text-xs text-zinc-300">{leftPhoto.filename}</p>
            {notesByPhotoId[leftPhoto.id] && (
              <p className="text-[11px] text-amber-300 italic max-w-xs truncate">
                Note: {notesByPhotoId[leftPhoto.id]}
              </p>
            )}
          </div>
        </div>

        {/* Right Photo View */}
        <div
          onClick={() => setActiveSlot('right')}
          className={`relative flex flex-col items-center justify-center overflow-hidden p-4 transition-all ${
            activeSlot === 'right' ? 'ring-2 ring-inset ring-purple-500/80 bg-white/[0.02]' : ''
          }`}
        >
          {/* Slot Label & Favorite Button */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                activeSlot === 'right' ? 'bg-purple-600 text-white shadow-xs' : 'bg-black/60 text-zinc-300'
              }`}
            >
              Photo B {activeSlot === 'right' ? '(Active Slot)' : ''}
            </span>
          </div>

          <div className="absolute top-4 right-4 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(rightPhoto.id);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition-all ${
                isRightFavorite
                  ? 'border-rose-500 bg-rose-600 text-white shadow-md'
                  : 'border-white/20 bg-black/50 text-white hover:bg-black/70'
              }`}
            >
              <Heart size={14} className={isRightFavorite ? 'fill-white' : ''} />
              <span>{isRightFavorite ? 'Favorited' : 'Favorite'}</span>
            </button>
          </div>

          <div className="flex h-full w-full items-center justify-center overflow-hidden">
            <img
              src={rightPhoto.fullUrl || rightPhoto.thumbnailUrl}
              alt={rightPhoto.filename}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              className="max-h-[calc(100vh-220px)] max-w-full select-none object-contain transition-transform duration-200 pointer-events-none"
              style={{ transform: `scale(${zoomScale})` }}
            />
          </div>

          <div className="mt-2 text-center">
            <p className="font-mono text-xs text-zinc-300">{rightPhoto.filename}</p>
            {notesByPhotoId[rightPhoto.id] && (
              <p className="text-[11px] text-amber-300 italic max-w-xs truncate">
                Note: {notesByPhotoId[rightPhoto.id]}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Filmstrip Carousel */}
      <div className="border-t border-white/10 bg-zinc-950/90 px-4 py-2.5">
        <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-400">
          <span>Click any thumbnail below to place into <strong>{activeSlot === 'left' ? 'Photo A' : 'Photo B'}</strong></span>
          <span className="font-mono">{photos.length} photos</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {photos.map((p, idx) => {
            const isLeft = idx === leftIndex;
            const isRight = idx === rightIndex;
            const isFav = favoriteSet.has(p.id);

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectThumbnail(idx)}
                className={`group relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border transition-all ${
                  isLeft
                    ? 'border-purple-500 ring-2 ring-purple-500/80 scale-105'
                    : isRight
                    ? 'border-cyan-500 ring-2 ring-cyan-500/80 scale-105'
                    : 'border-white/15 opacity-60 hover:opacity-100 hover:border-white/40'
                }`}
              >
                <img
                  src={p.thumbnailUrl || p.fullUrl}
                  alt={p.filename}
                  className="h-full w-full object-cover"
                />
                {isFav && (
                  <span className="absolute bottom-1 right-1 rounded-full bg-rose-600 p-0.5 text-white">
                    <Heart size={10} className="fill-white" />
                  </span>
                )}
                <span className="absolute top-1 left-1 rounded bg-black/70 px-1 py-0.5 font-mono text-[9px] text-white">
                  {isLeft ? 'A' : isRight ? 'B' : `${idx + 1}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
