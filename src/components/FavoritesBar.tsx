import React from 'react';
import { Columns3, Heart, LayoutGrid, Send } from 'lucide-react';
import { getGalleryThemeClasses } from '../data/galleryThemes';
import {
  GalleryFilter,
  GalleryHeaderStyle,
  GalleryLayoutMode,
  GalleryThemeId,
  PhotoItem,
} from '../types/gallery';

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
  showSubmitButton = true,
}) => {
  const t = getGalleryThemeClasses(theme);
  const favoritesCounterLabel = maxSelections
    ? `${favoritesCount}/${maxSelections}`
    : String(favoritesCount);

  return (
    <header className="mb-8">
      {headerStyle === 'split-cover' && coverPhoto ? (
        <div
          className={`grid grid-cols-1 items-stretch gap-6 rounded-2xl border p-6 lg:grid-cols-12 lg:p-8 ${t.surface} ${t.border}`}
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

            {maxSelections && (
              <div className={`border-t pt-4 text-xs ${t.border} ${t.textMuted}`}>
                Package allowance:{' '}
                <span className={`font-mono font-semibold tabular-nums ${t.textPrimary}`}>
                  {favoritesCount} of {maxSelections}
                </span>{' '}
                frames selected
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200/20 lg:col-span-5">
            <img
              src={coverPhoto.fullUrl}
              alt={coverPhoto.title || sessionName}
              referrerPolicy="no-referrer"
              className="h-64 w-full object-cover lg:h-full lg:max-h-[340px]"
            />
          </div>
        </div>
      ) : (
        <div className="max-w-3xl">
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
      )}

      <div
        className={`sticky top-3 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2.5 shadow-sm backdrop-blur-md ${t.toolbarBg}`}
        role="region"
        aria-label="Gallery filter and layout controls"
      >
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
              className={`inline-flex min-h-[38px] items-center gap-2 whitespace-nowrap shrink-0 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
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
              className={`inline-flex min-h-[38px] items-center gap-2 whitespace-nowrap shrink-0 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                activeFilter === 'favorites'
                  ? t.tabActiveBg
                  : `${t.textMuted} hover:${t.textPrimary}`
              }`}
            >
              <Heart
                size={15}
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

        <div className="flex items-center gap-2.5">
          <div
            className={`hidden items-center gap-1 rounded-lg p-1 sm:inline-flex ${t.tabContainerBg}`}
            role="group"
            aria-label="Gallery layout"
          >
            <button
              type="button"
              onClick={() => onLayoutModeChange('masonry')}
              aria-pressed={layoutMode === 'masonry'}
              title="Masonry layout"
              className={`inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
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
              className={`inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                layoutMode === 'grid' ? t.tabActiveBg : t.textMuted
              }`}
            >
              <LayoutGrid size={14} />
              <span>Grid</span>
            </button>
          </div>

          {showSubmitButton && (
            <button
              type="button"
              onClick={onOpenSubmit}
              className={`inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${t.primaryBtn}`}
            >
              <Send size={15} />
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
