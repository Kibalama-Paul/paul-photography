import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

function paulDevApiPlugin() {
  const dataDir = path.resolve(__dirname, 'data');
  const bookingsFile = path.resolve(dataDir, 'bookings.json');
  const galleryFile = path.resolve(__dirname, 'src/data/galleryData.json');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(bookingsFile)) {
    fs.writeFileSync(bookingsFile, '[]');
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
        return JSON.parse(fs.readFileSync(galleryFile, 'utf-8') || '[]');
      }
    } catch {}
    return [];
  };

  const writeGallery = (data: any) => {
    try {
      fs.writeFileSync(galleryFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[Vite API] Could not write gallery file:', e);
    }
  };

  return {
    name: 'paul-dev-api-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
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
                res.end(JSON.stringify({ success: true, id, bookings }));
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
                res.end(JSON.stringify({ success: true, booking: payload, bookings }));
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
                  res.end(JSON.stringify({ success: true, id, bookings }));
                  return;
                }
              }

              if (req.method === 'DELETE') {
                const id = payload.id || url.split('/').pop() || (rawUrl.includes('id=') ? new URL(rawUrl, 'http://localhost').searchParams.get('id') : null);
                bookings = bookings.filter((b: any) => b.id !== id);
                writeBookings(bookings);
                res.end(JSON.stringify({ success: true, id, bookings }));
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

        // 2. Gallery API (Real-time disk persistence for edits, deletes, and featured flip cards)
        if (url === '/api/gallery' || url === '/api/gallery/delete' || url === '/api/gallery/featured') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (req.method === 'GET') {
            const items = readGallery();
            res.end(JSON.stringify(items));
            return;
          }

          let body = '';
          req.on('data', (chunk: any) => (body += chunk));
          req.on('end', () => {
            try {
              let items = readGallery();
              const payload = body ? JSON.parse(body) : {};

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
