// Vercel Serverless Function: /api/favorites
// Handles client photo proofing selections, Google Sheets logging, and photographer email alerts.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Load .env.local and .env fallback for local/serverless execution
export function loadLocalEnv() {
  const rootDir = process.cwd();
  const envFiles = ['.env.local', '.env'];
  for (const envFile of envFiles) {
    const fullPath = path.resolve(rootDir, envFile);
    if (fs.existsSync(fullPath)) {
      try {
        const lines = fs.readFileSync(fullPath, 'utf-8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eq = trimmed.indexOf('=');
          if (eq > 0) {
            const key = trimmed.slice(0, eq).trim();
            let val = trimmed.slice(eq + 1).trim();
            if (
              (val.startsWith('"') && val.endsWith('"')) ||
              (val.startsWith("'") && val.endsWith("'"))
            ) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      } catch (_) {}
    }
  }
}
loadLocalEnv();

function base64UrlEncode(input) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function getGoogleServiceAccountToken(scopes) {
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

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

export async function logToGoogleSheets(submissionId, payload, timestamp) {
  // Option 1: Google Apps Script Webhook
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

  // Option 2: Direct Google Sheets v4 REST API via Service Account
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
  const filenamesList = (payload.selectedPhotos || []).map((p) => p.filename).join(', ');
  const photoNotesSummary = (payload.selectedPhotos || [])
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

export async function sendPhotographerEmail(submissionId, payload, timestamp) {
  const photographerEmail =
    process.env.PHOTOGRAPHER_EMAIL || 'paulphotography256@gmail.com';
  const fromAddress =
    process.env.EMAIL_FROM || 'Paul Photography 256 Proofing <proofing@paulphotography256.com>';

  if (!photographerEmail) return false;

  const subject = `[Favorites Selected] ${payload.clientName} — ${payload.sessionName} (${payload.selectedPhotos.length} photos)`;

  const rowsHtml = (payload.selectedPhotos || [])
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

  // Option A: Resend API
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

  // Option B: Nodemailer SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const { default: nodemailer } = await import('nodemailer');
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

export function saveLocalSubmission(record) {
  try {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const submissionsFile = path.resolve(dataDir, 'submissions.json');
    let existing = [];
    if (fs.existsSync(submissionsFile)) {
      try {
        existing = JSON.parse(fs.readFileSync(submissionsFile, 'utf-8') || '[]');
      } catch (_) {
        existing = [];
      }
    }
    existing.unshift(record);
    fs.writeFileSync(submissionsFile, JSON.stringify(existing, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[/api/favorites] Local submission save failed:', err);
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') {
      return res.status(204).end();
    }
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    if (typeof res.status === 'function') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (_) {
        body = {};
      }
    }
    body = body || {};

    if (
      !body.clientName?.trim() ||
      !body.clientEmail?.trim() ||
      !body.sessionId?.trim() ||
      !Array.isArray(body.selectedPhotos) ||
      body.selectedPhotos.length === 0
    ) {
      const errPayload = {
        error: 'Client name, client email, sessionId, and at least one selected photo are required.',
      };
      if (typeof res.status === 'function') {
        return res.status(400).json(errPayload);
      }
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(errPayload));
    }

    const submissionId = `FAV-${Date.now().toString(36).toUpperCase()}-${crypto
      .randomBytes(2)
      .toString('hex')
      .toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const cleanPayload = {
      sessionId: body.sessionId.trim(),
      sessionName: (body.sessionName || body.sessionId).trim(),
      clientName: body.clientName.trim(),
      clientEmail: body.clientEmail.trim(),
      sessionNotes: body.sessionNotes?.trim() || '',
      selectedPhotos: body.selectedPhotos.map((p) => ({
        id: String(p.id),
        filename: String(p.filename || 'untitled.jpg'),
        title: p.title ? String(p.title) : undefined,
        note: p.note?.trim() || '',
      })),
      submittedAt: timestamp,
    };

    const [sheetsResult, emailResult] = await Promise.allSettled([
      logToGoogleSheets(submissionId, cleanPayload, timestamp),
      sendPhotographerEmail(submissionId, cleanPayload, timestamp),
    ]);

    const loggedToSheets = sheetsResult.status === 'fulfilled' && Boolean(sheetsResult.value);
    const emailSent = emailResult.status === 'fulfilled' && Boolean(emailResult.value);

    if (sheetsResult.status === 'rejected') {
      console.error('[/api/favorites] Google Sheets error:', sheetsResult.reason);
    }
    if (emailResult.status === 'rejected') {
      console.error('[/api/favorites] Email error:', emailResult.reason);
    }

    const fullSubmissionRecord = {
      submissionId,
      timestamp,
      status: 'new',
      loggedToSheets,
      emailSent,
      ...cleanPayload,
    };

    const savedLocally = saveLocalSubmission(fullSubmissionRecord);

    // Broadcast in real time to all connected studio admins on any device or account
    try {
      fetch('https://ntfy.sh/paul_photo_proofing_submissions_256_dirfcqs1f', {
        method: 'POST',
        body: JSON.stringify(fullSubmissionRecord),
        headers: {
          Title: `New Selection: ${cleanPayload.clientName || 'Client'}`,
          Tags: 'camera_flash,heart',
          Priority: 'high',
          Cache: 'yes',
        },
      }).catch(() => {});
    } catch (_) {}

    const deliveries = [];
    if (loggedToSheets) deliveries.push('logged to Google Sheets');
    if (emailSent) deliveries.push('emailed to photographer');
    if (savedLocally && !loggedToSheets && !emailSent) {
      deliveries.push('saved to local studio database');
    }

    const message =
      deliveries.length > 0
        ? `Your ${cleanPayload.selectedPhotos.length} favorite frame selections have been confirmed and ${deliveries.join(' and ')}.`
        : `Your ${cleanPayload.selectedPhotos.length} favorite selections have been received.`;

    const responsePayload = {
      ok: true,
      submissionId,
      timestamp,
      loggedToSheets,
      emailSent,
      savedLocally,
      message,
    };

    if (typeof res.status === 'function') {
      return res.status(200).json(responsePayload);
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(responsePayload));
  } catch (err) {
    console.error('[/api/favorites] Internal error:', err);
    const errPayload = { error: err instanceof Error ? err.message : 'Internal server error' };
    if (typeof res.status === 'function') {
      return res.status(500).json(errPayload);
    }
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(errPayload));
  }
}
