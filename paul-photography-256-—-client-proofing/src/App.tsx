import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { IntegrationGuideModal } from './components/IntegrationGuideModal';
import { ProofingGallery } from './components/ProofingGallery';

type AppMode = 'client-locked' | 'showcase' | 'admin';

function readRouteState(): {
  mode: AppMode;
  sessionId: string;
  folderId?: string;
} {
  const params = new URLSearchParams(window.location.search);
  const galleryParam = params.get('gallery');
  const sessionParam = params.get('session');
  const folderId = params.get('folderId') || undefined;

  if (params.get('admin') === '1') {
    return {
      mode: 'admin',
      sessionId: galleryParam || sessionParam || 'kampala-editorial-2026',
      folderId,
    };
  }

  // Strict Client-Only Isolated View when opened via a provisioned ?gallery=... link
  if (galleryParam) {
    return {
      mode: 'client-locked',
      sessionId: galleryParam,
      folderId,
    };
  }

  return {
    mode: 'showcase',
    sessionId: sessionParam || 'kampala-editorial-2026',
    folderId,
  };
}

export function App() {
  const [route, setRoute] = useState(readRouteState);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [submitTrigger, setSubmitTrigger] = useState(0);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      setRoute(readRouteState());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = (search: string) => {
    const nextUrl = search ? `${window.location.pathname}${search}` : window.location.pathname;
    window.history.pushState({}, '', nextUrl);
    setRoute(readRouteState());
  };

  if (route.mode === 'admin') {
    return (
      <AdminDashboard
        onExitToShowcase={() => navigateTo('')}
        onOpenClientLink={(sessionId) =>
          navigateTo(`?gallery=${encodeURIComponent(sessionId)}`)
        }
      />
    );
  }

  // Strict Client-Only Mode: Client sees ONLY their intended gallery with zero studio admin tools or other sessions
  const isStrictClientMode = route.mode === 'client-locked';

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-4 sm:px-6 lg:px-8">
          <span className="font-serif text-lg font-medium tracking-tight text-zinc-950 whitespace-nowrap shrink-0">
            Paul Photography 256
          </span>

          {!isStrictClientMode && (
            <nav
              aria-label="Studio navigation"
              className="hidden items-center gap-6 text-sm font-medium text-zinc-600 md:flex"
            >
              <button
                type="button"
                onClick={() => navigateTo('?session=kampala-editorial-2026')}
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-zinc-950 hover:underline underline-offset-4 ${
                  route.sessionId === 'kampala-editorial-2026'
                    ? 'text-zinc-950 underline'
                    : ''
                }`}
              >
                Wedding &amp; Editorial
              </button>
              <button
                type="button"
                onClick={() => navigateTo('?session=studio-portraits-2026')}
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-zinc-950 hover:underline underline-offset-4 ${
                  route.sessionId === 'studio-portraits-2026'
                    ? 'text-zinc-950 underline'
                    : ''
                }`}
              >
                Studio Portraits
              </button>
              <button
                type="button"
                onClick={() => navigateTo('?admin=1')}
                className="whitespace-nowrap shrink-0 transition-colors hover:text-zinc-950 hover:underline underline-offset-4"
              >
                Studio Admin
              </button>
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="whitespace-nowrap shrink-0 transition-colors hover:text-zinc-950 hover:underline underline-offset-4"
              >
                Setup Guide
              </button>
            </nav>
          )}

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSubmitTrigger((n) => n + 1)}
              className="inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
            >
              <Send size={14} />
              <span className="tabular-nums">
                Submit Selections{favoritesCount > 0 ? ` (${favoritesCount})` : ''}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main>
        <ProofingGallery
          sessionId={route.sessionId}
          driveFolderId={route.folderId}
          showSubmitButton={false}
          externalSubmitTrigger={submitTrigger}
          onFavoritesCountChange={setFavoritesCount}
        />
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-zinc-500 sm:px-6 lg:px-8">
          <span>Paul Photography 256 &middot; Private Client Proofing</span>
          {!isStrictClientMode && (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigateTo('?admin=1')}
                className="font-medium text-zinc-700 hover:text-zinc-950 md:hidden"
              >
                Studio Admin
              </button>
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="hover:text-zinc-900"
              >
                Integration &amp; Embed Guide
              </button>
            </div>
          )}
        </div>
      </footer>

      {!isStrictClientMode && (
        <IntegrationGuideModal
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
