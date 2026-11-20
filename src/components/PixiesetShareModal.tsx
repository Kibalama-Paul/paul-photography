import React, { useState } from 'react';
import { Check, Copy, Mail, MessageCircle, QrCode, Share2, X } from 'lucide-react';

interface PixiesetShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionName: string;
  clientDisplayName?: string;
  sessionId: string;
}

export const PixiesetShareModal: React.FC<PixiesetShareModalProps> = ({
  isOpen,
  onClose,
  sessionName,
  clientDisplayName,
  sessionId,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!isOpen) return null;

  const galleryUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/client-selection/${encodeURIComponent(sessionId)}`
    : `https://paulphotography256.com/client-selection/${sessionId}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(galleryUrl)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(galleryUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {}
  };

  const shareText = encodeURIComponent(
    `View the private photo proofing gallery for ${sessionName}: ${galleryUrl}`
  );
  const whatsappUrl = `https://wa.me/?text=${shareText}`;
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(
    `Photo Proofing Gallery: ${sessionName}`
  )}&body=${shareText}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-2 text-zinc-950">
            <Share2 size={18} />
            <h3 className="font-serif text-lg font-medium">Share Client Gallery</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs text-zinc-500">
              Share this private gallery with family, friends, or co-clients:
            </p>
            <p className="font-serif text-sm font-semibold text-zinc-900 mt-1">
              {sessionName} {clientDisplayName ? `(${clientDisplayName})` : ''}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Direct Gallery Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={galleryUrl}
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-mono text-zinc-800 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
            >
              <MessageCircle size={15} />
              <span>WhatsApp</span>
            </a>
            <a
              href={mailtoUrl}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
            >
              <Mail size={15} />
              <span>Email</span>
            </a>
            <button
              type="button"
              onClick={() => setShowQr(!showQr)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
            >
              <QrCode size={15} />
              <span>{showQr ? 'Hide QR' : 'Scan QR'}</span>
            </button>
          </div>

          {showQr && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-center">
              <img
                src={qrImageUrl}
                alt="Gallery QR Code"
                className="h-36 w-36 rounded-lg border border-zinc-200 bg-white p-1 shadow-xs"
              />
              <p className="mt-2 text-[11px] text-zinc-500">
                Scan with any phone camera to view this gallery on mobile.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
