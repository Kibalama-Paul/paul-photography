import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

function bookingsApiPlugin() {
  const bookingsFile = path.resolve(__dirname, 'data/bookings.json');
  if (!fs.existsSync(path.dirname(bookingsFile))) {
    fs.mkdirSync(path.dirname(bookingsFile), { recursive: true });
  }
  if (!fs.existsSync(bookingsFile)) {
    fs.writeFileSync(bookingsFile, '[]');
  }

  return {
    name: 'bookings-api-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0];
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
              let bookings = JSON.parse(fs.readFileSync(bookingsFile, 'utf-8') || '[]');
              const payload = body ? JSON.parse(body) : {};

              if (url === '/api/bookings/approve' || url?.startsWith('/api/bookings/approve/')) {
                const id = payload.id || url.split('/').pop();
                const now = new Date().toISOString();
                bookings = bookings.map((b: any) =>
                  b.id === id ? { ...b, adminApproved: true, adminApprovedAt: now, status: 'confirmed' } : b
                );
                fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2));
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
                fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2));
                res.end(JSON.stringify({ success: true, booking: payload, bookings }));
                return;
              }

              if (req.method === 'DELETE') {
                const id = payload.id || url.split('/').pop();
                bookings = bookings.filter((b: any) => b.id !== id);
                fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2));
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
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), bookingsApiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
});
