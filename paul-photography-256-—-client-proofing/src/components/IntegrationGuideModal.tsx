import React, { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';

interface IntegrationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMBED_SNIPPET = `import { ProofingGallery } from './components/ProofingGallery';

export function ClientGalleryPage({ sessionId }: { sessionId: string }) {
  return <ProofingGallery sessionId={sessionId} />;
}`;

export const IntegrationGuideModal: React.FC<IntegrationGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EMBED_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pp-integration-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <h2 id="pp-integration-title" className="font-serif text-xl font-medium text-zinc-950">
            Portfolio &amp; Backend Integration Guide
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5 text-sm leading-relaxed text-zinc-700">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">
              01. Embed into paulphotography256.com
            </h3>
            <p className="mt-1 text-xs text-zinc-600">
              Mount the self-contained proofing widget inside any portfolio route and pass a session slug or Google Drive folder ID.
            </p>
            <div className="relative mt-2.5 rounded-xl border border-zinc-200 bg-zinc-950 p-4 text-xs text-zinc-100">
              <button
                type="button"
                onClick={handleCopy}
                className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/20"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <pre className="overflow-x-auto font-mono leading-relaxed">
                <code>{EMBED_SNIPPET}</code>
              </pre>
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-5">
            <h3 className="text-sm font-semibold text-zinc-950">
              02. Connect Private Google Drive Folders
            </h3>
            <p className="mt-1 text-xs text-zinc-600">
              Share client folders with your Google Service Account email (Viewer access), map session IDs in{' '}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px]">
                GOOGLE_DRIVE_SESSION_FOLDERS
              </code>
              , and set{' '}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px]">
                VITE_USE_MOCK_DATA=false
              </code>
              . Images are proxied securely via{' '}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px]">
                GET /api/gallery
              </code>
              .
            </p>
          </div>

          <div className="border-t border-zinc-200 pt-5">
            <h3 className="text-sm font-semibold text-zinc-950">
              03. Log to Google Sheets &amp; Notify Photographer
            </h3>
            <p className="mt-1 text-xs text-zinc-600">
              Set{' '}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px]">
                GOOGLE_SHEETS_SPREADSHEET_ID
              </code>{' '}
              and either{' '}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px]">
                RESEND_API_KEY
              </code>{' '}
              or SMTP credentials in your environment. Submissions sent to{' '}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px]">
                POST /api/favorites
              </code>{' '}
              also persist locally in{' '}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px]">
                .data/submissions.json
              </code>{' '}
              for immediate testing. See <code className="font-mono text-[11px]">INTEGRATION.md</code> and{' '}
              <code className="font-mono text-[11px]">apps-script/Code.gs</code> for full setup steps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
