import React, { useState } from 'react';
import {
  Check,
  Columns2,
  Download,
  Expand,
  Heart,
  ImageOff,
  MessageSquarePlus,
  X,
} from 'lucide-react';
import { getGalleryThemeClasses } from '../data/galleryThemes';
import {
  GalleryLayoutMode,
  GalleryThemeId,
  PhotoItem,
} from '../types/gallery';

interface GalleryGridProps {
  photos: PhotoItem[];
  favoriteSet: Set<string>;
  notesByPhotoId: Record<string, string>;
  layoutMode: GalleryLayoutMode;
  theme?: GalleryThemeId;
  watermarkEnabled?: boolean;
  watermarkText?: string;
  allowDownload?: boolean;
  onToggleFavorite: (photoId: string) => void;
  onUpdateNote: (photoId: string, note: string) => void;
  onOpenLightbox: (photoId: string) => void;
  onOpenCompare?: (photoId: string) => void;
  onQuickDownload?: (photo: PhotoItem) => void;
  emptyMessage: string;
  onShowAll?: () => void;
}

interface PhotoMediaProps {
  photo: PhotoItem;
  layoutMode: GalleryLayoutMode;
  watermarkEnabled?: boolean;
  watermarkText?: string;
  onOpenLightbox: (photoId: string) => void;
}

const PhotoMedia: React.FC<PhotoMediaProps> = ({
  photo,
  layoutMode,
  watermarkEnabled = false,
  watermarkText = 'Paul Photography 256',
  onOpenLightbox,
}) => {
  const [hasError, setHasError] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onOpenLightbox(photo.id)}
      aria-label={`Open ${photo.filename} in lightbox`}
      className={`group relative block w-full overflow-hidden bg-zinc-200/40 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 ${
        layoutMode === 'grid' ? 'aspect-[4/3]' : ''
      }`}
    >
      {hasError ? (
        <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-zinc-100 px-4 text-center text-zinc-500">
          <ImageOff size={24} strokeWidth={1.5} />
          <span className="font-mono text-xs">{photo.filename}</span>
        </div>
      ) : (
        <img
          src={photo.thumbnailUrl}
          alt={photo.title || photo.filename}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          className={`block w-full transition-transform duration-200 ease-out group-hover:scale-[1.015] pointer-events-none select-none ${
            layoutMode === 'grid' ? 'h-full object-cover' : 'h-auto object-cover'
          }`}
        />
      )}

      {watermarkEnabled && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-30 select-none"
        >
          <span className="transform -rotate-25 font-mono text-xs sm:text-sm font-semibold tracking-widest text-white/90 drop-shadow-md whitespace-nowrap uppercase">
            &copy; {watermarkText}
          </span>
        </div>
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/45 via-black/10 to-transparent opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 left-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950/75 text-white opacity-0 backdrop-blur-xs transition-opacity duration-150 group-hover:opacity-100"
      >
        <Expand size={14} />
      </span>
    </button>
  );
};

export const GalleryGrid: React.FC<GalleryGridProps> = ({
  photos,
  favoriteSet,
  notesByPhotoId,
  layoutMode,
  theme = 'editorial-light',
  watermarkEnabled = false,
  watermarkText = 'Paul Photography 256',
  allowDownload = false,
  onToggleFavorite,
  onUpdateNote,
  onOpenLightbox,
  onOpenCompare,
  onQuickDownload,
  emptyMessage,
  onShowAll,
}) => {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState('');
  const t = getGalleryThemeClasses(theme);
  const isDark = theme === 'obsidian-dark';

  const openNoteEditor = (photoId: string) => {
    setEditingNoteId(photoId);
    setDraftNote(notesByPhotoId[photoId] || '');
  };

  const saveNoteEditor = (photoId: string) => {
    onUpdateNote(photoId, draftNote.trim());
    setEditingNoteId(null);
  };

  if (photos.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-4 rounded-2xl border px-6 py-20 text-center ${t.surface} ${t.border}`}
      >
        <Heart size={32} strokeWidth={1.5} className={t.textMuted} />
        <p className={`max-w-md text-sm ${t.textSecondary}`}>{emptyMessage}</p>
        {onShowAll && (
          <button
            type="button"
            onClick={onShowAll}
            className={`inline-flex min-h-[40px] items-center justify-center whitespace-nowrap shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${t.border} ${t.surface} ${t.textPrimary} hover:${t.surfaceMuted}`}
          >
            View All Photos
          </button>
        )}
      </div>
    );
  }

  const containerClass =
    layoutMode === 'masonry'
      ? 'columns-1 gap-5 sm:columns-2 lg:columns-3'
      : 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={containerClass} aria-label="Client proofing photo gallery">
      {photos.map((photo) => {
        const isFavorite = favoriteSet.has(photo.id);
        const existingNote = notesByPhotoId[photo.id] || '';
        const isEditingNote = editingNoteId === photo.id;

        return (
          <article
            key={photo.id}
            className={`${
              layoutMode === 'masonry' ? 'mb-5 break-inside-avoid' : ''
            } overflow-hidden rounded-xl border transition-colors duration-150 ${t.surface} ${
              isFavorite
                ? 'border-rose-500/70 ring-1 ring-rose-500/30'
                : t.border
            }`}
          >
            <div className="relative">
              <PhotoMedia
                photo={photo}
                layoutMode={layoutMode}
                watermarkEnabled={watermarkEnabled}
                watermarkText={watermarkText}
                onOpenLightbox={onOpenLightbox}
              />

              {/* Set Badge Tag */}
              {photo.set && (
                <span className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-medium text-white shadow-xs">
                  {photo.set}
                </span>
              )}

              {/* Top-Right Favorite Heart */}
              <button
                type="button"
                onClick={() => onToggleFavorite(photo.id)}
                aria-pressed={isFavorite}
                aria-label={
                  isFavorite
                    ? `Remove ${photo.filename} from favorites`
                    : `Add ${photo.filename} to favorites`
                }
                className={`absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border transition-transform duration-150 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  isFavorite
                    ? 'border-rose-600 bg-rose-600 text-white shadow-sm'
                    : 'border-white/30 bg-zinc-950/60 text-white backdrop-blur-xs hover:bg-zinc-950/80'
                }`}
              >
                <Heart size={16} className={isFavorite ? 'fill-white' : ''} />
              </button>
            </div>

            {/* Photo Info & Actions Bar */}
            <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate font-mono text-xs font-medium tabular-nums ${t.textPrimary}`}
                  title={photo.filename}
                >
                  {photo.filename}
                </p>
                {photo.title && (
                  <p className={`truncate text-xs ${t.textMuted}`}>{photo.title}</p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Compare Button */}
                {onOpenCompare && photos.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => onOpenCompare(photo.id)}
                    title={`Compare ${photo.filename} side-by-side`}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs transition-colors ${t.surface} ${t.border} ${t.textMuted} hover:${t.textPrimary}`}
                  >
                    <Columns2 size={13} />
                  </button>
                )}

                {/* Quick Download Button */}
                {allowDownload && onQuickDownload && (
                  <button
                    type="button"
                    onClick={() => onQuickDownload(photo)}
                    title={`Download ${photo.filename}`}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs transition-colors ${t.surface} ${t.border} ${t.textMuted} hover:${t.textPrimary}`}
                  >
                    <Download size={13} />
                  </button>
                )}

                {/* Retouch / Note Button */}
                <button
                  type="button"
                  onClick={() =>
                    isEditingNote ? setEditingNoteId(null) : openNoteEditor(photo.id)
                  }
                  aria-expanded={isEditingNote}
                  title="Add retouching instruction"
                  className={`inline-flex min-h-[32px] items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-1 text-xs font-medium transition-colors ${
                    existingNote
                      ? `${t.surfaceMuted} ${t.border} ${t.textPrimary}`
                      : `${t.surface} ${t.border} ${t.textMuted}`
                  }`}
                >
                  <MessageSquarePlus size={13} />
                  <span>{existingNote ? 'Edit Note' : 'Note'}</span>
                </button>
              </div>
            </div>

            {existingNote && !isEditingNote && (
              <button
                type="button"
                onClick={() => openNoteEditor(photo.id)}
                className={`mx-3.5 mb-3 block w-[calc(100%-1.75rem)] rounded-lg border px-3 py-2 text-left text-xs leading-relaxed transition-colors ${t.noteBox}`}
              >
                <span className={`font-medium ${t.textPrimary}`}>Note:</span> {existingNote}
              </button>
            )}

            {isEditingNote && (
              <div className={`border-t px-3.5 py-3 ${t.border}`}>
                <textarea
                  rows={2}
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                  placeholder="Optional retouching, crop, or black & white note..."
                  aria-label={`Note for ${photo.filename}`}
                  autoFocus
                  className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none ${
                    isDark
                      ? 'border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 focus:border-zinc-400'
                      : 'border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950'
                  }`}
                />
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingNoteId(null)}
                    className={`inline-flex min-h-[32px] items-center gap-1 whitespace-nowrap shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium ${t.border} ${t.textMuted}`}
                  >
                    <X size={13} />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => saveNoteEditor(photo.id)}
                    className={`inline-flex min-h-[32px] items-center gap-1 whitespace-nowrap shrink-0 rounded-md px-3 py-1 text-xs font-medium ${t.primaryBtn}`}
                  >
                    <Check size={13} />
                    <span>Save Note</span>
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
};
