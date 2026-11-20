import React from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { getGalleryThemeClasses } from '../data/galleryThemes';
import { GalleryHeaderStyle, GalleryThemeId, PhotoItem } from '../types/gallery';

interface PixiesetCoverHeroProps {
  sessionName: string;
  clientDisplayName?: string;
  photographerName: string;
  shootDate: string;
  category?: string;
  instructions?: string;
  totalCount: number;
  coverPhoto?: PhotoItem;
  headerStyle?: GalleryHeaderStyle;
  theme?: GalleryThemeId;
  onScrollToGallery?: () => void;
}

export const PixiesetCoverHero: React.FC<PixiesetCoverHeroProps> = ({
  sessionName,
  clientDisplayName,
  photographerName,
  shootDate,
  category,
  instructions,
  totalCount,
  coverPhoto,
  headerStyle = 'editorial',
  theme = 'editorial-light',
  onScrollToGallery,
}) => {
  const t = getGalleryThemeClasses(theme);

  // 1. FULL-BLEED IMMERSIVE COVER (Signature Pixieset Hero Style)
  if (headerStyle === 'full-bleed' && coverPhoto) {
    return (
      <div className="relative mb-10 -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 min-h-[75vh] sm:min-h-[85vh] flex flex-col justify-between overflow-hidden shadow-2xl">
        {/* Background Image with Dark Vignette */}
        <div className="absolute inset-0 z-0">
          <img
            src={coverPhoto.fullUrl}
            alt={coverPhoto.title || sessionName}
            referrerPolicy="no-referrer"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            className="h-full w-full object-cover scale-105 filter brightness-75 transition-transform duration-1000 ease-out pointer-events-none select-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/50" />
        </div>

        {/* Top Branding */}
        <div className="relative z-10 p-6 sm:p-10 flex items-center justify-between text-white/90">
          <span className="font-serif text-xs sm:text-sm tracking-[0.25em] uppercase font-light">
            {photographerName}
          </span>
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/30 backdrop-blur-md px-3 py-1 text-xs font-mono">
            <span>{shootDate}</span>
            <span aria-hidden="true">&middot;</span>
            <span>{totalCount} frames</span>
          </div>
        </div>

        {/* Center / Bottom Title Typography */}
        <div className="relative z-10 px-6 sm:px-12 pb-16 max-w-4xl text-white">
          {category && (
            <span className="inline-block rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/90 mb-4">
              {category}
            </span>
          )}

          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight text-white drop-shadow-md">
            {sessionName}
          </h1>

          {clientDisplayName && (
            <p className="mt-3 font-serif text-lg sm:text-xl text-white/85 font-light">
              Prepared for {clientDisplayName}
            </p>
          )}

          {instructions && (
            <p className="mt-4 max-w-2xl text-xs sm:text-sm leading-relaxed text-white/75 backdrop-blur-xs">
              {instructions}
            </p>
          )}

          {/* Scroll CTA Button */}
          <div className="mt-8">
            <button
              type="button"
              onClick={onScrollToGallery}
              className="group inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-2.5 text-xs sm:text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white hover:text-zinc-950"
            >
              <span>Explore Gallery</span>
              <ChevronDown size={16} className="group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. SPLIT-COVER STYLE
  if (headerStyle === 'split-cover' && coverPhoto) {
    return (
      <div
        className={`mb-8 grid grid-cols-1 items-stretch gap-6 rounded-2xl border p-6 lg:grid-cols-12 lg:p-8 ${t.surface} ${t.border}`}
      >
        <div className="flex flex-col justify-between gap-6 lg:col-span-7">
          <div>
            <div
              className={`mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium tracking-wide ${t.textMuted}`}
            >
              <span>{photographerName}</span>
              <span aria-hidden="true">&middot;</span>
              <span>{shootDate}</span>
              {category && (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <span>{category}</span>
                </>
              )}
              <span aria-hidden="true">&middot;</span>
              <span className="font-mono tabular-nums">{totalCount} frames</span>
            </div>

            <h1
              className={`font-serif text-3xl font-medium tracking-tight sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12] ${t.textPrimary}`}
            >
              {sessionName}
            </h1>

            {clientDisplayName && (
              <p className={`mt-2 text-sm font-medium ${t.textSecondary}`}>
                Prepared for {clientDisplayName}
              </p>
            )}

            {instructions && (
              <p className={`mt-4 max-w-xl text-sm leading-relaxed ${t.textSecondary}`}>
                {instructions}
              </p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200/20 lg:col-span-5">
          <img
            src={coverPhoto.fullUrl}
            alt={coverPhoto.title || sessionName}
            referrerPolicy="no-referrer"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            className="h-64 w-full object-cover lg:h-full lg:max-h-[340px] pointer-events-none select-none"
          />
        </div>
      </div>
    );
  }

  // 3. EDITORIAL & MINIMAL DEFAULT
  return (
    <div className="mb-6 max-w-3xl">
      <div
        className={`mb-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium tracking-wide ${t.textMuted}`}
      >
        <span>{photographerName}</span>
        <span aria-hidden="true">&middot;</span>
        <span>{shootDate}</span>
        {category && (
          <>
            <span aria-hidden="true">&middot;</span>
            <span>{category}</span>
          </>
        )}
        <span aria-hidden="true">&middot;</span>
        <span className="font-mono tabular-nums">{totalCount} frames</span>
        {clientDisplayName && (
          <>
            <span aria-hidden="true">&middot;</span>
            <span>{clientDisplayName}</span>
          </>
        )}
      </div>

      <h1
        className={`font-serif text-3xl font-medium tracking-tight sm:text-4xl ${t.textPrimary}`}
      >
        {sessionName}
      </h1>

      {instructions && (
        <p className={`mt-3 text-sm leading-relaxed sm:text-[15px] ${t.textSecondary}`}>
          {instructions}
        </p>
      )}
    </div>
  );
};
