// Vercel Serverless Function: /api/cloud-sync
// Proxies cloud bin reads and writes (ExtendsClass) server-to-server without browser CORS restrictions.

const https = require('https');

const STORAGE_BASE = 'https://extendsclass.com/api/json-storage/bin';

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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const binId = req.query && req.query.bin;
  if (!binId) {
    return res.status(400).json({ error: 'Missing bin parameter' });
  }

  // GET: Fetch bin data
  if (req.method === 'GET') {
    try {
      const response = await httpRequest(`${STORAGE_BASE}/${binId}?_t=${Date.now()}`);
      if (response.status === 200 && response.body) {
        try {
          const json = JSON.parse(response.body);
          return res.status(200).json(json);
        } catch (_) {
          return res.status(200).send(response.body);
        }
      }
      return res.status(response.status).json({ error: 'Failed to fetch bin' });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  }

  // POST or PUT: Write bin data
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      let payload = req.body;
      if (typeof payload !== 'string') {
        payload = JSON.stringify(payload);
      }
      const response = await httpRequest(`${STORAGE_BASE}/${binId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      }, payload);

      if (response.status === 200) {
        return res.status(200).json({ success: true, bin: binId });
      }
      return res.status(response.status).json({ error: 'Failed to update bin', details: response.body });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
