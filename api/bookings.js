// Vercel Serverless Function: /api/bookings
// Manages permanent cloud bookings storage across all browsers, devices, and sessions.

const https = require('https');

const EXTENDSCLASS_BIN = 'https://extendsclass.com/api/json-storage/bin/daaceac';
const NTFY_URL = 'https://ntfy.sh/paul_photo_bks_sync_v2';

function httpRequest(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 8000,
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
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // 1. GET: Return all bookings
  if (req.method === 'GET') {
    const bookings = await getCloudBookings();
    return res.status(200).json(bookings);
  }

  // Parse Body
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  } else if (!body) {
    body = {};
  }

  // 2. POST: Create or upsert booking
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

    const bookings = await getCloudBookings();
    const existingIdx = bookings.findIndex((b) => b.id === newBooking.id);
    if (existingIdx !== -1) {
      bookings[existingIdx] = { ...bookings[existingIdx], ...newBooking };
    } else {
      bookings.unshift(newBooking);
    }

    await saveCloudBookings(bookings);
    await notifyNtfy('created', newBooking);

    return res.status(200).json({ success: true, booking: newBooking, bookings });
  }

  // 3. PUT: Update status or details
  if (req.method === 'PUT') {
    const bookingId = (req.query && req.query.id) || body.id;
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    const bookings = await getCloudBookings();
    let updatedBooking = null;

    for (let i = 0; i < bookings.length; i++) {
      if (bookings[i].id === bookingId) {
        bookings[i] = { ...bookings[i], ...body };
        if (body.status === 'confirmed' || body.adminApproved) {
          bookings[i].adminApproved = true;
          bookings[i].adminApprovedAt = bookings[i].adminApprovedAt || new Date().toISOString();
        }
        updatedBooking = bookings[i];
        break;
      }
    }

    if (!updatedBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    await saveCloudBookings(bookings);
    await notifyNtfy(updatedBooking.status || 'updated', updatedBooking);

    return res.status(200).json({ success: true, booking: updatedBooking, bookings });
  }

  // 4. DELETE: Remove booking
  if (req.method === 'DELETE') {
    const bookingId = (req.query && req.query.id) || body.id;
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    let bookings = await getCloudBookings();
    bookings = bookings.filter((b) => b.id !== bookingId);

    await saveCloudBookings(bookings);
    await notifyNtfy('deleted', { id: bookingId });

    return res.status(200).json({ success: true, id: bookingId, bookings });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
