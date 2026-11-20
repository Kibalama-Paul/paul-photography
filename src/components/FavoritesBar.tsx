import React from 'react';
import {
  Columns2,
  Columns3,
  Download,
  Heart,
  LayoutGrid,
  Play,
  Send,
  Share2,
} from 'lucide-react';
import { getGalleryThemeClasses } from '../data/galleryThemes';
import {
  GalleryFilter,
  GalleryHeaderStyle,
  GalleryLayoutMode,
  GalleryThemeId,
  PhotoItem,
} from '../types/gallery';
import { PixiesetCoverHero } from './PixiesetCoverHero';

interface FavoritesBarProps {
  sessionName: string;
  clientDisplayName?: string;
  photographerName: string;
  shootDate: string;
  category?: string;
  instructions?: string;
  totalCount: number;
  favoritesCount: number;
  maxSelections?: number;
  activeFilter: GalleryFilter;
  layoutMode: GalleryLayoutMode;
  theme?: GalleryThemeId;
  headerStyle?: GalleryHeaderStyle;
  coverPhoto?: PhotoItem;
  onFilterChange: (filter: GalleryFilter) => void;
  onLayoutModeChange: (mode: GalleryLayoutMode) => void;
  onOpenSubmit: () => void;
  onOpenShare?: () => void;
  onOpenDownload?: () => void;
  onOpenSlideshow?: () => void;
  onOpenCompare?: () => void;
  showSubmitButton?: boolean;
}

export const FavoritesBar: React.FC<FavoritesBarProps> = ({
  sessionName,
  clientDisplayName,
  photographerName,
  shootDate,
  category,
  instructions,
  totalCount,
  favoritesCount,
  maxSelections,
  activeFilter,
  layoutMode,
  theme = 'editorial-light',
  headerStyle = 'editorial',
  coverPhoto,
  onFilterChange,
  onLayoutModeChange,
  onOpenSubmit,
  onOpenShare,
  onOpenDownload,
  onOpenSlideshow,
  onOpenCompare,
  showSubmitButton = true,
}) => {
  const t = getGalleryThemeClasses(theme);
  const favoritesCounterLabel = maxSelections
    ? `${favoritesCount}/${maxSelections}`
    : String(favoritesCount);

  const scrollToGallery = () => {
    const el = document.getElementById('gallery-sticky-bar');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="mb-6">
      {/* Pixieset Cover Hero (Full-Bleed, Split, or Editorial) */}
      <PixiesetCoverHero
        sessionName={sessionName}
        clientDisplayName={clientDisplayName}
        photographerName={photographerName}
        shootDate={shootDate}
        category={category}
        instructions={instructions}
        totalCount={totalCount}
        coverPhoto={coverPhoto}
        headerStyle={headerStyle}
        theme={theme}
        onScrollToGallery={scrollToGallery}
      />

      {/* Sticky Pixieset Navigation & Action Toolbar */}
      <div
        id="gallery-sticky-bar"
        className={`sticky top-3 z-20 mt-4 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 shadow-sm backdrop-blur-md transition-all ${t.toolbarBg}`}
        role="region"
        aria-label="Gallery filter and action controls"
      >
        {/* Left: Filter Tabs (All Photos vs My Favorites) */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex items-center gap-1 rounded-lg p-1 ${t.tabContainerBg}`}
            role="tablist"
            aria-label="Filter gallery photos"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === 'all'}
              onClick={() => onFilterChange('all')}
              className={`inline-flex min-h-[36px] items-center gap-2 whitespace-nowrap shrink-0 rounded-md px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                activeFilter === 'all'
                  ? t.tabActiveBg
                  : `${t.textMuted} hover:${t.textPrimary}`
              }`}
            >
              <span>All Photos</span>
              <span className="font-mono text-xs tabular-nums opacity-75">
                {totalCount}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === 'favorites'}
              onClick={() => onFilterChange('favorites')}
              className={`inline-flex min-h-[36px] items-center gap-2 whitespace-nowrap shrink-0 rounded-md px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                activeFilter === 'favorites'
                  ? t.tabActiveBg
                  : `${t.textMuted} hover:${t.textPrimary}`
              }`}
            >
              <Heart
                size={14}
                className={
                  favoritesCount > 0 ? 'fill-rose-600 text-rose-600' : 'opacity-70'
                }
              />
              <span>Selected Favorites</span>
              <span className="font-mono text-xs tabular-nums opacity-75">
                {favoritesCounterLabel}
              </span>
            </button>
          </div>
        </div>

        {/* Right: Pixieset Actions (Slideshow, Compare, Download, Share, Submit) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Layout switches (Desktop) */}
          <div
            className={`hidden items-center gap-1 rounded-lg p-1 lg:inline-flex ${t.tabContainerBg}`}
            role="group"
            aria-label="Gallery layout"
          >
            <button
              type="button"
              onClick={() => onLayoutModeChange('masonry')}
              aria-pressed={layoutMode === 'masonry'}
              title="Masonry layout"
              className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                layoutMode === 'masonry' ? t.tabActiveBg : t.textMuted
              }`}
            >
              <Columns3 size={14} />
              <span>Masonry</span>
            </button>
            <button
              type="button"
              onClick={() => onLayoutModeChange('grid')}
              aria-pressed={layoutMode === 'grid'}
              title="Uniform grid layout"
              className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                layoutMode === 'grid' ? t.tabActiveBg : t.textMuted
              }`}
            >
              <LayoutGrid size={14} />
              <span>Grid</span>
            </button>
          </div>

          {/* Slideshow Button */}
          {onOpenSlideshow && (
            <button
              type="button"
              onClick={onOpenSlideshow}
              title="Play Fullscreen Slideshow"
              className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${t.border} ${t.surface} ${t.textSecondary} hover:${t.textPrimary}`}
            >
              <Play size={13} className="fill-current" />
              <span className="hidden sm:inline">Slideshow</span>
            </button>
          )}

          {/* Compare Button */}
          {onOpenCompare && totalCount >= 2 && (
            <button
              type="button"
              onClick={onOpenCompare}
              title="Compare Photos Side-by-Side"
              className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${t.border} ${t.surface} ${t.textSecondary} hover:${t.textPrimary}`}
            >
              <Columns2 size={14} />
              <span className="hidden sm:inline">Compare</span>
            </button>
          )}

          {/* Download Button */}
          {onOpenDownload && (
            <button
              type="button"
              onClick={onOpenDownload}
              title="Download High-Res Photos"
              className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${t.border} ${t.surface} ${t.textSecondary} hover:${t.textPrimary}`}
            >
              <Download size={14} />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}

          {/* Share Button */}
          {onOpenShare && (
            <button
              type="button"
              onClick={onOpenShare}
              title="Share Gallery Link & QR Code"
              className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${t.border} ${t.surface} ${t.textSecondary} hover:${t.textPrimary}`}
            >
              <Share2 size={14} />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          {/* Submit Selections CTA Button */}
          {showSubmitButton && (
            <button
              type="button"
              onClick={onOpenSubmit}
              className={`inline-flex min-h-[38px] items-center gap-2 whitespace-nowrap shrink-0 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all shadow-xs ${t.primaryBtn}`}
            >
              <Send size={14} />
              <span>
                Submit Selections
                {favoritesCount > 0 ? ` (${favoritesCount})` : ''}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
