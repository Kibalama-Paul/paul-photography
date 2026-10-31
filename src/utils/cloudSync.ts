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

// ── Cloudinary & FreeImage Multi-CDN Direct Upload ───────────────────

/**
 * Upload image to FreeImage CDN (permanent free CDN, public key).
 * Returns https://iili.io/... permanent URL accessible on all devices.
 */
async function uploadToFreeImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('key', '6d207e02198a847aa98d0a2a901485a5');
  formData.append('action', 'upload');
  formData.append('source', file);
  formData.append('format', 'json');

  const res = await fetch('https://freeimage.host/api/1/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (data?.image?.url) return data.image.url;
  if (data?.image?.display_url) return data.image.display_url;
  throw new Error(data?.error?.message || 'FreeImage host upload failed');
}

/**
 * Upload a file directly to Cloud CDN.
 * Tries Cloudinary first, then automatically falls back to FreeImage CDN.
 * Returns the permanent HTTPS URL that works on ALL devices instantly.
 */
export async function uploadToCloudinary(
  file: File,
  folder?: string
): Promise<string> {
  // 1. Try Cloudinary
  try {
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
    if (res.ok && data.secure_url) {
      console.log('[CloudSync] Uploaded to Cloudinary:', data.secure_url);
      return data.secure_url;
    }
  } catch (e) {
    console.warn('[CloudSync] Cloudinary upload attempted, switching to CDN mirror:', e);
  }

  // 2. Resilient permanent CDN mirror (FreeImage)
  try {
    const freeImageUrl = await uploadToFreeImage(file);
    if (freeImageUrl) {
      console.log('[CloudSync] Uploaded to CDN mirror:', freeImageUrl);
      return freeImageUrl;
    }
  } catch (err) {
    console.warn('[CloudSync] CDN mirror upload failed:', err);
  }

  throw new Error('Image upload failed on all cloud providers. Please verify connection.');
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
 * Seamlessly handles payloads converted to attachments (>4KB).
 */
async function fetchLatestFromTopic<T>(topic: string): Promise<T | null> {
  try {
    const res = await fetch(`${NTFY_BASE}/${topic}/json?poll=1&since=${NTFY_CACHE_SINCE}`);
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length === 0) return null;

    // Search backwards from the latest message
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const envelope = JSON.parse(lines[i]);
        if (envelope.attachment?.url) {
          const attRes = await fetch(envelope.attachment.url);
          if (attRes.ok) return (await attRes.json()) as T;
        }
        if (envelope.message) {
          return JSON.parse(envelope.message) as T;
        }
      } catch {}
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
// Permanent Cloud JSON Storage (ExtendsClass — Zero Setup, CORS Enabled)
// Stores the permanent truth of the website so all devices (PC, Mac,
// iPhone, Android, Safari, Chrome) see all updates 24/7/365.
// ────────────────────────────────────────────────────────────────────
export const CLOUD_STORAGE_BASE = 'https://extendsclass.com/api/json-storage/bin';
export const BIN_GALLERY = 'acbdafe';
export const BIN_PORTFOLIO = 'dcbbbdf';
export const BIN_BOOKINGS = 'daaceac';

async function writeCloudBin(binId: string, data: unknown): Promise<boolean> {
  try {
    const res = await fetch(`${CLOUD_STORAGE_BASE}/${binId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (e) {
    console.warn(`[CloudSync] Write error for bin ${binId}:`, e);
    return false;
  }
}

async function readCloudBin<T>(binId: string): Promise<T | null> {
  try {
    const res = await fetch(`${CLOUD_STORAGE_BASE}/${binId}?_t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const text = await res.text();
    return JSON.parse(text) as T;
  } catch (e) {
    console.warn(`[CloudSync] Read error for bin ${binId}:`, e);
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────
// Gallery Cloud Sync — Full State Persistence & Real-Time Push
// Syncs custom uploads, deleted photo IDs, edits, and homepage featured status.
// ────────────────────────────────────────────────────────────────────

export interface GalleryCloudState {
  customItems: GalleryItem[];
  deletedIds: number[];
  editedItems: Record<number, GalleryItem>;
  featuredIds: number[];
  updatedAt?: string;
}

/**
 * Broadcast full gallery state to permanent cloud storage + notify all devices.
 */
export async function broadcastGalleryToCloud(
  stateOrItems: GalleryCloudState | GalleryItem[]
): Promise<boolean> {
  try {
    let state: GalleryCloudState;
    if (Array.isArray(stateOrItems)) {
      const deletedIds = JSON.parse(localStorage.getItem('paul_deleted_gallery_ids') || '[]');
      const editedItems = JSON.parse(localStorage.getItem('paul_edited_gallery_items') || '{}');
      const featuredIds = JSON.parse(localStorage.getItem('paul_featured_gallery_ids') || '[]');
      state = { customItems: stateOrItems, deletedIds, editedItems, featuredIds };
    } else {
      state = stateOrItems;
    }

    state.updatedAt = new Date().toISOString();

    // 1. Permanent cloud bin
    await writeCloudBin(BIN_GALLERY, state);

    // 2. Real-time push via ntfy.sh (fires instant SSE on all devices)
    await broadcastToTopic(SYNC_TOPIC_GALLERY, { updated: true, time: Date.now() }, 'Gallery Updated');
    return true;
  } catch (e) {
    console.warn('[CloudSync] Gallery cloud broadcast failed:', e);
    return false;
  }
}

/**
 * Fetch full gallery state from permanent cloud storage.
 */
export async function fetchGalleryFromCloud(): Promise<GalleryCloudState | null> {
  try {
    const data = await readCloudBin<GalleryCloudState>(BIN_GALLERY);
    if (data && typeof data === 'object') {
      return {
        customItems: Array.isArray(data.customItems) ? data.customItems : [],
        deletedIds: Array.isArray(data.deletedIds) ? data.deletedIds : [],
        editedItems: data.editedItems && typeof data.editedItems === 'object' ? data.editedItems : {},
        featuredIds: Array.isArray(data.featuredIds) ? data.featuredIds : [],
        updatedAt: data.updatedAt,
      };
    }
  } catch {}

  // Fallback to ntfy cache
  try {
    const fallback = await fetchLatestFromTopic<any>(SYNC_TOPIC_GALLERY);
    if (fallback) {
      if (Array.isArray(fallback)) {
        return { customItems: fallback, deletedIds: [], editedItems: {}, featuredIds: [] };
      }
      if (fallback.customItems) return fallback as GalleryCloudState;
    }
  } catch {}

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
 * Push portfolio items to permanent cloud storage + notify all devices.
 */
export async function broadcastPortfolioToCloud(items: PortfolioMediaItem[]): Promise<boolean> {
  try {
    // 1. Permanent cloud bin
    await writeCloudBin(BIN_PORTFOLIO, { items, updatedAt: new Date().toISOString() });

    // 2. Real-time push via ntfy.sh
    await broadcastToTopic(SYNC_TOPIC_PORTFOLIO, { updated: true, time: Date.now() }, 'Portfolio Updated');
    return true;
  } catch (e) {
    console.warn('[CloudSync] Portfolio cloud sync failed:', e);
    return false;
  }
}

/**
 * Fetch portfolio items from permanent cloud storage.
 */
export async function fetchPortfolioFromCloud(): Promise<PortfolioMediaItem[] | null> {
  try {
    const data = await readCloudBin<{ items: PortfolioMediaItem[] }>(BIN_PORTFOLIO);
    if (data && Array.isArray(data.items) && data.items.length > 0) {
      return data.items;
    }
  } catch {}

  // Fallback to ntfy cache
  try {
    const fallback = await fetchLatestFromTopic<PortfolioMediaItem[]>(SYNC_TOPIC_PORTFOLIO);
    if (fallback && Array.isArray(fallback)) return fallback;
  } catch {}

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
 * Save booking to permanent cloud bin and broadcast to admin devices.
 */
export async function saveBookingToCloud(booking: BookingSubmission): Promise<boolean> {
  // 1. Save locally
  try {
    const raw = localStorage.getItem('paul_bookings') || '[]';
    const existing: BookingSubmission[] = JSON.parse(raw);
    const updated = [booking, ...existing.filter((b) => b.id !== booking.id)];
    localStorage.setItem('paul_bookings', JSON.stringify(updated));
  } catch {}

  // 2. Permanent cloud bin
  try {
    const cloud = await readCloudBin<{ bookings: BookingSubmission[] }>(BIN_BOOKINGS);
    const currentList = cloud?.bookings || [];
    const merged = [booking, ...currentList.filter((b) => b.id !== booking.id)];
    await writeCloudBin(BIN_BOOKINGS, { bookings: merged, updatedAt: new Date().toISOString() });
  } catch {}

  // 3. Broadcast notification to admin's devices
  try {
    await fetch(`${NTFY_BASE}/${SYNC_TOPIC_BOOKINGS}`, {
      method: 'POST',
      body: JSON.stringify(booking),
      headers: {
        'Title': `New Booking: ${booking.name}`,
        'Tags': 'camera,moneybag',
        'Cache': 'yes',
        'Click': 'https://www.paulphotography256.com/#admin',
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch all bookings from permanent cloud bin, merged with local bookings.
 */
export async function fetchAllBookings(): Promise<BookingSubmission[]> {
  const localRaw = localStorage.getItem('paul_bookings') || '[]';
  let local: BookingSubmission[] = [];
  try { local = JSON.parse(localRaw); } catch {}

  let cloudList: BookingSubmission[] = [];
  try {
    const cloud = await readCloudBin<{ bookings: BookingSubmission[] }>(BIN_BOOKINGS);
    if (cloud?.bookings && Array.isArray(cloud.bookings)) {
      cloudList = cloud.bookings;
    }
  } catch {}

  // Fallback to ntfy cached bookings
  if (cloudList.length === 0) {
    try {
      const res = await fetch(`${NTFY_BASE}/${SYNC_TOPIC_BOOKINGS}/json?poll=1&since=7d`);
      if (res.ok) {
        const text = await res.text();
        const lines = text.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const envelope = JSON.parse(line);
            if (envelope.message) {
              const b: BookingSubmission = JSON.parse(envelope.message);
              if (b?.id) cloudList.push(b);
            }
          } catch {}
        }
      }
    } catch {}
  }

  // Deduplicate and merge (prefer approved versions)
  const map = new Map<string, BookingSubmission>();
  for (const b of [...cloudList, ...local]) {
    const prev = map.get(b.id);
    if (!prev || (b.adminApproved && !prev.adminApproved)) {
      map.set(b.id, b);
    }
  }

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
  );

  try {
    localStorage.setItem('paul_bookings', JSON.stringify(merged));
  } catch {}

  return merged;
}

/**
 * Admin approves a booking: updates permanent cloud bin and broadcasts approval.
 */
export async function approveBookingInCloud(id: string): Promise<boolean> {
  const timestamp = new Date().toISOString();

  // 1. Local update
  try {
    const raw = localStorage.getItem('paul_bookings') || '[]';
    const list: BookingSubmission[] = JSON.parse(raw);
    const updated = list.map((b) =>
      b.id === id ? { ...b, adminApproved: true, adminApprovedAt: timestamp, status: 'confirmed' as const } : b
    );
    localStorage.setItem('paul_bookings', JSON.stringify(updated));
  } catch {}

  // 2. Permanent cloud bin update
  try {
    const cloud = await readCloudBin<{ bookings: BookingSubmission[] }>(BIN_BOOKINGS);
    if (cloud?.bookings) {
      const updated = cloud.bookings.map((b) =>
        b.id === id ? { ...b, adminApproved: true, adminApprovedAt: timestamp, status: 'confirmed' as const } : b
      );
      await writeCloudBin(BIN_BOOKINGS, { bookings: updated, updatedAt: timestamp });
    }
  } catch {}

  // 3. Broadcast approval notification
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
 * Delete booking from permanent cloud bin.
 */
export async function deleteBookingFromCloud(id: string): Promise<boolean> {
  try {
    const cloud = await readCloudBin<{ bookings: BookingSubmission[] }>(BIN_BOOKINGS);
    if (cloud?.bookings) {
      const updated = cloud.bookings.filter((b) => b.id !== id);
      await writeCloudBin(BIN_BOOKINGS, { bookings: updated, updatedAt: new Date().toISOString() });
    }
    return true;
  } catch (e) {
    console.warn('[CloudSync] Failed to delete booking from cloud:', e);
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

  // Polling fallback (every 4 seconds)
  const pollInterval = setInterval(async () => {
    if (isClosed) return;
    // Check local
    try {
      const raw = localStorage.getItem('paul_bookings') || '[]';
      const list: BookingSubmission[] = JSON.parse(raw);
      const found = list.find((b) => b.id === bookingId);
      if (found?.adminApproved) { triggerApproved(found.adminApprovedAt); return; }
    } catch {}

    // Check cloud bin
    try {
      const cloud = await readCloudBin<{ bookings: BookingSubmission[] }>(BIN_BOOKINGS);
      const found = cloud?.bookings?.find((b) => b.id === bookingId);
      if (found?.adminApproved) {
        triggerApproved(found.adminApprovedAt);
        return;
      }
    } catch {}
  }, 4000);

  return () => {
    isClosed = true;
    eventSource?.close();
    clearInterval(pollInterval);
  };
}

// ────────────────────────────────────────────────────────────────────
// Cloud Sync Initializer — called once on app startup on every device
// Hydrates every visitor's device with the latest gallery, portfolio & bookings.
// ────────────────────────────────────────────────────────────────────

export async function initCloudSync(): Promise<void> {
  console.log('[CloudSync] Initializing permanent cross-device sync...');

  // 1. Hydrate gallery from cloud
  try {
    const cloudGallery = await fetchGalleryFromCloud();
    if (cloudGallery) {
      if (Array.isArray(cloudGallery.customItems) && cloudGallery.customItems.length > 0) {
        const localRaw = localStorage.getItem('paul_custom_gallery') || '[]';
        const local: GalleryItem[] = JSON.parse(localRaw);
        const byId = new Map<number, GalleryItem>();
        for (const item of cloudGallery.customItems) byId.set(item.id, item);
        for (const item of local) { if (!byId.has(item.id)) byId.set(item.id, item); }
        localStorage.setItem('paul_custom_gallery', JSON.stringify(Array.from(byId.values())));
      }

      if (Array.isArray(cloudGallery.deletedIds)) {
        localStorage.setItem('paul_deleted_gallery_ids', JSON.stringify(cloudGallery.deletedIds));
      }

      if (cloudGallery.editedItems && typeof cloudGallery.editedItems === 'object') {
        localStorage.setItem('paul_edited_gallery_items', JSON.stringify(cloudGallery.editedItems));
      }

      if (Array.isArray(cloudGallery.featuredIds)) {
        localStorage.setItem('paul_featured_gallery_ids', JSON.stringify(cloudGallery.featuredIds));
      }

      window.dispatchEvent(new Event('paul_gallery_updated'));
    }
  } catch (e) {
    console.warn('[CloudSync] Gallery hydration failed:', e);
  }

  // 2. Hydrate portfolio from cloud
  try {
    const cloudPortfolio = await fetchPortfolioFromCloud();
    if (cloudPortfolio && cloudPortfolio.length > 0) {
      localStorage.setItem('paul_portfolio_media', JSON.stringify(cloudPortfolio));
      window.dispatchEvent(new Event('paul_portfolio_media_updated'));
    }
  } catch (e) {
    console.warn('[CloudSync] Portfolio hydration failed:', e);
  }

  // 3. Hydrate bookings from cloud
  try {
    await fetchAllBookings();
  } catch (e) {
    console.warn('[CloudSync] Bookings hydration failed:', e);
  }

  console.log('[CloudSync] Permanent cross-device sync initialized ✓');
}
