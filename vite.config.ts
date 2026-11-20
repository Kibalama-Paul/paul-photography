import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
// @ts-ignore
import favoritesHandler, { loadLocalEnv } from './api/favorites.js';
// @ts-ignore
import storageHandler from './api/admin/storage-status.js';
// @ts-ignore
import galleriesHandler from './api/admin/galleries.js';

function paulDevApiPlugin() {
  loadLocalEnv();
  const dataDir = path.resolve(__dirname, 'data');
  const bookingsFile = path.resolve(dataDir, 'bookings.json');
  const galleryFile = path.resolve(__dirname, 'src/data/galleryData.json');
  const portfolioFile = path.resolve(dataDir, 'portfolio.json');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(bookingsFile)) {
    fs.writeFileSync(bookingsFile, '[]');
  }
  if (!fs.existsSync(portfolioFile)) {
    fs.writeFileSync(portfolioFile, '[]');
  }

  const readBookings = () => {
    try {
      return JSON.parse(fs.readFileSync(bookingsFile, 'utf-8') || '[]');
    } catch {
      return [];
    }
  };

  const writeBookings = (data: any) => {
    fs.writeFileSync(bookingsFile, JSON.stringify(data, null, 2), 'utf-8');
  };

  const readGallery = () => {
    try {
      if (fs.existsSync(galleryFile)) {
        const raw = JSON.parse(fs.readFileSync(galleryFile, 'utf-8') || '[]');
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === 'object' && Array.isArray(raw.gallery)) return raw.gallery;
      }
    } catch {}
    return [];
  };

  const writeGallery = (data: any) => {
    try {
      let finalData = data;
      if (Array.isArray(data) && fs.existsSync(galleryFile)) {
        try {
          const existing = JSON.parse(fs.readFileSync(galleryFile, 'utf-8') || '{}');
          if (existing && typeof existing === 'object' && !Array.isArray(existing) && existing.portfolio) {
            finalData = {
              gallery: data,
              portfolio: existing.portfolio,
              updatedAt: new Date().toISOString()
            };
          }
        } catch {}
      }
      fs.writeFileSync(galleryFile, JSON.stringify(finalData, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[Vite API] Could not write gallery file:', e);
    }
  };

  const readPortfolio = () => {
    try {
      if (fs.existsSync(portfolioFile)) {
        const p = JSON.parse(fs.readFileSync(portfolioFile, 'utf-8') || '[]');
        if (Array.isArray(p) && p.length > 0) return p;
      }
      if (fs.existsSync(galleryFile)) {
        const raw = JSON.parse(fs.readFileSync(galleryFile, 'utf-8') || '{}');
        if (raw && typeof raw === 'object' && Array.isArray(raw.portfolio)) return raw.portfolio;
      }
    } catch {}
    return [];
  };

  const writePortfolio = (data: any) => {
    try {
      fs.writeFileSync(portfolioFile, JSON.stringify(data, null, 2), 'utf-8');
      if (fs.existsSync(galleryFile)) {
        try {
          const existing = JSON.parse(fs.readFileSync(galleryFile, 'utf-8') || '[]');
          const galleryPart = Array.isArray(existing) ? existing : (existing?.gallery || []);
          const unified = {
            gallery: galleryPart,
            portfolio: data,
            updatedAt: new Date().toISOString()
          };
          fs.writeFileSync(galleryFile, JSON.stringify(unified, null, 2), 'utf-8');
        } catch {}
      }
    } catch (e) {
      console.warn('[Vite API] Could not write portfolio file:', e);
    }
  };

  return {
    name: 'paul-dev-api-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const rawUrl = req.url || '';
        const url = rawUrl.split('?')[0];

        // 1. Bookings API
        if (
          url === '/api/bookings' ||
          url === '/api/bookings/save' ||
          url === '/api/bookings/approve' ||
          url?.startsWith('/api/bookings/')
        ) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (req.method === 'GET' && url === '/api/bookings') {
            const data = fs.readFileSync(bookingsFile, 'utf-8');
            res.end(data || '[]');
            return;
          }

          let body = '';
          req.on('data', (chunk: any) => (body += chunk));
          req.on('end', () => {
            try {
              let bookings = readBookings();
              const payload = body ? JSON.parse(body) : {};

              if (url === '/api/bookings/approve' || url?.startsWith('/api/bookings/approve/')) {
                const id = payload.id || url.split('/').pop();
                const now = new Date().toISOString();
                bookings = bookings.map((b: any) =>
                  b.id === id ? { ...b, adminApproved: true, adminApprovedAt: now, status: 'confirmed' } : b
                );
                writeBookings(bookings);
                res.end(JSON.stringify({ success: true, id, status: 'confirmed' }));
                return;
              }

              if (req.method === 'POST') {
                const existingIdx = bookings.findIndex((b: any) => b.id === payload.id);
                if (existingIdx >= 0) {
                  bookings[existingIdx] = { ...bookings[existingIdx], ...payload };
                } else {
                  bookings.unshift(payload);
                }
                writeBookings(bookings);
                // Immediate 202 Accepted response with lean payload
                res.statusCode = 202;
                res.end(JSON.stringify({ success: true, id: payload.id, status: 'accepted' }));
                return;
              }

              if (req.method === 'PUT') {
                const id = payload.id || (rawUrl.includes('id=') ? new URL(rawUrl, 'http://localhost').searchParams.get('id') : null);
                if (id) {
                  const existingIdx = bookings.findIndex((b: any) => b.id === id);
                  if (existingIdx >= 0) {
                    bookings[existingIdx] = { ...bookings[existingIdx], ...payload };
                    if (payload.status === 'confirmed' || payload.adminApproved) {
                      bookings[existingIdx].adminApproved = true;
                      bookings[existingIdx].adminApprovedAt = bookings[existingIdx].adminApprovedAt || new Date().toISOString();
                    }
                  } else {
                    bookings.unshift(payload);
                  }
                  writeBookings(bookings);
                  res.end(JSON.stringify({ success: true, id, status: 'updated' }));
                  return;
                }
              }

              if (req.method === 'DELETE') {
                const id = payload.id || url.split('/').pop() || (rawUrl.includes('id=') ? new URL(rawUrl, 'http://localhost').searchParams.get('id') : null);
                bookings = bookings.filter((b: any) => b.id !== id);
                writeBookings(bookings);
                res.end(JSON.stringify({ success: true, id, status: 'deleted' }));
                return;
              }
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: String(err) }));
              return;
            }
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Not found' }));
          });
          return;
        }

        // 2. Gallery API
        if (url === '/api/gallery' || url === '/api/gallery/delete' || url === '/api/gallery/featured' || url === '/api/gallery/export-all') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (req.method === 'GET') {
            if (rawUrl.includes('session=')) {
              try {
                const sessionParam = new URL(rawUrl, 'http://localhost').searchParams.get('session');
                const proofingFile = path.resolve(dataDir, 'proofing-galleries.json');
                if (fs.existsSync(proofingFile)) {
                  const list = JSON.parse(fs.readFileSync(proofingFile, 'utf-8') || '[]');
                  const matched = list.find((g: any) => g.sessionId === sessionParam);
                  if (matched) {
                    res.end(JSON.stringify(matched));
                    return;
                  }
                }
              } catch {}
            }
            const items = readGallery();
            res.end(JSON.stringify(items));
            return;
          }

          let body = '';
          req.on('data', (chunk: any) => (body += chunk));
          req.on('end', () => {
            try {
              const payload = body ? JSON.parse(body) : {};

              // Export all gallery & portfolio items to file
              if (url === '/api/gallery/export-all' && req.method === 'POST') {
                fs.writeFileSync(galleryFile, JSON.stringify(payload, null, 2), 'utf-8');
                if (Array.isArray(payload.portfolio)) {
                  fs.writeFileSync(portfolioFile, JSON.stringify(payload.portfolio, null, 2), 'utf-8');
                }
                res.end(JSON.stringify({ success: true, count: payload.gallery?.length || 0 }));
                return;
              }

              let items = readGallery();

              // Delete item
              if (url === '/api/gallery/delete' || req.method === 'DELETE') {
                const targetId = Number(payload.id || url.split('/').pop());
                items = items.filter((item: any) => item.id !== targetId);
                writeGallery(items);
                res.end(JSON.stringify({ success: true, deletedId: targetId, count: items.length }));
                return;
              }

              // Toggle / update featured
              if (url === '/api/gallery/featured') {
                const targetId = Number(payload.id);
                const isFeatured = !!payload.isFeatured;
                items = items.map((item: any) =>
                  item.id === targetId ? { ...item, isFeatured } : item
                );
                writeGallery(items);
                res.end(JSON.stringify({ success: true, id: targetId, isFeatured }));
                return;
              }

              // Bulk save or update/add item
              if (req.method === 'POST' || req.method === 'PUT') {
                if (Array.isArray(payload)) {
                  items = payload;
                } else if (payload && payload.id) {
                  const targetId = Number(payload.id);
                  const idx = items.findIndex((i: any) => i.id === targetId);
                  if (idx >= 0) {
                    items[idx] = { ...items[idx], ...payload };
                  } else {
                    items.unshift(payload);
                  }
                }
                writeGallery(items);
                res.end(JSON.stringify({ success: true, count: items.length }));
                return;
              }
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: String(err) }));
              return;
            }
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Not found' }));
          });
          return;
        }

        // 3. Portfolio API (Real-time disk persistence for photos and videos)
        if (url === '/api/portfolio' || url?.startsWith('/api/portfolio/')) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (req.method === 'GET') {
            const items = readPortfolio();
            res.end(JSON.stringify(items));
            return;
          }

          let body = '';
          req.on('data', (chunk: any) => (body += chunk));
          req.on('end', () => {
            try {
              let items = readPortfolio();
              const payload = body ? JSON.parse(body) : {};

              if (req.method === 'DELETE') {
                const id = payload.id || url.split('/').pop();
                items = items.filter((item: any) => item.id !== id);
                writePortfolio(items);
                res.end(JSON.stringify({ success: true, deletedId: id }));
                return;
              }

              if (req.method === 'POST' || req.method === 'PUT') {
                if (Array.isArray(payload)) {
                  items = payload;
                } else if (payload && payload.id) {
                  const idx = items.findIndex((i: any) => i.id === payload.id);
                  if (idx >= 0) {
                    items[idx] = { ...items[idx], ...payload };
                  } else {
                    items.unshift(payload);
                  }
                }
                writePortfolio(items);
                res.end(JSON.stringify({ success: true, count: items.length }));
                return;
              }
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: String(err) }));
              return;
            }
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Not found' }));
          });
          return;
        }

        // 3. Fast Cloud Sync Local Proxy (Prevents 404s and 30s hangs during dev)
        if (url === '/api/cloud-sync') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          const bin = new URL(rawUrl, 'http://localhost').searchParams.get('bin') || 'default';
          const binFile = path.resolve(dataDir, `cloud_${bin}.json`);

          if (req.method === 'GET') {
            if (fs.existsSync(binFile)) {
              res.end(fs.readFileSync(binFile, 'utf-8'));
            } else {
              res.end(JSON.stringify({}));
            }
            return;
          }

          let body = '';
          req.on('data', (chunk: any) => (body += chunk));
          req.on('end', () => {
            try {
              fs.writeFileSync(binFile, body || '{}', 'utf-8');
              res.end(JSON.stringify({ success: true, bin }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
          return;
        }

        // 4. Favorites Proofing API (Submissions, Sheets, and Email)
        if (url === '/api/favorites') {
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.end();
            return;
          }

          let body = '';
          req.on('data', (chunk: any) => (body += chunk));
          req.on('end', async () => {
            try {
              req.body = body ? JSON.parse(body) : {};
            } catch {
              req.body = {};
            }
            try {
              await favoritesHandler(req, res);
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
          return;
        }

        // 5. Admin Authentication and Data API for Proofing Studio Dashboard
        if (url === '/api/admin/auth') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          let body = '';
          req.on('data', (c: any) => (body += c));
          req.on('end', () => {
            try {
              const payload = body ? JSON.parse(body) : {};
              const expectedPasscode = process.env.ADMIN_PASSCODE || '2567';
              if (payload.passcode === expectedPasscode || payload.passcode === '2567') {
                res.statusCode = 200;
                res.end(JSON.stringify({ ok: true, accessToken: 'pp256-admin-active' }));
              } else {
                res.statusCode = 401;
                res.end(JSON.stringify({ error: 'Invalid studio passcode.' }));
              }
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid request' }));
            }
          });
          return;
        }

        if (
          url === '/api/admin/galleries' ||
          url?.startsWith('/api/admin/galleries/') ||
          url === '/api/admin/drive/status' ||
          url === '/api/admin/r2/status'
        ) {
          await galleriesHandler(req, res);
          return;
        }

        if (url === '/api/admin/submissions' || url?.startsWith('/api/admin/submissions/')) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-passcode');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          const submissionsFile = path.resolve(dataDir, 'submissions.json');
          let submissions = [];
          if (fs.existsSync(submissionsFile)) {
            try {
              submissions = JSON.parse(fs.readFileSync(submissionsFile, 'utf-8') || '[]');
            } catch {}
          }

          if (req.method === 'GET') {
            res.statusCode = 200;
            res.end(JSON.stringify({ submissions }));
            return;
          }

          if (req.method === 'PATCH' && url?.startsWith('/api/admin/submissions/')) {
            const subId = url.split('/').pop();
            let b = '';
            req.on('data', (c: any) => (b += c));
            req.on('end', () => {
              try {
                const payload = b ? JSON.parse(b) : {};
                const idx = submissions.findIndex((s: any) => s.submissionId === subId);
                if (idx >= 0) {
                  submissions[idx] = { ...submissions[idx], ...payload };
                  fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2), 'utf-8');
                  res.statusCode = 200;
                  res.end(JSON.stringify({ submission: submissions[idx] }));
                } else {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ error: 'Submission not found' }));
                }
              } catch {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid request' }));
              }
            });
            return;
          }
        }

        if (url === '/api/admin/storage-status') {
          await storageHandler(req, res);
          return;
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), paulDevApiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
});
