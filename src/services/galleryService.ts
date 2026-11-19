import { MOCK_GALLERY_SESSIONS } from '../data/mockGallery';
import {
  AdminGalleryRecord,
  DriveStatusResponse,
  FavoriteSubmission,
  GalleryHeaderStyle,
  GalleryLayoutMode,
  GallerySession,
  GalleryThemeId,
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

  // Fallback for standalone static builds
  const fallback =
    MOCK_GALLERY_SESSIONS[sessionId] || Object.values(MOCK_GALLERY_SESSIONS)[0];
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
      return (await response.json()) as SubmitFavoritesResponse;
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
  const res = await fetch(`${API_BASE_URL}/api/admin/galleries`, {
    headers: adminHeaders(passcode),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to load galleries.');
  }
  const data = (await res.json()) as { galleries: AdminGalleryRecord[] };
  return data.galleries;
}

export async function adminCreateGallery(
  passcode: string,
  payload: GalleryMutationPayload
): Promise<AdminGalleryRecord> {
  const res = await fetch(`${API_BASE_URL}/api/admin/galleries`, {
    method: 'POST',
    headers: {
      ...adminHeaders(passcode),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Unable to create gallery.');
  }
  const data = (await res.json()) as { gallery: AdminGalleryRecord };
  return data.gallery;
}

export async function adminUpdateGallery(
  passcode: string,
  sessionId: string,
  payload: Partial<GalleryMutationPayload>
): Promise<AdminGalleryRecord> {
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
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Unable to update gallery.');
  }
  const data = (await res.json()) as { gallery: AdminGalleryRecord };
  return data.gallery;
}

export async function adminDeleteGallery(
  passcode: string,
  sessionId: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/admin/galleries/${encodeURIComponent(sessionId)}`,
    {
      method: 'DELETE',
      headers: adminHeaders(passcode),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Unable to delete gallery.');
  }
}

export async function adminUploadPhotos(
  passcode: string,
  sessionId: string,
  files: File[]
): Promise<{
  gallery: AdminGalleryRecord;
  uploadDestination: 'google-drive' | 'local';
}> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('photos', file);
  }

  const res = await fetch(
    `${API_BASE_URL}/api/admin/galleries/${encodeURIComponent(sessionId)}/photos`,
    {
      method: 'POST',
      headers: {
        'x-admin-passcode': passcode,
      },
      body: formData,
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Photo upload failed.');
  }
  return (await res.json()) as {
    gallery: AdminGalleryRecord;
    uploadDestination: 'google-drive' | 'local';
  };
}

export async function adminGetDriveStatus(
  passcode: string
): Promise<DriveStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/api/admin/drive/status`, {
    headers: adminHeaders(passcode),
  });
  if (!res.ok) {
    return { configured: false };
  }
  return (await res.json()) as DriveStatusResponse;
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

export async function adminDeletePhoto(
  passcode: string,
  sessionId: string,
  photoId: string
): Promise<AdminGalleryRecord> {
  const res = await fetch(
    `${API_BASE_URL}/api/admin/galleries/${encodeURIComponent(
      sessionId
    )}/photos/${encodeURIComponent(photoId)}`,
    {
      method: 'DELETE',
      headers: adminHeaders(passcode),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Unable to remove photo.');
  }
  const data = (await res.json()) as { gallery: AdminGalleryRecord };
  return data.gallery;
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
