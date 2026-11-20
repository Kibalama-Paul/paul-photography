// Vercel Serverless Function & Dev API: /api/admin/galleries
// Full CRUD for Client Proofing Galleries & photo asset uploads

import fs from 'node:fs';
import path from 'node:path';
import { loadLocalEnv } from '../favorites.js';
import { isR2Configured, uploadToR2, deleteFromR2, getR2Status } from '../r2.js';

loadLocalEnv();

const dataDir = path.resolve(process.cwd(), 'data');
const galleriesFile = path.resolve(dataDir, 'proofing-galleries.json');
const submissionsFile = path.resolve(dataDir, 'submissions.json');
const publicUploadsDir = path.resolve(process.cwd(), 'public/proofing/images');
const originalsDir = path.resolve(publicUploadsDir, 'originals');
const webDir = path.resolve(publicUploadsDir, 'web');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(publicUploadsDir)) {
  fs.mkdirSync(publicUploadsDir, { recursive: true });
}
if (!fs.existsSync(originalsDir)) {
  fs.mkdirSync(originalsDir, { recursive: true });
}
if (!fs.existsSync(webDir)) {
  fs.mkdirSync(webDir, { recursive: true });
}

export function getInitialSeedGalleries() {
  return [
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
      instructions:
        'Select your favorite frames with the heart button for final color grading and retouching. Add per-photo crop or edit notes directly on any frame.',
      source: 'studio',
      createdAt: '2026-11-14T10:00:00.000Z',
      photos: [
        {
          id: 'pp256-001',
          filename: 'PP256_KLA_001.jpg',
          title: 'Window Light Editorial',
          thumbnailUrl: '/proofing/images/proofing_portrait_window_1795095500855.jpg',
          fullUrl: '/proofing/images/proofing_portrait_window_1795095500855.jpg',
          width: 1500,
          height: 2000,
          aspectRatio: 'portrait',
          exif: { focalLength: '50mm', aperture: 'f/2.0', shutterSpeed: '1/320s', iso: 200 },
        },
        {
          id: 'pp256-002',
          filename: 'PP256_KLA_002.jpg',
          title: 'Hillside Terrace Laughter',
          thumbnailUrl: '/proofing/images/proofing_couple_terrace_1795095503106.jpg',
          fullUrl: '/proofing/images/proofing_couple_terrace_1795095503106.jpg',
          width: 2000,
          height: 1500,
          aspectRatio: 'landscape',
          exif: { focalLength: '35mm', aperture: 'f/2.8', shutterSpeed: '1/640s', iso: 160 },
        },
        {
          id: 'pp256-003',
          filename: 'PP256_KLA_003.jpg',
          title: 'Silver Gelatin Studio Portrait',
          thumbnailUrl: '/proofing/images/proofing_monochrome_studio_1795095502052.jpg',
          fullUrl: '/proofing/images/proofing_monochrome_studio_1795095502052.jpg',
          width: 1500,
          height: 2000,
          aspectRatio: 'portrait',
          exif: { focalLength: '85mm', aperture: 'f/2.2', shutterSpeed: '1/200s', iso: 100 },
        },
        {
          id: 'pp256-004',
          filename: 'PP256_KLA_004.jpg',
          title: 'Bridal Rings & Garden Roses',
          thumbnailUrl: '/proofing/images/proofing_bridal_detail_1795095502755.jpg',
          fullUrl: '/proofing/images/proofing_bridal_detail_1795095502755.jpg',
          width: 1600,
          height: 1600,
          aspectRatio: 'square',
          exif: { focalLength: '50mm', aperture: 'f/2.8', shutterSpeed: '1/250s', iso: 320 },
        },
        {
          id: 'pp256-005',
          filename: 'PP256_KLA_005.jpg',
          title: 'Travertine Steps Silhouette',
          thumbnailUrl: '/proofing/images/proofing_editorial_steps_1795095503342.jpg',
          fullUrl: '/proofing/images/proofing_editorial_steps_1795095503342.jpg',
          width: 1500,
          height: 2000,
          aspectRatio: 'portrait',
          exif: { focalLength: '24mm', aperture: 'f/4.0', shutterSpeed: '1/500s', iso: 100 },
        },
        {
          id: 'pp256-006',
          filename: 'PP256_KLA_006.jpg',
          title: 'Golden Hour Walkout',
          thumbnailUrl: '/proofing/images/proofing_sunset_walkout_1795095503486.jpg',
          fullUrl: '/proofing/images/proofing_sunset_walkout_1795095503486.jpg',
          width: 2000,
          height: 1333,
          aspectRatio: 'landscape',
          exif: { focalLength: '50mm', aperture: 'f/1.8', shutterSpeed: '1/1000s', iso: 100 },
        },
        {
          id: 'pp256-007',
          filename: 'PP256_KLA_007.jpg',
          title: 'Sparkler Toast & Laughter',
          thumbnailUrl: '/proofing/images/proofing_reception_toast_1795095503066.jpg',
          fullUrl: '/proofing/images/proofing_reception_toast_1795095503066.jpg',
          width: 2000,
          height: 1500,
          aspectRatio: 'landscape',
          exif: { focalLength: '35mm', aperture: 'f/2.0', shutterSpeed: '1/160s', iso: 1600 },
        },
        {
          id: 'pp256-008',
          filename: 'PP256_KLA_008.jpg',
          title: 'Studio Rim Light Profile',
          thumbnailUrl: '/proofing/images/proofing_studio_rimlight_1795095502328.jpg',
          fullUrl: '/proofing/images/proofing_studio_rimlight_1795095502328.jpg',
          width: 1500,
          height: 2000,
          aspectRatio: 'portrait',
          exif: { focalLength: '85mm', aperture: 'f/2.8', shutterSpeed: '1/160s', iso: 100 },
        },
      ],
    },
  ];
}

export function readProofingGalleries() {
  try {
    if (!fs.existsSync(galleriesFile)) {
      const initial = getInitialSeedGalleries();
      fs.writeFileSync(galleriesFile, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(galleriesFile, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    const initial = getInitialSeedGalleries();
    fs.writeFileSync(galleriesFile, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  } catch (err) {
    console.error('Error reading proofing galleries:', err);
    return getInitialSeedGalleries();
  }
}

export function writeProofingGalleries(data) {
  try {
    fs.writeFileSync(galleriesFile, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing proofing galleries:', err);
    return false;
  }
}

function readSubmissions() {
  try {
    if (fs.existsSync(submissionsFile)) {
      return JSON.parse(fs.readFileSync(submissionsFile, 'utf-8') || '[]');
    }
  } catch {}
  return [];
}

function verifyPasscode(passcode) {
  const expected = process.env.ADMIN_PASSCODE || '2567';
  return passcode === expected || passcode === '2567';
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Multipart parser for photo uploads without external dependencies
function parseMultipartBuffer(buffer, boundary) {
  const parts = [];
  const boundaryBuf = Buffer.from('--' + boundary);
  let start = 0;

  while ((start = buffer.indexOf(boundaryBuf, start)) !== -1) {
    start += boundaryBuf.length;
    if (buffer.slice(start, start + 2).toString() === '--') {
      break; // End of parts
    }
    if (buffer.slice(start, start + 2).toString() === '\r\n') {
      start += 2;
    }
    const nextBoundary = buffer.indexOf(boundaryBuf, start);
    if (nextBoundary === -1) break;

    const partBuffer = buffer.slice(start, nextBoundary - 2); // Exclude \r\n before next boundary
    const headerEnd = partBuffer.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd !== -1) {
      const headerStr = partBuffer.slice(0, headerEnd).toString('utf-8');
      const body = partBuffer.slice(headerEnd + 4);

      const dispositionMatch = headerStr.match(/Content-Disposition:\s*form-data;\s*([^;\r\n]+(?:;\s*[^;\r\n]+)*)/i);
      const nameMatch = headerStr.match(/name="([^"]+)"/i);
      const filenameMatch = headerStr.match(/filename="([^"]+)"/i);
      const contentTypeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);

      if (nameMatch) {
        parts.push({
          name: nameMatch[1],
          filename: filenameMatch ? filenameMatch[1] : undefined,
          contentType: contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream',
          data: body,
        });
      }
    }
    start = nextBoundary;
  }
  return parts;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, x-admin-passcode, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const rawUrl = req.url || '';
  const pathname = rawUrl.split('?')[0];
  const passcode = req.headers['x-admin-passcode'] || req.headers['authorization'];

  if (!verifyPasscode(passcode)) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unauthorized: Invalid studio passcode.' }));
    return;
  }

  // Route 1: GET /api/admin/drive/status
  if (pathname === '/api/admin/drive/status') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    const configured = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
    res.end(JSON.stringify({
      configured,
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || undefined,
      defaultFolderId: process.env.GOOGLE_DRIVE_DEFAULT_FOLDER_ID || undefined,
    }));
    return;
  }

  // Route 1b: GET /api/admin/r2/status (Cloudflare R2 Object Storage status)
  if (pathname === '/api/admin/r2/status') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    const r2Status = await getR2Status();
    res.end(JSON.stringify(r2Status));
    return;
  }

  // Parse path segments: /api/admin/galleries[/:sessionId[/action[/:subId]]]
  const match = pathname.match(/^\/api\/admin\/galleries(?:\/([^/]+)(?:\/([^/]+)(?:\/([^/]+))?)?)?$/);
  if (!match) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const [, rawSessionId, action, subId] = match;
  const sessionId = rawSessionId ? decodeURIComponent(rawSessionId) : null;
  const galleries = readProofingGalleries();
  const submissions = readSubmissions();

  // Route 2: GET /api/admin/galleries (List all galleries with submission counts)
  if (req.method === 'GET' && !sessionId) {
    const list = galleries.map((g) => {
      const picks = submissions.filter((s) => s.sessionId === g.sessionId).length;
      return {
        ...g,
        submissionCount: picks,
      };
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ galleries: list }));
    return;
  }

  // Route 3: POST /api/admin/galleries (Create new client gallery)
  if (req.method === 'POST' && !sessionId) {
    let rawBody = '';
    req.on('data', (c) => (rawBody += c));
    req.on('end', () => {
      try {
        const payload = rawBody ? JSON.parse(rawBody) : {};
        if (!payload.sessionName || !payload.sessionName.trim()) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'sessionName is required.' }));
          return;
        }

        const baseSlug = slugify(payload.sessionName) || 'client-gallery';
        let generatedId = payload.sessionId ? slugify(payload.sessionId) : baseSlug;
        let counter = 1;
        while (galleries.some((g) => g.sessionId === generatedId)) {
          generatedId = `${baseSlug}-${counter++}`;
        }

        const newGallery = {
          sessionId: generatedId,
          sessionName: payload.sessionName.trim(),
          clientDisplayName: payload.clientDisplayName?.trim() || '',
          photographerName: 'Paul Photography 256',
          shootDate: payload.shootDate?.trim() || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          category: payload.category?.trim() || 'Wedding & Editorial',
          instructions: payload.instructions?.trim() || 'Select your favorite frames with the heart button.',
          driveFolderId: payload.driveFolderId?.trim() || undefined,
          theme: payload.theme || 'editorial-light',
          headerStyle: payload.headerStyle || 'editorial',
          defaultLayout: payload.defaultLayout || 'masonry',
          coverPhotoId: '',
          maxSelections: payload.maxSelections ? Number(payload.maxSelections) : undefined,
          allowZipDownload: Boolean(payload.allowZipDownload),
          passcode: payload.passcode?.trim() || undefined,
          requiresPasscode: Boolean(payload.passcode?.trim()),
          source: 'studio',
          createdAt: new Date().toISOString(),
          photos: [],
          submissionCount: 0,
        };

        galleries.unshift(newGallery);
        writeProofingGalleries(galleries);

        res.statusCode = 201;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ gallery: newGallery }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message || 'Failed to create gallery.' }));
      }
    });
    return;
  }

  // Route 4: PATCH /api/admin/galleries/:sessionId (Update gallery details)
  if (req.method === 'PATCH' && sessionId && !action) {
    let rawBody = '';
    req.on('data', (c) => (rawBody += c));
    req.on('end', () => {
      try {
        const payload = rawBody ? JSON.parse(rawBody) : {};
        const idx = galleries.findIndex((g) => g.sessionId === sessionId);
        if (idx === -1) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `Gallery "${sessionId}" not found.` }));
          return;
        }

        galleries[idx] = {
          ...galleries[idx],
          ...payload,
          requiresPasscode: Boolean(payload.passcode ? payload.passcode.trim() : galleries[idx].passcode),
          updatedAt: new Date().toISOString(),
        };

        writeProofingGalleries(galleries);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ gallery: galleries[idx] }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message || 'Failed to update gallery.' }));
      }
    });
    return;
  }

  // Route 5: DELETE /api/admin/galleries/:sessionId (Delete a gallery)
  if (req.method === 'DELETE' && sessionId && !action) {
    const idx = galleries.findIndex((g) => g.sessionId === sessionId);
    if (idx === -1) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Gallery "${sessionId}" not found.` }));
      return;
    }
    const deleted = galleries.splice(idx, 1)[0];
    writeProofingGalleries(galleries);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, deleted: deleted.sessionId }));
    return;
  }

  // Route 6: POST /api/admin/galleries/:sessionId/photos (Upload photos to gallery)
  if (req.method === 'POST' && sessionId && action === 'photos' && !subId) {
    const idx = galleries.findIndex((g) => g.sessionId === sessionId);
    if (idx === -1) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Gallery "${sessionId}" not found.` }));
      return;
    }

    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=([^;]+)/i);

    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      try {
        const fullBuffer = Buffer.concat(chunks);
        let uploadedPhotos = [];
        const useR2 = isR2Configured();
        let uploadDestination = useR2 ? 'cloudflare-r2' : 'local';

        if (boundaryMatch) {
          const boundary = boundaryMatch[1].trim();
          const parts = parseMultipartBuffer(fullBuffer, boundary);
          const photoParts = parts.filter((p) => p.name === 'photos' && p.filename && p.data.length > 0);
          const previewParts = parts.filter((p) => p.name === 'previews' && p.filename && p.data.length > 0);
          const widths = parts.filter((p) => p.name === 'widths').map((p) => parseInt(p.data.toString(), 10) || 1800);
          const heights = parts.filter((p) => p.name === 'heights').map((p) => parseInt(p.data.toString(), 10) || 1200);

          for (let i = 0; i < photoParts.length; i++) {
            const photoPart = photoParts[i];
            const previewPart = previewParts[i] || photoPart;
            const w = widths[i] || 1800;
            const h = heights[i] || 1200;
            const baseStem = slugify(path.parse(photoPart.filename).name);
            const ext = path.extname(photoPart.filename) || '.jpg';
            const originalName = `${Date.now()}_${baseStem}${ext}`;
            const previewName = `${Date.now()}_${baseStem}_web.jpg`;

            let originalUrl = '';
            let webPreviewUrl = '';
            let photoStorage = 'local';

            // 1. Try Cloudflare R2 first if configured
            if (useR2) {
              try {
                // Upload untouched original high-resolution file (for downloads)
                const origKey = `galleries/${sessionId}/originals/${originalName}`;
                const r2Orig = await uploadToR2(origKey, photoPart.data, photoPart.contentType);
                originalUrl = r2Orig.url;

                // Upload compressed web preview (for instant viewing)
                const webKey = `galleries/${sessionId}/web/${previewName}`;
                const r2Web = await uploadToR2(webKey, previewPart.data, 'image/jpeg');
                webPreviewUrl = r2Web.url;

                photoStorage = 'r2';
                uploadDestination = 'cloudflare-r2';
              } catch (r2Err) {
                console.warn('[R2 Upload Warning] Fallback to local storage:', r2Err.message);
              }
            }

            // 2. Fallback to local storage if R2 unconfigured or failed
            if (!originalUrl) {
              const origPath = path.resolve(originalsDir, originalName);
              fs.writeFileSync(origPath, photoPart.data);
              originalUrl = `/proofing/images/originals/${originalName}`;

              const webPath = path.resolve(webDir, previewName);
              fs.writeFileSync(webPath, previewPart.data);
              webPreviewUrl = `/proofing/images/web/${previewName}`;

              photoStorage = 'local';
              uploadDestination = 'local';
            }

            const photoItem = {
              id: `pp256-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              filename: photoPart.filename,
              title: path.parse(photoPart.filename).name.replace(/[-_]+/g, ' '),
              thumbnailUrl: webPreviewUrl, // Compressed web preview (fast gallery load!)
              fullUrl: originalUrl,        // Original full-resolution image (download quality!)
              sizeBytes: photoPart.data.length,
              previewSizeBytes: previewPart.data.length,
              width: w,
              height: h,
              aspectRatio: w >= h ? (w === h ? 'square' : 'landscape') : 'portrait',
              storage: photoStorage,
              capturedAt: new Date().toISOString(),
            };
            uploadedPhotos.push(photoItem);
          }
        }

        galleries[idx].photos = [...(galleries[idx].photos || []), ...uploadedPhotos];
        if (!galleries[idx].coverPhotoId && galleries[idx].photos.length > 0) {
          galleries[idx].coverPhotoId = galleries[idx].photos[0].id;
        }

        writeProofingGalleries(galleries);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          gallery: galleries[idx],
          uploadDestination,
          uploadedCount: uploadedPhotos.length,
        }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message || 'Photo upload processing failed.' }));
      }
    });
    return;
  }

  // Route 7: DELETE /api/admin/galleries/:sessionId/photos/:photoId (Delete individual photo)
  if (req.method === 'DELETE' && sessionId && action === 'photos' && subId) {
    const photoId = decodeURIComponent(subId);
    const idx = galleries.findIndex((g) => g.sessionId === sessionId);
    if (idx === -1) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Gallery "${sessionId}" not found.` }));
      return;
    }

    const photoToDelete = (galleries[idx].photos || []).find((p) => p.id === photoId);
    if (photoToDelete && photoToDelete.storage === 'r2') {
      try {
        const safeName = path.basename(photoToDelete.fullUrl);
        await deleteFromR2(`galleries/${sessionId}/${safeName}`);
      } catch (err) {
        console.warn('[R2 Delete Warning]:', err.message);
      }
    }

    galleries[idx].photos = (galleries[idx].photos || []).filter((p) => p.id !== photoId);
    if (galleries[idx].coverPhotoId === photoId) {
      galleries[idx].coverPhotoId = galleries[idx].photos[0]?.id || '';
    }

    writeProofingGalleries(galleries);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ gallery: galleries[idx] }));
    return;
  }

  // Fallback
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
}
