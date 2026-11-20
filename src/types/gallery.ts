export type GalleryFilter = 'all' | 'favorites';

export type GalleryLayoutMode = 'masonry' | 'grid';

export type GalleryThemeId =
  | 'editorial-light'
  | 'obsidian-dark'
  | 'warm-monograph'
  | 'bento-grid';

export type GalleryHeaderStyle = 'editorial' | 'split-cover' | 'full-bleed' | 'minimal';

export type SubmissionStatus = 'new' | 'retouching' | 'delivered';

export interface PhotoExif {
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
}

export interface PhotoItem {
  id: string;
  filename: string;
  title?: string;
  thumbnailUrl: string;
  fullUrl: string;
  width?: number;
  height?: number;
  aspectRatio?: 'portrait' | 'landscape' | 'square';
  capturedAt?: string;
  mimeType?: string;
  sizeBytes?: number;
  previewSizeBytes?: number;
  storage?: 'google-drive' | 'local' | 'sample' | 'r2';
  exif?: PhotoExif;
  set?: string; // Pixieset sub-gallery/set: e.g. "Highlights", "Ceremony", "Portraits"
}

export interface DriveStatusResponse {
  configured: boolean;
  serviceAccountEmail?: string;
  defaultFolderId?: string;
}

export interface GallerySession {
  sessionId: string;
  sessionName: string;
  clientDisplayName?: string;
  photographerName: string;
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
  requiresPasscode?: boolean;
  isLocked?: boolean;
  expiresAt?: string;
  createdAt?: string;
  source?: 'mock' | 'drive' | 'sample' | 'studio';
  photos: PhotoItem[];
  // Pixieset Feature Extensions
  sets?: string[]; // e.g. ["Highlights", "Getting Ready", "Ceremony", "Reception", "Portraits"]
  downloadPin?: string; // 4-digit PIN for client download protection (e.g. "4829")
  watermarkEnabled?: boolean; // Displays proofing watermark on web viewing
  watermarkText?: string; // Custom watermark label: "PAUL PHOTOGRAPHY 256"
  coverLayout?: 'full-bleed' | 'split-cover' | 'minimal';
  status?: 'draft' | 'published' | 'archived';
  linkEnabled?: boolean;
  preventScreenshots?: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Lead Photographer' | 'Studio Manager' | 'Retoucher' | 'Assistant' | 'Google Studio Admin' | string;
  avatarUrl?: string;
  authProvider: 'passcode' | 'google';
  lastActive?: string;
}

export interface AdminGalleryRecord extends GallerySession {
  passcode?: string;
  submissionCount?: number;
  viewCount?: number;
}

export interface GalleryDesignPreset {
  id: GalleryThemeId;
  name: string;
  description: string;
  defaultLayout: GalleryLayoutMode;
  defaultHeaderStyle: GalleryHeaderStyle;
  swatchBg: string;
  swatchSurface: string;
  swatchText: string;
  swatchAccent: string;
}

export interface PhotoSelectionDetail {
  id: string;
  filename: string;
  title?: string;
  note?: string;
}

export interface FavoriteSubmission {
  sessionId: string;
  sessionName: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  sessionNotes?: string;
  notes?: string;
  notesByPhotoId?: Record<string, string>;
  selectedPhotos: PhotoSelectionDetail[];
  submittedAt: string;
}

export interface StoredSubmissionRecord extends FavoriteSubmission {
  submissionId: string;
  timestamp: string;
  status: SubmissionStatus;
  loggedToSheets?: boolean;
  emailSent?: boolean;
}

export interface SubmitFavoritesResponse {
  ok: boolean;
  submissionId: string;
  timestamp: string;
  loggedToSheets: boolean;
  emailSent: boolean;
  savedLocally: boolean;
  message: string;
}

export interface StorageStatusResponse {
  disk: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    totalFormatted: string;
    freeFormatted: string;
    usedFormatted: string;
    usedPercent: number;
    freePercent: number;
  };
  studio: {
    photosSizeBytes: number;
    photosSizeFormatted: string;
    photosCount: number;
    submissionsSizeBytes: number;
    submissionsSizeFormatted: string;
    submissionsCount: number;
    totalStudioFormatted: string;
  };
  drive?: {
    configured: boolean;
    serviceAccountEmail?: string;
    storageQuota?: {
      limit?: string;
      usage?: string;
      usageInDrive?: string;
      usageInDriveTrash?: string;
    };
    limitFormatted?: string;
    usageFormatted?: string;
    freeFormatted?: string;
    usedPercent?: number;
  };
  r2?: R2StatusResponse;
  updatedAt: string;
}

export interface R2StatusResponse {
  configured: boolean;
  connectionValid?: boolean;
  bucketName?: string;
  publicUrl?: string;
  totalObjects?: number;
  totalSizeBytes?: number;
  totalSizeFormatted?: string;
  limitBytes?: number;
  limitFormatted?: string;
  freeBytes?: number;
  freeFormatted?: string;
  usedPercent?: number;
  freePercent?: number;
  error?: string | null;
}
