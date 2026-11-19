import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Check,
  CloudUpload,
  Copy,
  ExternalLink,
  FolderDown,
  FolderOpen,
  FolderPlus,
  ImagePlus,
  Inbox,
  KeyRound,
  Loader2,
  LogOut,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { GALLERY_DESIGN_PRESETS } from '../data/galleryThemes';
import {
  adminCreateDriveFolder,
  adminCreateGallery,
  adminDeleteGallery,
  adminDeletePhoto,
  adminGetDriveStatus,
  adminListGalleries,
  adminListSubmissions,
  adminSyncDriveFolder,
  adminUpdateGallery,
  adminUpdateSubmissionStatus,
  adminUploadPhotos,
  getSavedAdminPasscode,
  setSavedAdminPasscode,
  verifyAdminPasscode,
} from '../services/galleryService';
import {
  AdminGalleryRecord,
  DriveStatusResponse,
  GalleryHeaderStyle,
  GalleryLayoutMode,
  GalleryThemeId,
  PhotoItem,
  StoredSubmissionRecord,
  SubmissionStatus,
} from '../types/gallery';
import {
  batchDownloadJpgsToDevice,
  downloadPhotosAsZip,
} from '../utils/downloadHelpers';

interface AdminDashboardProps {
  onExitToShowcase: () => void;
  onOpenClientLink: (sessionId: string) => void;
}

type AdminSection = 'galleries' | 'submissions';
type GalleryTab = 'photos' | 'design' | 'share';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onExitToShowcase,
  onOpenClientLink,
}) => {
  const [adminPasscode, setAdminPasscode] = useState<string | null>(() =>
    getSavedAdminPasscode()
  );
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [section, setSection] = useState<AdminSection>('galleries');
  const [galleryTab, setGalleryTab] = useState<GalleryTab>('photos');

  const [galleries, setGalleries] = useState<AdminGalleryRecord[]>([]);
  const [submissions, setSubmissions] = useState<StoredSubmissionRecord[]>([]);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Create Gallery Modal state
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newShootDate, setNewShootDate] = useState(() =>
    new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  );
  const [newCategory, setNewCategory] = useState('Wedding & Editorial');
  const [newDriveFolderId, setNewDriveFolderId] = useState('');
  const [newTheme, setNewTheme] = useState<GalleryThemeId>('editorial-light');
  const [isSavingNew, setIsSavingNew] = useState(false);

  // Google Drive connection status
  const [driveStatus, setDriveStatus] = useState<DriveStatusResponse>({
    configured: false,
  });
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [isCreatingDriveFolder, setIsCreatingDriveFolder] = useState(false);

  // Edit Gallery Form state
  const [editForm, setEditForm] = useState<{
    sessionName: string;
    clientDisplayName: string;
    shootDate: string;
    category: string;
    instructions: string;
    driveFolderId: string;
    theme: GalleryThemeId;
    headerStyle: GalleryHeaderStyle;
    defaultLayout: GalleryLayoutMode;
    coverPhotoId: string;
    maxSelections: string;
    passcode: string;
    allowZipDownload: boolean;
  } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSavedBanner, setEditSavedBanner] = useState(false);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  // Photographer-only batch export state
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Share & Delete helpers
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedLrFilter, setCopiedLrFilter] = useState(false);
  const [confirmDeleteGallery, setConfirmDeleteGallery] = useState(false);

  // Submissions search & filter
  const [submissionQuery, setSubmissionQuery] = useState('');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<
    'all' | SubmissionStatus
  >('all');

  const loadDashboardData = async (passcode: string) => {
    setIsLoadingData(true);
    setDataError(null);
    try {
      const [galleryList, submissionList, driveInfo] = await Promise.all([
        adminListGalleries(passcode),
        adminListSubmissions(passcode),
        adminGetDriveStatus(passcode),
      ]);
      setGalleries(galleryList);
      setSubmissions(submissionList);
      setDriveStatus(driveInfo);
      if (galleryList.length > 0 && !selectedGalleryId) {
        setSelectedGalleryId(galleryList[0].sessionId);
      }
      if (submissionList.length > 0 && !selectedSubmissionId) {
        setSelectedSubmissionId(submissionList[0].submissionId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load studio data.';
      if (msg.toLowerCase().includes('unauthorized')) {
        setSavedAdminPasscode(null);
        setAdminPasscode(null);
      }
      setDataError(msg);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (adminPasscode) {
      loadDashboardData(adminPasscode);
    }
  }, [adminPasscode]);

  const activeGallery = useMemo(
    () => galleries.find((g) => g.sessionId === selectedGalleryId) || galleries[0] || null,
    [galleries, selectedGalleryId]
  );

  // Sync edit form whenever active gallery changes
  useEffect(() => {
    if (!activeGallery) {
      setEditForm(null);
      return;
    }
    setEditForm({
      sessionName: activeGallery.sessionName,
      clientDisplayName: activeGallery.clientDisplayName || '',
      shootDate: activeGallery.shootDate,
      category: activeGallery.category || '',
      instructions: activeGallery.instructions || '',
      driveFolderId: activeGallery.driveFolderId || '',
      theme: activeGallery.theme || 'editorial-light',
      headerStyle: activeGallery.headerStyle || 'editorial',
      defaultLayout: activeGallery.defaultLayout || 'masonry',
      coverPhotoId: activeGallery.coverPhotoId || '',
      maxSelections: activeGallery.maxSelections
        ? String(activeGallery.maxSelections)
        : '',
      passcode: activeGallery.passcode || '',
      allowZipDownload: activeGallery.allowZipDownload !== false,
    });
    setConfirmDeleteGallery(false);
    setEditSavedBanner(false);
  }, [activeGallery]);

  // Tally how many times each photo in the active gallery was favorited by clients
  const photoPickCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!activeGallery) return counts;
    for (const sub of submissions) {
      if (sub.sessionId !== activeGallery.sessionId) continue;
      for (const p of sub.selectedPhotos) {
        counts[p.id] = (counts[p.id] || 0) + 1;
      }
    }
    return counts;
  }, [activeGallery, submissions]);

  const filteredSubmissions = useMemo(() => {
    const q = submissionQuery.trim().toLowerCase();
    return submissions.filter((sub) => {
      if (submissionStatusFilter !== 'all' && sub.status !== submissionStatusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        sub.clientName.toLowerCase().includes(q) ||
        sub.clientEmail.toLowerCase().includes(q) ||
        sub.sessionName.toLowerCase().includes(q) ||
        sub.submissionId.toLowerCase().includes(q)
      );
    });
  }, [submissions, submissionQuery, submissionStatusFilter]);

  const activeSubmission = useMemo(
    () =>
      filteredSubmissions.find((s) => s.submissionId === selectedSubmissionId) ||
      filteredSubmissions[0] ||
      null,
    [filteredSubmissions, selectedSubmissionId]
  );

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsAuthenticating(true);
    try {
      await verifyAdminPasscode(loginInput.trim());
      setAdminPasscode(loginInput.trim());
      setLoginInput('');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Invalid studio passcode.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    setSavedAdminPasscode(null);
    setAdminPasscode(null);
  };

  const handleCreateGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPasscode || !newTitle.trim()) return;
    setIsSavingNew(true);
    try {
      const preset = GALLERY_DESIGN_PRESETS.find((p) => p.id === newTheme);
      const created = await adminCreateGallery(adminPasscode, {
        sessionName: newTitle.trim(),
        clientDisplayName: newClientName.trim() || undefined,
        shootDate: newShootDate.trim(),
        category: newCategory.trim() || 'Client Session',
        driveFolderId: newDriveFolderId.trim() || undefined,
        theme: newTheme,
        headerStyle: preset?.defaultHeaderStyle || 'editorial',
        defaultLayout: preset?.defaultLayout || 'masonry',
        allowZipDownload: true,
      });
      setGalleries((prev) => [created, ...prev]);
      setSelectedGalleryId(created.sessionId);
      setSection('galleries');
      setGalleryTab('photos');
      setIsCreating(false);
      setNewTitle('');
      setNewClientName('');
      setNewDriveFolderId('');
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Failed to create gallery.');
    } finally {
      setIsSavingNew(false);
    }
  };

  const handleSaveGalleryEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPasscode || !activeGallery || !editForm) return;
    setIsSavingEdit(true);
    setEditSavedBanner(false);
    try {
      const updated = await adminUpdateGallery(adminPasscode, activeGallery.sessionId, {
        sessionName: editForm.sessionName,
        clientDisplayName: editForm.clientDisplayName,
        shootDate: editForm.shootDate,
        category: editForm.category,
        instructions: editForm.instructions,
        driveFolderId: editForm.driveFolderId,
        theme: editForm.theme,
        headerStyle: editForm.headerStyle,
        defaultLayout: editForm.defaultLayout,
        coverPhotoId: editForm.coverPhotoId,
        maxSelections: editForm.maxSelections ? Number(editForm.maxSelections) : 0,
        passcode: editForm.passcode,
        allowZipDownload: editForm.allowZipDownload,
      });
      setGalleries((prev) =>
        prev.map((g) =>
          g.sessionId === updated.sessionId ? { ...g, ...updated } : g
        )
      );
      setEditSavedBanner(true);
      setTimeout(() => setEditSavedBanner(false), 2500);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Unable to save changes.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleFilesUpload = async (fileList: FileList | File[]) => {
    if (!adminPasscode || !activeGallery) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadNotice(null);
    setDataError(null);
    try {
      const { gallery: updated, uploadDestination } = await adminUploadPhotos(
        adminPasscode,
        activeGallery.sessionId,
        files
      );
      setGalleries((prev) =>
        prev.map((g) =>
          g.sessionId === updated.sessionId ? { ...g, ...updated } : g
        )
      );
      setUploadNotice(
        uploadDestination === 'google-drive'
          ? `Uploaded ${files.length} image${files.length === 1 ? '' : 's'} directly to Google Drive.`
          : `Uploaded ${files.length} image${files.length === 1 ? '' : 's'} to local Studio Storage.`
      );
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateDriveFolder = async () => {
    if (!adminPasscode || !activeGallery) return;
    setIsCreatingDriveFolder(true);
    setDataError(null);
    try {
      const updated = await adminCreateDriveFolder(
        adminPasscode,
        activeGallery.sessionId
      );
      setGalleries((prev) =>
        prev.map((g) =>
          g.sessionId === updated.sessionId ? { ...g, ...updated } : g
        )
      );
      setUploadNotice(`Created & linked Google Drive folder (${updated.driveFolderId}).`);
    } catch (err) {
      setDataError(
        err instanceof Error ? err.message : 'Failed to create Google Drive folder.'
      );
    } finally {
      setIsCreatingDriveFolder(false);
    }
  };

  const handleSyncDriveFolder = async () => {
    if (!adminPasscode || !activeGallery) return;
    setIsSyncingDrive(true);
    setDataError(null);
    try {
      const { gallery: updated, syncedCount } = await adminSyncDriveFolder(
        adminPasscode,
        activeGallery.sessionId
      );
      setGalleries((prev) =>
        prev.map((g) =>
          g.sessionId === updated.sessionId ? { ...g, ...updated } : g
        )
      );
      setUploadNotice(`Synced ${syncedCount} image(s) from Google Drive folder.`);
    } catch (err) {
      setDataError(
        err instanceof Error ? err.message : 'Failed to sync Google Drive folder.'
      );
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!adminPasscode || !activeGallery) return;
    try {
      const updated = await adminDeletePhoto(
        adminPasscode,
        activeGallery.sessionId,
        photoId
      );
      setGalleries((prev) =>
        prev.map((g) =>
          g.sessionId === updated.sessionId ? { ...g, ...updated } : g
        )
      );
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Unable to delete photo.');
    }
  };

  const handleSetCoverPhoto = async (photoId: string) => {
    if (!adminPasscode || !activeGallery) return;
    try {
      const updated = await adminUpdateGallery(adminPasscode, activeGallery.sessionId, {
        coverPhotoId: photoId,
      });
      setGalleries((prev) =>
        prev.map((g) =>
          g.sessionId === updated.sessionId ? { ...g, ...updated } : g
        )
      );
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Unable to update cover photo.');
    }
  };

  const handleDeleteGallery = async () => {
    if (!adminPasscode || !activeGallery) return;
    try {
      await adminDeleteGallery(adminPasscode, activeGallery.sessionId);
      const remaining = galleries.filter(
        (g) => g.sessionId !== activeGallery.sessionId
      );
      setGalleries(remaining);
      setSelectedGalleryId(remaining[0]?.sessionId || null);
      setConfirmDeleteGallery(false);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Unable to delete gallery.');
    }
  };

  const handleBatchDownloadJpgs = async (photos: PhotoItem[]) => {
    if (photos.length === 0) return;
    setIsExporting(true);
    setExportStatus(`Preparing ${photos.length} .jpg files...`);
    try {
      const result = await batchDownloadJpgsToDevice(photos, (done, total, name) => {
        setExportStatus(`Saving .jpg ${done}/${total}: ${name}`);
      });
      setExportStatus(
        result.mode === 'directory'
          ? `Saved ${result.count} .jpg files directly to the chosen device folder.`
          : `Started direct .jpg download of ${result.count} files to your device.`
      );
    } catch (err) {
      setExportStatus(
        err instanceof Error ? err.message : 'Batch .jpg download failed.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleBatchDownloadZip = async (photos: PhotoItem[], zipName: string) => {
    if (photos.length === 0) return;
    setIsExporting(true);
    setExportStatus(`Packaging ${photos.length} photos into ${zipName}...`);
    try {
      const count = await downloadPhotosAsZip(photos, zipName, undefined, (done, total) => {
        setExportStatus(`Zipping ${done}/${total}...`);
      });
      setExportStatus(`Downloaded ${zipName} (${count} high-resolution files).`);
    } catch (err) {
      setExportStatus(err instanceof Error ? err.message : 'ZIP export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpdateStatus = async (
    submissionId: string,
    status: SubmissionStatus
  ) => {
    if (!adminPasscode) return;
    try {
      const updated = await adminUpdateSubmissionStatus(
        adminPasscode,
        submissionId,
        status
      );
      setSubmissions((prev) =>
        prev.map((s) => (s.submissionId === updated.submissionId ? updated : s))
      );
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Status update failed.');
    }
  };

  const resolveSubmissionPhotos = (sub: StoredSubmissionRecord): PhotoItem[] => {
    const gallery = galleries.find((g) => g.sessionId === sub.sessionId);
    return sub.selectedPhotos.map((sel) => {
      const match = gallery?.photos.find(
        (p) => p.id === sel.id || p.filename === sel.filename
      );
      return (
        match || {
          id: sel.id,
          filename: sel.filename,
          title: sel.title,
          thumbnailUrl: '',
          fullUrl: '',
        }
      );
    }).filter((p) => Boolean(p.fullUrl));
  };

  const getClientShareUrl = (sessionId: string) =>
    `${window.location.origin}/?gallery=${encodeURIComponent(sessionId)}`;

  const handleCopyClientLink = async (sessionId: string) => {
    try {
      await navigator.clipboard.writeText(getClientShareUrl(sessionId));
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Clipboard blocked
    }
  };

  const handleCopyLightroomFilter = async (sub: StoredSubmissionRecord) => {
    const list = sub.selectedPhotos.map((p) => p.filename).join(', ');
    try {
      await navigator.clipboard.writeText(list);
      setCopiedLrFilter(true);
      setTimeout(() => setCopiedLrFilter(false), 2000);
    } catch {
      // Clipboard blocked
    }
  };

  // ---------------------------------------------------------------------------
  // STUDIO ADMIN PASSCODE GATE
  // ---------------------------------------------------------------------------
  if (!adminPasscode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-950">
            <KeyRound size={20} />
          </div>

          <p className="text-xs font-medium tracking-wide text-zinc-500">
            Paul Photography 256 &middot; Studio Console
          </p>
          <h1 className="mt-1.5 font-serif text-2xl font-medium text-zinc-950">
            Photographer Admin Sign-In
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Upload client galleries, customize visual layouts, generate private client links, and batch-export `.jpg` selections.
          </p>

          <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
            {loginError && (
              <div
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
              >
                {loginError}
              </div>
            )}

            <div>
              <label
                htmlFor="pp-admin-passcode"
                className="mb-1.5 block text-xs font-semibold text-zinc-900"
              >
                Studio Passcode
              </label>
              <input
                id="pp-admin-passcode"
                type="password"
                required
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder="Enter studio passcode"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none"
              />
              <p className="mt-1.5 text-xs text-zinc-500">
                Default passcode: <code className="font-mono text-zinc-800">pp256admin</code> (override via <code className="font-mono">ADMIN_PASSCODE</code>).
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onExitToShowcase}
                className="inline-flex min-h-[42px] flex-1 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Back to Gallery
              </button>
              <button
                type="submit"
                disabled={isAuthenticating}
                className="inline-flex min-h-[42px] flex-1 items-center justify-center whitespace-nowrap rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {isAuthenticating ? 'Unlocking...' : 'Enter Studio'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const newSubmissionCount = submissions.filter((s) => s.status === 'new').length;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-950 lg:flex-row">
      {/* Studio Sidebar */}
      <aside className="flex w-full shrink-0 flex-col border-b border-zinc-200 bg-white lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <span className="font-serif text-lg font-medium tracking-tight text-zinc-950">
            Paul Photography 256
          </span>
          <button
            type="button"
            onClick={onExitToShowcase}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-950 lg:hidden"
          >
            Exit Admin
          </button>
        </div>

        <div className="p-3.5">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSection('galleries')}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                section === 'galleries'
                  ? 'bg-zinc-950 text-white'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <FolderOpen size={16} />
                <span>Client Galleries</span>
              </span>
              <span className="font-mono text-xs tabular-nums opacity-75">
                {galleries.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSection('submissions')}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                section === 'submissions'
                  ? 'bg-zinc-950 text-white'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <Inbox size={16} />
                <span>Submissions</span>
              </span>
              <span className="font-mono text-xs tabular-nums opacity-75">
                {newSubmissionCount > 0 ? `${newSubmissionCount} new` : submissions.length}
              </span>
            </button>
          </div>

          {section === 'galleries' && (
            <div className="mt-5 border-t border-zinc-200 pt-4">
              <div className="mb-2.5 flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-zinc-500">
                  All Client Galleries
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-950 hover:underline"
                >
                  <Plus size={14} />
                  <span>New</span>
                </button>
              </div>

              <div className="max-h-[45vh] space-y-1 overflow-y-auto">
                {galleries.map((g) => {
                  const isActive = activeGallery?.sessionId === g.sessionId;
                  return (
                    <button
                      key={g.sessionId}
                      type="button"
                      onClick={() => setSelectedGalleryId(g.sessionId)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                        isActive
                          ? 'border-zinc-300 bg-zinc-100'
                          : 'border-transparent hover:bg-zinc-50'
                      }`}
                    >
                      <p className="truncate text-xs font-semibold text-zinc-900">
                        {g.sessionName}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[11px] tabular-nums text-zinc-500">
                        {g.photos.length} photos &middot; {g.submissionCount || 0} picks
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto hidden border-t border-zinc-200 p-3.5 lg:block">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onExitToShowcase}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
            >
              <ExternalLink size={13} />
              <span>Public View</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-4">
          <div className="min-w-0 text-sm text-zinc-500">
            <span>Studio Console</span>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="font-medium text-zinc-950">
              {section === 'galleries'
                ? activeGallery?.sessionName || 'Client Galleries'
                : 'Client Favorite Submissions'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {section === 'galleries' && activeGallery && (
              <>
                <button
                  type="button"
                  onClick={() => handleCopyClientLink(activeGallery.sessionId)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Link Copied' : 'Copy Client Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenClientLink(activeGallery.sessionId)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  <ExternalLink size={14} />
                  <span>Preview Client View</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-zinc-950 px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              <Plus size={14} />
              <span>New Client Gallery</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">
          {dataError && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800"
            >
              {dataError}
            </div>
          )}

          {exportStatus && (
            <div
              role="status"
              className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-xs font-medium text-zinc-900"
            >
              <span>{exportStatus}</span>
              {!isExporting && (
                <button
                  type="button"
                  onClick={() => setExportStatus(null)}
                  className="text-zinc-500 hover:text-zinc-950"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}

          {isLoadingData && galleries.length === 0 ? (
            <div className="flex items-center justify-center py-24 text-zinc-500">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : section === 'galleries' ? (
            activeGallery ? (
              <div className="space-y-6">
                {/* Gallery Summary & Sub-Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
                  <div>
                    <h1 className="font-serif text-2xl font-medium text-zinc-950">
                      {activeGallery.sessionName}
                    </h1>
                    <p className="mt-1 text-xs text-zinc-500">
                      {activeGallery.clientDisplayName || 'Client Session'} &middot;{' '}
                      {activeGallery.shootDate} &middot;{' '}
                      <span className="font-mono tabular-nums">
                        {activeGallery.photos.length} photos
                      </span>{' '}
                      &middot; Design:{' '}
                      <span className="font-medium text-zinc-800">
                        {GALLERY_DESIGN_PRESETS.find((p) => p.id === activeGallery.theme)
                          ?.name || 'Editorial Light'}
                      </span>
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1 rounded-lg bg-zinc-200/70 p-1">
                    <button
                      type="button"
                      onClick={() => setGalleryTab('photos')}
                      className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        galleryTab === 'photos'
                          ? 'bg-white text-zinc-950 shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-950'
                      }`}
                    >
                      <ImagePlus size={14} />
                      <span>Photos &amp; Upload</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGalleryTab('design')}
                      className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        galleryTab === 'design'
                          ? 'bg-white text-zinc-950 shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-950'
                      }`}
                    >
                      <Palette size={14} />
                      <span>Design &amp; Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGalleryTab('share')}
                      className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        galleryTab === 'share'
                          ? 'bg-white text-zinc-950 shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-950'
                      }`}
                    >
                      <Share2 size={14} />
                      <span>Client Link</span>
                    </button>
                  </div>
                </div>

                {/* SUB-TAB 1: PHOTOS & GOOGLE DRIVE UPLOAD + PHOTOGRAPHER BATCH JPG DOWNLOAD */}
                {galleryTab === 'photos' && (
                  <div className="space-y-6">
                    {/* Google Drive Upload Target & Sync Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-xs font-semibold text-zinc-950">
                          <CloudUpload size={15} />
                          <span>
                            {driveStatus.configured &&
                            (activeGallery.driveFolderId || driveStatus.defaultFolderId)
                              ? 'Google Drive Upload Active'
                              : 'Upload Target: Studio Local Storage'}
                          </span>
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-500">
                          {activeGallery.driveFolderId
                            ? `Linked Drive Folder: ${activeGallery.driveFolderId}`
                            : driveStatus.configured
                              ? `Default Drive Folder: ${driveStatus.defaultFolderId || 'Not set (link a folder below)'}`
                              : 'Add GOOGLE_SERVICE_ACCOUNT_EMAIL & GOOGLE_PRIVATE_KEY in environment to route uploads directly to Google Drive.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {driveStatus.configured && !activeGallery.driveFolderId && (
                          <button
                            type="button"
                            disabled={isCreatingDriveFolder}
                            onClick={handleCreateDriveFolder}
                            className="inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
                          >
                            <FolderPlus size={14} />
                            <span>
                              {isCreatingDriveFolder ? 'Creating...' : 'Create Drive Folder'}
                            </span>
                          </button>
                        )}
                        {driveStatus.configured &&
                          (activeGallery.driveFolderId || driveStatus.defaultFolderId) && (
                            <button
                              type="button"
                              disabled={isSyncingDrive}
                              onClick={handleSyncDriveFolder}
                              className="inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
                            >
                              <RefreshCw
                                size={14}
                                className={isSyncingDrive ? 'animate-spin' : ''}
                              />
                              <span>
                                {isSyncingDrive ? 'Syncing...' : 'Sync from Drive'}
                              </span>
                            </button>
                          )}
                      </div>
                    </div>

                    {/* Drag & Drop Image Uploader */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files?.length) {
                          handleFilesUpload(e.dataTransfer.files);
                        }
                      }}
                      className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                        isDragging
                          ? 'border-zinc-950 bg-zinc-100'
                          : 'border-zinc-300 bg-white'
                      }`}
                    >
                      <Upload size={26} className="text-zinc-500" />
                      <p className="mt-3 text-sm font-semibold text-zinc-950">
                        {driveStatus.configured &&
                        (activeGallery.driveFolderId || driveStatus.defaultFolderId)
                          ? 'Upload high-resolution images directly to Google Drive'
                          : 'Upload high-resolution photos to this client gallery'}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Drag and drop `.jpg`, `.png`, or `.webp` files here, or browse from your computer (up to 60 files per batch).
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.length) {
                            handleFilesUpload(e.target.files);
                            e.target.value = '';
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Uploading photos...</span>
                          </>
                        ) : (
                          <>
                            <ImagePlus size={14} />
                            <span>Select Photos to Upload</span>
                          </>
                        )}
                      </button>

                      {uploadNotice && (
                        <p className="mt-3 text-xs font-medium text-emerald-700">
                          {uploadNotice}
                        </p>
                      )}
                    </div>

                    {/* Photographer-Only Batch JPG Export Controls */}
                    {activeGallery.photos.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4">
                        <div>
                          <p className="text-xs font-semibold text-zinc-950">
                            Photographer Device Export (Admin Only)
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            Batch save `.jpg` files directly into the device gallery/folder, or export a `.zip` bundle.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            disabled={isExporting}
                            onClick={() => handleBatchDownloadJpgs(activeGallery.photos)}
                            className="inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                          >
                            <FolderDown size={15} />
                            <span>
                              Batch Download .JPGs to Device ({activeGallery.photos.length})
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={isExporting}
                            onClick={() =>
                              handleBatchDownloadZip(
                                activeGallery.photos,
                                `${activeGallery.sessionId}-all.zip`
                              )
                            }
                            className="inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
                          >
                            <Archive size={15} />
                            <span>Export .ZIP</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Uploaded Gallery Photos Grid */}
                    {activeGallery.photos.length === 0 ? (
                      <div className="rounded-2xl border border-zinc-200 bg-white py-16 text-center text-sm text-zinc-500">
                        No photos in this gallery yet. Upload images above to prepare it for your client.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {activeGallery.photos.map((photo) => {
                          const isCover = activeGallery.coverPhotoId === photo.id;
                          const pickCount = photoPickCounts[photo.id] || 0;

                          return (
                            <div
                              key={photo.id}
                              className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
                            >
                              <div className="relative aspect-[4/3] bg-zinc-100">
                                <img
                                  src={photo.thumbnailUrl}
                                  alt={photo.filename}
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  className="h-full w-full object-cover"
                                />
                              </div>

                              <div className="p-3">
                                <p
                                  className="truncate font-mono text-xs font-medium text-zinc-950"
                                  title={photo.filename}
                                >
                                  {photo.filename}
                                </p>
                                <p className="mt-0.5 font-mono text-[11px] tabular-nums text-zinc-500">
                                  {pickCount} client {pickCount === 1 ? 'pick' : 'picks'}
                                  {isCover ? ' · Cover Photo' : ''}
                                </p>

                                <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSetCoverPhoto(photo.id)}
                                    disabled={isCover}
                                    className="text-xs font-medium text-zinc-700 hover:text-zinc-950 disabled:text-zinc-400"
                                  >
                                    {isCover ? 'Active Cover' : 'Set as Cover'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeletePhoto(photo.id)}
                                    aria-label={`Delete ${photo.filename}`}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800"
                                  >
                                    <Trash2 size={13} />
                                    <span>Remove</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-TAB 2: DESIGN & DETAILS CUSTOMIZER */}
                {galleryTab === 'design' && editForm && (
                  <form
                    onSubmit={handleSaveGalleryEdits}
                    className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6"
                  >
                    {editSavedBanner && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">
                        Gallery settings and interface design saved.
                      </div>
                    )}

                    <div>
                      <h2 className="text-sm font-semibold text-zinc-950">
                        01. Choose Gallery Interface Design
                      </h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        Select how your client experiences this gallery. Changes apply immediately to their shared link.
                      </p>

                      <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                        {GALLERY_DESIGN_PRESETS.map((preset) => {
                          const selected = editForm.theme === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() =>
                                setEditForm((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        theme: preset.id,
                                        defaultLayout: preset.defaultLayout,
                                        headerStyle: preset.defaultHeaderStyle,
                                      }
                                    : prev
                                )
                              }
                              className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-colors ${
                                selected
                                  ? 'border-zinc-950 ring-1 ring-zinc-950'
                                  : 'border-zinc-200 hover:border-zinc-400'
                              }`}
                            >
                              <div>
                                <div
                                  className="mb-3 flex h-16 items-end justify-between rounded-lg border border-zinc-200/70 p-2.5"
                                  style={{ backgroundColor: preset.swatchBg }}
                                >
                                  <div
                                    className="h-5 w-10 rounded"
                                    style={{ backgroundColor: preset.swatchSurface }}
                                  />
                                  <div
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: preset.swatchAccent }}
                                  />
                                </div>
                                <p className="text-xs font-semibold text-zinc-950">
                                  {preset.name}
                                </p>
                                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                                  {preset.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 border-t border-zinc-200 pt-6 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-zinc-900">
                          Gallery Title
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.sessionName}
                          onChange={(e) =>
                            setEditForm({ ...editForm, sessionName: e.target.value })
                          }
                          className="w-full rounded-lg border border-zinc-300 px-3.5 py-2 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-zinc-900">
                          Client Name
                        </label>
                        <input
                          type="text"
                          value={editForm.clientDisplayName}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              clientDisplayName: e.target.value,
                            })
                          }
                          placeholder="e.g., Amara & Daniel"
                          className="w-full rounded-lg border border-zinc-300 px-3.5 py-2 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-zinc-900">
                          Shoot Date
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            required
                            value={editForm.shootDate}
                            onChange={(e) =>
                              setEditForm({ ...editForm, shootDate: e.target.value })
                            }
                            placeholder="November 14, 2026"
                            className="flex-1 rounded-lg border border-zinc-300 px-3.5 py-2 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none"
                          />
                          <input
                            type="date"
                            aria-label="Pick shoot date"
                            onChange={(e) => {
                              if (!e.target.value) return;
                              const formatted = new Date(
                                `${e.target.value}T12:00:00`
                              ).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              });
                              setEditForm({ ...editForm, shootDate: formatted });
                            }}
                            className="w-10 shrink-0 rounded-lg border border-zinc-300 px-2 py-2 text-xs text-zinc-700 focus:border-zinc-950 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-zinc-900">
                          Session Category
                        </label>
                        <input
                          type="text"
                          value={editForm.category}
                          onChange={(e) =>
                            setEditForm({ ...editForm, category: e.target.value })
                          }
                          placeholder="Wedding & Editorial"
                          className="w-full rounded-lg border border-zinc-300 px-3.5 py-2 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-zinc-900">
                          Header Interface Style
                        </label>
                        <select
                          value={editForm.headerStyle}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              headerStyle: e.target.value as GalleryHeaderStyle,
                            })
                          }
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none"
                        >
                          <option value="editorial">Editorial Typographic Header</option>
                          <option value="split-cover">Split Cover Hero with Featured Image</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-zinc-900">
                          Default Photo Grid Mode
                        </label>
                        <select
                          value={editForm.defaultLayout}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              defaultLayout: e.target.value as GalleryLayoutMode,
                            })
                          }
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none"
                        >
                          <option value="masonry">Masonry (Preserve Aspect Ratios)</option>
                          <option value="grid">Uniform Architectural 4:3 Grid</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-zinc-900">
                          Selection Limit{' '}
                          <span className="font-normal text-zinc-500">
                            (optional package cap)
                          </span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={editForm.maxSelections}
                          onChange={(e) =>
                            setEditForm({ ...editForm, maxSelections: e.target.value })
                          }
                          placeholder="Unlimited"
                          className="w-full rounded-lg border border-zinc-300 px-3.5 py-2 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-zinc-900">
                          Client Gallery Passcode{' '}
                          <span className="font-normal text-zinc-500">(optional PIN)</span>
                        </label>
                        <input
                          type="text"
                          value={editForm.passcode}
                          onChange={(e) =>
                            setEditForm({ ...editForm, passcode: e.target.value })
                          }
                          placeholder="Leave blank for open link"
                          className="w-full rounded-lg border border-zinc-300 px-3.5 py-2 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-xs font-semibold text-zinc-900">
                          Google Drive Folder ID{' '}
                          <span className="font-normal text-zinc-500">
                            (optional — links uploads &amp; sync directly to this Drive folder)
                          </span>
                        </label>
                        <input
                          type="text"
                          value={editForm.driveFolderId}
                          onChange={(e) =>
                            setEditForm({ ...editForm, driveFolderId: e.target.value })
                          }
                          placeholder="e.g., 1AbCdEfGhIjKlMnOpQrStUvWxYz"
                          className="w-full rounded-lg border border-zinc-300 px-3.5 py-2 font-mono text-xs text-zinc-950 focus:border-zinc-950 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-zinc-900">
                        Session Description &amp; Client Instructions
                      </label>
                      <textarea
                        rows={3}
                        value={editForm.instructions}
                        onChange={(e) =>
                          setEditForm({ ...editForm, instructions: e.target.value })
                        }
                        placeholder="Describe this shoot and guide your client on selecting their favorite frames..."
                        className="w-full rounded-lg border border-zinc-300 px-3.5 py-2 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none"
                      />
                    </div>

                    <label className="flex items-center gap-2.5 text-xs font-medium text-zinc-800">
                      <input
                        type="checkbox"
                        checked={editForm.allowZipDownload}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            allowZipDownload: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-zinc-300"
                      />
                      <span>
                        Allow client to download selected favorites as a `.zip` archive after submitting
                      </span>
                    </label>

                    <div className="flex justify-end border-t border-zinc-200 pt-5">
                      <button
                        type="submit"
                        disabled={isSavingEdit}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-zinc-950 px-5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                      >
                        {isSavingEdit ? 'Saving...' : 'Save Design & Details'}
                      </button>
                    </div>
                  </form>
                )}

                {/* SUB-TAB 3: PROVISIONED CLIENT LINK & ACCESS */}
                {galleryTab === 'share' && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                      <h2 className="text-sm font-semibold text-zinc-950">
                        Private Client Gallery Link
                      </h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        Share this link directly with your client. It locks their browser strictly to{' '}
                        <span className="font-medium text-zinc-900">
                          {activeGallery.sessionName}
                        </span>{' '}
                        with zero access to other client sessions or studio tools.
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2.5">
                        <input
                          type="text"
                          readOnly
                          value={getClientShareUrl(activeGallery.sessionId)}
                          className="min-w-[260px] flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 font-mono text-xs text-zinc-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyClientLink(activeGallery.sessionId)}
                          className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                        >
                          {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedLink ? 'Copied Link' : 'Copy Link'}</span>
                        </button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `Hello${
                              activeGallery.clientDisplayName
                                ? ` ${activeGallery.clientDisplayName}`
                                : ''
                            }, your proofing gallery "${
                              activeGallery.sessionName
                            }" from Paul Photography 256 is ready: ${getClientShareUrl(
                              activeGallery.sessionId
                            )}${
                              activeGallery.passcode
                                ? ` (Passcode: ${activeGallery.passcode})`
                                : ''
                            }`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                        >
                          <Share2 size={14} />
                          <span>Share via WhatsApp</span>
                        </a>
                      </div>

                      {activeGallery.passcode && (
                        <p className="mt-3 text-xs text-zinc-600">
                          Active Client Passcode:{' '}
                          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono font-semibold text-zinc-950">
                            {activeGallery.passcode}
                          </code>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50/50 p-6">
                      <div>
                        <p className="text-xs font-semibold text-rose-900">
                          Delete Client Gallery
                        </p>
                        <p className="mt-0.5 text-xs text-rose-700">
                          Permanently remove this gallery and any locally uploaded files.
                        </p>
                      </div>

                      {confirmDeleteGallery ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteGallery(false)}
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteGallery}
                            className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                          >
                            Confirm Delete
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteGallery(true)}
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 size={14} />
                          <span>Delete Gallery</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-200 bg-white py-20 text-center">
                <p className="text-sm text-zinc-600">
                  No client galleries yet. Create your first gallery to upload photos.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-white"
                >
                  <Plus size={14} />
                  <span>Create First Gallery</span>
                </button>
              </div>
            )
          ) : (
            /* SECTION 2: CLIENT SUBMISSIONS INBOX */
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative w-full max-w-sm">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="search"
                    value={submissionQuery}
                    onChange={(e) => setSubmissionQuery(e.target.value)}
                    placeholder="Search client name, email, or session..."
                    className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-xs text-zinc-950 focus:border-zinc-950 focus:outline-none"
                  />
                </div>

                <div className="inline-flex items-center gap-1 rounded-lg bg-zinc-200/70 p-1">
                  {(['all', 'new', 'retouching', 'delivered'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSubmissionStatusFilter(st)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                        submissionStatusFilter === st
                          ? 'bg-white text-zinc-950 shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-950'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white py-20 text-center text-sm text-zinc-500">
                  No client favorite submissions match the current filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  <div className="space-y-2 lg:col-span-5">
                    {filteredSubmissions.map((sub) => {
                      const isSelected =
                        activeSubmission?.submissionId === sub.submissionId;
                      return (
                        <button
                          key={sub.submissionId}
                          type="button"
                          onClick={() => setSelectedSubmissionId(sub.submissionId)}
                          className={`w-full rounded-xl border p-4 text-left transition-colors ${
                            isSelected
                              ? 'border-zinc-950 bg-white ring-1 ring-zinc-950'
                              : 'border-zinc-200 bg-white hover:border-zinc-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-zinc-950">
                              {sub.clientName}
                            </p>
                            <span
                              className={`text-xs font-semibold capitalize ${
                                sub.status === 'delivered'
                                  ? 'text-emerald-700'
                                  : sub.status === 'retouching'
                                    ? 'text-amber-700'
                                    : 'text-rose-600'
                              }`}
                            >
                              {sub.status}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-zinc-600">
                            {sub.sessionName}
                          </p>
                          <p className="mt-2 font-mono text-[11px] tabular-nums text-zinc-500">
                            {sub.selectedPhotos.length} selected &middot;{' '}
                            {new Date(sub.timestamp).toLocaleDateString()}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {activeSubmission && (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-7">
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-4">
                        <div>
                          <p className="font-mono text-xs text-zinc-500">
                            {activeSubmission.submissionId} &middot;{' '}
                            {new Date(activeSubmission.timestamp).toLocaleString()}
                          </p>
                          <h2 className="mt-1 font-serif text-xl font-medium text-zinc-950">
                            {activeSubmission.clientName}
                          </h2>
                          <a
                            href={`mailto:${activeSubmission.clientEmail}`}
                            className="text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-950"
                          >
                            {activeSubmission.clientEmail}
                          </a>
                        </div>

                        <select
                          value={activeSubmission.status}
                          onChange={(e) =>
                            handleUpdateStatus(
                              activeSubmission.submissionId,
                              e.target.value as SubmissionStatus
                            )
                          }
                          aria-label="Submission status"
                          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-950"
                        >
                          <option value="new">New Submission</option>
                          <option value="retouching">In Retouching</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </div>

                      {activeSubmission.sessionNotes && (
                        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-xs text-zinc-700">
                          <span className="font-semibold text-zinc-950">
                            Session Notes:
                          </span>{' '}
                          {activeSubmission.sessionNotes}
                        </div>
                      )}

                      {/* Photographer Batch Actions on Submitted Favorites */}
                      <div className="mt-5 flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          disabled={isExporting}
                          onClick={() =>
                            handleBatchDownloadJpgs(
                              resolveSubmissionPhotos(activeSubmission)
                            )
                          }
                          className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg bg-zinc-950 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                        >
                          <FolderDown size={14} />
                          <span>Batch Save Selected .JPGs to Device</span>
                        </button>

                        <button
                          type="button"
                          disabled={isExporting}
                          onClick={() =>
                            handleBatchDownloadZip(
                              resolveSubmissionPhotos(activeSubmission),
                              `${activeSubmission.submissionId}-favorites.zip`
                            )
                          }
                          className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                        >
                          <Archive size={14} />
                          <span>Download .ZIP</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyLightroomFilter(activeSubmission)}
                          className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                        >
                          {copiedLrFilter ? <Check size={14} /> : <Sparkles size={14} />}
                          <span>
                            {copiedLrFilter
                              ? 'Copied Filenames'
                              : 'Copy Lightroom Filter'}
                          </span>
                        </button>
                      </div>

                      <div className="mt-5 divide-y divide-zinc-200 rounded-xl border border-zinc-200">
                        {activeSubmission.selectedPhotos.map((item, idx) => {
                          const gallery = galleries.find(
                            (g) => g.sessionId === activeSubmission.sessionId
                          );
                          const matchedPhoto = gallery?.photos.find(
                            (p) => p.id === item.id || p.filename === item.filename
                          );

                          return (
                            <div
                              key={`${item.id}-${idx}`}
                              className="flex items-center gap-3.5 px-4 py-3"
                            >
                              {matchedPhoto?.thumbnailUrl ? (
                                <img
                                  src={matchedPhoto.thumbnailUrl}
                                  alt={item.filename}
                                  className="h-12 w-12 shrink-0 rounded-md border border-zinc-200 object-cover"
                                />
                              ) : (
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-zinc-100 font-mono text-xs text-zinc-400">
                                  JPG
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-mono text-xs font-semibold text-zinc-950">
                                  {item.filename}
                                </p>
                                {item.note ? (
                                  <p className="mt-0.5 text-xs text-zinc-600">
                                    Note: {item.note}
                                  </p>
                                ) : (
                                  <p className="mt-0.5 text-xs text-zinc-400">
                                    No editing notes
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Create New Client Gallery Modal */}
      {isCreating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pp-new-gallery-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h2 id="pp-new-gallery-title" className="font-serif text-xl font-medium text-zinc-950">
              Create Client Gallery
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              A private client link will be provisioned automatically.
            </p>

            <form onSubmit={handleCreateGallery} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-900">
                  Gallery Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Nakato & Kato Engagement Session"
                  className="w-full rounded-lg border border-zinc-300 px-3.5 py-2 text-sm focus:border-zinc-950 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-900">
                  Client Name
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g., Grace Nakato"
                  className="w-full rounded-lg border border-zinc-300 px-3.5 py-2 text-sm focus:border-zinc-950 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-900">
                    Shoot Date
                  </label>
                  <input
                    type="text"
                    value={newShootDate}
                    onChange={(e) => setNewShootDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs focus:border-zinc-950 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-900">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs focus:border-zinc-950 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-900">
                  Google Drive Folder ID{' '}
                  <span className="font-normal text-zinc-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newDriveFolderId}
                  onChange={(e) => setNewDriveFolderId(e.target.value)}
                  placeholder="Paste Drive folder ID or leave blank"
                  className="w-full rounded-lg border border-zinc-300 px-3.5 py-2 font-mono text-xs focus:border-zinc-950 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-900">
                  Initial Design Interface
                </label>
                <select
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value as GalleryThemeId)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-950 focus:outline-none"
                >
                  {GALLERY_DESIGN_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingNew}
                  className="rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  {isSavingNew ? 'Creating...' : 'Create Gallery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
