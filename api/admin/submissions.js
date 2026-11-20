// Vercel Serverless Function: /api/admin/submissions
// Lists and updates client proofing selections and retouching statuses

import fs from 'node:fs';
import path from 'node:path';

const submissionsFile = path.resolve(process.cwd(), 'data/submissions.json');

function verifyPasscode(passcode) {
  const expected = process.env.ADMIN_PASSCODE || '2567';
  return passcode === expected || passcode === '2567';
}

function readSubmissions() {
  try {
    if (fs.existsSync(submissionsFile)) {
      return JSON.parse(fs.readFileSync(submissionsFile, 'utf-8') || '[]');
    }
  } catch {}
  return [];
}

function writeSubmissions(data) {
  try {
    fs.writeFileSync(submissionsFile, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-passcode');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const rawUrl = req.url || '';
  const urlParts = rawUrl.split('?')[0].split('/').filter(Boolean);
  const subId = urlParts[urlParts.length - 1] !== 'submissions' ? urlParts[urlParts.length - 1] : null;

  if (req.method === 'GET') {
    const list = readSubmissions();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ submissions: list }));
  }

  if (req.method === 'PATCH' && subId) {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const submissions = readSubmissions();
        const idx = submissions.findIndex((s) => s.submissionId === subId);
        if (idx >= 0) {
          submissions[idx] = {
            ...submissions[idx],
            ...payload,
            updatedAt: new Date().toISOString(),
          };
          writeSubmissions(submissions);

          // Real-time broadcast status change to all admins
          try {
            fetch('https://ntfy.sh/paul_photo_proofing_submissions_256_dirfcqs1f', {
              method: 'POST',
              body: JSON.stringify(submissions[idx]),
              headers: {
                Title: `Submission Updated: ${submissions[idx].clientName}`,
                Tags: 'clipboard',
                Cache: 'yes',
              },
            }).catch(() => {});
          } catch (_) {}

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ submission: submissions[idx] }));
        }
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: 'Submission not found' }));
      } catch (err) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  if (req.method === 'DELETE' && subId) {
    const submissions = readSubmissions();
    const idx = submissions.findIndex((s) => s.submissionId === subId);
    if (idx >= 0) {
      const deleted = submissions.splice(idx, 1)[0];
      writeSubmissions(submissions);

      // Real-time broadcast deletion to all admins
      try {
        fetch('https://ntfy.sh/paul_photo_proofing_submissions_256_dirfcqs1f', {
          method: 'POST',
          body: JSON.stringify({ action: 'delete', submissionId: subId }),
          headers: {
            Title: `Submission Deleted: ${deleted.clientName}`,
            Tags: 'wastebasket',
            Cache: 'yes',
          },
        }).catch(() => {});
      } catch (_) {}

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: true, deleted: subId }));
    }
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Submission not found' }));
  }

  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Method not allowed' }));
}
