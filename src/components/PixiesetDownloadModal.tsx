import React, { useState } from 'react';
import {
  AlertCircle,
  Archive,
  Check,
  CheckCircle2,
  Download,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  Lock,
  Sparkles,
  X,
} from 'lucide-react';
import { PhotoItem } from '../types/gallery';
import { downloadPhotosAsZip } from '../utils/downloadHelpers';

interface PixiesetDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionName: string;
  allPhotos: PhotoItem[];
  favoritePhotos: PhotoItem[];
  allowZipDownload: boolean;
  downloadPin?: string;
  isPinUnlocked?: boolean;
  onPinUnlock?: () => void;
}

export const PixiesetDownloadModal: React.FC<PixiesetDownloadModalProps> = ({
  isOpen,
  onClose,
  sessionName,
  allPhotos,
  favoritePhotos,
  allowZipDownload,
  downloadPin,
  isPinUnlocked = false,
  onPinUnlock,
}) => {
  const [downloadTarget, setDownloadTarget] = useState<'all' | 'favorites'>('favorites');
  const [resolution, setResolution] = useState<'high' | 'web'>('high');
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isPinValidated, setIsPinValidated] = useState(isPinUnlocked);

  // Progress state
  const [isArchiving, setIsArchiving] = useState(false);
  const [progressCount, setProgressCount] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [currentFilename, setCurrentFilename] = useState('');
  const [archiveSuccess, setArchiveSuccess] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  if (!isOpen) return null;

  const requiresPin = Boolean(downloadPin?.trim()) && !isPinValidated;
  const targetPhotos = downloadTarget === 'favorites' ? favoritePhotos : allPhotos;

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadPin) return;
    if (enteredPin.trim() === downloadPin.trim()) {
      setIsPinValidated(true);
      setPinError(null);
      onPinUnlock?.();
    } else {
      setPinError('Incorrect download PIN. Please check the PIN provided by Paul Photography.');
    }
  };

  const handleStartDownload = async () => {
    if (targetPhotos.length === 0) {
      setArchiveError('No photographs selected in this group.');
      return;
    }

    setIsArchiving(true);
    setArchiveError(null);
    setArchiveSuccess(false);
    setProgressCount(0);
    setProgressTotal(targetPhotos.length);

    try {
      const safeSession = sessionName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filenameSuffix = downloadTarget === 'favorites' ? 'favorites' : 'full_gallery';
      const zipName = `${safeSession}_${filenameSuffix}_${resolution === 'high' ? 'highres' : 'web'}.zip`;

      const summaryNote = [
        `PAUL PHOTOGRAPHY 256 - CLIENT GALLERY ARCHIVE`,
        `================================================`,
        `Gallery: ${sessionName}`,
        `Downloaded: ${new Date().toLocaleString()}`,
        `Group: ${downloadTarget === 'favorites' ? 'Client Selected Favorites' : 'Full Gallery'}`,
        `Resolution: ${resolution === 'high' ? 'Original High-Resolution JPG' : 'Web Resolution JPG (1920px)'}`,
        `Total Photos: ${targetPhotos.length}`,
        `================================================`,
        ...targetPhotos.map((p, idx) => `${idx + 1}. ${p.filename} (${p.width || '?'}x${p.height || '?'})`),
      ].join('\n');

      await downloadPhotosAsZip(
        targetPhotos,
        zipName,
        summaryNote,
        (completed, total, current) => {
          setProgressCount(completed);
          setProgressTotal(total);
          setCurrentFilename(current);
        }
      );

      setArchiveSuccess(true);
      setTimeout(() => {
        setIsArchiving(false);
        setArchiveSuccess(false);
        onClose();
      }, 2500);
    } catch (err) {
      console.error('[DownloadModal] ZIP export error:', err);
      setArchiveError(
        err instanceof Error ? err.message : 'Failed to generate photo archive.'
      );
      setIsArchiving(false);
    }
  };

  const percent = progressTotal > 0 ? Math.round((progressCount / progressTotal) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (!isArchiving && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-2.5 text-zinc-950">
            <Download size={19} className="text-zinc-900" />
            <h3 className="font-serif text-lg font-medium text-zinc-950">
              Download Gallery Photos
            </h3>
          </div>
          {!isArchiving && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* PIN Security Gate */}
        {requiresPin ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-semibold">
                <Lock size={15} />
                <span>Download PIN Protected</span>
              </div>
              <p className="mt-1 leading-relaxed">
                This client gallery requires a 4-digit PIN to download photographs. Please enter the PIN provided by Paul Photography.
              </p>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-3.5">
              {pinError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
                  {pinError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  4-Digit Download PIN
                </label>
                <div className="relative">
                  <KeyRound
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="password"
                    maxLength={8}
                    autoFocus
                    required
                    value={enteredPin}
                    onChange={(e) => setEnteredPin(e.target.value)}
                    placeholder="Enter 4-digit PIN"
                    className="w-full rounded-lg border border-zinc-300 py-2.5 pl-9 pr-3.5 text-center font-mono text-sm tracking-widest text-zinc-950 placeholder:tracking-normal focus:border-zinc-950 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-zinc-300 bg-white py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-zinc-950 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors"
                >
                  Verify PIN
                </button>
              </div>
            </form>
          </div>
        ) : isArchiving || archiveSuccess ? (
          /* Live Progress State */
          <div className="mt-6 space-y-4 py-3 text-center">
            {archiveSuccess ? (
              <div className="flex flex-col items-center gap-2 text-emerald-600">
                <CheckCircle2 size={38} className="animate-bounce" />
                <p className="font-serif text-base font-medium text-zinc-900">
                  Download Ready!
                </p>
                <p className="text-xs text-zinc-500">
                  Your browser will now save the high-resolution ZIP file.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-zinc-900">
                  <Loader2 size={24} className="animate-spin text-zinc-900" />
                  <span className="font-serif text-sm font-medium">
                    Archiving Photographs ({percent}%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full bg-zinc-950 transition-all duration-200 ease-out"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <span className="truncate max-w-[200px] text-left">{currentFilename || 'Preparing photos...'}</span>
                  <span>
                    {progressCount} / {progressTotal} frames
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Packaging original full-resolution files into a ZIP archive...
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Selection & Download Options Form */
          <div className="mt-5 space-y-5">
            {archiveError && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
                <AlertCircle size={15} className="shrink-0" />
                <span>{archiveError}</span>
              </div>
            )}

            <div>
              <p className="text-xs text-zinc-500">Gallery</p>
              <p className="font-serif text-sm font-semibold text-zinc-900 mt-0.5">
                {sessionName}
              </p>
            </div>

            {/* Choose Download Target */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-2">
                Choose Photographs to Download
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDownloadTarget('favorites')}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                    downloadTarget === 'favorites'
                      ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300'
                  }`}
                >
                  <span className="text-xs font-semibold">My Favorites</span>
                  <span
                    className={`mt-1 font-mono text-[11px] ${
                      downloadTarget === 'favorites' ? 'text-zinc-300' : 'text-zinc-500'
                    }`}
                  >
                    {favoritePhotos.length} selected {favoritePhotos.length === 1 ? 'photo' : 'photos'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDownloadTarget('all')}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                    downloadTarget === 'all'
                      ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300'
                  }`}
                >
                  <span className="text-xs font-semibold">Full Gallery</span>
                  <span
                    className={`mt-1 font-mono text-[11px] ${
                      downloadTarget === 'all' ? 'text-zinc-300' : 'text-zinc-500'
                    }`}
                  >
                    {allPhotos.length} total {allPhotos.length === 1 ? 'photo' : 'photos'}
                  </span>
                </button>
              </div>
            </div>

            {/* Resolution Mode */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-2">
                Image Resolution
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setResolution('high')}
                  className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                    resolution === 'high'
                      ? 'border-zinc-950 bg-zinc-100 font-semibold text-zinc-950'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    <Sparkles size={13} className="text-amber-600" />
                    <span>High Resolution</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-zinc-500">
                    Best for large prints & framing
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setResolution('web')}
                  className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                    resolution === 'web'
                      ? 'border-zinc-950 bg-zinc-100 font-semibold text-zinc-950'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    <ImageIcon size={13} className="text-cyan-600" />
                    <span>Web Size</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-zinc-500">
                    Fast share on Instagram & phone
                  </p>
                </button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-zinc-200 bg-white py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartDownload}
                disabled={targetPhotos.length === 0}
                className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                <Archive size={15} />
                <span>
                  Download ZIP ({targetPhotos.length})
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
