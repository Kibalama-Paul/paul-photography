import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { PageRoute } from '../types';
import { ProofingGallery } from '../components/ProofingGallery';
import { AdminDashboard } from '../components/AdminDashboard';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ProofingErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ProofingPage] Render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-4 px-6 py-28 text-center text-zinc-100">
          <div className="rounded-full bg-rose-500/20 p-4 text-rose-400 border border-rose-500/30">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-semibold text-white">Client Gallery Unavailable</h2>
          <p className="text-sm text-zinc-400 max-w-md">
            {this.state.error?.message || 'We could not display this proofing session. Please check your session link or try reloading.'}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 transition-colors cursor-pointer"
          >
            <RotateCcw size={16} />
            <span>Reload Gallery</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ProofingPageProps {
  sessionId?: string;
  initialAdmin?: boolean;
  onNavigate?: (page: PageRoute) => void;
}

export const ProofingPage: React.FC<ProofingPageProps> = ({
  sessionId: initialSessionId,
  initialAdmin = false,
  onNavigate,
}) => {
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return (
      initialSessionId ||
      params.get('gallery') ||
      params.get('session') ||
      import.meta.env.VITE_DEFAULT_SESSION_ID ||
      'kampala-editorial-2026'
    );
  });

  const [folderId, setFolderId] = useState<string | undefined>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('folderId') || undefined;
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const pathname = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    return (
      Boolean(initialAdmin) ||
      params.get('admin') === '1' ||
      pathname.includes('admin-selection') ||
      pathname.includes('admin-selction') ||
      hash.includes('admin-selection') ||
      hash.includes('admin-selction')
    );
  });

  useEffect(() => {
    if (initialSessionId) {
      setActiveSessionId(initialSessionId);
    }
  }, [initialSessionId]);

  useEffect(() => {
    if (initialAdmin !== undefined) {
      setIsAdmin(initialAdmin);
    }
  }, [initialAdmin]);

  // Sync state if URL query params or path change
  useEffect(() => {
    const handleUrlChange = () => {
      const pathname = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const querySession = params.get('gallery') || params.get('session');
      if (querySession) {
        setActiveSessionId(querySession);
      }
      setFolderId(params.get('folderId') || undefined);
      setIsAdmin(
        params.get('admin') === '1' ||
        pathname.includes('admin-selection') ||
        pathname.includes('admin-selction') ||
        hash.includes('admin-selection') ||
        hash.includes('admin-selction')
      );
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  if (isAdmin) {
    return (
      <div className="pt-20 sm:pt-24 pb-16 min-h-screen">
        <ProofingErrorBoundary>
          <AdminDashboard
            onExitToShowcase={() => {
              const nextUrl = '/client-selection';
              window.history.pushState({}, '', nextUrl);
              setIsAdmin(false);
            }}
            onOpenClientLink={(sId) => {
              setActiveSessionId(sId);
              setIsAdmin(false);
              const nextUrl = `/client-selection/${encodeURIComponent(sId)}`;
              window.history.pushState({}, '', nextUrl);
            }}
          />
        </ProofingErrorBoundary>
      </div>
    );
  }

  return (
    <div className="pt-20 sm:pt-24 pb-16 min-h-screen">
      <ProofingErrorBoundary>
        <ProofingGallery
          key={activeSessionId}
          sessionId={activeSessionId}
          driveFolderId={folderId}
          showSubmitButton={true}
        />
      </ProofingErrorBoundary>
    </div>
  );
};

export default ProofingPage;
