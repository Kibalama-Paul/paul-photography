import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, KeyRound, Loader2, Lock } from 'lucide-react';
import { getGalleryThemeClasses } from '../data/galleryThemes';
import {
  fetchGallerySession,
  loadDraftState,
  saveDraftState,
  submitFavoriteSelections,
  unlockGallerySession,
} from '../services/galleryService';
import {
  GalleryFilter,
  GalleryLayoutMode,
  GallerySession,
} from '../types/gallery';
import { FavoritesBar } from './FavoritesBar';
import { GalleryGrid } from './GalleryGrid';
import { LightboxModal } from './LightboxModal';
import { SubmitFavoritesModal } from './SubmitFavoritesModal';

export interface ProofingGalleryProps {
  /** Session identifier mapped to a studio gallery or Google Drive folder */
  sessionId?: string;
  /** Optional explicit Google Drive folder ID override */
  driveFolderId?: string;
  /** Toggle whether the sticky toolbar displays the Submit CTA (true for standalone embedding) */
  showSubmitButton?: boolean;
  /** Controlled trigger counter from parent shell to open Submit modal */
  externalSubmitTrigger?: number;
  /** Optional callback notifying parent shell whenever the favorites count updates */
  onFavoritesCountChange?: (count: number) => void;
}

export const ProofingGallery: React.FC<ProofingGalleryProps> = ({
  sessionId = import.meta.env.VITE_DEFAULT_SESSION_ID || 'kampala-editorial-2026',
  driveFolderId,
  showSubmitButton = true,
  externalSubmitTrigger = 0,
  onFavoritesCountChange,
}) => {
  const [session, setSession] = useState<GallerySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [passcodeInput, setPasscodeInput] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [notesByPhotoId, setNotesByPhotoId] = useState<Record<string, string>>({});
  const [activeFilter, setActiveFilter] = useState<GalleryFilter>('all');
  const [layoutMode, setLayoutMode] = useState<GalleryLayoutMode>('masonry');
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);

  useEffect(() => {
    if (externalSubmitTrigger > 0) {
      setIsSubmitOpen(true);
    }
  }, [externalSubmitTrigger]);

  const loadGallery = async (activeRef: { current: boolean }) => {
    setIsLoading(true);
    setLoadError(null);
    setActiveFilter('all');
    setLightboxPhotoId(null);
    setLimitNotice(null);

    try {
      const data = await fetchGallerySession(sessionId, driveFolderId);
      if (!activeRef.current) return;
      setSession(data);
      if (data.defaultLayout) {
        setLayoutMode(data.defaultLayout);
      }
      const draft = loadDraftState(data.sessionId);
      setFavoriteIds(draft.favoriteIds);
      setNotesByPhotoId(draft.notesByPhotoId);
    } catch (err) {
      if (!activeRef.current) return;
      setLoadError(
        err instanceof Error ? err.message : 'Could not load gallery photos.'
      );
    } finally {
      if (activeRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    const activeRef = { current: true };
    loadGallery(activeRef);
    return () => {
      activeRef.current = false;
    };
  }, [sessionId, driveFolderId]);

  useEffect(() => {
    if (!session || session.isLocked) return;
    saveDraftState(session.sessionId, { favoriteIds, notesByPhotoId });
  }, [session, favoriteIds, notesByPhotoId]);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const sessionPhotos = useMemo(() => {
    return Array.isArray(session?.photos) ? session.photos : [];
  }, [session]);

  const selectedPhotos = useMemo(() => {
    return sessionPhotos.filter((p) => favoriteSet.has(p.id));
  }, [sessionPhotos, favoriteSet]);

  useEffect(() => {
    onFavoritesCountChange?.(selectedPhotos.length);
  }, [selectedPhotos.length, onFavoritesCountChange]);

  const visiblePhotos = useMemo(() => {
    return activeFilter === 'favorites' ? selectedPhotos : sessionPhotos;
  }, [sessionPhotos, activeFilter, selectedPhotos]);

  const coverPhoto = useMemo(() => {
    if (sessionPhotos.length === 0) return undefined;
    return (
      sessionPhotos.find((p) => p.id === session?.coverPhotoId) || sessionPhotos[0]
    );
  }, [sessionPhotos, session?.coverPhotoId]);

  const handleToggleFavorite = (photoId: string) => {
    setLimitNotice(null);
    setFavoriteIds((prev) => {
      if (prev.includes(photoId)) {
        return prev.filter((id) => id !== photoId);
      }
      if (session?.maxSelections && prev.length >= session.maxSelections) {
        setLimitNotice(
          `Your package allows up to ${session.maxSelections} favorite selections. Deselect a frame to swap it.`
        );
        return prev;
      }
      return [...prev, photoId];
    });
  };

  const handleUpdateNote = (photoId: string, note: string) => {
    setNotesByPhotoId((prev) => {
      const next = { ...prev };
      if (!note) {
        delete next[photoId];
      } else {
        next[photoId] = note;
      }
      return next;
    });
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setUnlockError(null);
    setIsUnlocking(true);
    try {
      await unlockGallerySession(session.sessionId, passcodeInput);
      setPasscodeInput('');
      await loadGallery({ current: true });
    } catch (err) {
      setUnlockError(
        err instanceof Error ? err.message : 'Incorrect gallery passcode.'
      );
    } finally {
      setIsUnlocking(false);
    }
  };

  if (isLoading) {
    return (
      <section className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-3 px-5 py-24 text-zinc-500">
        <Loader2 size={26} className="animate-spin" />
        <p className="text-sm">Loading client gallery...</p>
      </section>
    );
  }

  if (loadError || !session) {
    return (
      <section
        role="alert"
        className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-3 px-5 py-24 text-center text-rose-700"
      >
        <AlertCircle size={26} />
        <p className="max-w-md text-sm">{loadError || 'Gallery session unavailable.'}</p>
      </section>
    );
  }

  const theme = session.theme || 'editorial-light';
  const t = getGalleryThemeClasses(theme);

  if (session.isLocked) {
    return (
      <div className={`min-h-[calc(100vh-140px)] px-4 py-16 ${t.pageBg}`}>
        <div
          className={`mx-auto max-w-md rounded-2xl border p-8 shadow-sm ${t.surface} ${t.border}`}
        >
          <div
            className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border ${t.surfaceMuted} ${t.border}`}
          >
            <Lock size={20} className={t.textPrimary} />
          </div>
          <p className={`text-xs font-medium tracking-wide ${t.textMuted}`}>
            {session.photographerName} &middot; {session.shootDate}
          </p>
          <h1 className={`mt-2 font-serif text-2xl font-medium ${t.textPrimary}`}>
            {session.sessionName}
          </h1>
          <p className={`mt-2 text-sm leading-relaxed ${t.textSecondary}`}>
            This private client gallery is passcode protected. Enter the passcode provided by your photographer to view and select your proofs.
          </p>

          <form onSubmit={handleUnlockSubmit} className="mt-6 space-y-4">
            {unlockError && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
              >
                <AlertCircle size={15} className="shrink-0" />
                <span>{unlockError}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="pp-gallery-passcode"
                className={`mb-1.5 block text-xs font-semibold ${t.textPrimary}`}
              >
                Gallery Passcode
              </label>
              <div className="relative">
                <KeyRound
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  id="pp-gallery-passcode"
                  type="password"
                  required
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  placeholder="Enter client passcode"
                  className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUnlocking}
              className={`inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${t.primaryBtn}`}
            >
              {isUnlocking ? 'Verifying...' : 'Unlock Gallery'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-140px)] transition-colors duration-200 ${t.pageBg}`}>
      <section
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
        aria-label="Client Photo Proofing"
      >
        <FavoritesBar
          sessionName={session.sessionName}
          clientDisplayName={session.clientDisplayName}
          photographerName={session.photographerName}
          shootDate={session.shootDate}
          category={session.category}
          instructions={session.instructions}
          totalCount={sessionPhotos.length}
          favoritesCount={selectedPhotos.length}
          maxSelections={session.maxSelections}
          activeFilter={activeFilter}
          layoutMode={layoutMode}
          theme={theme}
          headerStyle={session.headerStyle}
          coverPhoto={coverPhoto}
          onFilterChange={setActiveFilter}
          onLayoutModeChange={setLayoutMode}
          onOpenSubmit={() => setIsSubmitOpen(true)}
          showSubmitButton={showSubmitButton}
        />

        {limitNotice && (
          <div
            role="status"
            className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900"
          >
            <span>{limitNotice}</span>
            <button
              type="button"
              onClick={() => setLimitNotice(null)}
              className="font-semibold underline underline-offset-2"
            >
              Dismiss
            </button>
          </div>
        )}

        <GalleryGrid
          photos={visiblePhotos}
          favoriteSet={favoriteSet}
          notesByPhotoId={notesByPhotoId}
          layoutMode={layoutMode}
          theme={theme}
          onToggleFavorite={handleToggleFavorite}
          onUpdateNote={handleUpdateNote}
          onOpenLightbox={setLightboxPhotoId}
          emptyMessage="You have not marked any favorite frames yet. Click the heart button on any photograph to add it to your selection."
          onShowAll={
            activeFilter === 'favorites' ? () => setActiveFilter('all') : undefined
          }
        />

        <LightboxModal
          photos={visiblePhotos}
          activePhotoId={lightboxPhotoId}
          favoriteSet={favoriteSet}
          notesByPhotoId={notesByPhotoId}
          onClose={() => setLightboxPhotoId(null)}
          onSelectPhoto={setLightboxPhotoId}
          onToggleFavorite={handleToggleFavorite}
          onUpdateNote={handleUpdateNote}
        />

        <SubmitFavoritesModal
          isOpen={isSubmitOpen}
          sessionId={session.sessionId}
          sessionName={session.sessionName}
          selectedPhotos={selectedPhotos}
          notesByPhotoId={notesByPhotoId}
          allowZipDownload={session.allowZipDownload !== false}
          onClose={() => setIsSubmitOpen(false)}
          onSubmit={submitFavoriteSelections}
        />
      </section>
    </div>
  );
};
