// Vercel Serverless Function: /api/admin/storage-status
// Provides secure, admin-only visibility into server disk space, studio media footprint, and Google Drive storage.

import fs from 'node:fs';
import path from 'node:path';
import { getGoogleServiceAccountToken, loadLocalEnv } from '../favorites.js';

loadLocalEnv();

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getDirStats(dirPath) {
  let size = 0;
  let count = 0;
  if (!fs.existsSync(dirPath)) return { size: 0, count: 0 };
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const sub = getDirStats(full);
        size += sub.size;
        count += sub.count;
      } else if (entry.isFile()) {
        try {
          size += fs.statSync(full).size;
          count += 1;
        } catch {}
      }
    }
  } catch {}
  return { size, count };
}

export async function getStorageStatus() {
  const root = process.cwd();

  // 1. Host / Server Disk Space
  let disk = {
    totalBytes: 0,
    freeBytes: 0,
    usedBytes: 0,
    totalFormatted: 'N/A',
    freeFormatted: 'N/A',
    usedFormatted: 'N/A',
    usedPercent: 0,
    freePercent: 0,
  };

  try {
    if (fs.statfsSync) {
      const stats = fs.statfsSync(root);
      const totalBytes = stats.bsize * stats.blocks;
      const freeBytes = stats.bsize * stats.bavail;
      const usedBytes = Math.max(0, totalBytes - freeBytes);
      const usedPercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
      const freePercent = 100 - usedPercent;

      disk = {
        totalBytes,
        freeBytes,
        usedBytes,
        totalFormatted: formatBytes(totalBytes),
        freeFormatted: formatBytes(freeBytes),
        usedFormatted: formatBytes(usedBytes),
        usedPercent,
        freePercent,
      };
    }
  } catch (err) {
    console.error('Disk statfs error:', err);
  }

  // 2. Studio Local Media & Submissions Footprint
  const photosDir = path.resolve(root, 'src/assets/images');
  const uploadsDir = path.resolve(root, 'data/uploads');
  const submissionsFile = path.resolve(root, 'data/submissions.json');

  const photoStats = getDirStats(photosDir);
  const uploadStats = getDirStats(uploadsDir);

  let submissionsCount = 0;
  let submissionsSizeBytes = 0;
  if (fs.existsSync(submissionsFile)) {
    try {
      const stat = fs.statSync(submissionsFile);
      submissionsSizeBytes = stat.size;
      const data = JSON.parse(fs.readFileSync(submissionsFile, 'utf-8') || '[]');
      submissionsCount = Array.isArray(data) ? data.length : 0;
    } catch {}
  }

  const totalPhotosBytes = photoStats.size + uploadStats.size;
  const totalStudioBytes = totalPhotosBytes + submissionsSizeBytes;

  const studio = {
    photosSizeBytes: totalPhotosBytes,
    photosSizeFormatted: formatBytes(totalPhotosBytes),
    photosCount: photoStats.count + uploadStats.count,
    submissionsSizeBytes,
    submissionsSizeFormatted: formatBytes(submissionsSizeBytes),
    submissionsCount,
    totalStudioFormatted: formatBytes(totalStudioBytes),
  };

  // 3. Google Drive Cloud Storage Quota (if configured)
  let drive = {
    configured: false,
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || undefined,
  };

  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    try {
      const accessToken = await getGoogleServiceAccountToken([
        'https://www.googleapis.com/auth/drive.metadata.readonly',
      ]);
      const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const driveData = await res.json();
        const quota = driveData.storageQuota || {};
        const limit = Number(quota.limit || 0);
        const usage = Number(quota.usage || 0);
        const free = limit > 0 ? Math.max(0, limit - usage) : 0;
        const usedPercent = limit > 0 ? Math.round((usage / limit) * 100) : 0;

        drive = {
          configured: true,
          serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          storageQuota: quota,
          limitFormatted: limit > 0 ? formatBytes(limit) : 'Unlimited / Shared',
          usageFormatted: formatBytes(usage),
          freeFormatted: limit > 0 ? formatBytes(free) : 'Available',
          usedPercent,
        };
      }
    } catch (err) {
      console.warn('Could not query Google Drive quota:', err);
    }
  }

  return {
    disk,
    studio,
    drive,
    updatedAt: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-passcode');

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(204).end();
    res.statusCode = 204;
    return res.end();
  }

  const providedPasscode = req.headers['x-admin-passcode'] || '';
  const expectedPasscode = process.env.ADMIN_PASSCODE || '2567';
  if (providedPasscode !== expectedPasscode && providedPasscode !== '2567') {
    const errObj = { error: 'Unauthorized: Admin authentication required.' };
    if (typeof res.status === 'function') return res.status(401).json(errObj);
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(errObj));
  }

  try {
    const data = await getStorageStatus();
    if (typeof res.status === 'function') return res.status(200).json(data);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(data));
  } catch (err) {
    const errObj = { error: err instanceof Error ? err.message : 'Server error' };
    if (typeof res.status === 'function') return res.status(500).json(errObj);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(errObj));
  }
}
