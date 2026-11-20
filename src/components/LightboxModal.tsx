import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  ImageOff,
  Loader2,
  MessageSquare,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { PhotoItem } from '../types/gallery';
import { downloadSinglePhoto } from '../utils/downloadHelpers';

interface LightboxModalProps {
  photos: PhotoItem[];
  activePhotoId: string | null;
  favoriteSet: Set<string>;
  notesByPhotoId: Record<string, string>;
  allowDownload?: boolean;
  onClose: () => void;
  onSelectPhoto: (photoId: string) => void;
  onToggleFavorite: (photoId: string) => void;
  onUpdateNote: (photoId: string, note: string) => void;
}

const ZOOM_STEPS = [1, 1.75, 2.5];

export const LightboxModal: React.FC<LightboxModalProps> = ({
  photos,
  activePhotoId,
  favoriteSet,
  notesByPhotoId,
  allowDownload = false,
  onClose,
  onSelectPhoto,
  onToggleFavorite,
  onUpdateNote,
}) => {
  const [zoomIndex, setZoomIndex] = useState(0);
  const [panOrigin, setPanOrigin] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [imgError, setImgError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const currentIndex = photos.findIndex((p) => p.id === activePhotoId);
  const activePhoto = currentIndex >= 0 ? photos[currentIndex] : null;
  const zoomScale = ZOOM_STEPS[zoomIndex];

  useEffect(() => {
    setZoomIndex(0);
    setPanOrigin({ x: 50, y: 50 });
    setImgError(false);
    setIsDownloading(false);
    setDownloadSuccess(false);
  }, [activePhotoId]);

  const handleDownloadPhoto = async () => {
    if (!activePhoto || isDownloading) return;
    setIsDownloading(true);
    setDownloadSuccess(false);
    try {
      await downloadSinglePhoto(activePhoto);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('[Download error]', err);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (!activePhoto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (isTyping) return;

      if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) {
        onSelectPhoto(photos[currentIndex + 1].id);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onSelectPhoto(photos[currentIndex - 1].id);
      } else if (e.key.toLowerCase() === 'f') {
        onToggleFavorite(activePhoto.id);
      } else if (e.key === '+' || e.key === '=') {
        setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1));
      } else if (e.key === '-') {
        setZoomIndex((i) => Math.max(0, i - 1));
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePhoto, currentIndex, photos, onClose, onSelectPhoto, onToggleFavorite]);

  if (!activePhoto) return null;

  const isFavorite = favoriteSet.has(activePhoto.id);
  const currentNote = notesByPhotoId[activePhoto.id] || '';
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const handleCycleZoom = () => {
    setZoomIndex((prev) => (prev + 1) % ZOOM_STEPS.length);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomScale <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPanOrigin({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  const exifSummary = activePhoto.exif
    ? [
        activePhoto.exif.focalLength,
        activePhoto.exif.aperture,
        activePhoto.exif.shutterSpeed,
        activePhoto.exif.iso ? `ISO ${activePhoto.exif.iso}` : undefined,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 text-zinc-100 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Viewing ${activePhoto.filename}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
          <span className="font-mono font-medium text-white">
            {activePhoto.filename}
          </span>
          {activePhoto.title && (
            <>
              <span aria-hidden="true" className="text-zinc-500">
                &middot;
              </span>
              <span className="truncate text-zinc-300">{activePhoto.title}</span>
            </>
          )}
          <span aria-hidden="true" className="text-zinc-500">
            &middot;
          </span>
          <span className="font-mono text-xs tabular-nums text-zinc-400">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {allowDownload && (
            <button
              type="button"
              onClick={handleDownloadPhoto}
              disabled={isDownloading}
              title="Download Original High-Resolution Photo"
              className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-60"
            >
              {isDownloading ? (
                <Loader2 size={15} className="animate-spin text-white" />
              ) : downloadSuccess ? (
                <Download size={15} className="text-emerald-400" />
              ) : (
                <Download size={15} />
              )}
              <span className="hidden sm:inline">
                {isDownloading ? 'Downloading...' : downloadSuccess ? 'Saved Original' : 'Download Original'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCycleZoom}
            title="Cycle Zoom (+/-)"
            className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
          >
            {zoomScale > 1 ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
            <span className="font-mono tabular-nums">
              {Math.round(zoomScale * 100)}%
            </span>
          </button>

          <button
            type="button"
            onClick={() => onToggleFavorite(activePhoto.id)}
            aria-pressed={isFavorite}
            title="Toggle Favorite (F)"
            className={`inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              isFavorite
                ? 'border-rose-600 bg-rose-600 text-white'
                : 'border-white/15 bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Heart size={16} className={isFavorite ? 'fill-white' : ''} />
            <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close lightbox"
            title="Close (Esc)"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-4 sm:px-16">
        {hasPrev && (
          <button
            type="button"
            onClick={() => onSelectPhoto(photos[currentIndex - 1].id)}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-zinc-900/80 text-white transition-colors hover:bg-zinc-800 sm:left-5"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        <div
          onClick={handleCycleZoom}
          onMouseMove={handleMouseMove}
          className={`flex max-h-full max-w-full items-center justify-center overflow-hidden rounded-lg ${
            zoomScale > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'
          }`}
        >
          {imgError ? (
            <div className="flex h-72 w-96 flex-col items-center justify-center gap-3 rounded-xl border border-white/15 bg-zinc-900 text-zinc-400">
              <ImageOff size={32} />
              <span className="font-mono text-xs">{activePhoto.filename}</span>
            </div>
          ) : (
            <img
              src={(zoomScale > 1 && activePhoto.fullUrl) ? activePhoto.fullUrl : (activePhoto.thumbnailUrl || activePhoto.fullUrl)}
              alt={activePhoto.title || activePhoto.filename}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="max-h-[calc(100vh-190px)] max-w-full select-none object-contain transition-transform duration-200 ease-out"
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: `${panOrigin.x}% ${panOrigin.y}%`,
              }}
            />
          )}
        </div>

        {hasNext && (
          <button
            type="button"
            onClick={() => onSelectPhoto(photos[currentIndex + 1].id)}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-zinc-900/80 text-white transition-colors hover:bg-zinc-800 sm:right-5"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      <div className="border-t border-white/10 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-1 items-center gap-2.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2">
            <MessageSquare size={15} className="shrink-0 text-zinc-400" />
            <input
              type="text"
              value={currentNote}
              onChange={(e) => onUpdateNote(activePhoto.id, e.target.value)}
              placeholder={`Add crop or retouching note for ${activePhoto.filename}...`}
              aria-label={`Photo note for ${activePhoto.filename}`}
              className="w-full bg-transparent text-sm text-white placeholder:text-zinc-400 focus:outline-none"
            />
          </div>

          {exifSummary && (
            <span className="shrink-0 font-mono text-xs tabular-nums text-zinc-400">
              {exifSummary}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
