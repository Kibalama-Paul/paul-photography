import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  KeyRound,
  Link2Off,
  Loader2,
  Lock,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
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
  PhotoItem,
} from '../types/gallery';
import { downloadSinglePhoto } from '../utils/downloadHelpers';
import { broadcastNewSubmission } from '../utils/realtimeProofingSync';
import { FavoritesBar } from './FavoritesBar';
import { GalleryGrid } from './GalleryGrid';
import { LightboxModal } from './LightboxModal';
import { PixiesetCompareModal } from './PixiesetCompareModal';
import { PixiesetDownloadModal } from './PixiesetDownloadModal';
import { PixiesetPinModal } from './PixiesetPinModal';
import { PixiesetShareModal } from './PixiesetShareModal';
import { PixiesetSlideshowModal } from './PixiesetSlideshowModal';
import { ScreenshotGuard } from './ScreenshotGuard';
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
  const [activeSet, setActiveSet] = useState<string>('all');
  const [layoutMode, setLayoutMode] = useState<GalleryLayoutMode>('masonry');
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);

  // Modals state
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);
  const [slideshowStartPhotoId, setSlideshowStartPhotoId] = useState<string | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareLeftPhotoId, setCompareLeftPhotoId] = useState<string | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isDownloadPinUnlocked, setIsDownloadPinUnlocked] = useState(false);
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

  const availableSets = useMemo(() => {
    const counts = new Map<string, number>();
    sessionPhotos.forEach((p) => {
      const s = p.set || 'Highlights';
      counts.set(s, (counts.get(s) || 0) + 1);
    });
    if (session?.sets && Array.isArray(session.sets)) {
      session.sets.forEach((s) => {
        if (!counts.has(s)) counts.set(s, 0);
      });
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [sessionPhotos, session?.sets]);

  const visiblePhotos = useMemo(() => {
    let list = activeFilter === 'favorites' ? selectedPhotos : sessionPhotos;
    if (activeSet !== 'all') {
      list = list.filter((p) => (p.set || 'Highlights') === activeSet);
    }
    return list;
  }, [sessionPhotos, activeFilter, selectedPhotos, activeSet]);

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

  const handleQuickDownload = async (photo: PhotoItem) => {
    if (session?.downloadPin?.trim() && !isDownloadPinUnlocked) {
      setIsPinModalOpen(true);
      return;
    }
    try {
      await downloadSinglePhoto(photo);
    } catch (err) {
      console.error('[Quick download error]', err);
    }
  };

  const handleOpenSlideshow = (photoId?: string) => {
    setSlideshowStartPhotoId(photoId || visiblePhotos[0]?.id || null);
    setIsSlideshowOpen(true);
  };

  const handleOpenCompare = (photoId?: string) => {
    setCompareLeftPhotoId(photoId || visiblePhotos[0]?.id || null);
    setIsCompareOpen(true);
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

  // If photographer or studio administrator disabled this client link
  if (session.linkEnabled === false || session.status === 'archived') {
    return (
      <div className={`min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-16 ${t.pageBg}`}>
        <div
          className={`mx-auto max-w-lg rounded-2xl border p-8 sm:p-10 text-center shadow-lg ${t.surface} ${t.border}`}
        >
          <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-8 ring-rose-50/50">
            <Link2Off size={30} />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-800">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
            <span>Link Inactive</span>
          </div>

          <h1 className={`mt-3 font-serif text-2xl sm:text-3xl font-medium ${t.textPrimary}`}>
            Gallery Link Disabled
          </h1>
          <p className={`mt-3 text-sm leading-relaxed ${t.textSecondary}`}>
            Client proofing access to <strong>&ldquo;{session.sessionName}&rdquo;</strong> has been deactivated by the photographer or studio administrator.
          </p>

          <div className={`mt-6 rounded-xl border p-4 text-left ${t.surfaceMuted} ${t.border}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${t.textMuted}`}>
              Studio Contact Information
            </p>
            <div className="mt-2.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className={t.textSecondary}>Lead Photographer:</span>
                <span className={`font-medium ${t.textPrimary}`}>Kibalama Paul</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={t.textSecondary}>Studio:</span>
                <span className={`font-medium ${t.textPrimary}`}>Paul Photography 256</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={t.textSecondary}>Direct Email:</span>
                <a
                  href="mailto:kibalamapaul70@gmail.com"
                  className="font-mono text-zinc-900 underline hover:text-black dark:text-zinc-200"
                >
                  kibalamapaul70@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://wa.me/256700000000?text=Hello%20Paul%20Photography%20256,%20I%20am%20inquiring%20about%20my%20client%20proofing%20gallery%20link."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[42px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <MessageCircle size={15} />
              <span>Contact Photographer on WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={`inline-flex min-h-[42px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-xs font-semibold transition-colors ${t.border} ${t.surface} ${t.textPrimary} hover:${t.surfaceMuted}`}
            >
              <RefreshCw size={14} />
              <span>Refresh Gallery Link</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  const isDownloadPermitted =
    Boolean(session.allowZipDownload) &&
    (!session.downloadPin?.trim() || isDownloadPinUnlocked);

  return (
    <ScreenshotGuard
      enabled={session.preventScreenshots !== false}
      watermarkText={session.watermarkText || 'Paul Photography 256'}
    >
      <div className={`min-h-[calc(100vh-140px)] transition-colors duration-200 ${t.pageBg}`}>
        <section
          className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
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
            onOpenShare={() => setIsShareOpen(true)}
            onOpenDownload={isDownloadPermitted ? () => setIsDownloadOpen(true) : undefined}
            onOpenSlideshow={() => handleOpenSlideshow()}
            onOpenCompare={() => handleOpenCompare()}
            showSubmitButton={showSubmitButton}
          />

        {/* Pixieset Sets / Collections Navigation Tabs */}
        {availableSets.length > 1 && (
          <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveSet('all')}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                activeSet === 'all'
                  ? `${t.tabActiveBg} shadow-xs ring-1 ring-black/10`
                  : `${t.surface} ${t.textSecondary} hover:${t.textPrimary} border ${t.border}`
              }`}
            >
              <span>All Sets</span>
              <span className="font-mono text-[11px] opacity-75">({sessionPhotos.length})</span>
            </button>
            {availableSets.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setActiveSet(s.name)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  activeSet === s.name
                    ? `${t.tabActiveBg} shadow-xs ring-1 ring-black/10`
                    : `${t.surface} ${t.textSecondary} hover:${t.textPrimary} border ${t.border}`
                }`}
              >
                <span>{s.name}</span>
                <span className="font-mono text-[11px] opacity-75">({s.count})</span>
              </button>
            ))}
          </div>
        )}

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

        {/* Main Photo Grid */}
        <GalleryGrid
          photos={visiblePhotos}
          favoriteSet={favoriteSet}
          notesByPhotoId={notesByPhotoId}
          layoutMode={layoutMode}
          theme={theme}
          watermarkEnabled={Boolean(session.watermarkEnabled)}
          watermarkText={session.watermarkText}
          allowDownload={isDownloadPermitted}
          onToggleFavorite={handleToggleFavorite}
          onUpdateNote={handleUpdateNote}
          onOpenLightbox={setLightboxPhotoId}
          onOpenCompare={(id) => handleOpenCompare(id)}
          onQuickDownload={isDownloadPermitted ? handleQuickDownload : undefined}
          emptyMessage="You have not marked any favorite frames yet. Click the heart button on any photograph to add it to your selection."
          onShowAll={
            activeFilter === 'favorites' ? () => setActiveFilter('all') : undefined
          }
        />

        {/* Lightbox Modal */}
        <LightboxModal
          photos={visiblePhotos}
          activePhotoId={lightboxPhotoId}
          favoriteSet={favoriteSet}
          notesByPhotoId={notesByPhotoId}
          allowDownload={isDownloadPermitted}
          watermarkEnabled={Boolean(session.watermarkEnabled)}
          watermarkText={session.watermarkText}
          onClose={() => setLightboxPhotoId(null)}
          onSelectPhoto={setLightboxPhotoId}
          onToggleFavorite={handleToggleFavorite}
          onUpdateNote={handleUpdateNote}
          onOpenSlideshow={(id) => handleOpenSlideshow(id)}
          onOpenCompare={(id) => handleOpenCompare(id)}
        />

        {/* Pixieset Slideshow Modal */}
        <PixiesetSlideshowModal
          isOpen={isSlideshowOpen}
          photos={visiblePhotos}
          initialPhotoId={slideshowStartPhotoId}
          favoriteSet={favoriteSet}
          onToggleFavorite={handleToggleFavorite}
          onClose={() => setIsSlideshowOpen(false)}
        />

        {/* Pixieset Compare Modal */}
        <PixiesetCompareModal
          isOpen={isCompareOpen}
          photos={sessionPhotos}
          initialLeftPhotoId={compareLeftPhotoId}
          favoriteSet={favoriteSet}
          notesByPhotoId={notesByPhotoId}
          onToggleFavorite={handleToggleFavorite}
          onClose={() => setIsCompareOpen(false)}
        />

        {/* Pixieset Download Modal */}
        <PixiesetDownloadModal
          isOpen={isDownloadOpen}
          onClose={() => setIsDownloadOpen(false)}
          sessionName={session.sessionName}
          allPhotos={sessionPhotos}
          favoritePhotos={selectedPhotos}
          allowZipDownload={Boolean(session.allowZipDownload)}
          downloadPin={session.downloadPin}
          isPinUnlocked={isDownloadPinUnlocked}
          onPinUnlock={() => setIsDownloadPinUnlocked(true)}
        />

        {/* Submit Favorites Modal */}
        <SubmitFavoritesModal
          isOpen={isSubmitOpen}
          sessionId={session.sessionId}
          sessionName={session.sessionName}
          selectedPhotos={selectedPhotos}
          notesByPhotoId={notesByPhotoId}
          allowZipDownload={isDownloadPermitted}
          onClose={() => setIsSubmitOpen(false)}
          onSubmit={async (payload) => {
            const result = await submitFavoriteSelections(payload);
            // Broadcast instantly across all devices and accounts
            try {
              broadcastNewSubmission({
                submissionId: result.submissionId || `sub_${Date.now()}`,
                sessionId: payload.sessionId,
                sessionName: payload.sessionName,
                clientName: payload.clientName,
                clientEmail: payload.clientEmail,
                clientPhone: payload.clientPhone,
                status: 'new',
                submittedAt: payload.submittedAt || new Date().toISOString(),
                timestamp: result.timestamp || new Date().toISOString(),
                selectedPhotos: payload.selectedPhotos,
                notesByPhotoId: payload.notesByPhotoId,
                sessionNotes: payload.sessionNotes,
                loggedToSheets: Boolean(result.loggedToSheets),
                emailSent: Boolean(result.emailSent),
              }).catch(() => {});
            } catch (_) {}
            return result;
          }}
        />

        {/* Pixieset Share Modal */}
        <PixiesetShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          sessionId={session.sessionId}
          sessionName={session.sessionName}
          clientDisplayName={session.clientDisplayName}
        />

        {/* Pixieset Download PIN Modal */}
        {session.downloadPin?.trim() && (
          <PixiesetPinModal
            isOpen={isPinModalOpen}
            onClose={() => setIsPinModalOpen(false)}
            expectedPin={session.downloadPin}
            onSuccess={() => {
              setIsDownloadPinUnlocked(true);
              setIsPinModalOpen(false);
            }}
          />
        )}
      </section>
    </div>
    </ScreenshotGuard>
  );
};
