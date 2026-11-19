import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type GalleryThemeId =
  | 'editorial-light'
  | 'obsidian-dark'
  | 'warm-monograph'
  | 'bento-grid';
type GalleryHeaderStyle = 'editorial' | 'split-cover';
type GalleryLayoutMode = 'masonry' | 'grid';
type SubmissionStatus = 'new' | 'retouching' | 'delivered';

interface PhotoExif {
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
}

interface PhotoItem {
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
  storage?: 'google-drive' | 'local' | 'sample';
  exif?: PhotoExif;
}

interface GalleryRecord {
  sessionId: string;
  sessionName: string;
  clientDisplayName?: string;
  photographerName: string;
  shootDate: string;
  category?: string;
  instructions?: string;
  driveFolderId?: string;
  theme: GalleryThemeId;
  headerStyle: GalleryHeaderStyle;
  defaultLayout: GalleryLayoutMode;
  coverPhotoId?: string;
  maxSelections?: number;
  allowZipDownload: boolean;
  passcode?: string;
  expiresAt?: string;
  createdAt: string;
  source: 'studio' | 'sample' | 'drive';
  photos: PhotoItem[];
}

interface PhotoSelectionDetail {
  id: string;
  filename: string;
  title?: string;
  note?: string;
}

interface FavoriteSubmissionBody {
  sessionId: string;
  sessionName: string;
  clientName: string;
  clientEmail: string;
  sessionNotes?: string;
  selectedPhotos: PhotoSelectionDetail[];
  submittedAt?: string;
}

interface DriveFileRecord {
  id: string;
  name?: string;
  mimeType?: string;
  createdTime?: string;
  thumbnailLink?: string;
  imageMediaMetadata?: {
    width?: number;
    height?: number;
  };
}

interface StoredSubmission extends FavoriteSubmissionBody {
  submissionId: string;
  timestamp: string;
  status: SubmissionStatus;
  loggedToSheets: boolean;
  emailSent: boolean;
}

const DATA_DIR = path.resolve(__dirname, '.data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const GALLERIES_FILE = path.join(DATA_DIR, 'galleries.json');

const SEED_GALLERIES: GalleryRecord[] = [
  {
    sessionId: 'kampala-editorial-2026',
    sessionName: 'Golden Hour Wedding & Editorial Session',
    clientDisplayName: 'Amara & Daniel',
    photographerName: 'Paul Photography 256',
    shootDate: 'November 14, 2026',
    category: 'Wedding & Editorial Portraits',
    theme: 'editorial-light',
    headerStyle: 'editorial',
    defaultLayout: 'masonry',
    coverPhotoId: 'pp256-002',
    allowZipDownload: true,
    createdAt: '2026-11-14T16:00:00.000Z',
    instructions:
      'Select your favorite frames with the heart button for final color grading and retouching. Add per-photo crop or edit notes directly on any frame.',
    source: 'sample',
    photos: [
      {
        id: 'pp256-001',
        filename: 'PP256_KLA_001.jpg',
        title: 'Window Light Editorial',
        thumbnailUrl: '/src/assets/images/proofing_portrait_window_1795095500855.jpg',
        fullUrl: '/src/assets/images/proofing_portrait_window_1795095500855.jpg',
        width: 1500,
        height: 2000,
        aspectRatio: 'portrait',
        exif: { focalLength: '50mm', aperture: 'f/2.0', shutterSpeed: '1/320s', iso: 200 },
      },
      {
        id: 'pp256-002',
        filename: 'PP256_KLA_002.jpg',
        title: 'Hillside Terrace Laughter',
        thumbnailUrl: '/src/assets/images/proofing_couple_terrace_1795095503106.jpg',
        fullUrl: '/src/assets/images/proofing_couple_terrace_1795095503106.jpg',
        width: 2000,
        height: 1500,
        aspectRatio: 'landscape',
        exif: { focalLength: '35mm', aperture: 'f/2.8', shutterSpeed: '1/640s', iso: 160 },
      },
      {
        id: 'pp256-003',
        filename: 'PP256_KLA_003.jpg',
        title: 'Silver Gelatin Studio Portrait',
        thumbnailUrl: '/src/assets/images/proofing_monochrome_studio_1795095502052.jpg',
        fullUrl: '/src/assets/images/proofing_monochrome_studio_1795095502052.jpg',
        width: 1500,
        height: 2000,
        aspectRatio: 'portrait',
        exif: { focalLength: '85mm', aperture: 'f/2.2', shutterSpeed: '1/200s', iso: 100 },
      },
      {
        id: 'pp256-004',
        filename: 'PP256_KLA_004.jpg',
        title: 'Bridal Rings & Garden Roses',
        thumbnailUrl: '/src/assets/images/proofing_bridal_detail_1795095502755.jpg',
        fullUrl: '/src/assets/images/proofing_bridal_detail_1795095502755.jpg',
        width: 1600,
        height: 1600,
        aspectRatio: 'square',
        exif: { focalLength: '50mm', aperture: 'f/2.8', shutterSpeed: '1/250s', iso: 320 },
      },
      {
        id: 'pp256-005',
        filename: 'PP256_KLA_005.jpg',
        title: 'Travertine Steps Silhouette',
        thumbnailUrl: '/src/assets/images/proofing_editorial_steps_1795095503342.jpg',
        fullUrl: '/src/assets/images/proofing_editorial_steps_1795095503342.jpg',
        width: 1500,
        height: 2000,
        aspectRatio: 'portrait',
        exif: { focalLength: '50mm', aperture: 'f/4.0', shutterSpeed: '1/1000s', iso: 100 },
      },
      {
        id: 'pp256-006',
        filename: 'PP256_KLA_006.jpg',
        title: 'Twilight Botanical Walkout',
        thumbnailUrl: '/src/assets/images/proofing_sunset_walkout_1795095503486.jpg',
        fullUrl: '/src/assets/images/proofing_sunset_walkout_1795095503486.jpg',
        width: 2400,
        height: 1350,
        aspectRatio: 'landscape',
        exif: { focalLength: '35mm', aperture: 'f/1.8', shutterSpeed: '1/250s', iso: 640 },
      },
      {
        id: 'pp256-007',
        filename: 'PP256_KLA_007.jpg',
        title: 'Candlelit Courtyard Toast',
        thumbnailUrl: '/src/assets/images/proofing_reception_toast_1795095503066.jpg',
        fullUrl: '/src/assets/images/proofing_reception_toast_1795095503066.jpg',
        width: 2000,
        height: 1500,
        aspectRatio: 'landscape',
        exif: { focalLength: '35mm', aperture: 'f/1.4', shutterSpeed: '1/160s', iso: 1250 },
      },
      {
        id: 'pp256-008',
        filename: 'PP256_KLA_008.jpg',
        title: 'Obsidian Rim Light Portrait',
        thumbnailUrl: '/src/assets/images/proofing_studio_rimlight_1795095502328.jpg',
        fullUrl: '/src/assets/images/proofing_studio_rimlight_1795095502328.jpg',
        width: 1500,
        height: 2000,
        aspectRatio: 'portrait',
        exif: { focalLength: '85mm', aperture: 'f/2.0', shutterSpeed: '1/200s', iso: 100 },
      },
    ],
  },
  {
    sessionId: 'studio-portraits-2026',
    sessionName: 'Kololo Studio Fine Art Portraits',
    clientDisplayName: 'Private Studio Sitting',
    photographerName: 'Paul Photography 256',
    shootDate: 'November 10, 2026',
    category: 'Studio Portraiture',
    theme: 'obsidian-dark',
    headerStyle: 'split-cover',
    defaultLayout: 'masonry',
    coverPhotoId: 'pp256-st-002',
    maxSelections: 3,
    allowZipDownload: true,
    createdAt: '2026-11-10T11:00:00.000Z',
    instructions:
      'Choose up to 3 preferred studio frames for high-resolution print master delivery and subtle skin/tonal finishing.',
    source: 'sample',
    photos: [
      {
        id: 'pp256-st-001',
        filename: 'PP256_STD_014.jpg',
        title: 'Window Light Editorial',
        thumbnailUrl: '/src/assets/images/proofing_portrait_window_1795095500855.jpg',
        fullUrl: '/src/assets/images/proofing_portrait_window_1795095500855.jpg',
        width: 1500,
        height: 2000,
        aspectRatio: 'portrait',
        exif: { focalLength: '50mm', aperture: 'f/2.0', shutterSpeed: '1/320s', iso: 200 },
      },
      {
        id: 'pp256-st-002',
        filename: 'PP256_STD_019.jpg',
        title: 'Obsidian Rim Light Portrait',
        thumbnailUrl: '/src/assets/images/proofing_studio_rimlight_1795095502328.jpg',
        fullUrl: '/src/assets/images/proofing_studio_rimlight_1795095502328.jpg',
        width: 1500,
        height: 2000,
        aspectRatio: 'portrait',
        exif: { focalLength: '85mm', aperture: 'f/2.0', shutterSpeed: '1/200s', iso: 100 },
      },
      {
        id: 'pp256-st-003',
        filename: 'PP256_STD_024.jpg',
        title: 'Silver Gelatin Studio Portrait',
        thumbnailUrl: '/src/assets/images/proofing_monochrome_studio_1795095502052.jpg',
        fullUrl: '/src/assets/images/proofing_monochrome_studio_1795095502052.jpg',
        width: 1500,
        height: 2000,
        aspectRatio: 'portrait',
        exif: { focalLength: '85mm', aperture: 'f/2.2', shutterSpeed: '1/200s', iso: 100 },
      },
      {
        id: 'pp256-st-004',
        filename: 'PP256_STD_031.jpg',
        title: 'Travertine Steps Silhouette',
        thumbnailUrl: '/src/assets/images/proofing_editorial_steps_1795095503342.jpg',
        fullUrl: '/src/assets/images/proofing_editorial_steps_1795095503342.jpg',
        width: 1500,
        height: 2000,
        aspectRatio: 'portrait',
        exif: { focalLength: '50mm', aperture: 'f/4.0', shutterSpeed: '1/1000s', iso: 100 },
      },
    ],
  },
];

function ensureDataDirs(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function readGalleries(): GalleryRecord[] {
  ensureDataDirs();
  if (!fs.existsSync(GALLERIES_FILE)) {
    fs.writeFileSync(GALLERIES_FILE, JSON.stringify(SEED_GALLERIES, null, 2));
    return [...SEED_GALLERIES];
  }
  try {
    const raw = fs.readFileSync(GALLERIES_FILE, 'utf8');
    const parsed = JSON.parse(raw) as GalleryRecord[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...SEED_GALLERIES];
  } catch {
    return [...SEED_GALLERIES];
  }
}

function writeGalleries(galleries: GalleryRecord[]): void {
  ensureDataDirs();
  fs.writeFileSync(GALLERIES_FILE, JSON.stringify(galleries, null, 2));
}

function readSubmissions(): StoredSubmission[] {
  ensureDataDirs();
  if (!fs.existsSync(SUBMISSIONS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(SUBMISSIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as StoredSubmission[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSubmissions(submissions: StoredSubmission[]): void {
  ensureDataDirs();
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions.slice(0, 500), null, 2));
}

function slugifySessionId(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 6);
  return base ? `${base}-${suffix}` : `gallery-${Date.now().toString(36)}`;
}

function getAdminPasscode(): string {
  return process.env.ADMIN_PASSCODE || 'pp256admin';
}

function getGalleryTokenSecret(): string {
  return process.env.ADMIN_PASSCODE || 'pp256-gallery-secret-key';
}

function createGalleryAccessToken(sessionId: string, passcode: string): string {
  return crypto
    .createHmac('sha256', getGalleryTokenSecret())
    .update(`${sessionId}:${passcode}`)
    .digest('hex');
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function getGoogleServiceAccountToken(scopes: string[]): Promise<string> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !rawKey) {
    throw new Error('Google Service Account credentials are not configured.');
  }

  const privateKey = rawKey.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);

  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = base64UrlEncode(
    JSON.stringify({
      iss: clientEmail,
      scope: scopes.join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    })
  );

  const signingInput = `${header}.${claimSet}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = base64UrlEncode(signer.sign(privateKey));
  const assertion = `${signingInput}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google OAuth token request failed (${tokenRes.status}): ${errText}`);
  }

  const tokenData = (await tokenRes.json()) as { access_token: string };
  return tokenData.access_token;
}

function resolveDriveFolderId(sessionId?: string, explicitFolderId?: string): string | null {
  if (explicitFolderId) return explicitFolderId;

  if (sessionId && process.env.GOOGLE_DRIVE_SESSION_FOLDERS) {
    try {
      const mapping = JSON.parse(process.env.GOOGLE_DRIVE_SESSION_FOLDERS) as Record<
        string,
        string
      >;
      if (mapping[sessionId]) return mapping[sessionId];
    } catch {
      // Ignore malformed JSON mapping and fall back
    }
  }

  return process.env.GOOGLE_DRIVE_DEFAULT_FOLDER_ID || null;
}

function hasGoogleDriveConfig(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
  );
}

async function listDriveFolderPhotos(
  accessToken: string,
  folderId: string
): Promise<{ folderName?: string; createdTime?: string; photos: PhotoItem[] }> {
  const [folderMetaRes, filesListRes] = await Promise.all([
    fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        folderId
      )}?fields=id,name,createdTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    ),
    fetch(
      `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({
        q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
        orderBy: 'name asc',
        pageSize: '500',
        fields: 'files(id,name,mimeType,size,createdTime,imageMediaMetadata(width,height))',
      }).toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    ),
  ]);

  if (!folderMetaRes.ok || !filesListRes.ok) {
    throw new Error('Google Drive folder lookup failed. Verify folder ID and Service Account permissions.');
  }

  const folderMeta = (await folderMetaRes.json()) as DriveFileRecord;
  const listJson = (await filesListRes.json()) as {
    files?: (DriveFileRecord & { size?: string })[];
  };
  const files = listJson.files || [];

  const photos: PhotoItem[] = files.map((file) => {
    const width = file.imageMediaMetadata?.width;
    const height = file.imageMediaMetadata?.height;
    let aspectRatio: 'portrait' | 'landscape' | 'square' = 'landscape';
    if (width && height) {
      if (Math.abs(width - height) < 40) aspectRatio = 'square';
      else aspectRatio = height > width ? 'portrait' : 'landscape';
    }

    return {
      id: file.id,
      filename: file.name || 'untitled.jpg',
      thumbnailUrl: `/api/gallery?fileId=${encodeURIComponent(file.id)}&size=thumb`,
      fullUrl: `/api/gallery?fileId=${encodeURIComponent(file.id)}&size=full`,
      width,
      height,
      aspectRatio,
      capturedAt: file.createdTime,
      mimeType: file.mimeType,
      sizeBytes: file.size ? Number(file.size) : undefined,
      storage: 'google-drive',
    };
  });

  return {
    folderName: folderMeta.name,
    createdTime: folderMeta.createdTime,
    photos,
  };
}

async function uploadBufferToGoogleDrive(
  accessToken: string,
  folderId: string,
  filename: string,
  mimeType: string,
  fileBuffer: Buffer
): Promise<PhotoItem> {
  const boundary = `pp256_drive_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const metadataPart = JSON.stringify({
    name: filename,
    parents: [folderId],
  });

  const prefix = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataPart}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    'utf8'
  );
  const suffix = Buffer.from(`\r\n--${boundary}--`, 'utf8');
  const multipartBody = Buffer.concat([prefix, fileBuffer, suffix]);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,imageMediaMetadata(width,height)',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(multipartBody.length),
      },
      body: multipartBody,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Google Drive upload failed (${uploadRes.status}): ${errText}`);
  }

  const created = (await uploadRes.json()) as DriveFileRecord & { size?: string };
  const width = created.imageMediaMetadata?.width;
  const height = created.imageMediaMetadata?.height;
  let aspectRatio: 'portrait' | 'landscape' | 'square' | undefined;
  if (width && height) {
    if (Math.abs(width - height) < 40) aspectRatio = 'square';
    else aspectRatio = height > width ? 'portrait' : 'landscape';
  }

  return {
    id: created.id,
    filename: created.name || filename,
    thumbnailUrl: `/api/gallery?fileId=${encodeURIComponent(created.id)}&size=thumb`,
    fullUrl: `/api/gallery?fileId=${encodeURIComponent(created.id)}&size=full`,
    width,
    height,
    aspectRatio,
    capturedAt: created.createdTime || new Date().toISOString(),
    mimeType: created.mimeType || mimeType,
    sizeBytes: created.size ? Number(created.size) : fileBuffer.length,
    storage: 'google-drive',
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function saveSubmissionLocally(record: StoredSubmission): boolean {
  try {
    const existing = readSubmissions();
    existing.unshift(record);
    writeSubmissions(existing);
    return true;
  } catch (err) {
    console.error('[server] Local submission save failed:', err);
    return false;
  }
}

async function logToGoogleSheets(
  submissionId: string,
  payload: FavoriteSubmissionBody,
  timestamp: string
): Promise<boolean> {
  if (process.env.APPS_SCRIPT_WEBHOOK_URL) {
    const res = await fetch(process.env.APPS_SCRIPT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId, timestamp, ...payload }),
    });
    if (!res.ok) {
      throw new Error(`Apps Script webhook failed (${res.status})`);
    }
    return true;
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (
    !spreadsheetId ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY
  ) {
    return false;
  }

  const accessToken = await getGoogleServiceAccountToken([
    'https://www.googleapis.com/auth/spreadsheets',
  ]);
  const tabName = process.env.GOOGLE_SHEETS_TAB_NAME || 'Selections';
  const filenamesList = payload.selectedPhotos.map((p) => p.filename).join(', ');
  const photoNotesSummary = payload.selectedPhotos
    .filter((p) => p.note)
    .map((p) => `${p.filename}: ${p.note}`)
    .join(' | ');

  const range = encodeURIComponent(`${tabName}!A:J`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${range}:append?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [
        [
          timestamp,
          submissionId,
          payload.sessionId,
          payload.sessionName,
          payload.clientName,
          payload.clientEmail,
          payload.selectedPhotos.length,
          filenamesList,
          photoNotesSummary || '—',
          payload.sessionNotes || '—',
        ],
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Sheets API failed (${res.status}): ${body}`);
  }

  return true;
}

async function sendPhotographerEmail(
  submissionId: string,
  payload: FavoriteSubmissionBody,
  timestamp: string
): Promise<boolean> {
  const photographerEmail =
    process.env.PHOTOGRAPHER_EMAIL || 'paulphotography256@gmail.com';
  const fromAddress =
    process.env.EMAIL_FROM || 'Paul Photography 256 Proofing <proofing@paulphotography256.com>';

  if (!photographerEmail) return false;

  const subject = `[Favorites Selected] ${payload.clientName} — ${payload.sessionName} (${payload.selectedPhotos.length} photos)`;

  const rowsHtml = payload.selectedPhotos
    .map(
      (p, i) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e4e4e7;">${i + 1}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e4e4e7;font-family:monospace;"><strong>${escapeHtml(
          p.filename
        )}</strong></td>
        <td style="padding:8px 10px;border-bottom:1px solid #e4e4e7;">${
          p.note ? escapeHtml(p.note) : '<span style="color:#71717a;">—</span>'
        }</td>
      </tr>`
    )
    .join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#09090b;">
      <h2 style="margin-bottom:4px;">New Client Favorite Selections</h2>
      <p style="color:#52525b;margin-top:0;">Reference: <code>${submissionId}</code> &middot; ${timestamp}</p>
      <table style="width:100%;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:12px;margin:16px 0;">
        <tr><td style="padding:4px 8px;"><strong>Session:</strong></td><td>${escapeHtml(payload.sessionName)} (${escapeHtml(payload.sessionId)})</td></tr>
        <tr><td style="padding:4px 8px;"><strong>Client:</strong></td><td>${escapeHtml(payload.clientName)}</td></tr>
        <tr><td style="padding:4px 8px;"><strong>Email:</strong></td><td><a href="mailto:${escapeHtml(payload.clientEmail)}">${escapeHtml(payload.clientEmail)}</a></td></tr>
        <tr><td style="padding:4px 8px;"><strong>Selected:</strong></td><td>${payload.selectedPhotos.length} photos</td></tr>
      </table>
      ${
        payload.sessionNotes
          ? `<div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:12px;margin:16px 0;">
               <strong>Overall Session Notes:</strong><br/>${escapeHtml(payload.sessionNotes)}
             </div>`
          : ''
      }
      <h3 style="margin-bottom:8px;">Selected Filenames</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#09090b;color:#fff;text-align:left;">
            <th style="padding:8px 10px;">#</th>
            <th style="padding:8px 10px;">Filename</th>
            <th style="padding:8px 10px;">Photo Note</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `;

  const text = [
    `New Client Favorite Selections (${submissionId})`,
    `Session: ${payload.sessionName} (${payload.sessionId})`,
    `Client: ${payload.clientName} <${payload.clientEmail}>`,
    `Session Notes: ${payload.sessionNotes || 'None'}`,
    '',
    `Selected Photos (${payload.selectedPhotos.length}):`,
    ...payload.selectedPhotos.map(
      (p, i) => `${i + 1}. ${p.filename}${p.note ? ` — ${p.note}` : ''}`
    ),
  ].join('\n');

  if (process.env.RESEND_API_KEY) {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [photographerEmail],
        reply_to: payload.clientEmail,
        subject,
        html,
        text,
      }),
    });
    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      throw new Error(`Resend API error (${resendRes.status}): ${errBody}`);
    }
    return true;
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE !== 'false',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: fromAddress,
      to: photographerEmail,
      replyTo: payload.clientEmail,
      subject,
      html,
      text,
    });
    return true;
  }

  return false;
}

const uploadStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const sessionId = String(req.params.sessionId || 'misc').replace(/[^a-zA-Z0-9_-]/g, '');
    const targetDir = path.join(UPLOADS_DIR, sessionId);
    fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: (_req, file, cb) => {
    const cleanOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniquePrefix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    cb(null, `${uniquePrefix}-${cleanOriginal}`);
  },
});

const uploadMiddleware = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB per high-res photo
    files: 60,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (.jpg, .png, .webp) are allowed.'));
    }
  },
});

function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const provided = String(req.headers['x-admin-passcode'] || '');
  if (!provided || provided !== getAdminPasscode()) {
    return res.status(401).json({ error: 'Unauthorized studio access.' });
  }
  return next();
}

async function startServer() {
  ensureDataDirs();
  // Ensure initial galleries file exists on boot
  readGalleries();

  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Serve photographer-uploaded client photos statically
  app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));

  // ---------------------------------------------------------------------------
  // CLIENT GALLERY ENDPOINTS
  // ---------------------------------------------------------------------------
  app.get('/api/gallery', async (req, res) => {
    try {
      const fileId = typeof req.query.fileId === 'string' ? req.query.fileId : '';
      const sessionId =
        typeof req.query.session === 'string'
          ? req.query.session
          : process.env.VITE_DEFAULT_SESSION_ID || 'kampala-editorial-2026';
      const explicitFolderId =
        typeof req.query.folderId === 'string' ? req.query.folderId : undefined;

      const hasGoogleAuth =
        Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) &&
        Boolean(process.env.GOOGLE_PRIVATE_KEY);

      // Mode 1: Proxy private Google Drive image bytes securely
      if (fileId && hasGoogleAuth) {
        const accessToken = await getGoogleServiceAccountToken([
          'https://www.googleapis.com/auth/drive.readonly',
        ]);
        const size = req.query.size === 'thumb' ? 'thumb' : 'full';
        const metaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
            fileId
          )}?fields=mimeType,thumbnailLink`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!metaRes.ok) {
          return res.status(metaRes.status).json({ error: 'Unable to fetch Drive file metadata' });
        }

        const meta = (await metaRes.json()) as DriveFileRecord;

        if (size === 'thumb' && meta.thumbnailLink) {
          const thumbUrl = meta.thumbnailLink.replace(/=s\d+$/, '=s1000');
          const imgRes = await fetch(thumbUrl);
          const buf = Buffer.from(await imgRes.arrayBuffer());
          res.setHeader('Content-Type', meta.mimeType || 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          return res.status(200).send(buf);
        }

        const mediaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!mediaRes.ok) {
          return res.status(mediaRes.status).json({ error: 'Unable to stream Drive image' });
        }
        const buf = Buffer.from(await mediaRes.arrayBuffer());
        res.setHeader('Content-Type', meta.mimeType || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).send(buf);
      }

      // Mode 2: Load directly from Google Drive folder when configured & requested
      if (hasGoogleAuth && (explicitFolderId || process.env.VITE_USE_MOCK_DATA === 'false')) {
        const folderId = resolveDriveFolderId(sessionId, explicitFolderId);
        if (folderId) {
          const accessToken = await getGoogleServiceAccountToken([
            'https://www.googleapis.com/auth/drive.readonly',
          ]);
          const [folderMetaRes, filesListRes] = await Promise.all([
            fetch(
              `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
                folderId
              )}?fields=id,name,createdTime`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            ),
            fetch(
              `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({
                q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
                orderBy: 'name asc',
                pageSize: '500',
                fields: 'files(id,name,mimeType,createdTime,imageMediaMetadata(width,height))',
              }).toString()}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            ),
          ]);

          if (!folderMetaRes.ok || !filesListRes.ok) {
            return res.status(502).json({ error: 'Google Drive API request failed.' });
          }

          const folderMeta = (await folderMetaRes.json()) as DriveFileRecord;
          const listJson = (await filesListRes.json()) as { files?: DriveFileRecord[] };
          const files = listJson.files || [];

          const photos = files.map((file) => {
            const width = file.imageMediaMetadata?.width;
            const height = file.imageMediaMetadata?.height;
            let aspectRatio: 'portrait' | 'landscape' | 'square' = 'landscape';
            if (width && height) {
              if (Math.abs(width - height) < 40) aspectRatio = 'square';
              else aspectRatio = height > width ? 'portrait' : 'landscape';
            }

            return {
              id: file.id,
              filename: file.name || 'untitled.jpg',
              thumbnailUrl: `/api/gallery?fileId=${encodeURIComponent(file.id)}&size=thumb`,
              fullUrl: `/api/gallery?fileId=${encodeURIComponent(file.id)}&size=full`,
              width,
              height,
              aspectRatio,
              capturedAt: file.createdTime,
              mimeType: file.mimeType,
            };
          });

          return res.status(200).json({
            sessionId,
            sessionName: folderMeta.name || 'Client Proofing Gallery',
            photographerName: process.env.VITE_BRAND_NAME || 'Paul Photography 256',
            shootDate: folderMeta.createdTime
              ? new Date(folderMeta.createdTime).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : 'Recent Session',
            instructions:
              'Select your favorite frames with the heart button for final retouching and add any editing notes before submitting.',
            driveFolderId: folderId,
            allowZipDownload: true,
            source: 'drive',
            photos,
          });
        }
      }

      // Mode 3: Studio-managed client galleries stored in .data/galleries.json
      const galleries = readGalleries();
      const gallery = galleries.find((g) => g.sessionId === sessionId);

      if (!gallery) {
        return res.status(404).json({
          error: `Gallery "${sessionId}" was not found. Please check your client gallery link.`,
        });
      }

      const requiresPasscode = Boolean(gallery.passcode && gallery.passcode.trim().length > 0);
      let isLocked = false;
      if (requiresPasscode && gallery.passcode) {
        const providedToken = String(req.headers['x-gallery-access'] || '');
        const expectedToken = createGalleryAccessToken(gallery.sessionId, gallery.passcode);
        if (providedToken !== expectedToken) {
          isLocked = true;
        }
      }

      // Strip secret passcode from public response; omit photos while locked
      const { passcode: _hiddenPasscode, ...publicFields } = gallery;
      return res.status(200).json({
        ...publicFields,
        requiresPasscode,
        isLocked,
        photos: isLocked ? [] : gallery.photos,
      });
    } catch (err) {
      console.error('[GET /api/gallery] Error:', err);
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Unexpected server error',
      });
    }
  });

  app.post('/api/gallery/unlock', (req, res) => {
    const body = req.body as { sessionId?: string; passcode?: string } | undefined;
    const sessionId = body?.sessionId?.trim();
    const passcode = body?.passcode?.trim();

    if (!sessionId || !passcode) {
      return res.status(400).json({ error: 'Session ID and passcode are required.' });
    }

    const galleries = readGalleries();
    const gallery = galleries.find((g) => g.sessionId === sessionId);
    if (!gallery) {
      return res.status(404).json({ error: 'Gallery not found.' });
    }

    if (!gallery.passcode || gallery.passcode !== passcode) {
      return res.status(401).json({ error: 'Incorrect gallery passcode.' });
    }

    return res.status(200).json({
      ok: true,
      accessToken: createGalleryAccessToken(gallery.sessionId, gallery.passcode),
    });
  });

  // ---------------------------------------------------------------------------
  // CLIENT FAVORITES SUBMISSION ENDPOINT
  // ---------------------------------------------------------------------------
  app.post('/api/favorites', async (req, res) => {
    const body = req.body as Partial<FavoriteSubmissionBody> | undefined;

    if (
      !body ||
      !body.clientName?.trim() ||
      !body.clientEmail?.trim() ||
      !body.sessionId?.trim() ||
      !Array.isArray(body.selectedPhotos) ||
      body.selectedPhotos.length === 0
    ) {
      return res.status(400).json({
        error:
          'Client name, client email, sessionId, and at least one selected photo are required.',
      });
    }

    const submissionId = `PP256-${Date.now().toString(36).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const cleanPayload: FavoriteSubmissionBody = {
      sessionId: body.sessionId.trim(),
      sessionName: (body.sessionName || body.sessionId).trim(),
      clientName: body.clientName.trim(),
      clientEmail: body.clientEmail.trim(),
      sessionNotes: body.sessionNotes?.trim() || undefined,
      selectedPhotos: body.selectedPhotos,
      submittedAt: body.submittedAt || timestamp,
    };

    try {
      const [sheetsResult, emailResult] = await Promise.allSettled([
        logToGoogleSheets(submissionId, cleanPayload, timestamp),
        sendPhotographerEmail(submissionId, cleanPayload, timestamp),
      ]);

      const loggedToSheets = sheetsResult.status === 'fulfilled' && sheetsResult.value;
      const emailSent = emailResult.status === 'fulfilled' && emailResult.value;

      if (sheetsResult.status === 'rejected') {
        console.error('[POST /api/favorites] Google Sheets error:', sheetsResult.reason);
      }
      if (emailResult.status === 'rejected') {
        console.error('[POST /api/favorites] Email error:', emailResult.reason);
      }

      const savedLocally = saveSubmissionLocally({
        ...cleanPayload,
        submissionId,
        timestamp,
        status: 'new',
        loggedToSheets,
        emailSent,
      });

      const deliveries: string[] = [];
      if (loggedToSheets) deliveries.push('logged to Google Sheets');
      if (emailSent) deliveries.push('emailed to photographer');
      if (savedLocally && !loggedToSheets && !emailSent) {
        deliveries.push('saved to studio dashboard');
      }

      return res.status(200).json({
        ok: true,
        submissionId,
        timestamp,
        loggedToSheets,
        emailSent,
        savedLocally,
        message:
          deliveries.length > 0
            ? `Selections recorded (${deliveries.join(', ')}).`
            : 'Selections recorded.',
      });
    } catch (err) {
      console.error('[POST /api/favorites] Error:', err);
      return res.status(500).json({
        error: 'Unable to process favorite selections right now.',
      });
    }
  });

  // ---------------------------------------------------------------------------
  // PHOTOGRAPHER ADMIN DASHBOARD ENDPOINTS
  // ---------------------------------------------------------------------------
  app.post('/api/admin/auth', (req, res) => {
    const body = req.body as { passcode?: string } | undefined;
    if (!body?.passcode || body.passcode !== getAdminPasscode()) {
      return res.status(401).json({ error: 'Invalid studio passcode.' });
    }
    return res.status(200).json({ ok: true });
  });

  app.get('/api/admin/galleries', requireAdmin, (_req, res) => {
    const galleries = readGalleries();
    const submissions = readSubmissions();

    const enriched = galleries.map((g) => ({
      ...g,
      submissionCount: submissions.filter((s) => s.sessionId === g.sessionId).length,
    }));

    return res.status(200).json({ galleries: enriched });
  });

  app.post('/api/admin/galleries', requireAdmin, (req, res) => {
    const body = req.body as Partial<GalleryRecord> | undefined;
    if (!body?.sessionName?.trim()) {
      return res.status(400).json({ error: 'Gallery title is required.' });
    }

    const galleries = readGalleries();
    let sessionId = body.sessionId?.trim()
      ? body.sessionId
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
      : slugifySessionId(body.clientDisplayName || body.sessionName);

    if (galleries.some((g) => g.sessionId === sessionId)) {
      sessionId = slugifySessionId(sessionId);
    }

    const newGallery: GalleryRecord = {
      sessionId,
      sessionName: body.sessionName.trim(),
      clientDisplayName: body.clientDisplayName?.trim() || undefined,
      photographerName:
        body.photographerName?.trim() ||
        process.env.VITE_BRAND_NAME ||
        'Paul Photography 256',
      shootDate:
        body.shootDate?.trim() ||
        new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      category: body.category?.trim() || 'Client Session',
      instructions:
        body.instructions?.trim() ||
        'Select your favorite frames with the heart button for final color grading and retouching.',
      driveFolderId: body.driveFolderId?.trim() || undefined,
      theme: body.theme || 'editorial-light',
      headerStyle: body.headerStyle || 'editorial',
      defaultLayout: body.defaultLayout || 'masonry',
      maxSelections:
        typeof body.maxSelections === 'number' && body.maxSelections > 0
          ? body.maxSelections
          : undefined,
      allowZipDownload: body.allowZipDownload !== false,
      passcode: body.passcode?.trim() || undefined,
      expiresAt: body.expiresAt?.trim() || undefined,
      createdAt: new Date().toISOString(),
      source: 'studio',
      photos: [],
    };

    galleries.unshift(newGallery);
    writeGalleries(galleries);

    return res.status(201).json({ gallery: newGallery });
  });

  app.patch('/api/admin/galleries/:sessionId', requireAdmin, (req, res) => {
    const { sessionId } = req.params;
    const body = req.body as Partial<GalleryRecord> | undefined;
    const galleries = readGalleries();
    const index = galleries.findIndex((g) => g.sessionId === sessionId);

    if (index === -1) {
      return res.status(404).json({ error: 'Gallery not found.' });
    }

    const current = galleries[index];
    const updated: GalleryRecord = {
      ...current,
      sessionName:
        body?.sessionName !== undefined ? body.sessionName.trim() : current.sessionName,
      clientDisplayName:
        body?.clientDisplayName !== undefined
          ? body.clientDisplayName.trim() || undefined
          : current.clientDisplayName,
      shootDate:
        body?.shootDate !== undefined ? body.shootDate.trim() : current.shootDate,
      category:
        body?.category !== undefined
          ? body.category.trim() || undefined
          : current.category,
      instructions:
        body?.instructions !== undefined
          ? body.instructions.trim() || undefined
          : current.instructions,
      driveFolderId:
        body?.driveFolderId !== undefined
          ? body.driveFolderId.trim() || undefined
          : current.driveFolderId,
      theme: body?.theme || current.theme,
      headerStyle: body?.headerStyle || current.headerStyle,
      defaultLayout: body?.defaultLayout || current.defaultLayout,
      coverPhotoId:
        body?.coverPhotoId !== undefined ? body.coverPhotoId || undefined : current.coverPhotoId,
      maxSelections:
        body?.maxSelections !== undefined
          ? body.maxSelections && body.maxSelections > 0
            ? Number(body.maxSelections)
            : undefined
          : current.maxSelections,
      allowZipDownload:
        body?.allowZipDownload !== undefined
          ? Boolean(body.allowZipDownload)
          : current.allowZipDownload,
      passcode:
        body?.passcode !== undefined ? body.passcode.trim() || undefined : current.passcode,
      expiresAt:
        body?.expiresAt !== undefined
          ? body.expiresAt.trim() || undefined
          : current.expiresAt,
    };

    galleries[index] = updated;
    writeGalleries(galleries);

    return res.status(200).json({ gallery: updated });
  });

  app.get('/api/admin/drive/status', requireAdmin, (_req, res) => {
    return res.status(200).json({
      configured: hasGoogleDriveConfig(),
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || undefined,
      defaultFolderId: process.env.GOOGLE_DRIVE_DEFAULT_FOLDER_ID || undefined,
    });
  });

  app.post('/api/admin/galleries/:sessionId/drive-folder', requireAdmin, async (req, res) => {
    const { sessionId } = req.params;
    if (!hasGoogleDriveConfig()) {
      return res.status(400).json({
        error:
          'Google Drive Service Account credentials are not configured in server environment.',
      });
    }

    const galleries = readGalleries();
    const index = galleries.findIndex((g) => g.sessionId === sessionId);
    if (index === -1) {
      return res.status(404).json({ error: 'Gallery not found.' });
    }

    try {
      const accessToken = await getGoogleServiceAccountToken([
        'https://www.googleapis.com/auth/drive',
      ]);
      const parentId = process.env.GOOGLE_DRIVE_DEFAULT_FOLDER_ID;
      const folderPayload: { name: string; mimeType: string; parents?: string[] } = {
        name: `${galleries[index].sessionName} (${sessionId})`,
        mimeType: 'application/vnd.google-apps.folder',
      };
      if (parentId) folderPayload.parents = [parentId];

      const driveRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(folderPayload),
      });

      if (!driveRes.ok) {
        const errBody = await driveRes.text();
        throw new Error(`Unable to create Google Drive folder (${driveRes.status}): ${errBody}`);
      }

      const createdFolder = (await driveRes.json()) as { id: string; name: string };
      galleries[index].driveFolderId = createdFolder.id;
      writeGalleries(galleries);

      return res.status(201).json({
        gallery: galleries[index],
        driveFolderId: createdFolder.id,
      });
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to create Drive folder.',
      });
    }
  });

  app.post('/api/admin/galleries/:sessionId/sync-drive', requireAdmin, async (req, res) => {
    const { sessionId } = req.params;
    if (!hasGoogleDriveConfig()) {
      return res.status(400).json({
        error: 'Google Drive Service Account credentials are not configured.',
      });
    }

    const galleries = readGalleries();
    const index = galleries.findIndex((g) => g.sessionId === sessionId);
    if (index === -1) {
      return res.status(404).json({ error: 'Gallery not found.' });
    }

    const targetFolderId =
      galleries[index].driveFolderId || resolveDriveFolderId(sessionId);
    if (!targetFolderId) {
      return res.status(400).json({
        error: 'No Google Drive Folder ID is linked to this gallery.',
      });
    }

    try {
      const accessToken = await getGoogleServiceAccountToken([
        'https://www.googleapis.com/auth/drive.readonly',
      ]);
      const { photos } = await listDriveFolderPhotos(accessToken, targetFolderId);

      const existingIds = new Set(galleries[index].photos.map((p) => p.id));
      const merged = [
        ...galleries[index].photos,
        ...photos.filter((p) => !existingIds.has(p.id)),
      ];
      galleries[index].photos = merged;
      galleries[index].driveFolderId = targetFolderId;
      if (!galleries[index].coverPhotoId && merged.length > 0) {
        galleries[index].coverPhotoId = merged[0].id;
      }
      writeGalleries(galleries);

      return res.status(200).json({
        gallery: galleries[index],
        syncedCount: photos.length,
      });
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to sync Drive folder.',
      });
    }
  });

  app.delete('/api/admin/galleries/:sessionId', requireAdmin, (req, res) => {
    const { sessionId } = req.params;
    const galleries = readGalleries();
    const filtered = galleries.filter((g) => g.sessionId !== sessionId);

    if (filtered.length === galleries.length) {
      return res.status(404).json({ error: 'Gallery not found.' });
    }

    writeGalleries(filtered);

    const galleryUploadDir = path.join(
      UPLOADS_DIR,
      String(sessionId).replace(/[^a-zA-Z0-9_-]/g, '')
    );
    if (fs.existsSync(galleryUploadDir)) {
      fs.rmSync(galleryUploadDir, { recursive: true, force: true });
    }

    return res.status(200).json({ ok: true });
  });

  app.post(
    '/api/admin/galleries/:sessionId/photos',
    requireAdmin,
    uploadMiddleware.array('photos', 60),
    async (req, res) => {
      const { sessionId } = req.params;
      const galleries = readGalleries();
      const index = galleries.findIndex((g) => g.sessionId === sessionId);

      if (index === -1) {
        return res.status(404).json({ error: 'Gallery not found.' });
      }

      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0) {
        return res.status(400).json({ error: 'No image files uploaded.' });
      }

      const current = galleries[index];
      const targetDriveFolderId =
        current.driveFolderId || resolveDriveFolderId(sessionId);
      const shouldUploadToDrive = hasGoogleDriveConfig() && Boolean(targetDriveFolderId);

      try {
        let addedPhotos: PhotoItem[] = [];

        if (shouldUploadToDrive && targetDriveFolderId) {
          const accessToken = await getGoogleServiceAccountToken([
            'https://www.googleapis.com/auth/drive',
          ]);

          for (const file of files) {
            const fileBuffer = fs.readFileSync(file.path);
            const drivePhoto = await uploadBufferToGoogleDrive(
              accessToken,
              targetDriveFolderId,
              file.originalname,
              file.mimetype,
              fileBuffer
            );
            addedPhotos.push(drivePhoto);
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          }
        } else {
          const safeDir = String(sessionId).replace(/[^a-zA-Z0-9_-]/g, '');
          addedPhotos = files.map((file) => {
            const publicUrl = `/uploads/${encodeURIComponent(safeDir)}/${encodeURIComponent(
              file.filename
            )}`;
            return {
              id: `up-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              filename: file.originalname,
              thumbnailUrl: publicUrl,
              fullUrl: publicUrl,
              mimeType: file.mimetype,
              sizeBytes: file.size,
              storage: 'local',
              capturedAt: new Date().toISOString(),
            };
          });
        }

        current.photos = [...current.photos, ...addedPhotos];
        if (!current.coverPhotoId && addedPhotos.length > 0) {
          current.coverPhotoId = addedPhotos[0].id;
        }
        galleries[index] = current;
        writeGalleries(galleries);

        return res.status(201).json({
          gallery: current,
          addedPhotos,
          uploadDestination: shouldUploadToDrive ? 'google-drive' : 'local',
        });
      } catch (err) {
        for (const file of files) {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
        return res.status(500).json({
          error: err instanceof Error ? err.message : 'Photo upload failed.',
        });
      }
    }
  );

  app.delete('/api/admin/galleries/:sessionId/photos/:photoId', requireAdmin, (req, res) => {
    const { sessionId, photoId } = req.params;
    const galleries = readGalleries();
    const index = galleries.findIndex((g) => g.sessionId === sessionId);

    if (index === -1) {
      return res.status(404).json({ error: 'Gallery not found.' });
    }

    const current = galleries[index];
    const targetPhoto = current.photos.find((p) => p.id === photoId);
    if (!targetPhoto) {
      return res.status(404).json({ error: 'Photo not found.' });
    }

    current.photos = current.photos.filter((p) => p.id !== photoId);
    if (current.coverPhotoId === photoId) {
      current.coverPhotoId = current.photos[0]?.id;
    }
    galleries[index] = current;
    writeGalleries(galleries);

    if (targetPhoto.fullUrl.startsWith('/uploads/')) {
      const relative = decodeURIComponent(targetPhoto.fullUrl.replace(/^\/uploads\//, ''));
      const diskPath = path.join(UPLOADS_DIR, relative);
      if (diskPath.startsWith(UPLOADS_DIR) && fs.existsSync(diskPath)) {
        fs.unlinkSync(diskPath);
      }
    }

    return res.status(200).json({ gallery: current });
  });

  app.get('/api/admin/submissions', requireAdmin, (_req, res) => {
    const submissions = readSubmissions();
    return res.status(200).json({ submissions });
  });

  app.patch('/api/admin/submissions/:submissionId', requireAdmin, (req, res) => {
    const { submissionId } = req.params;
    const body = req.body as { status?: SubmissionStatus } | undefined;
    const validStatuses: SubmissionStatus[] = ['new', 'retouching', 'delivered'];

    if (!body?.status || !validStatuses.includes(body.status)) {
      return res.status(400).json({ error: 'Valid status is required.' });
    }

    const submissions = readSubmissions();
    const index = submissions.findIndex((s) => s.submissionId === submissionId);
    if (index === -1) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    submissions[index] = { ...submissions[index], status: body.status };
    writeSubmissions(submissions);

    return res.status(200).json({ submission: submissions[index] });
  });

  // ---------------------------------------------------------------------------
  // Vite Middleware (dev) or Static Bundle (production)
  // ---------------------------------------------------------------------------
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Client Photo Proofing server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
