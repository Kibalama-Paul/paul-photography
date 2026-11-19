import React, { useState } from 'react';
import {
  AlertCircle,
  Archive,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Send,
  X,
} from 'lucide-react';
import {
  FavoriteSubmission,
  PhotoItem,
  SubmitFavoritesResponse,
} from '../types/gallery';
import { downloadPhotosAsZip } from '../utils/downloadHelpers';

interface SubmitFavoritesModalProps {
  isOpen: boolean;
  sessionId: string;
  sessionName: string;
  selectedPhotos: PhotoItem[];
  notesByPhotoId: Record<string, string>;
  allowZipDownload?: boolean;
  onClose: () => void;
  onSubmit: (submission: FavoriteSubmission) => Promise<SubmitFavoritesResponse>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SubmitFavoritesModal: React.FC<SubmitFavoritesModalProps> = ({
  isOpen,
  sessionId,
  sessionName,
  selectedPhotos,
  notesByPhotoId,
  allowZipDownload = true,
  onClose,
  onSubmit,
}) => {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<SubmitFavoritesResponse | null>(
    null
  );
  const [copiedFilenames, setCopiedFilenames] = useState(false);

  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ done: number; total: number } | null>(
    null
  );
  const [zipError, setZipError] = useState<string | null>(null);
  const [zipCompleted, setZipCompleted] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting || isZipping) return;
    setValidationError(null);
    setSubmitError(null);
    setZipError(null);
    onClose();
  };

  const buildSummaryText = () => {
    const lines = [
      `PAUL PHOTOGRAPHY 256 — SELECTION RECEIPT`,
      `Session: ${sessionName} (${sessionId})`,
      `Client: ${clientName} <${clientEmail}>`,
      `Reference ID: ${confirmation?.submissionId || 'N/A'}`,
      `Submitted: ${confirmation?.timestamp || new Date().toISOString()}`,
      ``,
      `Selected Favorites (${selectedPhotos.length}):`,
      ...selectedPhotos.map((p, idx) => {
        const note = notesByPhotoId[p.id]?.trim();
        return `${idx + 1}. ${p.filename}${p.title ? ` (${p.title})` : ''}${
          note ? ` — Note: ${note}` : ''
        }`;
      }),
    ];

    if (sessionNotes.trim()) {
      lines.push('', `Overall Session Notes:`, sessionNotes.trim());
    }
    return lines.join('\n');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSubmitError(null);

    if (selectedPhotos.length === 0) {
      setValidationError(
        'Please select at least one favorite photo before submitting.'
      );
      return;
    }

    const trimmedName = clientName.trim();
    const trimmedEmail = clientEmail.trim();

    if (trimmedName.length < 2) {
      setValidationError('Please enter your full name.');
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    const payload: FavoriteSubmission = {
      sessionId,
      sessionName,
      clientName: trimmedName,
      clientEmail: trimmedEmail,
      sessionNotes: sessionNotes.trim() || undefined,
      submittedAt: new Date().toISOString(),
      selectedPhotos: selectedPhotos.map((photo) => ({
        id: photo.id,
        filename: photo.filename,
        title: photo.title,
        note: notesByPhotoId[photo.id]?.trim() || undefined,
      })),
    };

    try {
      setIsSubmitting(true);
      setZipCompleted(false);
      const response = await onSubmit(payload);
      setConfirmation(response);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while submitting your selections.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadSummary = () => {
    const blob = new Blob([buildSummaryText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionId}-favorites.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllZip = async () => {
    setZipError(null);
    setZipCompleted(false);
    setIsZipping(true);
    setZipProgress({ done: 0, total: selectedPhotos.length });

    try {
      await downloadPhotosAsZip(
        selectedPhotos,
        `${sessionId}-favorites.zip`,
        buildSummaryText(),
        (done, total) => setZipProgress({ done, total })
      );
      setZipCompleted(true);
    } catch (err) {
      setZipError(
        err instanceof Error
          ? err.message
          : 'Unable to package selected images into a ZIP archive.'
      );
    } finally {
      setIsZipping(false);
    }
  };

  const handleCopyFilenames = async () => {
    const text = selectedPhotos.map((p) => p.filename).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFilenames(true);
      setTimeout(() => setCopiedFilenames(false), 2000);
    } catch {
      // Clipboard blocked in restricted browser context
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pp-submit-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <h2 id="pp-submit-modal-title" className="font-serif text-xl font-medium text-zinc-950">
            {confirmation ? 'Selections Submitted' : 'Submit Your Favorites'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
          >
            <X size={18} />
          </button>
        </div>

        {confirmation ? (
          <div className="px-6 py-7 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={28} />
            </div>

            <h3 className="text-lg font-semibold text-zinc-950">
              Thank you, {clientName}
            </h3>
            <p className="mt-1.5 text-sm text-zinc-600">
              Your{' '}
              <span className="font-mono font-semibold tabular-nums">
                {selectedPhotos.length}
              </span>{' '}
              selected {selectedPhotos.length === 1 ? 'frame has' : 'frames have'} been
              recorded for <span className="font-medium text-zinc-900">{sessionName}</span>.
            </p>

            <div className="mt-5 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-zinc-50 text-left text-xs">
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-zinc-500">Reference ID</span>
                <code className="font-mono font-medium text-zinc-950">
                  {confirmation.submissionId}
                </code>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-zinc-500">Client Email</span>
                <span className="font-medium text-zinc-900">{clientEmail}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-zinc-500">Delivery Status</span>
                <span className="font-medium text-zinc-900">
                  {confirmation.loggedToSheets || confirmation.emailSent
                    ? 'Synced to Studio'
                    : 'Saved to Studio Dashboard'}
                </span>
              </div>
            </div>

            {confirmation.message && (
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                {confirmation.message}
              </p>
            )}

            {zipError && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-left text-xs font-medium text-rose-800"
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{zipError}</span>
              </div>
            )}

            {allowZipDownload && selectedPhotos.length > 0 && (
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleDownloadAllZip}
                  disabled={isZipping}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
                >
                  {isZipping ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span className="font-mono tabular-nums">
                        Packaging High-Res ZIP ({zipProgress?.done || 0}/{zipProgress?.total || selectedPhotos.length})...
                      </span>
                    </>
                  ) : zipCompleted ? (
                    <>
                      <Check size={15} />
                      <span>Favorites Archive Downloaded (.zip)</span>
                    </>
                  ) : (
                    <>
                      <Archive size={15} />
                      <span>
                        Download All Favorites ({selectedPhotos.length} High-Res .zip)
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={handleCopyFilenames}
                className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
              >
                {copiedFilenames ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedFilenames ? 'Copied' : 'Copy Filenames'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSummary}
                className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
              >
                <Download size={14} />
                <span>Download Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmation(null);
                  setZipCompleted(false);
                  handleClose();
                }}
                className="inline-flex min-h-[40px] items-center justify-center whitespace-nowrap shrink-0 rounded-lg border border-zinc-300 bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
              >
                Return to Gallery
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="space-y-4 px-6 py-5" noValidate>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
              <div className="mb-2.5 flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-600">Selected Frames</span>
                <span className="font-mono font-semibold tabular-nums text-zinc-950">
                  {selectedPhotos.length} selected
                </span>
              </div>

              {selectedPhotos.length > 0 ? (
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {selectedPhotos.map((photo) => (
                    <div key={photo.id} className="w-20 shrink-0">
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.filename}
                        referrerPolicy="no-referrer"
                        className="h-14 w-20 rounded-md border border-zinc-200 object-cover"
                      />
                      <p className="mt-1 truncate font-mono text-[11px] text-zinc-700">
                        {photo.filename}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">
                  No favorites selected yet. Close this form and tap the heart button on your preferred frames.
                </p>
              )}
            </div>

            {(validationError || submitError) && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{validationError || submitError}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="pp-client-name"
                className="mb-1.5 block text-xs font-semibold text-zinc-900"
              >
                Client Name <span className="text-rose-600">*</span>
              </label>
              <input
                id="pp-client-name"
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., Amara & Daniel"
                disabled={isSubmitting}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="pp-client-email"
                className="mb-1.5 block text-xs font-semibold text-zinc-900"
              >
                Client Email <span className="text-rose-600">*</span>
              </label>
              <input
                id="pp-client-email"
                type="email"
                required
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isSubmitting}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="pp-session-notes"
                className="mb-1.5 block text-xs font-semibold text-zinc-900"
              >
                Overall Session Notes{' '}
                <span className="font-normal text-zinc-500">(optional)</span>
              </label>
              <textarea
                id="pp-session-notes"
                rows={3}
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Album print preferences, color grading requests, or turnaround notes..."
                disabled={isSubmitting}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="inline-flex min-h-[40px] items-center justify-center whitespace-nowrap shrink-0 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-zinc-950 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Confirm &amp; Send ({selectedPhotos.length})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
