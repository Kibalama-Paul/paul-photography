import { BookingSubmission, GalleryItem, PortfolioMediaItem } from '../types';

// ────────────────────────────────────────────────────────────────────
// Paul Photography — Cross-Device Cloud Sync Engine
// Ensures paulphotography256.com updates on ALL devices (PC + Mobile)
// when admin uploads images or approves bookings.
//
// Architecture:
//   • ntfy.sh     → Real-time push + message cache (cross-device sync)
//   • Cloudinary  → Image/Video CDN hosting (dirfcqs1f)
//
// How it works:
//   1. Admin uploads an image → uploaded to Cloudinary → gallery metadata
//      is broadcast to ntfy.sh topic with cache headers.
//   2. ALL devices (phones, PCs, tablets) subscribe to the same topic
//      via Server-Sent Events (SSE). When a message arrives, they
//      re-fetch and re-render.
//   3. On first page load, each device polls ntfy.sh for cached messages
//      from the last 3 days, ensuring nothing is missed.
// ────────────────────────────────────────────────────────────────────

// ── Cloudinary Config ───────────────────────────────────────────────
export const CLOUDINARY_CLOUD_NAME = 'dirfcqs1f';
export const CLOUDINARY_PRESET_STORAGE_KEY = 'paul_cloudinary_upload_preset';
export const DEFAULT_CLOUDINARY_PRESET = 'paul_preset';

// ── ntfy.sh Real-Time Push Topics ────────────────────────────────────
const NTFY_BASE = 'https://ntfy.sh';
const SYNC_TOPIC_GALLERY = 'paul_photo_gallery_256_dirfcqs1f';
const SYNC_TOPIC_PORTFOLIO = 'paul_photo_portfolio_256_dirfcqs1f';
const SYNC_TOPIC_BOOKINGS = 'paul_photo_bookings_256_dirfcqs1f';
const SYNC_TOPIC_APPROVALS = 'paul_photo_approvals_256_dirfcqs1f';

// Cache duration: ntfy.sh keeps messages for up to 12h by default
const NTFY_CACHE_SINCE = '3d'; // Fetch messages from last 3 days

// ── Helpers ─────────────────────────────────────────────────────────

export const getCloudinaryPreset = (): string =>
  localStorage.getItem(CLOUDINARY_PRESET_STORAGE_KEY) || DEFAULT_CLOUDINARY_PRESET;

export const setCloudinaryPreset = (preset: string): void =>
  localStorage.setItem(CLOUDINARY_PRESET_STORAGE_KEY, preset.trim());

// ── Cloudinary Direct Upload ────────────────────────────────────────

/**
 * Upload a file directly to Cloudinary CDN.
 * Returns the permanent secure_url that works on all devices.
 */
export async function uploadToCloudinary(
  file: File,
  folder?: string
): Promise<string> {
  const preset = getCloudinaryPreset();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);
  if (folder) formData.append('folder', `paul-photography/${folder}`);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    { method: 'POST', body: formData }
  );

  const data = await res.json();
  if (res.ok && data.secure_url) return data.secure_url;
  throw new Error(data.error?.message || 'Cloudinary upload failed');
}

// ────────────────────────────────────────────────────────────────────
// ntfy.sh — Persistent Message Broadcast + Real-Time Push
// Messages are cached by ntfy.sh and can be fetched by any device.
// ────────────────────────────────────────────────────────────────────

/**
 * Broadcast data to a topic. All subscribed devices receive it instantly.
 * The message is also cached so new visitors can fetch it on page load.
 */
async function broadcastToTopic(topic: string, data: unknown, title: string): Promise<void> {
  await fetch(`${NTFY_BASE}/${topic}`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Title': title,
      'Tags': 'camera_flash',
      'Cache': 'yes',
    },
  });
}

/**
 * Fetch the latest cached message from a topic.
 * Returns the parsed data from the most recent message, or null.
 */
async function fetchLatestFromTopic<T>(topic: string): Promise<T | null> {
  try {
    const res = await fetch(`${NTFY_BASE}/${topic}/json?poll=1&since=${NTFY_CACHE_SINCE}`);
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length === 0) return null;

    // Get the LATEST message (last line)
    const lastLine = lines[lines.length - 1];
    const envelope = JSON.parse(lastLine);
    if (envelope.message) {
      return JSON.parse(envelope.message) as T;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Subscribe to real-time updates via Server-Sent Events (SSE).
 * Works on both mobile Safari, Chrome, and desktop browsers.
 * When admin pushes an update, the callback fires instantly on all devices.
 */
export function subscribeToUpdates(
  topic: string,
  onUpdate: () => void
): () => void {
  let eventSource: EventSource | null = null;
  let isClosed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (isClosed) return;
    try {
      eventSource = new EventSource(`${NTFY_BASE}/${topic}/sse`);
      eventSource.onmessage = () => {
        if (!isClosed) onUpdate();
      };
      eventSource.onerror = () => {
        // Auto-reconnect after 5s on connection drop
        if (!isClosed) {
          eventSource?.close();
          reconnectTimer = setTimeout(connect, 5000);
        }
      };
    } catch {
      // Fallback: poll every 10 seconds
      const interval = setInterval(() => {
        if (!isClosed) onUpdate();
      }, 10000);
      return () => { isClosed = true; clearInterval(interval); };
    }
  };

  connect();

  return () => {
    isClosed = true;
    eventSource?.close();
    if (reconnectTimer) clearTimeout(reconnectTimer);
  };
}

// ────────────────────────────────────────────────────────────────────
// Gallery Cloud Sync — Cross-Device
// ────────────────────────────────────────────────────────────────────

/**
 * Push gallery items to cloud + notify all devices instantly.
 * Called after admin adds/edits/deletes a gallery item.
 */
export async function broadcastGalleryToCloud(items: GalleryItem[]): Promise<boolean> {
  try {
    await broadcastToTopic(SYNC_TOPIC_GALLERY, items, 'Gallery Updated');
    return true;
  } catch (e) {
    console.warn('Gallery cloud sync failed:', e);
    return false;
  }
}

/**
 * Fetch gallery items from cloud cache.
 * Called on every device when app loads or SSE notification fires.
 */
export async function fetchGalleryFromCloud(): Promise<GalleryItem[] | null> {
  const items = await fetchLatestFromTopic<GalleryItem[]>(SYNC_TOPIC_GALLERY);
  if (items && Array.isArray(items)) return items;
  return null;
}

/**
 * Subscribe to real-time gallery updates across all devices.
 */
export function subscribeToGalleryUpdates(onUpdate: () => void): () => void {
  return subscribeToUpdates(SYNC_TOPIC_GALLERY, onUpdate);
}

// ────────────────────────────────────────────────────────────────────
// Portfolio Media Cloud Sync — Cross-Device
// ────────────────────────────────────────────────────────────────────

/**
 * Push portfolio items to cloud + notify all devices.
 */
export async function broadcastPortfolioToCloud(items: PortfolioMediaItem[]): Promise<boolean> {
  try {
    await broadcastToTopic(SYNC_TOPIC_PORTFOLIO, items, 'Portfolio Updated');
    return true;
  } catch (e) {
    console.warn('Portfolio cloud sync failed:', e);
    return false;
  }
}

/**
 * Fetch portfolio items from cloud cache.
 */
export async function fetchPortfolioFromCloud(): Promise<PortfolioMediaItem[] | null> {
  const items = await fetchLatestFromTopic<PortfolioMediaItem[]>(SYNC_TOPIC_PORTFOLIO);
  if (items && Array.isArray(items)) return items;
  return null;
}

/**
 * Subscribe to real-time portfolio updates across all devices.
 */
export function subscribeToPortfolioUpdates(onUpdate: () => void): () => void {
  return subscribeToUpdates(SYNC_TOPIC_PORTFOLIO, onUpdate);
}

// ────────────────────────────────────────────────────────────────────
// Bookings Cloud Sync & Live Approval — Cross-Device
// ────────────────────────────────────────────────────────────────────

/**
 * Save booking and broadcast to admin's devices.
 */
export async function saveBookingToCloud(booking: BookingSubmission): Promise<boolean> {
  // 1. Save locally
  try {
    const raw = localStorage.getItem('paul_bookings') || '[]';
    const existing: BookingSubmission[] = JSON.parse(raw);
    const updated = [booking, ...existing.filter((b) => b.id !== booking.id)];
    localStorage.setItem('paul_bookings', JSON.stringify(updated));
  } catch {}

  // 2. Broadcast to cloud
  try {
    await fetch(`${NTFY_BASE}/${SYNC_TOPIC_BOOKINGS}`, {
      method: 'POST',
      body: JSON.stringify(booking),
      headers: {
        'Title': `New Booking: ${booking.name}`,
        'Tags': 'camera,moneybag',
        'Cache': 'yes',
        'Click': 'https://www.paulphotography256.com/admin',
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch all bookings from cloud, merged with local bookings.
 */
export async function fetchAllBookings(): Promise<BookingSubmission[]> {
  const localRaw = localStorage.getItem('paul_bookings') || '[]';
  let local: BookingSubmission[] = [];
  try { local = JSON.parse(localRaw); } catch {}

  // Fetch bookings from cloud
  const cloudBookings: BookingSubmission[] = [];
  try {
    const res = await fetch(`${NTFY_BASE}/${SYNC_TOPIC_BOOKINGS}/json?poll=1&since=${NTFY_CACHE_SINCE}`);
    if (res.ok) {
      const text = await res.text();
      const lines = text.trim().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const envelope = JSON.parse(line);
          if (envelope.message) {
            const b: BookingSubmission = JSON.parse(envelope.message);
            if (b?.id) cloudBookings.push(b);
          }
        } catch {}
      }
    }
  } catch {}

  // Fetch approval statuses
  const approvals = new Map<string, string>();
  try {
    const appRes = await fetch(`${NTFY_BASE}/${SYNC_TOPIC_APPROVALS}/json?poll=1&since=${NTFY_CACHE_SINCE}`);
    if (appRes.ok) {
      const appText = await appRes.text();
      const appLines = appText.trim().split('\n').filter(Boolean);
      for (const line of appLines) {
        try {
          const envelope = JSON.parse(line);
          if (envelope.message) {
            const approval = JSON.parse(envelope.message);
            if (approval?.id && approval.adminApproved) {
              approvals.set(approval.id, approval.adminApprovedAt || new Date().toISOString());
            }
          }
        } catch {}
      }
    }
  } catch {}

  // Merge: deduplicate by id, prefer approved version
  const byId = new Map<string, BookingSubmission>();
  for (const b of [...cloudBookings, ...local]) {
    const existing = byId.get(b.id);
    if (!existing || (b.adminApproved && !existing.adminApproved)) {
      byId.set(b.id, b);
    }
  }

  // Apply approvals
  const merged = Array.from(byId.values()).map((b) => {
    const approvedAt = approvals.get(b.id);
    if (approvedAt) {
      return { ...b, adminApproved: true, adminApprovedAt: approvedAt, status: 'confirmed' as const };
    }
    return b;
  });

  // Save merged back locally
  try { localStorage.setItem('paul_bookings', JSON.stringify(merged)); } catch {}
  return merged;
}

/**
 * Admin approves a booking: broadcasts approval to all devices.
 */
export async function approveBookingInCloud(id: string): Promise<boolean> {
  const timestamp = new Date().toISOString();

  // Update local
  try {
    const raw = localStorage.getItem('paul_bookings') || '[]';
    const list: BookingSubmission[] = JSON.parse(raw);
    const updated = list.map((b) =>
      b.id === id ? { ...b, adminApproved: true, adminApprovedAt: timestamp, status: 'confirmed' as const } : b
    );
    localStorage.setItem('paul_bookings', JSON.stringify(updated));
  } catch {}

  // Broadcast approval to cloud
  try {
    await fetch(`${NTFY_BASE}/${SYNC_TOPIC_APPROVALS}`, {
      method: 'POST',
      body: JSON.stringify({ id, adminApproved: true, adminApprovedAt: timestamp }),
      headers: { 'Title': 'Booking Approved', 'Tags': 'white_check_mark', 'Cache': 'yes' },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Client-side subscription to booking approval.
 * Uses SSE + polling to detect when admin approves.
 */
export function subscribeToBookingApproval(
  bookingId: string,
  onApproved: (booking: BookingSubmission) => void
): () => void {
  let isClosed = false;

  const triggerApproved = (approvedAt?: string) => {
    if (isClosed) return;
    try {
      const raw = localStorage.getItem('paul_bookings') || '[]';
      const list: BookingSubmission[] = JSON.parse(raw);
      const found = list.find((b) => b.id === bookingId);
      if (found) {
        onApproved({ ...found, adminApproved: true, adminApprovedAt: approvedAt || new Date().toISOString() });
      } else {
        onApproved({
          id: bookingId, name: '', shootType: '', datetime: '',
          status: 'confirmed', adminApproved: true,
          adminApprovedAt: approvedAt || new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
      }
    } catch {}
  };

  // SSE real-time listener
  let eventSource: EventSource | null = null;
  try {
    eventSource = new EventSource(`${NTFY_BASE}/${SYNC_TOPIC_APPROVALS}/sse`);
    eventSource.onmessage = (event) => {
      try {
        const envelope = JSON.parse(event.data);
        if (envelope.message) {
          const data = JSON.parse(envelope.message);
          if (data?.id === bookingId && data.adminApproved) {
            triggerApproved(data.adminApprovedAt);
          }
        }
      } catch {}
    };
  } catch {}

  // Polling fallback (every 5 seconds)
  const pollInterval = setInterval(async () => {
    if (isClosed) return;
    // Check local first
    try {
      const raw = localStorage.getItem('paul_bookings') || '[]';
      const list: BookingSubmission[] = JSON.parse(raw);
      const found = list.find((b) => b.id === bookingId);
      if (found?.adminApproved) { triggerApproved(found.adminApprovedAt); return; }
    } catch {}

    // Check cloud
    try {
      const res = await fetch(`${NTFY_BASE}/${SYNC_TOPIC_APPROVALS}/json?poll=1&since=1h`);
      if (res.ok) {
        const text = await res.text();
        const lines = text.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const env = JSON.parse(line);
            if (env.message) {
              const data = JSON.parse(env.message);
              if (data?.id === bookingId && data.adminApproved) {
                triggerApproved(data.adminApprovedAt);
                return;
              }
            }
          } catch {}
        }
      }
    } catch {}
  }, 5000);

  return () => {
    isClosed = true;
    eventSource?.close();
    clearInterval(pollInterval);
  };
}

// ────────────────────────────────────────────────────────────────────
// Cloud Sync Initializer — called once on app startup
// Hydrates every visitor's device with latest data from the cloud.
// ────────────────────────────────────────────────────────────────────

export async function initCloudSync(): Promise<void> {
  console.log('[CloudSync] Initializing cross-device sync...');

  // Hydrate gallery from cloud
  try {
    const cloudGallery = await fetchGalleryFromCloud();
    if (cloudGallery && cloudGallery.length > 0) {
      const localRaw = localStorage.getItem('paul_custom_gallery') || '[]';
      const local: GalleryItem[] = JSON.parse(localRaw);

      // Merge: cloud is truth, but keep local-only items too
      const byId = new Map<number, GalleryItem>();
      for (const item of cloudGallery) byId.set(item.id, item);
      for (const item of local) { if (!byId.has(item.id)) byId.set(item.id, item); }

      localStorage.setItem('paul_custom_gallery', JSON.stringify(Array.from(byId.values())));
      window.dispatchEvent(new Event('paul_gallery_updated'));
    }
  } catch (e) {
    console.warn('[CloudSync] Gallery hydration failed:', e);
  }

  // Hydrate portfolio from cloud
  try {
    const cloudPortfolio = await fetchPortfolioFromCloud();
    if (cloudPortfolio && cloudPortfolio.length > 0) {
      localStorage.setItem('paul_portfolio_media', JSON.stringify(cloudPortfolio));
      window.dispatchEvent(new Event('paul_portfolio_media_updated'));
    }
  } catch (e) {
    console.warn('[CloudSync] Portfolio hydration failed:', e);
  }

  console.log('[CloudSync] Cross-device sync initialized ✓');
}
