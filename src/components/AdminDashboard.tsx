import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CloudUpload,
  Copy,
  Database,
  ExternalLink,
  FolderDown,
  FolderOpen,
  FolderPlus,
  HardDrive,
  ImagePlus,
  Inbox,
  KeyRound,
  Layers,
  Link2,
  Link2Off,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  Palette,
  Pencil,
  PieChart,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Server,
  Share2,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  User,
  UserCheck,
} from 'lucide-react';
import { GALLERY_DESIGN_PRESETS } from '../data/galleryThemes';
import {
  adminCreateDriveFolder,
  adminCreateGallery,
  adminDeleteGallery,
  adminDeletePhoto,
  adminDeleteSubmission,
  adminGetDriveStatus,
  adminGetStorageStatus,
  adminListGalleries,
  adminListSubmissions,
  adminSyncDriveFolder,
  adminUpdateGallery,
  adminUpdateSubmissionStatus,
  adminUploadPhotos,
  DEFAULT_ADMIN_PROFILES,
  getSavedAdminPasscode,
  getSavedAdminUser,
  setSavedAdminPasscode,
  setSavedAdminUser,
  UploadProgressInfo,
  verifyAdminPasscode,
} from '../services/galleryService';
import {
  playSubmissionChime,
  subscribeToGalleries,
  subscribeToSubmissions,
} from '../utils/realtimeProofingSync';
import {
  AdminGalleryRecord,
  AdminUser,
  DriveStatusResponse,
  GalleryHeaderStyle,
  GalleryLayoutMode,
  GalleryThemeId,
  PhotoItem,
  StorageStatusResponse,
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

type AdminSection = 'galleries' | 'submissions' | 'storage';
type GalleryTab = 'photos' | 'design' | 'share';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onExitToShowcase,
  onOpenClientLink,
}) => {
  const [adminPasscode, setAdminPasscode] = useState<string | null>(() =>
    getSavedAdminPasscode()
  );
  const [activeAdminUser, setActiveAdminUser] = useState<AdminUser | null>(() =>
    getSavedAdminUser() || DEFAULT_ADMIN_PROFILES[0]
  );
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [customAccounts, setCustomAccounts] = useState<AdminUser[]>(() => {
    try {
      const raw = localStorage.getItem('pp256_custom_admin_accounts');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [isAddingCustomAccount, setIsAddingCustomAccount] = useState(false);

  const allAvailableProfiles = useMemo(
    () => [...DEFAULT_ADMIN_PROFILES, ...customAccounts],
    [customAccounts]
  );
  const [liveAlert, setLiveAlert] = useState<string | null>(null);
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [section, setSection] = useState<AdminSection>('galleries');
  const [galleryTab, setGalleryTab] = useState<GalleryTab>('photos');

  const [galleries, setGalleries] = useState<AdminGalleryRecord[]>([]);
  const [submissions, setSubmissions] = useState<StoredSubmissionRecord[]>([]);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [galleryToDelete, setGalleryToDelete] = useState<AdminGalleryRecord | null>(null);

  // Storage status state (Admin-only provision)
  const [storageStatus, setStorageStatus] = useState<StorageStatusResponse | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);

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
  const [newAllowZipDownload, setNewAllowZipDownload] = useState(false);
  const [newDownloadPin, setNewDownloadPin] = useState('');
  const [newWatermarkEnabled, setNewWatermarkEnabled] = useState(false);
  const [newWatermarkText, setNewWatermarkText] = useState('PAUL PHOTOGRAPHY 256');
  const [newSets, setNewSets] = useState('Highlights, Ceremony, Portraits');
  const [newLinkEnabled, setNewLinkEnabled] = useState(true);
  const [newPreventScreenshots, setNewPreventScreenshots] = useState(true);
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
    downloadPin: string;
    watermarkEnabled: boolean;
    watermarkText: string;
    sets: string[];
    coverLayout: 'full-bleed' | 'split-cover' | 'minimal';
    status: 'draft' | 'published' | 'archived';
    linkEnabled: boolean;
    preventScreenshots: boolean;
  } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSavedBanner, setEditSavedBanner] = useState(false);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [isDeletingSubmission, setIsDeletingSubmission] = useState(false);
  const [isDeletingGallery, setIsDeletingGallery] = useState(false);

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
      const [galleryList, submissionList, driveInfo, storageInfo] = await Promise.all([
        adminListGalleries(passcode),
        adminListSubmissions(passcode),
        adminGetDriveStatus(passcode),
        adminGetStorageStatus(passcode).catch((err) => {
          console.warn('Storage status check warning:', err);
          return null;
        }),
      ]);
      setGalleries(galleryList);
      setSubmissions(submissionList);
      setDriveStatus(driveInfo);
      if (storageInfo) {
        setStorageStatus(storageInfo);
      }
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

  const handleRefreshStorage = async () => {
    if (!adminPasscode) return;
    setIsLoadingStorage(true);
    try {
      const latest = await adminGetStorageStatus(adminPasscode);
      setStorageStatus(latest);
    } catch (err) {
      console.error('Failed to refresh storage:', err);
    } finally {
      setIsLoadingStorage(false);
    }
  };

  useEffect(() => {
    if (adminPasscode) {
      loadDashboardData(adminPasscode);

      // 1. Instant Real-Time Cross-Device Submissions Listener (SSE < 200ms)
      const unsubSubs = subscribeToSubmissions((newSub) => {
        playSubmissionChime();
        setLiveAlert(
          `🔔 New selection from ${newSub.clientName || 'Client'} (${newSub.selectedPhotos?.length || 0} frames for ${newSub.sessionName})!`
        );
        setTimeout(() => setLiveAlert(null), 6000);

        setSubmissions((prev) => {
          const idx = prev.findIndex((s) => s.submissionId === newSub.submissionId);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...newSub };
            return copy;
          }
          return [newSub, ...prev];
        });

        setGalleries((prev) =>
          prev.map((g) =>
            g.sessionId === newSub.sessionId
              ? { ...g, submissionCount: (g.submissionCount || 0) + 1 }
              : g
          )
        );
      });

      // 2. Real-Time Gallery Changes Listener (SSE)
      const unsubGalleries = subscribeToGalleries(() => {
        adminListGalleries(adminPasscode)
          .then((latest) => setGalleries(latest))
          .catch(() => {});
      });

      // 3. 5-Second Background Heartbeat Polling for 100% Cross-Device Consistency
      const heartbeat = setInterval(() => {
        adminListSubmissions(adminPasscode)
          .then((latestSubs) => setSubmissions(latestSubs))
          .catch(() => {});
      }, 5000);

      return () => {
        unsubSubs();
        unsubGalleries();
        clearInterval(heartbeat);
      };
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
      downloadPin: activeGallery.downloadPin || '',
      watermarkEnabled: Boolean(activeGallery.watermarkEnabled),
      watermarkText: activeGallery.watermarkText || 'PAUL PHOTOGRAPHY 256',
      sets: activeGallery.sets || ['Highlights', 'Ceremony', 'Portraits'],
      coverLayout: activeGallery.coverLayout || 'full-bleed',
      status: activeGallery.status || 'published',
      linkEnabled: activeGallery.linkEnabled !== false,
      preventScreenshots: activeGallery.preventScreenshots !== false,
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

  const handleGoogleAccountLogin = (profile: AdminUser) => {
    setSavedAdminUser(profile);
    setActiveAdminUser(profile);
    setSavedAdminPasscode('2567');
    setAdminPasscode('2567');
    setIsAccountMenuOpen(false);
  };

  const handleConnectCustomGoogle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail.trim()) return;
    const cleanEmail = customGoogleEmail.trim().toLowerCase();
    const cleanName = customGoogleName.trim() || cleanEmail.split('@')[0];
    const profile: AdminUser = {
      id: `google-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      role: 'Google Studio Admin',
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
      authProvider: 'google',
    };
    const updated = [profile, ...customAccounts.filter((a) => a.email !== cleanEmail)];
    setCustomAccounts(updated);
    try {
      localStorage.setItem('pp256_custom_admin_accounts', JSON.stringify(updated));
    } catch {}
    handleGoogleAccountLogin(profile);
    setCustomGoogleEmail('');
    setCustomGoogleName('');
    setIsAddingCustomAccount(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsAuthenticating(true);
    try {
      await verifyAdminPasscode(loginInput.trim());
      const defaultUser = DEFAULT_ADMIN_PROFILES[0];
      setSavedAdminUser(defaultUser);
      setActiveAdminUser(defaultUser);
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
    setSavedAdminUser(null);
    setActiveAdminUser(null);
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
        allowZipDownload: newAllowZipDownload,
        downloadPin: newDownloadPin.trim() || undefined,
        watermarkEnabled: newWatermarkEnabled,
        watermarkText: newWatermarkText.trim() || 'PAUL PHOTOGRAPHY 256',
        sets: newSets.split(',').map((s) => s.trim()).filter(Boolean),
        linkEnabled: newLinkEnabled,
        preventScreenshots: newPreventScreenshots,
      });
      setGalleries((prev) => [created, ...prev]);
      setSelectedGalleryId(created.sessionId);
      setSection('galleries');
      setGalleryTab('photos');
      setIsCreating(false);
      setNewTitle('');
      setNewClientName('');
      setNewDriveFolderId('');
      setNewAllowZipDownload(false);
      setNewDownloadPin('');
      setNewLinkEnabled(true);
      setNewPreventScreenshots(true);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Failed to create gallery.');
    } finally {
      setIsSavingNew(false);
    }
  };

  const handleToggleDownloads = async (gallery: AdminGalleryRecord) => {
    if (!adminPasscode) return;
    const newSetting = !gallery.allowZipDownload;
    try {
      const updated = await adminUpdateGallery(adminPasscode, gallery.sessionId, {
        allowZipDownload: newSetting,
      });
      setGalleries((prev) =>
        prev.map((g) => (g.sessionId === updated.sessionId ? { ...g, ...updated, allowZipDownload: newSetting } : g))
      );
      if (editForm) {
        setEditForm((prev) => (prev ? { ...prev, allowZipDownload: newSetting } : null));
      }
    } catch (err) {
      console.error('Failed to toggle download permission:', err);
    }
  };

  const handleToggleLinkEnabled = async (gallery: AdminGalleryRecord) => {
    if (!adminPasscode) return;
    const currentEnabled = gallery.linkEnabled !== false;
    const newSetting = !currentEnabled;
    try {
      const updated = await adminUpdateGallery(adminPasscode, gallery.sessionId, {
        linkEnabled: newSetting,
      });
      setGalleries((prev) =>
        prev.map((g) => (g.sessionId === updated.sessionId ? { ...g, ...updated, linkEnabled: newSetting } : g))
      );
      if (editForm) {
        setEditForm((prev) => (prev ? { ...prev, linkEnabled: newSetting } : null));
      }
    } catch (err) {
      console.error('Failed to toggle client link permission:', err);
    }
  };

  const handleTogglePreventScreenshots = async (gallery: AdminGalleryRecord) => {
    if (!adminPasscode) return;
    const currentActive = gallery.preventScreenshots !== false;
    const newSetting = !currentActive;
    try {
      const updated = await adminUpdateGallery(adminPasscode, gallery.sessionId, {
        preventScreenshots: newSetting,
      });
      setGalleries((prev) =>
        prev.map((g) => (g.sessionId === updated.sessionId ? { ...g, ...updated, preventScreenshots: newSetting } : g))
      );
      if (editForm) {
        setEditForm((prev) => (prev ? { ...prev, preventScreenshots: newSetting } : null));
      }
    } catch (err) {
      console.error('Failed to toggle screenshot protection:', err);
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
        downloadPin: editForm.downloadPin,
        watermarkEnabled: editForm.watermarkEnabled,
        watermarkText: editForm.watermarkText,
        sets: editForm.sets,
        coverLayout: editForm.coverLayout,
        status: editForm.status,
        linkEnabled: editForm.linkEnabled,
        preventScreenshots: editForm.preventScreenshots,
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
    setUploadProgress({
      loadedBytes: 0,
      totalBytes: files.reduce((acc, f) => acc + f.size, 0),
      percent: 0,
      currentFileIndex: 0,
      totalFiles: files.length,
      currentFilename: files[0]?.name || 'Preparing upload...',
      phase: 'preparing',
    });
    try {
      const { gallery: updated, uploadDestination } = await adminUploadPhotos(
        adminPasscode,
        activeGallery.sessionId,
        files,
        undefined,
        (progress) => setUploadProgress(progress)
      );
      setGalleries((prev) =>
        prev.map((g) =>
          g.sessionId === updated.sessionId ? { ...g, ...updated } : g
        )
      );
      setUploadNotice(
        uploadDestination === 'cloudflare-r2'
          ? `Uploaded ${files.length} photo${files.length === 1 ? '' : 's'} directly to Cloudflare R2 ($0 egress storage).`
          : uploadDestination === 'google-drive'
          ? `Uploaded ${files.length} image${files.length === 1 ? '' : 's'} directly to Google Drive.`
          : `Uploaded ${files.length} image${files.length === 1 ? '' : 's'} to local Studio Storage.`
      );
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
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
    setIsDeletingGallery(true);
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
    } finally {
      setIsDeletingGallery(false);
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

  const handleDeleteSubmission = async (
    submissionId: string,
    clientName: string
  ) => {
    if (!adminPasscode) return;
    if (
      !window.confirm(
        `Are you sure you want to delete the submission from "${clientName}"? This action cannot be undone.`
      )
    ) {
      return;
    }
    setIsDeletingSubmission(true);
    try {
      await adminDeleteSubmission(adminPasscode, submissionId);
      setSubmissions((prev) =>
        prev.filter((s) => s.submissionId !== submissionId)
      );
      if (selectedSubmissionId === submissionId) {
        setSelectedSubmissionId(null);
      }
    } catch (err) {
      setDataError(
        err instanceof Error ? err.message : 'Failed to delete submission.'
      );
    } finally {
      setIsDeletingSubmission(false);
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
  // STUDIO MULTI-ACCOUNT & GOOGLE AUTHENTICATION PORTAL
  // ---------------------------------------------------------------------------
  if (!adminPasscode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-xs">
                <Shield size={20} />
              </div>
              <div>
                <h1 className="font-serif text-xl font-medium text-zinc-950">
                  Studio Admin Console
                </h1>
                <p className="text-xs text-zinc-500">
                  Paul Photography 256 &middot; Real-Time Proofing Engine
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Cloud Sync Live</span>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-zinc-600">
            Sign in with your Google account, studio profile, or master passcode. All authenticated accounts share the <strong>real-time client submissions stream</strong> and all client galleries.
          </p>

          {/* Quick One-Click Google / Studio Accounts */}
          <div className="mt-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Sign In with Google Account / Studio Profile
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCustomAccount(!isAddingCustomAccount)}
                className="text-[11px] font-semibold text-purple-700 hover:text-purple-900"
              >
                {isAddingCustomAccount ? 'View default accounts' : '+ Connect custom Google'}
              </button>
            </div>

            {isAddingCustomAccount ? (
              <form onSubmit={handleConnectCustomGoogle} className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-3">
                <p className="text-xs font-semibold text-zinc-900">
                  Connect Your Google Account
                </p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Enter your Google Account email. You will immediately have access to all client galleries and real-time submissions stream.
                </p>
                <div>
                  <input
                    type="email"
                    required
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    placeholder="e.g. photographer@gmail.com"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    placeholder="Your display name (optional)"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomAccount(false)}
                    className="flex-1 rounded-lg border border-zinc-300 bg-white py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-zinc-950 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                  >
                    Sign In with Google
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                {allAvailableProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => handleGoogleAccountLogin(profile)}
                    className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-left transition-all hover:border-zinc-950 hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={profile.avatarUrl}
                        alt={profile.name}
                        className="h-9 w-9 rounded-full object-cover border border-zinc-200"
                      />
                      <div>
                        <p className="text-xs font-semibold text-zinc-900">{profile.name}</p>
                        <p className="font-mono text-[11px] text-zinc-500">{profile.email}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-zinc-200/80 px-2.5 py-1 text-[10px] font-medium text-zinc-700">
                      {profile.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-zinc-400 font-medium">Or enter studio passcode</span>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            {loginError && (
              <div
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
              >
                {loginError}
              </div>
            )}

            <div>
              <div className="relative">
                <KeyRound
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  id="pp-admin-passcode"
                  type="password"
                  required
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="Enter studio master passcode (2567)"
                  className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onExitToShowcase}
                className="inline-flex min-h-[42px] flex-1 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Back to Showcase
              </button>
              <button
                type="submit"
                disabled={isAuthenticating}
                className="inline-flex min-h-[42px] flex-1 items-center justify-center whitespace-nowrap rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {isAuthenticating ? 'Authenticating...' : 'Enter Console'}
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

            <button
              type="button"
              onClick={() => setSection('storage')}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                section === 'storage'
                  ? 'bg-zinc-950 text-white'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <HardDrive size={16} />
                <span>Storage &amp; Capacity</span>
              </span>
              {storageStatus ? (
                <span className="font-mono text-[11px] tabular-nums opacity-75">
                  {storageStatus.r2?.configured && storageStatus.r2.freeFormatted
                    ? `${storageStatus.r2.freeFormatted} free`
                    : `${storageStatus.disk.freeFormatted} free`}
                </span>
              ) : (
                <span className="font-mono text-[11px] tabular-nums opacity-50">Admin</span>
              )}
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
                    <div
                      key={g.sessionId}
                      className={`group relative flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                        isActive
                          ? 'border-zinc-300 bg-zinc-100 shadow-2xs'
                          : 'border-transparent hover:bg-zinc-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedGalleryId(g.sessionId)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                          <span className="truncate">{g.sessionName}</span>
                          {g.linkEnabled === false && (
                            <span className="shrink-0 rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
                              Disabled
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[11px] tabular-nums text-zinc-500">
                          {g.photos.length} photos &middot; {g.submissionCount || 0} picks
                        </p>
                      </button>

                      {/* Quick action buttons for each gallery */}
                      <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGalleryId(g.sessionId);
                            setGalleryTab('design');
                          }}
                          title="Edit Gallery"
                          className="p-1 rounded text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 transition-colors"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setGalleryToDelete(g);
                          }}
                          title="Delete Gallery"
                          className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {storageStatus && (
          <div className="mx-3.5 mt-auto mb-2 hidden rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 lg:block">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-zinc-800">
                <CloudUpload size={13} className="text-orange-500" />
                <span>{storageStatus.r2?.configured ? 'Cloudflare R2 Storage' : 'Server Storage'}</span>
              </span>
              <button
                type="button"
                onClick={handleRefreshStorage}
                disabled={isLoadingStorage}
                title="Refresh storage statistics"
                className="text-zinc-400 hover:text-zinc-700 disabled:opacity-50"
              >
                <RefreshCw size={11} className={isLoadingStorage ? 'animate-spin' : ''} />
              </button>
            </div>

            {storageStatus.r2?.configured ? (
              <>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(storageStatus.r2.usedPercent || 0, 1))}%`,
                    }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between font-mono text-[11px] tabular-nums text-zinc-700">
                  <span>{storageStatus.r2.totalSizeFormatted || '0 B'} used</span>
                  <span className="font-semibold text-emerald-700">{storageStatus.r2.freeFormatted || '10 GB'} free</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
                  <span>Free Tier: {storageStatus.r2.limitFormatted || '10 GB'}</span>
                  <button
                    type="button"
                    onClick={() => setSection('storage')}
                    className="text-zinc-600 hover:text-zinc-950 underline font-medium"
                  >
                    Details
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      storageStatus.disk.usedPercent > 90
                        ? 'bg-rose-500'
                        : storageStatus.disk.usedPercent > 75
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, storageStatus.disk.usedPercent)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between font-mono text-[11px] tabular-nums text-zinc-600">
                  <span>{storageStatus.disk.usedFormatted} used</span>
                  <span className="font-semibold text-emerald-700">{storageStatus.disk.freeFormatted} free</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
                  <span>Total {storageStatus.disk.totalFormatted}</span>
                  <button
                    type="button"
                    onClick={() => setSection('storage')}
                    className="text-zinc-600 hover:text-zinc-950 underline font-medium"
                  >
                    Details
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="hidden border-t border-zinc-200 p-3.5 lg:block">
          {/* Active Admin Profile Card */}
          <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50/80 p-2.5">
            <img
              src={activeAdminUser?.avatarUrl || DEFAULT_ADMIN_PROFILES[0].avatarUrl}
              alt={activeAdminUser?.name}
              className="h-8 w-8 rounded-full border border-zinc-300 object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-zinc-950">
                {activeAdminUser?.name || 'Studio Admin'}
              </p>
              <p className="truncate font-mono text-[10px] text-zinc-500">
                {activeAdminUser?.email || 'admin@paulphotography256.com'}
              </p>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Live stream active" />
          </div>

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
          <div className="flex items-center gap-3">
            <div className="min-w-0 text-sm text-zinc-500">
              <span>Studio Console</span>
              <span className="mx-2" aria-hidden="true">/</span>
              <span className="font-medium text-zinc-950">
                {section === 'galleries'
                  ? activeGallery?.sessionName || 'Client Galleries'
                  : section === 'submissions'
                  ? 'Client Favorite Submissions'
                  : 'Studio Storage & Capacity'}
              </span>
            </div>

            {/* Live Real-Time Multi-Account Stream Indicator */}
            <div className="hidden xl:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time Stream Active (All Accounts)</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Google / Admin Profile Badge & Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 hover:border-zinc-300 hover:bg-zinc-100 transition-all cursor-pointer"
                title="Switch Google / Admin Account"
              >
                <img
                  src={activeAdminUser?.avatarUrl || DEFAULT_ADMIN_PROFILES[0].avatarUrl}
                  alt={activeAdminUser?.name}
                  className="h-6 w-6 rounded-full border border-zinc-300 object-cover"
                />
                <span className="text-xs font-medium text-zinc-800 max-w-[120px] truncate hidden sm:inline">
                  {activeAdminUser?.name || 'Kibalama Paul'}
                </span>
                <span className="text-[10px] font-mono bg-zinc-200/80 text-zinc-700 px-1.5 py-0.5 rounded-full hidden md:inline">
                  {activeAdminUser?.role || 'Admin'}
                </span>
                <ChevronDown size={14} className="text-zinc-500" />
              </button>

              {/* Account Switcher Dropdown */}
              {isAccountMenuOpen && (
                <div className="absolute right-0 top-full mt-2 z-40 w-80 rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xl">
                  <div className="border-b border-zinc-100 pb-2.5 px-1">
                    <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                      Signed in as
                    </p>
                    <p className="text-xs font-bold text-zinc-900 mt-0.5">
                      {activeAdminUser?.name}
                    </p>
                    <p className="font-mono text-[11px] text-zinc-500 truncate">
                      {activeAdminUser?.email}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 rounded-md px-2 py-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Viewing all client submissions &amp; galleries in real-time</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold px-1 mb-1">
                      Switch Google / Studio Profile
                    </p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {allAvailableProfiles.map((p) => {
                        const isCurrent = activeAdminUser?.email === p.email;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleGoogleAccountLogin(p)}
                            className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors ${
                              isCurrent
                                ? 'bg-zinc-100 font-semibold text-zinc-950'
                                : 'text-zinc-700 hover:bg-zinc-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={p.avatarUrl}
                                alt={p.name}
                                className="h-6 w-6 rounded-full object-cover shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="truncate leading-tight">{p.name}</p>
                                <p className="font-mono text-[10px] text-zinc-400 truncate leading-tight">
                                  {p.email}
                                </p>
                              </div>
                            </div>
                            {isCurrent ? (
                              <Check size={14} className="text-emerald-600 shrink-0" />
                            ) : (
                              <span className="text-[10px] text-zinc-400 shrink-0">{p.role}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-2 border-t border-zinc-100 pt-2 flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        setIsAddingCustomAccount(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50 transition-colors"
                    >
                      <Plus size={14} />
                      <span>Sign In with another Google Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            {storageStatus && (
              <button
                type="button"
                onClick={() => setSection('storage')}
                title="View Cloudflare R2 and Server Storage Capacity"
                className={`inline-flex min-h-[38px] items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  section === 'storage'
                    ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                    : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50'
                }`}
              >
                {storageStatus.r2?.configured ? (
                  <>
                    <CloudUpload size={14} className="text-orange-500" />
                    <span className="font-semibold text-emerald-700">{storageStatus.r2.freeFormatted || '10 GB'} Free (R2)</span>
                    <span className="opacity-60 hidden sm:inline">
                      {storageStatus.r2.totalSizeFormatted || '0 B'} used
                    </span>
                  </>
                ) : (
                  <>
                    <HardDrive size={14} className={section === 'storage' ? 'text-zinc-300' : 'text-zinc-500'} />
                    <span className="font-semibold">{storageStatus.disk.freeFormatted} Free</span>
                    <span className="opacity-60 hidden sm:inline">of {storageStatus.disk.totalFormatted}</span>
                  </>
                )}
              </button>
            )}
            {section === 'galleries' && activeGallery && (
              <>
                <button
                  type="button"
                  onClick={() => handleCopyClientLink(activeGallery.sessionId)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenClientLink(activeGallery.sessionId)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  <ExternalLink size={14} />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGalleryTab('design')}
                  className={`inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    galleryTab === 'design'
                      ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                      : 'border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50'
                  }`}
                  title="Edit gallery title, client name, shoot date, and design"
                >
                  <Pencil size={13} />
                  <span>Edit Gallery</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGalleryToDelete(activeGallery)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
                  title="Delete this client gallery"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
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
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                      <span>{activeGallery.clientDisplayName || 'Client Session'}</span>
                      <span>&middot;</span>
                      <span>{activeGallery.shootDate}</span>
                      <span>&middot;</span>
                      <span className="font-mono tabular-nums">
                        {activeGallery.photos.length} photos
                      </span>
                      <span>&middot;</span>
                      <span>
                        Design:{' '}
                        <span className="font-medium text-zinc-800">
                          {GALLERY_DESIGN_PRESETS.find((p) => p.id === activeGallery.theme)
                            ?.name || 'Editorial Light'}
                        </span>
                      </span>
                      <span>&middot;</span>
                      <button
                        type="button"
                        onClick={() => handleToggleLinkEnabled(activeGallery)}
                        title="Click to enable or disable client link access"
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all shadow-2xs ${
                          activeGallery.linkEnabled !== false
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 ring-1 ring-rose-300 hover:bg-rose-100'
                        }`}
                      >
                        {activeGallery.linkEnabled !== false ? (
                          <Link2 size={11} className="text-emerald-600" />
                        ) : (
                          <Link2Off size={11} className="text-rose-600" />
                        )}
                        <span>
                          Client Link: {activeGallery.linkEnabled !== false ? 'Active' : 'Disabled'}
                        </span>
                      </button>
                      <span>&middot;</span>
                      <button
                        type="button"
                        onClick={() => handleToggleDownloads(activeGallery)}
                        title="Click to toggle client download access"
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all shadow-2xs ${
                          activeGallery.allowZipDownload
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 hover:bg-emerald-100'
                            : 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-300 hover:bg-zinc-200'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            activeGallery.allowZipDownload ? 'bg-emerald-600' : 'bg-zinc-400'
                          }`}
                        />
                        <span>
                          Downloads: {activeGallery.allowZipDownload ? 'Active' : 'Disabled (View-Only)'}
                        </span>
                      </button>
                      <span>&middot;</span>
                      <button
                        type="button"
                        onClick={() => handleTogglePreventScreenshots(activeGallery)}
                        title="Click to toggle anti-screenshot capture protection"
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all shadow-2xs ${
                          activeGallery.preventScreenshots !== false
                            ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20 hover:bg-purple-100'
                            : 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-300 hover:bg-zinc-200'
                        }`}
                      >
                        <ShieldAlert size={11} className={activeGallery.preventScreenshots !== false ? 'text-purple-600' : 'text-zinc-400'} />
                        <span>
                          Anti-Screenshot: {activeGallery.preventScreenshots !== false ? 'Active' : 'Off'}
                        </span>
                      </button>
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
                      <Pencil size={13} />
                      <span>Edit &amp; Settings</span>
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

                      {isUploading && uploadProgress && (
                        <div className="mt-5 w-full max-w-md rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left shadow-sm">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-zinc-900 flex items-center gap-2">
                              <Loader2 size={13} className="animate-spin text-zinc-700" />
                              {uploadProgress.phase === 'preparing' && 'Preparing Web Previews...'}
                              {uploadProgress.phase === 'uploading' && 'Uploading to Cloud Storage...'}
                              {uploadProgress.phase === 'processing' && 'Finalizing Gallery Photos...'}
                            </span>
                            <span className="font-mono font-bold text-zinc-950">
                              {uploadProgress.percent}%
                            </span>
                          </div>

                          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                            <div
                              className="h-full rounded-full bg-zinc-950 transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, uploadProgress.percent))}%` }}
                            />
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                            <span className="truncate max-w-[240px]" title={uploadProgress.currentFilename}>
                              {uploadProgress.currentFilename}
                            </span>
                            <span className="font-sans">
                              {uploadProgress.totalFiles > 0
                                ? `${uploadProgress.totalFiles} item${uploadProgress.totalFiles === 1 ? '' : 's'}`
                                : ''}
                            </span>
                          </div>
                        </div>
                      )}

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

                {/* SUB-TAB 2: EDIT GALLERY & DESIGN SETTINGS */}
                {galleryTab === 'design' && editForm && (
                  <form
                    onSubmit={handleSaveGalleryEdits}
                    className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs"
                  >
                    {/* Top Action & Save Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
                      <div>
                        <h2 className="text-base font-semibold text-zinc-950 flex items-center gap-2">
                          <Pencil size={16} className="text-purple-600" />
                          <span>Edit Gallery &amp; Design Settings</span>
                        </h2>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Update title, client name, shoot date, photo sets, passcode, download PIN, and theme.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setGalleryToDelete(activeGallery)}
                          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 size={13} />
                          <span>Delete Gallery</span>
                        </button>

                        <button
                          type="submit"
                          disabled={isSavingEdit}
                          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 shadow-xs transition-colors"
                        >
                          {isSavingEdit ? (
                            <Loader2 size={13} className="animate-spin text-white" />
                          ) : (
                            <Check size={13} />
                          )}
                          <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                      </div>
                    </div>

                    {editSavedBanner && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <span>Gallery settings saved successfully! Updates are live across all client and admin views.</span>
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

                    <div className="space-y-3">
                      <label className="flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs font-medium text-zinc-800 cursor-pointer hover:bg-zinc-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={editForm.linkEnabled}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              linkEnabled: e.target.checked,
                            })
                          }
                          className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950"
                        />
                        <div>
                          <span className="font-semibold text-zinc-900 flex items-center gap-1.5">
                            <span>Activate Client Link (Public Proofing Access)</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              editForm.linkEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {editForm.linkEnabled ? 'Active' : 'Disabled'}
                            </span>
                          </span>
                          <p className="text-[11px] text-zinc-500 font-normal mt-0.5">
                            When checked, the client can access and review their proofing gallery at their unique URL. When unchecked, client access is immediately disabled and revoked with a studio contact screen.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs font-medium text-zinc-800 cursor-pointer hover:bg-zinc-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={editForm.preventScreenshots}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              preventScreenshots: e.target.checked,
                            })
                          }
                          className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-purple-700 focus:ring-purple-700"
                        />
                        <div>
                          <span className="font-semibold text-zinc-900 flex items-center gap-1.5">
                            <ShieldAlert size={13} className="text-purple-600" />
                            <span>Screen Capture &amp; Anti-Screenshot Protection</span>
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                              Active Shield
                            </span>
                          </span>
                          <p className="text-[11px] text-zinc-500 font-normal mt-0.5">
                            Blocks right-click context menu, browser print shortcuts (Cmd/Ctrl+P), screenshot shortcuts (PrintScreen, Cmd+Shift+3/4/5), photo dragging, and blurs proofs during screen capture attempts.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs font-medium text-zinc-800 cursor-pointer hover:bg-zinc-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={editForm.allowZipDownload}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              allowZipDownload: e.target.checked,
                            })
                          }
                          className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950"
                        />
                        <div>
                          <span className="font-semibold text-zinc-900">Enable Client Downloads (Original High-Resolution)</span>
                          <p className="text-[11px] text-zinc-500 font-normal mt-0.5">
                            When checked, clients can download full-resolution original photos and ZIP archives. When unchecked, download buttons are completely hidden for strictly view-only proofing.
                          </p>
                        </div>
                      </label>
                    </div>

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
                    {/* Client Link Status & Fast Controls Card */}
                    <div className={`rounded-2xl border p-5 flex flex-wrap items-center justify-between gap-4 ${
                      activeGallery.linkEnabled !== false
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                        : 'border-rose-200 bg-rose-50/80 text-rose-950'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl shadow-xs ${
                          activeGallery.linkEnabled !== false ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                        }`}>
                          {activeGallery.linkEnabled !== false ? <Link2 size={20} /> : <Link2Off size={20} />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {activeGallery.linkEnabled !== false ? 'Client Link is Live & Accessible' : 'Client Link is Currently Disabled & Revoked'}
                          </p>
                          <p className="text-xs opacity-80 mt-0.5">
                            {activeGallery.linkEnabled !== false
                              ? 'Clients visiting this URL can view proofs, select favorites, and play slideshows.'
                              : 'Clients visiting this URL will see an "Access Suspended" notice with studio contact information.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleLinkEnabled(activeGallery)}
                          className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold shadow-xs transition-colors ${
                            activeGallery.linkEnabled !== false
                              ? 'border border-rose-300 bg-white text-rose-700 hover:bg-rose-50'
                              : 'bg-emerald-700 text-white hover:bg-emerald-800'
                          }`}
                        >
                          {activeGallery.linkEnabled !== false ? <Link2Off size={14} /> : <Link2 size={14} />}
                          <span>{activeGallery.linkEnabled !== false ? 'Disable Client Link' : 'Activate Client Link'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePreventScreenshots(activeGallery)}
                          className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-colors ${
                            activeGallery.preventScreenshots !== false
                              ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
                              : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                          }`}
                        >
                          <ShieldAlert size={14} className={activeGallery.preventScreenshots !== false ? 'text-purple-600' : 'text-zinc-400'} />
                          <span>{activeGallery.preventScreenshots !== false ? 'Screenshot Shield: On' : 'Screenshot Shield: Off'}</span>
                        </button>
                      </div>
                    </div>

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
                            disabled={isDeletingGallery}
                            onClick={() => setConfirmDeleteGallery(false)}
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isDeletingGallery}
                            onClick={handleDeleteGallery}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                          >
                            {isDeletingGallery ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            <span>Confirm Delete</span>
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
          ) : section === 'submissions' ? (
            /* SECTION 2: CLIENT SUBMISSIONS INBOX */
            <div className="space-y-5">
              {/* Real-time sync banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold">Real-Time Stream Active:</span>
                  <span>Every logged-in admin &amp; Google account sees new client selections instantly (&lt;200ms).</span>
                </div>
                <span className="font-mono text-[11px] font-semibold opacity-80">
                  {submissions.length} total client {submissions.length === 1 ? 'submission' : 'submissions'}
                </span>
              </div>

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
                          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                            <span className="font-mono tabular-nums">
                              {sub.selectedPhotos.length} selected &middot;{' '}
                              {new Date(sub.timestamp).toLocaleDateString()}
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubmission(sub.submissionId, sub.clientName);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.stopPropagation();
                                  handleDeleteSubmission(sub.submissionId, sub.clientName);
                                }
                              }}
                              title="Delete Submission"
                              className="rounded p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </span>
                          </div>
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
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <a
                              href={`mailto:${activeSubmission.clientEmail}`}
                              className="text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-950"
                            >
                              {activeSubmission.clientEmail}
                            </a>
                            {activeSubmission.clientPhone && (
                              <>
                                <span className="text-zinc-300">&middot;</span>
                                <a
                                  href={`https://wa.me/${activeSubmission.clientPhone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                                >
                                  <MessageCircle size={13} />
                                  <span>{activeSubmission.clientPhone} (WhatsApp)</span>
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
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

                          <button
                            type="button"
                            disabled={isDeletingSubmission}
                            onClick={() =>
                              handleDeleteSubmission(
                                activeSubmission.submissionId,
                                activeSubmission.clientName
                              )
                            }
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-colors disabled:opacity-50"
                            title="Delete this client submission"
                          >
                            {isDeletingSubmission ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                            <span>Delete</span>
                          </button>
                        </div>
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
          ) : (
            /* SECTION 3: STORAGE & CAPACITY (Admin-only) */
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
                <div>
                  <h1 className="font-serif text-2xl font-medium text-zinc-950">
                    Storage &amp; Cloud Capacity
                  </h1>
                  <p className="mt-1 text-xs text-zinc-500">
                    Admin-only view of server disk usage, studio proofing footprint, and Google Drive quota.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshStorage}
                  disabled={isLoadingStorage}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isLoadingStorage ? 'animate-spin' : ''} />
                  <span>{isLoadingStorage ? 'Refreshing…' : 'Refresh'}</span>
                </button>
              </div>

              {!storageStatus ? (
                <div className="flex items-center justify-center py-20 text-zinc-500">
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  {/* 1. Cloudflare R2 Cloud Storage Card (Primary Storage Hero) */}
                  <div className="rounded-2xl border border-orange-200 bg-white p-6 xl:col-span-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-sm font-semibold text-zinc-950">
                        <CloudUpload size={20} className="text-orange-500" />
                        <span>Cloudflare R2 Object Storage</span>
                        <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700 border border-orange-200">
                          Primary Client Cloud Storage &middot; $0 Egress Bandwidth
                        </span>
                      </div>
                      {storageStatus.r2?.configured ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Live &amp; Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Ready to Connect
                        </span>
                      )}
                    </div>

                    {storageStatus.r2?.configured ? (
                      <div className="mt-5 space-y-4">
                        <div className="flex items-end justify-between">
                          <span className="font-mono text-3xl font-bold tabular-nums text-zinc-950">
                            {storageStatus.r2.usedPercent ?? 0}%
                          </span>
                          <span className="text-xs text-zinc-500 font-medium">
                            <strong className="text-zinc-900 font-semibold">{storageStatus.r2.totalSizeFormatted || '0 B'}</strong> used of{' '}
                            <strong>{storageStatus.r2.limitFormatted || '10 GB'}</strong> (Cloudflare Free Tier) &middot;{' '}
                            <span className="text-emerald-700 font-semibold">{storageStatus.r2.freeFormatted || '10 GB'} Free Space</span>
                          </span>
                        </div>

                        {/* R2 Quota Progress Bar */}
                        <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full transition-all duration-700 bg-orange-500"
                            style={{
                              width: `${Math.min(100, Math.max(storageStatus.r2.usedPercent || 0, 1))}%`,
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                              Actual Space Used
                            </p>
                            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-zinc-950">
                              {storageStatus.r2.totalSizeFormatted || '0 B'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                              Available Free Space
                            </p>
                            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-emerald-800">
                              {storageStatus.r2.freeFormatted || '10 GB'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                              Stored Cloud Photos
                            </p>
                            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-zinc-950">
                              {storageStatus.r2.totalObjects || 0} photo{(storageStatus.r2.totalObjects || 0) === 1 ? '' : 's'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                              R2 Bucket
                            </p>
                            <p className="mt-1 font-mono text-xs font-bold text-zinc-950 truncate" title={storageStatus.r2.bucketName}>
                              {storageStatus.r2.bucketName || '—'}
                            </p>
                          </div>
                        </div>

                        {storageStatus.r2.publicUrl && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs">
                            <span className="text-zinc-500">Public CDN Endpoint:</span>
                            <a
                              href={storageStatus.r2.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs font-medium text-zinc-900 hover:underline inline-flex items-center gap-1"
                            >
                              <span>{storageStatus.r2.publicUrl}</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-5 rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-5">
                        <div className="flex items-start gap-3.5">
                          <div className="rounded-lg bg-orange-100 p-2 text-orange-600 shrink-0">
                            <CloudUpload size={20} />
                          </div>
                          <div className="text-xs text-zinc-700 space-y-2">
                            <p className="font-semibold text-zinc-950">
                              How to Connect Cloudflare R2 (10 GB Free Forever)
                            </p>
                            <p className="leading-relaxed text-zinc-600">
                              Cloudflare R2 provides fast global photo delivery and unlimited client downloads with <strong>$0 egress bandwidth fees</strong>. To activate, add these 5 keys to your <code className="rounded bg-white px-1.5 py-0.5 font-mono text-zinc-800 border border-zinc-200">.env.local</code>:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                              <div className="rounded-md bg-white p-2 border border-orange-200/80">
                                <span className="font-semibold text-zinc-900">R2_ACCOUNT_ID</span>
                                <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Found on Cloudflare dashboard sidebar</p>
                              </div>
                              <div className="rounded-md bg-white p-2 border border-orange-200/80">
                                <span className="font-semibold text-zinc-900">R2_BUCKET_NAME</span>
                                <p className="text-[10px] text-zinc-500 font-sans mt-0.5">e.g. paul-photography-proofing</p>
                              </div>
                              <div className="rounded-md bg-white p-2 border border-orange-200/80">
                                <span className="font-semibold text-zinc-900">R2_ACCESS_KEY_ID</span>
                                <p className="text-[10px] text-zinc-500 font-sans mt-0.5">From &quot;Manage R2 API Tokens&quot;</p>
                              </div>
                              <div className="rounded-md bg-white p-2 border border-orange-200/80">
                                <span className="font-semibold text-zinc-900">R2_SECRET_ACCESS_KEY</span>
                                <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Secret access key string</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Studio Proofing Footprint Card */}
                  <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                    <div className="flex items-center gap-2.5 text-sm font-semibold text-zinc-950">
                      <Database size={18} className="text-zinc-500" />
                      <span>Studio Proofing Footprint</span>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                            Total Studio Assets
                          </p>
                          <span className="rounded-md bg-zinc-200/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-700">
                            {storageStatus.studio.totalStudioFormatted}
                          </span>
                        </div>
                      </div>

                      <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                              <ImagePlus size={15} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-zinc-900">
                                Gallery Photos
                              </p>
                              <p className="text-[11px] text-zinc-500">
                                {storageStatus.studio.photosCount} file{storageStatus.studio.photosCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-semibold tabular-nums text-zinc-800">
                            {storageStatus.studio.photosSizeFormatted}
                          </span>
                        </div>

                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
                              <Inbox size={15} className="text-violet-600" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-zinc-900">
                                Client Submissions
                              </p>
                              <p className="text-[11px] text-zinc-500">
                                {storageStatus.studio.submissionsCount} record{storageStatus.studio.submissionsCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-semibold tabular-nums text-zinc-800">
                            {storageStatus.studio.submissionsSizeFormatted}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Server Disk Storage Card (Local Host Machine) */}
                  <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-sm font-semibold text-zinc-950">
                        <Server size={18} className="text-zinc-500" />
                        <span>Local Host Server Disk</span>
                      </div>
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 border border-zinc-200">
                        macOS Host Drive
                      </span>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-end justify-between">
                        <span className="font-mono text-3xl font-bold tabular-nums text-zinc-950">
                          {storageStatus.disk.usedPercent}%
                        </span>
                        <span className="text-xs text-zinc-500">
                          of {storageStatus.disk.totalFormatted} total host disk
                        </span>
                      </div>

                      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            storageStatus.disk.usedPercent > 90
                              ? 'bg-rose-500'
                              : storageStatus.disk.usedPercent > 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, storageStatus.disk.usedPercent)}%` }}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                            Host Used Space
                          </p>
                          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-zinc-950">
                            {storageStatus.disk.usedFormatted}
                          </p>
                        </div>
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                            Host Free Space
                          </p>
                          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-emerald-800">
                            {storageStatus.disk.freeFormatted}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Google Drive Quota Card */}
                  <div className="rounded-2xl border border-zinc-200 bg-white p-6 xl:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-sm font-semibold text-zinc-950">
                        <CloudUpload size={18} className="text-zinc-500" />
                        <span>Google Drive Cloud Quota</span>
                      </div>
                      {storageStatus.drive?.configured ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                          Not Linked
                        </span>
                      )}
                    </div>

                    {storageStatus.drive?.configured && storageStatus.drive.limitFormatted ? (
                      <div className="mt-5">
                        <div className="flex items-end justify-between">
                          <span className="font-mono text-2xl font-bold tabular-nums text-zinc-950">
                            {storageStatus.drive.usageFormatted || '—'}
                          </span>
                          <span className="text-xs text-zinc-500">
                            of {storageStatus.drive.limitFormatted}
                          </span>
                        </div>
                        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              (storageStatus.drive.usedPercent || 0) > 90
                                ? 'bg-rose-500'
                                : (storageStatus.drive.usedPercent || 0) > 75
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(100, storageStatus.drive.usedPercent || 0)}%` }}
                          />
                        </div>
                        <div className="mt-3 flex items-center justify-between font-mono text-xs tabular-nums text-zinc-600">
                          <span>Used: {storageStatus.drive.usageFormatted || '—'}</span>
                          <span className="font-semibold text-blue-700">
                            Free: {storageStatus.drive.freeFormatted || '—'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 py-8 text-center">
                        <CloudUpload size={28} className="mx-auto text-zinc-300" />
                        <p className="mt-2 text-xs text-zinc-500">
                          Link a Google Service Account to see Drive storage quota here.
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-400">
                          Set <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-600">GOOGLE_SERVICE_ACCOUNT_EMAIL</code> and{' '}
                          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-600">GOOGLE_PRIVATE_KEY</code> in your environment.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              {storageStatus && (
                <p className="text-center text-[11px] text-zinc-400">
                  Last updated: {new Date(storageStatus.updatedAt).toLocaleString()}
                </p>
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

              <div className="space-y-2.5">
                <label className="flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-medium text-zinc-800 cursor-pointer hover:bg-zinc-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={newLinkEnabled}
                    onChange={(e) => setNewLinkEnabled(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950"
                  />
                  <div>
                    <span className="font-semibold text-zinc-900">Activate Client Link</span>
                    <p className="text-[11px] text-zinc-500 font-normal mt-0.5">
                      Make this proofing gallery accessible immediately at its client URL.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-medium text-zinc-800 cursor-pointer hover:bg-zinc-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={newPreventScreenshots}
                    onChange={(e) => setNewPreventScreenshots(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-purple-700 focus:ring-purple-700"
                  />
                  <div>
                    <span className="font-semibold text-zinc-900">Anti-Screenshot Protection</span>
                    <p className="text-[11px] text-zinc-500 font-normal mt-0.5">
                      Guards proofs with screenshot blocking, print lockdown, and capture shielding.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-medium text-zinc-800 cursor-pointer hover:bg-zinc-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={newAllowZipDownload}
                    onChange={(e) => setNewAllowZipDownload(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950"
                  />
                  <div>
                    <span className="font-semibold text-zinc-900">Enable Client Downloads</span>
                    <p className="text-[11px] text-zinc-500 font-normal mt-0.5">
                      Allow client to download high-resolution original photos and ZIP archives. Leave unchecked for view-only proofing.
                    </p>
                  </div>
                </label>
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

      {/* DELETE GALLERY CONFIRMATION MODAL */}
      {galleryToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setGalleryToDelete(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100">
                <Trash2 size={22} className="text-rose-600" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-zinc-950">
                  Delete Client Gallery
                </h3>
                <p className="text-xs text-zinc-500">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/70 p-4 text-xs text-rose-900 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong>"{galleryToDelete.sessionName}"</strong>?
              {galleryToDelete.photos.length > 0 && (
                <span className="block mt-1">
                  All <strong>{galleryToDelete.photos.length} uploaded photographs</strong>, proofs, and client access links will be permanently removed.
                </span>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setGalleryToDelete(null)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingGallery}
                onClick={async () => {
                  if (!adminPasscode || !galleryToDelete) return;
                  setIsDeletingGallery(true);
                  try {
                    await adminDeleteGallery(adminPasscode, galleryToDelete.sessionId);
                    const remaining = galleries.filter(
                      (g) => g.sessionId !== galleryToDelete.sessionId
                    );
                    setGalleries(remaining);
                    if (selectedGalleryId === galleryToDelete.sessionId) {
                      setSelectedGalleryId(remaining[0]?.sessionId || null);
                    }
                    setGalleryToDelete(null);
                  } catch (err) {
                    setDataError(
                      err instanceof Error ? err.message : 'Unable to delete gallery.'
                    );
                  } finally {
                    setIsDeletingGallery(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-sm disabled:opacity-50"
              >
                {isDeletingGallery ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>Yes, Delete Gallery</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
