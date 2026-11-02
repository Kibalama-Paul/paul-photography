// Vercel Serverless Function: /api/portfolio
// Fast persistence for portfolio images and videos with cache invalidation support

const https = require('https');

const STORAGE_BASE = 'https://extendsclass.com/api/json-storage/bin/dcbbbdf';

let memoryPortfolio = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10000;

function httpRequest(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 3000,
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

async function getPortfolioFromCloud() {
  try {
    const res = await httpRequest(`${STORAGE_BASE}?_t=${Date.now()}`);
    if (res.status === 200 && res.body) {
      const parsed = JSON.parse(res.body);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.items)) return parsed.items;
    }
  } catch (err) {
    console.warn('[API Portfolio] Fetch error:', err.message);
  }
  return [];
}

async function savePortfolioToCloud(items) {
  try {
    const payload = JSON.stringify({ items, updatedAt: new Date().toISOString() });
    await httpRequest(STORAGE_BASE, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);
  } catch (_) {}
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // 1. GET Portfolio Media
  if (req.method === 'GET') {
    const now = Date.now();
    if (memoryPortfolio && (now - lastCacheTime) < CACHE_TTL_MS) {
      return res.status(200).json(memoryPortfolio);
    }
    const items = await getPortfolioFromCloud();
    if (items && items.length > 0) {
      memoryPortfolio = items;
      lastCacheTime = now;
    }
    return res.status(200).json(memoryPortfolio || items || []);
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  } else if (!body) {
    body = {};
  }

  // 2. POST / PUT: Update or save portfolio media
  if (req.method === 'POST' || req.method === 'PUT') {
    if (Array.isArray(body)) {
      memoryPortfolio = body;
    } else if (body && body.id) {
      if (!memoryPortfolio) memoryPortfolio = [];
      const idx = memoryPortfolio.findIndex((i) => i.id === body.id);
      if (idx >= 0) {
        memoryPortfolio[idx] = { ...memoryPortfolio[idx], ...body };
      } else {
        memoryPortfolio.unshift(body);
      }
    }
    lastCacheTime = Date.now();

    // Async cloud backup
    setImmediate(async () => {
      await savePortfolioToCloud(memoryPortfolio || []);
    });

    return res.status(200).json({ success: true, count: (memoryPortfolio || []).length });
  }

  // 3. DELETE
  if (req.method === 'DELETE') {
    const id = body.id || (req.query && req.query.id);
    if (id && memoryPortfolio) {
      memoryPortfolio = memoryPortfolio.filter((i) => i.id !== id);
      lastCacheTime = Date.now();
      setImmediate(async () => {
        await savePortfolioToCloud(memoryPortfolio || []);
      });
    }
    return res.status(200).json({ success: true, deletedId: id });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
