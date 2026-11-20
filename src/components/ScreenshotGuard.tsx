import React, { useEffect, useState } from 'react';
import { EyeOff, ShieldAlert } from 'lucide-react';

interface ScreenshotGuardProps {
  enabled?: boolean;
  watermarkText?: string;
  children: React.ReactNode;
}

export const ScreenshotGuard: React.FC<ScreenshotGuardProps> = ({
  enabled = true,
  watermarkText = 'Paul Photography 256',
  children,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);

  const showNotice = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!enabled) return;

    // 1. Inject Strict Print Blocker CSS & Protection Rules
    const styleEl = document.createElement('style');
    styleEl.id = 'pp-anti-screenshot-css';
    styleEl.innerHTML = `
      @media print {
        html, body, #root, * {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          max-height: 0 !important;
          overflow: hidden !important;
        }
      }
      .pp-protected-proofing {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
      .pp-protected-proofing img {
        -webkit-user-drag: none !important;
        -khtml-user-drag: none !important;
        -moz-user-drag: none !important;
        -o-user-drag: none !important;
        user-drag: none !important;
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(styleEl);

    // 2. Prevent Context Menu (Right Click Save)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      showNotice('⚠️ Right-click context menu is disabled to protect client proofs.');
      return false;
    };

    // 3. Prevent Drag and Drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // 4. Prevent Copying Outside Input Fields
    const handleCopy = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.getAttribute('contenteditable') === 'true';

      if (!isInput) {
        e.preventDefault();
        try {
          e.clipboardData?.setData('text/plain', '');
        } catch {}
        showNotice('⚠️ Image and proof copying is restricted by Paul Photography 256.');
      }
    };

    // 5. Intercept Screenshot, Print, and DevTools Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isInput =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA';

      // PrintScreen Key (Windows / Linux)
      if (e.key === 'PrintScreen' || key === 'printscreen') {
        e.preventDefault();
        try {
          navigator.clipboard?.writeText?.('');
        } catch {}
        setIsWindowBlurred(true);
        setTimeout(() => setIsWindowBlurred(false), 2000);
        showNotice('🔒 Screenshot capture blocked. Proofs are copy-protected.');
        return;
      }

      // Cmd+P / Ctrl+P (Print)
      if ((e.metaKey || e.ctrlKey) && key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        showNotice('🔒 Printing is disabled for private client proofing galleries.');
        return;
      }

      // Cmd+S / Ctrl+S (Save Webpage)
      if ((e.metaKey || e.ctrlKey) && key === 's') {
        e.preventDefault();
        e.stopPropagation();
        showNotice('🔒 Saving complete webpage is restricted.');
        return;
      }

      // Cmd+U / Ctrl+U (View Source)
      if ((e.metaKey || e.ctrlKey) && key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Mac Screenshot Shortcuts: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
      if (e.metaKey && e.shiftKey && (key === '3' || key === '4' || key === '5')) {
        e.preventDefault();
        e.stopPropagation();
        setIsWindowBlurred(true);
        setTimeout(() => setIsWindowBlurred(false), 2500);
        showNotice('🔒 Screen capture blocked by Paul Photography 256.');
        return;
      }

      // Windows Snipping Shortcut: Windows+Shift+S / Ctrl+Shift+S
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 's') {
        e.preventDefault();
        e.stopPropagation();
        setIsWindowBlurred(true);
        setTimeout(() => setIsWindowBlurred(false), 2500);
        showNotice('🔒 Snipping tool capture blocked.');
        return;
      }

      // Inspect Element Shortcuts: F12, Cmd+Option+I, Ctrl+Shift+I
      if (
        key === 'f12' ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && (key === 'i' || key === 'c' || key === 'j'))
      ) {
        if (!isInput) {
          e.preventDefault();
          showNotice('🔒 Developer tools inspection is disabled on this gallery.');
        }
      }
    };

    // 6. Shield Screen when Window Loses Focus during Snipping Tool Captures
    const handleWindowBlur = () => {
      // Small timeout to avoid triggering on normal click focus shifts
      setTimeout(() => {
        if (document.visibilityState === 'hidden' || !document.hasFocus()) {
          setIsWindowBlurred(true);
        }
      }, 50);
    };

    const handleWindowFocus = () => {
      setIsWindowBlurred(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsWindowBlurred(true);
      } else {
        setIsWindowBlurred(false);
      }
    };

    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('dragstart', handleDragStart, true);
    window.addEventListener('copy', handleCopy, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      styleEl.remove();
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('dragstart', handleDragStart, true);
      window.removeEventListener('copy', handleCopy, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);

  return (
    <div
      className={`relative min-h-screen ${
        enabled ? 'pp-protected-proofing select-none' : ''
      }`}
      onContextMenu={enabled ? (e) => e.preventDefault() : undefined}
      onDragStart={enabled ? (e) => e.preventDefault() : undefined}
    >
      {/* Client Gallery Content */}
      {children}

      {/* Screen Capture Shield Veil: Active when window is blurred during snipping attempts */}
      {enabled && isWindowBlurred && (
        <div
          role="presentation"
          onClick={() => setIsWindowBlurred(false)}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center text-white backdrop-blur-2xl transition-all duration-300"
        >
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <EyeOff size={32} className="text-purple-300" />
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-purple-300">
            Screen Capture Shield Active
          </p>
          <h2 className="mt-2 font-serif text-2xl sm:text-3xl font-light text-white">
            Protected Client Proofing Gallery
          </h2>
          <p className="mt-3 max-w-md text-xs sm:text-sm leading-relaxed text-zinc-300">
            Content is copy-protected by <strong>Paul Photography 256</strong> (Lead Photographer: Kibalama Paul). Screen capture utilities are shielded to protect original proofs.
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsWindowBlurred(false);
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-6 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white hover:text-zinc-950"
          >
            <span>Click to Resume Viewing</span>
          </button>
        </div>
      )}

      {/* Protective Toast Alert */}
      {enabled && toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex max-w-md items-center gap-2.5 rounded-xl border border-white/20 bg-zinc-950/95 px-4 py-3 text-xs font-medium text-white shadow-2xl backdrop-blur-md"
        >
          <ShieldAlert size={16} className="shrink-0 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
