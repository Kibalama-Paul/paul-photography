import { MOCK_GALLERY_SESSIONS } from '../data/mockGallery';
import { createWebOptimizedBlob } from '../utils/imageOptimizer';
import {
  broadcastGalleryChange,
  broadcastNewSubmission,
} from '../utils/realtimeProofingSync';
import {
  AdminGalleryRecord,
  AdminUser,
  DriveStatusResponse,
  FavoriteSubmission,
  GalleryHeaderStyle,
  GalleryLayoutMode,
  GallerySession,
  GalleryThemeId,
  PhotoItem,
  R2StatusResponse,
  StorageStatusResponse,
  StoredSubmissionRecord,
  SubmissionStatus,
  SubmitFavoritesResponse,
} from '../types/gallery';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== 'false';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const DEFAULT_BRAND = import.meta.env.VITE_BRAND_NAME || 'Paul Photography 256';
const DEFAULT_SESSION_ID =
  import.meta.env.VITE_DEFAULT_SESSION_ID || 'kampala-editorial-2026';

const DRAFT_STORAGE_PREFIX = 'pp256_proofing_draft_v1_';
const GALLERY_ACCESS_PREFIX = 'pp256_gallery_access_v1_';
const ADMIN_SESSION_KEY = 'pp256_admin_passcode_v1';
const LOCAL_GALLERIES_STORAGE_KEY = 'pp256_client_galleries_cache_v1';

export function getLocalStoredGalleries(): AdminGalleryRecord[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_GALLERIES_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function setLocalStoredGalleries(galleries: AdminGalleryRecord[]): void {
  try {
    window.localStorage.setItem(LOCAL_GALLERIES_STORAGE_KEY, JSON.stringify(galleries));
  } catch {}
}

export interface ProofingDraftState {
  favoriteIds: string[];
  notesByPhotoId: Record<string, string>;
}

export interface GalleryMutationPayload {
  sessionId?: string;
  sessionName: string;
  clientDisplayName?: string;
  shootDate: string;
  category?: string;
  instructions?: string;
  driveFolderId?: string;
  theme?: GalleryThemeId;
  headerStyle?: GalleryHeaderStyle;
  defaultLayout?: GalleryLayoutMode;
  coverPhotoId?: string;
  maxSelections?: number;
  allowZipDownload?: boolean;
  passcode?: string;
  expiresAt?: string;
  // Pixieset Feature Extensions
  sets?: string[];
  downloadPin?: string;
  watermarkEnabled?: boolean;
  watermarkText?: string;
  coverLayout?: 'full-bleed' | 'split-cover' | 'minimal';
  status?: 'draft' | 'published' | 'archived';
  linkEnabled?: boolean;
  preventScreenshots?: boolean;
}

function getStoredGalleryToken(sessionId: string): string | null {
  try {
    return window.sessionStorage.getItem(`${GALLERY_ACCESS_PREFIX}${sessionId}`);
  } catch {
    return null;
  }
}

export function setStoredGalleryToken(sessionId: string, token: string): void {
  try {
    window.sessionStorage.setItem(`${GALLERY_ACCESS_PREFIX}${sessionId}`, token);
  } catch {
    // Ignore storage errors
  }
}

export function getSavedAdminPasscode(): string | null {
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_KEY);
  } catch {
    return null;
  }
}

export function setSavedAdminPasscode(passcode: string | null): void {
  try {
    if (!passcode) {
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } else {
      window.sessionStorage.setItem(ADMIN_SESSION_KEY, passcode);
    }
  } catch {
    // Ignore storage errors
  }
}

const ADMIN_USER_STORAGE_KEY = 'pp256_admin_user_v1';

export const DEFAULT_ADMIN_PROFILES: AdminUser[] = [
  {
    id: 'kibalama-paul',
    name: 'Kibalama Paul',
    email: 'kibalamapaul70@gmail.com',
    role: 'Lead Photographer',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
    authProvider: 'google',
  },
  {
    id: 'studio-director',
    name: 'Paul Photography 256 Studio',
    email: 'paulphotography256@gmail.com',
    role: 'Studio Manager',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
    authProvider: 'google',
  },
  {
    id: 'studio-retoucher',
    name: 'Studio Retoucher & Colorist',
    email: 'retouching@paulphotography256.com',
    role: 'Retoucher',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=160&q=80',
    authProvider: 'google',
  },
];

export function getSavedAdminUser(): AdminUser | null {
  try {
    const raw =
      window.sessionStorage.getItem(ADMIN_USER_STORAGE_KEY) ||
      window.localStorage.getItem(ADMIN_USER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.id === 'paul-godfrey' || parsed.id === 'kibalama paul' || parsed.name === 'Paul Godfrey') {
        parsed.id = 'kibalama-paul';
        parsed.name = 'Kibalama Paul';
        parsed.email = 'kibalamapaul70@gmail.com';
        setSavedAdminUser(parsed);
      }
      return parsed;
    }
  } catch {}
  return null;
}

export function setSavedAdminUser(user: AdminUser | null): void {
  try {
    if (!user) {
      window.sessionStorage.removeItem(ADMIN_USER_STORAGE_KEY);
      window.localStorage.removeItem(ADMIN_USER_STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(user));
      window.localStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(user));
    }
  } catch {}
}

/**
 * Loads the requested client gallery from `/api/gallery` (which serves studio-created galleries,
 * uploaded photos, or Google Drive folders). Falls back to static sample data only if
 * running in static-only preview mode without a backend.
 */
export async function fetchGallerySession(
  sessionId: string = DEFAULT_SESSION_ID,
  driveFolderId?: string
): Promise<GallerySession> {
  const params = new URLSearchParams();
  if (sessionId) params.set('session', sessionId);
  if (driveFolderId) params.set('folderId', driveFolderId);

  const endpoint = `${API_BASE_URL}/api/gallery?${params.toString()}`;
  const accessToken = getStoredGalleryToken(sessionId);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(accessToken ? { 'x-gallery-access': accessToken } : {}),
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.photos)) {
        return {
          ...data,
          photographerName: data.photographerName || DEFAULT_BRAND,
        };
      }
    }

    const errBody = await response.json().catch(() => null);
    if (!USE_MOCK_DATA || response.status === 404 || response.status === 401) {
      throw new Error(
        errBody?.error ||
          `Unable to load gallery (${response.status} ${response.statusText}).`
      );
    }
  } catch (err) {
    if (!USE_MOCK_DATA || (err instanceof Error && err.message.includes('not found'))) {
      throw err instanceof Error ? err : new Error('Failed to load gallery.');
    }
  }

  // Fallback: check locally stored galleries created by admin
  const localList = getLocalStoredGalleries();
  const matchedLocal = localList.find((g) => g.sessionId === sessionId);
  if (matchedLocal) {
    return {
      ...matchedLocal,
      photographerName: matchedLocal.photographerName || DEFAULT_BRAND,
    };
  }

  // Fallback for standalone static builds
  const fallback =
    MOCK_GALLERY_SESSIONS[sessionId] || localList[0] || Object.values(MOCK_GALLERY_SESSIONS)[0];
  return {
    ...fallback,
    photographerName: DEFAULT_BRAND,
  };
}

export async function unlockGallerySession(
  sessionId: string,
  passcode: string
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/gallery/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ sessionId, passcode }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.error || 'Incorrect gallery passcode.');
  }

  const data = (await response.json()) as { ok: boolean; accessToken: string };
  setStoredGalleryToken(sessionId, data.accessToken);
  return data.accessToken;
}

export async function submitFavoriteSelections(
  payload: FavoriteSubmission
): Promise<SubmitFavoritesResponse> {
  const endpoint = `${API_BASE_URL}/api/favorites`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = (await response.json()) as SubmitFavoritesResponse;
      try {
        broadcastNewSubmission({
          submissionId: data.submissionId,
          timestamp: data.timestamp,
          status: 'new',
          loggedToSheets: Boolean(data.loggedToSheets),
          emailSent: Boolean(data.emailSent),
          ...payload,
        });
      } catch (_) {}
      return data;
    }

    const errData = await response.json().catch(() => null);
    if (!USE_MOCK_DATA || response.status < 500) {
      throw new Error(
        errData?.error ||
          `Unable to submit selections (${response.status}). Please try again.`
      );
    }
  } catch (err) {
    if (!USE_MOCK_DATA) {
      throw err instanceof Error
        ? err
        : new Error('Network error while submitting favorite selections.');
    }
  }

  return {
    ok: true,
    submissionId: `DEMO-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    loggedToSheets: false,
    emailSent: false,
    savedLocally: true,
    message:
      'Preview confirmation generated locally. Connect /api/favorites to enable Google Sheets & email alerts.',
  };
}

// =============================================================================
// PHOTOGRAPHER ADMIN API CLIENT
// =============================================================================
function adminHeaders(passcode: string): Record<string, string> {
  return {
    Accept: 'application/json',
    'x-admin-passcode': passcode,
  };
}

export async function verifyAdminPasscode(passcode: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    if (res.ok) {
      setSavedAdminPasscode(passcode);
      return true;
    }
    if (res.status === 401 || res.status === 403) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || 'Invalid studio passcode.');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Invalid studio passcode')) {
      throw err;
    }
  }

  // Fallback passcode check (defaults to 2567 matching photographer PIN)
  if (passcode === '2567') {
    setSavedAdminPasscode(passcode);
    return true;
  }

  throw new Error('Invalid studio passcode.');
}

export async function adminListGalleries(
  passcode: string
): Promise<AdminGalleryRecord[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/galleries`, {
      headers: adminHeaders(passcode),
    });
    if (res.ok) {
      const data = (await res.json()) as { galleries: AdminGalleryRecord[] };
      if (Array.isArray(data.galleries)) {
        setLocalStoredGalleries(data.galleries);
        return data.galleries;
      }
    }
  } catch (err) {
    console.warn('[Admin Galleries] API error, falling back to local storage:', err);
  }
  return getLocalStoredGalleries();
}

export async function adminCreateGallery(
  passcode: string,
  payload: GalleryMutationPayload
): Promise<AdminGalleryRecord> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/galleries`, {
      method: 'POST',
      headers: {
        ...adminHeaders(passcode),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = (await res.json()) as { gallery: AdminGalleryRecord };
      if (data && data.gallery) {
        const local = getLocalStoredGalleries();
        setLocalStoredGalleries([
          data.gallery,
          ...local.filter((g) => g.sessionId !== data.gallery.sessionId),
        ]);
        try {
          broadcastGalleryChange('create', data.gallery);
        } catch (_) {}
        return data.gallery;
      }
    }
    const err = await res.json().catch(() => null);
    if (err?.error && !USE_MOCK_DATA) {
      throw new Error(err.error);
    }
  } catch (err) {
    if (!USE_MOCK_DATA) throw err;
    console.warn('[Admin Galleries] Create API error, saving locally:', err);
  }

  // Resilient fallback: create and save in localStorage
  const slug =
    (
      payload.sessionId ||
      payload.sessionName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    ).replace(/^-|-$/g, '') || `session-${Date.now()}`;

  const newRecord: AdminGalleryRecord = {
    sessionId: slug,
    sessionName: payload.sessionName,
    clientDisplayName: payload.clientDisplayName || '',
    photographerName: DEFAULT_BRAND,
    shootDate: payload.shootDate,
    category: payload.category || 'Wedding & Editorial',
    instructions:
      payload.instructions ||
      'Select your favorite frames with the heart button.',
    driveFolderId: payload.driveFolderId,
    theme: payload.theme || 'editorial-light',
    headerStyle: payload.headerStyle || 'editorial',
    defaultLayout: payload.defaultLayout || 'masonry',
    coverPhotoId: '',
    allowZipDownload: payload.allowZipDownload !== false,
    passcode: payload.passcode,
    requiresPasscode: Boolean(payload.passcode),
    source: 'studio',
    createdAt: new Date().toISOString(),
    photos: [],
    submissionCount: 0,
  };

  const existing = getLocalStoredGalleries();
  const updated = [newRecord, ...existing.filter((g) => g.sessionId !== slug)];
  setLocalStoredGalleries(updated);
  return newRecord;
}

export async function adminUpdateGallery(
  passcode: string,
  sessionId: string,
  payload: Partial<GalleryMutationPayload>
): Promise<AdminGalleryRecord> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/admin/galleries/${encodeURIComponent(sessionId)}`,
      {
        method: 'PATCH',
        headers: {
          ...adminHeaders(passcode),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );
    if (res.ok) {
      const data = (await res.json()) as { gallery: AdminGalleryRecord };
      if (data && data.gallery) {
        const local = getLocalStoredGalleries();
        setLocalStoredGalleries(
          local.map((g) =>
            g.sessionId === sessionId ? { ...g, ...data.gallery } : g
          )
        );
        try {
          broadcastGalleryChange('update', data.gallery);
        } catch (_) {}
        return data.gallery;
      }
    }
  } catch (err) {
    console.warn('[Admin Galleries] Update API error, saving locally:', err);
  }

  const local = getLocalStoredGalleries();
  const idx = local.findIndex((g) => g.sessionId === sessionId);
  if (idx >= 0) {
    local[idx] = { ...local[idx], ...payload };
    setLocalStoredGalleries(local);
    return local[idx];
  }
  throw new Error(`Gallery "${sessionId}" not found.`);
}

export async function adminDeleteGallery(
  passcode: string,
  sessionId: string
): Promise<void> {
  const local = getLocalStoredGalleries();
  setLocalStoredGalleries(local.filter((g) => g.sessionId !== sessionId));

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/admin/galleries/${encodeURIComponent(sessionId)}`,
      {
        method: 'DELETE',
        headers: adminHeaders(passcode),
      }
    );
    if (!res.ok && res.status !== 404) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || `Failed to delete gallery (HTTP ${res.status}).`);
    }
  } catch (err) {
    if (err instanceof Error && !err.message.includes('404')) {
      console.warn('[Admin Galleries] Delete API error:', err);
      throw err;
    }
  }

  try {
    broadcastGalleryChange('delete', { sessionId } as AdminGalleryRecord);
  } catch (_) {}
}

export interface UploadProgressInfo {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
  currentFileIndex: number;
  totalFiles: number;
  currentFilename: string;
  phase: 'preparing' | 'uploading' | 'processing';
}

export async function adminUploadPhotos(
  passcode: string,
  sessionId: string,
  files: File[],
  targetSet?: string,
  onProgress?: (info: UploadProgressInfo) => void
): Promise<{
  gallery: AdminGalleryRecord;
  uploadDestination: 'google-drive' | 'local' | 'cloudflare-r2';
}> {
  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
  try {
    const formData = new FormData();
    if (targetSet) {
      formData.append('set', targetSet);
    }
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.({
        loadedBytes: 0,
        totalBytes,
        percent: Math.round(((i + 1) / files.length) * 20),
        currentFileIndex: i + 1,
        totalFiles: files.length,
        currentFilename: file.name,
        phase: 'preparing',
      });

      // 1. Pristine original full-resolution file (for client download)
      formData.append('photos', file, file.name);

      // 2. Client-side web-optimized compressed preview (for fast loading)
      try {
        const { blob: previewBlob, width, height } = await createWebOptimizedBlob(file);
        const previewName = file.name.replace(/\.[^/.]+$/, '') + '_web.jpg';
        formData.append('previews', previewBlob, previewName);
        formData.append('widths', String(width));
        formData.append('heights', String(height));
      } catch {
        // Fallback: if browser canvas fails, send original
        formData.append('previews', file, file.name);
        formData.append('widths', '1800');
        formData.append('heights', '1200');
      }
    }

    onProgress?.({
      loadedBytes: 0,
      totalBytes,
      percent: 25,
      currentFileIndex: files.length,
      totalFiles: files.length,
      currentFilename: files[0]?.name || '',
      phase: 'uploading',
    });

    const data = await new Promise<{
      gallery: AdminGalleryRecord;
      uploadDestination: 'google-drive' | 'local' | 'cloudflare-r2';
    }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(
        'POST',
        `${API_BASE_URL}/api/admin/galleries/${encodeURIComponent(sessionId)}/photos`
      );
      xhr.setRequestHeader('x-admin-passcode', passcode);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const uploadPercent = Math.round(25 + (e.loaded / e.total) * 70);
          onProgress?.({
            loadedBytes: e.loaded,
            totalBytes: e.total,
            percent: uploadPercent,
            currentFileIndex: files.length,
            totalFiles: files.length,
            currentFilename: `${(e.loaded / (1024 * 1024)).toFixed(1)} MB of ${(e.total / (1024 * 1024)).toFixed(1)} MB`,
            phase: 'uploading',
          });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            onProgress?.({
              loadedBytes: totalBytes,
              totalBytes,
              percent: 100,
              currentFileIndex: files.length,
              totalFiles: files.length,
              currentFilename: 'Finishing upload...',
              phase: 'processing',
            });
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error('Invalid response from server.'));
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err?.error || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during photo upload.'));
      xhr.send(formData);
    });

    if (data?.gallery) {
      const local = getLocalStoredGalleries();
      setLocalStoredGalleries(
        local.map((g) => (g.sessionId === sessionId ? { ...g, ...data.gallery } : g))
      );
      try {
        broadcastGalleryChange('photos_uploaded', data.gallery);
      } catch (_) {}
      return data;
    }
  } catch (err) {
    if (!USE_MOCK_DATA) throw err;
    console.warn('[Admin Photo Upload] API error, falling back to local file readers:', err);
  }

  // Fallback: convert files to object URLs and save to localStorage
  const photoItems: PhotoItem[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let previewUrl = '';
    let origUrl = '';
    let previewSize = file.size;
    let w = 1800;
    let h = 1200;

    try {
      const { blob: previewBlob, width, height } = await createWebOptimizedBlob(file);
      previewUrl = URL.createObjectURL(previewBlob);
      previewSize = previewBlob.size;
      w = width;
      h = height;
    } catch {
      previewUrl = URL.createObjectURL(file);
    }
    origUrl = URL.createObjectURL(file);

    const photoId = `pp256-local-${Date.now().toString(36)}-${i}`;
    photoItems.push({
      id: photoId,
      filename: file.name,
      title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' '),
      thumbnailUrl: previewUrl,
      fullUrl: origUrl,
      sizeBytes: file.size,
      previewSizeBytes: previewSize,
      width: w,
      height: h,
      mimeType: file.type,
      storage: 'local',
      capturedAt: new Date().toISOString(),
    });
  }

  const local = getLocalStoredGalleries();
  const idx = local.findIndex((g) => g.sessionId === sessionId);
  if (idx >= 0) {
    local[idx].photos = [...(local[idx].photos || []), ...photoItems];
    if (!local[idx].coverPhotoId && local[idx].photos.length > 0) {
      local[idx].coverPhotoId = local[idx].photos[0].id;
    }
    setLocalStoredGalleries(local);
    return {
      gallery: local[idx],
      uploadDestination: 'local',
    };
  }

  throw new Error('Gallery not found.');
}

export async function adminDeletePhoto(
  passcode: string,
  sessionId: string,
  photoId: string
): Promise<AdminGalleryRecord> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/admin/galleries/${encodeURIComponent(
        sessionId
      )}/photos/${encodeURIComponent(photoId)}`,
      {
        method: 'DELETE',
        headers: adminHeaders(passcode),
      }
    );
    if (res.ok) {
      const data = (await res.json()) as { gallery: AdminGalleryRecord };
      if (data?.gallery) {
        const local = getLocalStoredGalleries();
        setLocalStoredGalleries(
          local.map((g) => (g.sessionId === sessionId ? { ...g, ...data.gallery } : g))
        );
        return data.gallery;
      }
    }
  } catch (err) {
    console.warn('[Admin Photo Delete] API error, removing locally:', err);
  }

  const local = getLocalStoredGalleries();
  const target = local.find((g) => g.sessionId === sessionId);
  if (target) {
    target.photos = (target.photos || []).filter((p) => p.id !== photoId);
    setLocalStoredGalleries(local);
    return target;
  }
  throw new Error('Gallery not found.');
}

export async function adminGetDriveStatus(
  passcode: string
): Promise<DriveStatusResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/drive/status`, {
      headers: adminHeaders(passcode),
    });
    if (res.ok) {
      return (await res.json()) as DriveStatusResponse;
    }
  } catch {}
  return { configured: false };
}

export async function adminGetR2Status(
  passcode: string
): Promise<R2StatusResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/r2/status`, {
      headers: adminHeaders(passcode),
    });
    if (res.ok) {
      return (await res.json()) as R2StatusResponse;
    }
  } catch {}
  return { configured: false };
}

export async function adminCreateDriveFolder(
  passcode: string,
  sessionId: string
): Promise<AdminGalleryRecord> {
  const res = await fetch(
    `${API_BASE_URL}/api/admin/galleries/${encodeURIComponent(
      sessionId
    )}/drive-folder`,
    {
      method: 'POST',
      headers: adminHeaders(passcode),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Unable to create Google Drive folder.');
  }
  const data = (await res.json()) as { gallery: AdminGalleryRecord };
  return data.gallery;
}

export async function adminSyncDriveFolder(
  passcode: string,
  sessionId: string
): Promise<{ gallery: AdminGalleryRecord; syncedCount: number }> {
  const res = await fetch(
    `${API_BASE_URL}/api/admin/galleries/${encodeURIComponent(
      sessionId
    )}/sync-drive`,
    {
      method: 'POST',
      headers: adminHeaders(passcode),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Unable to sync Google Drive folder.');
  }
  return (await res.json()) as {
    gallery: AdminGalleryRecord;
    syncedCount: number;
  };
}

export async function adminListSubmissions(
  passcode: string
): Promise<StoredSubmissionRecord[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/submissions`, {
    headers: adminHeaders(passcode),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to load client submissions.');
  }
  const data = (await res.json()) as { submissions: StoredSubmissionRecord[] };
  return data.submissions;
}

export async function adminUpdateSubmissionStatus(
  passcode: string,
  submissionId: string,
  status: SubmissionStatus
): Promise<StoredSubmissionRecord> {
  const res = await fetch(
    `${API_BASE_URL}/api/admin/submissions/${encodeURIComponent(submissionId)}`,
    {
      method: 'PATCH',
      headers: {
        ...adminHeaders(passcode),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to update submission status.');
  }
  const data = (await res.json()) as { submission: StoredSubmissionRecord };
  return data.submission;
}

export async function adminDeleteSubmission(
  passcode: string,
  submissionId: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/admin/submissions/${encodeURIComponent(submissionId)}`,
    {
      method: 'DELETE',
      headers: adminHeaders(passcode),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to delete client submission.');
  }
}

export async function adminGetStorageStatus(
  passcode: string
): Promise<StorageStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/api/admin/storage-status`, {
    headers: adminHeaders(passcode),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to load storage status.');
  }
  return (await res.json()) as StorageStatusResponse;
}

export function loadDraftState(sessionId: string): ProofingDraftState {
  try {
    const raw = window.localStorage.getItem(`${DRAFT_STORAGE_PREFIX}${sessionId}`);
    if (!raw) return { favoriteIds: [], notesByPhotoId: {} };
    const parsed = JSON.parse(raw) as Partial<ProofingDraftState>;
    return {
      favoriteIds: Array.isArray(parsed.favoriteIds) ? parsed.favoriteIds : [],
      notesByPhotoId:
        parsed.notesByPhotoId && typeof parsed.notesByPhotoId === 'object'
          ? parsed.notesByPhotoId
          : {},
    };
  } catch {
    return { favoriteIds: [], notesByPhotoId: {} };
  }
}

export function saveDraftState(sessionId: string, state: ProofingDraftState): void {
  try {
    window.localStorage.setItem(
      `${DRAFT_STORAGE_PREFIX}${sessionId}`,
      JSON.stringify(state)
    );
  } catch {
    // Ignore storage quota or private-browsing errors
  }
}
