// Vercel Serverless Function: /api/bookings
// Manages high-performance asynchronous cloud bookings storage across all browsers, devices, and sessions.

const https = require('https');

const EXTENDSCLASS_BIN = 'https://extendsclass.com/api/json-storage/bin/daaceac';
const NTFY_URL = 'https://ntfy.sh/paul_photo_bks_sync_v2';

// In-memory cache & index to prevent external API locking & delays
let memoryBookings = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10000; // 10s TTL cache

function httpRequest(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 2500,
    };

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function getCloudBookings() {
  try {
    const res = await httpRequest(`${EXTENDSCLASS_BIN}?_t=${Date.now()}`);
    if (res.status === 200 && res.body) {
      const parsed = JSON.parse(res.body);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.bookings)) return parsed.bookings;
    }
  } catch (err) {
    console.warn('[API Bookings] Cloud fetch error:', err.message);
  }
  return [];
}

async function getCachedBookings() {
  const now = Date.now();
  if (memoryBookings && (now - lastCacheTime) < CACHE_TTL_MS) {
    return memoryBookings;
  }
  const cloud = await getCloudBookings();
  if (cloud && cloud.length > 0) {
    memoryBookings = cloud;
    lastCacheTime = now;
    return memoryBookings;
  }
  return memoryBookings || [];
}

async function saveCloudBookings(bookings) {
  try {
    const payload = JSON.stringify({ bookings, updatedAt: new Date().toISOString() });
    const res = await httpRequest(EXTENDSCLASS_BIN, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);
    return res.status === 200;
  } catch (err) {
    console.warn('[API Bookings] Cloud write error:', err.message);
    return false;
  }
}

async function notifyNtfy(event, booking) {
  try {
    const payload = JSON.stringify({ event, booking, timestamp: Date.now() });
    await httpRequest(NTFY_URL, {
      method: 'POST',
      headers: {
        'Title': `Paul Photography Booking: ${event.toUpperCase()}`,
        'Content-Type': 'application/json',
        'Priority': 'urgent',
      },
    }, payload);
  } catch (_) {}
}

module.exports = async (req, res) => {
  // CORS & No-Cache Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // 1. GET: Return bookings (fast cached response)
  if (req.method === 'GET') {
    const bookings = await getCachedBookings();
    return res.status(200).json(bookings);
  }

  // Parse Body
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  } else if (!body) {
    body = {};
  }

  // 2. POST: Create order with immediate 202 Accepted & asynchronous background write
  if (req.method === 'POST') {
    const newBooking = body;
    if (!newBooking || !newBooking.name) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    if (!newBooking.id) {
      newBooking.id = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    if (!newBooking.status) {
      newBooking.status = 'pending';
    }
    if (!newBooking.createdAt) {
      newBooking.createdAt = new Date().toISOString();
    }

    // Fast in-memory update with ID deduplication
    if (!memoryBookings) {
      memoryBookings = [];
    }
    const existingIdx = memoryBookings.findIndex((b) => b.id === newBooking.id);
    if (existingIdx !== -1) {
      memoryBookings[existingIdx] = { ...memoryBookings[existingIdx], ...newBooking };
    } else {
      memoryBookings.unshift(newBooking);
    }
    lastCacheTime = Date.now();

    // Asynchronous background persistence & lightweight webhook dispatch (non-blocking)
    setImmediate(async () => {
      try {
        const cloudBookings = await getCloudBookings();
        const idx = cloudBookings.findIndex((b) => b.id === newBooking.id);
        if (idx !== -1) {
          cloudBookings[idx] = { ...cloudBookings[idx], ...newBooking };
        } else {
          cloudBookings.unshift(newBooking);
        }
        await saveCloudBookings(cloudBookings);
        await notifyNtfy('created', newBooking);
      } catch (err) {
        console.warn('[Background Worker] Async booking save failed:', err.message);
      }
    });

    // Immediate 202 Accepted with lean payload
    return res.status(202).json({
      success: true,
      id: newBooking.id,
      status: 'accepted',
      createdAt: newBooking.createdAt,
    });
  }

  // 3. PUT: Update status or details with async persistence
  if (req.method === 'PUT') {
    const bookingId = (req.query && req.query.id) || body.id;
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    if (!memoryBookings) memoryBookings = await getCloudBookings();
    let updatedBooking = null;

    for (let i = 0; i < memoryBookings.length; i++) {
      if (memoryBookings[i].id === bookingId) {
        memoryBookings[i] = { ...memoryBookings[i], ...body };
        if (body.status === 'confirmed' || body.adminApproved) {
          memoryBookings[i].adminApproved = true;
          memoryBookings[i].adminApprovedAt = memoryBookings[i].adminApprovedAt || new Date().toISOString();
        }
        updatedBooking = memoryBookings[i];
        break;
      }
    }

    if (!updatedBooking) {
      updatedBooking = { id: bookingId, ...body };
      memoryBookings.unshift(updatedBooking);
    }
    lastCacheTime = Date.now();

    // Async background sync
    setImmediate(async () => {
      try {
        const cloudBookings = await getCloudBookings();
        const idx = cloudBookings.findIndex((b) => b.id === bookingId);
        if (idx !== -1) {
          cloudBookings[idx] = { ...cloudBookings[idx], ...body };
        } else {
          cloudBookings.unshift(updatedBooking);
        }
        await saveCloudBookings(cloudBookings);
        await notifyNtfy(updatedBooking.status || 'updated', updatedBooking);
      } catch (_) {}
    });

    return res.status(200).json({ success: true, id: bookingId, status: 'updated' });
  }

  // 4. DELETE: Remove booking
  if (req.method === 'DELETE') {
    const bookingId = (req.query && req.query.id) || body.id;
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    if (memoryBookings) {
      memoryBookings = memoryBookings.filter((b) => b.id !== bookingId);
      lastCacheTime = Date.now();
    }

    setImmediate(async () => {
      try {
        let bookings = await getCloudBookings();
        bookings = bookings.filter((b) => b.id !== bookingId);
        await saveCloudBookings(bookings);
        await notifyNtfy('deleted', { id: bookingId });
      } catch (_) {}
    });

    return res.status(200).json({ success: true, id: bookingId, status: 'deleted' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
