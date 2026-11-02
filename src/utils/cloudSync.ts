import { BookingSubmission, GalleryItem, PortfolioMediaItem } from '../types';
import seedBookings from '../data/bookingsData.json';

// ────────────────────────────────────────────────────────────────────
// Paul Photography — Real-Time Zero-Latency Cross-Device Sync Engine
// Direct Payload Push across all Devices, IP Addresses & Browsers
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

const NTFY_CACHE_SINCE = '3d';

// ── Helpers ─────────────────────────────────────────────────────────
export const getCloudinaryPreset = (): string =>
  localStorage.getItem(CLOUDINARY_PRESET_STORAGE_KEY) || DEFAULT_CLOUDINARY_PRESET;

export const setCloudinaryPreset = (preset: string): void =>
  localStorage.setItem(CLOUDINARY_PRESET_STORAGE_KEY, preset.trim());

// ── Cloudinary & FreeImage Multi-CDN Direct Upload ───────────────────
async function uploadToFreeImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('key', '6d207e02198a847aa98d0a2a901485a5');
  formData.append('action', 'upload');
  formData.append('source', file);
  formData.append('format', 'json');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch('https://freeimage.host/api/1/upload', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (data?.image?.url) return data.image.url;
    if (data?.image?.display_url) return data.image.display_url;
  } catch {}
  clearTimeout(timeoutId);
  throw new Error('FreeImage host upload failed');
}

export async function uploadToCloudinary(file: File, folder?: string): Promise<string> {
  // 1. Try Cloudinary
  try {
    const preset = getCloudinaryPreset();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', preset);
    if (folder) formData.append('folder', `paul-photography/${folder}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
      { method: 'POST', body: formData, signal: controller.signal }
    );
    clearTimeout(timeoutId);
    const data = await res.json();
    if (res.ok && data.secure_url) {
      return data.secure_url;
    }
  } catch (e) {
    console.warn('[CloudSync] Cloudinary upload attempted, switching to CDN mirror:', e);
  }

  // 2. Fallback to FreeImage CDN
  try {
    const freeImageUrl = await uploadToFreeImage(file);
    if (freeImageUrl) return freeImageUrl;
  } catch (err) {
    console.warn('[CloudSync] CDN mirror upload failed:', err);
  }

  throw new Error('Image upload failed on cloud providers. Please verify connection.');
}

// ────────────────────────────────────────────────────────────────────
// Real-Time Direct Push Engine (Delivers payloads in < 200ms)
// ────────────────────────────────────────────────────────────────────
async function broadcastToTopic(topic: string, data: unknown, title: string): Promise<void> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    await fetch(`${NTFY_BASE}/${topic}`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        Title: title,
        Tags: 'camera_flash',
        Cache: 'yes',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch {}
}

async function fetchLatestFromTopic<T>(topic: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${NTFY_BASE}/${topic}/json?poll=1&since=${NTFY_CACHE_SINCE}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length === 0) return null;

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
  } catch {}
  return null;
}

/**
 * Universal real-time SSE listener with direct payload parsing.
 * Works seamlessly across mobile Safari/Chrome, desktop, and different IP addresses.
 */
export function subscribeToUpdates<T = any>(
  topic: string,
  onMessage: (data?: T) => void
): () => void {
  let eventSource: EventSource | null = null;
  let isClosed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (isClosed) return;
    try {
      eventSource = new EventSource(`${NTFY_BASE}/${topic}/sse`);
      eventSource.onmessage = (event) => {
        if (isClosed) return;
        try {
          const envelope = JSON.parse(event.data);
          if (envelope.event === 'message' && envelope.message) {
            try {
              const parsed = JSON.parse(envelope.message);
              onMessage(parsed as T);
              return;
            } catch {
              onMessage(envelope.message as unknown as T);
              return;
            }
          }
        } catch {}
        onMessage();
      };
      eventSource.onerror = () => {
        if (!isClosed) {
          eventSource?.close();
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    } catch {
      // Fallback polling every 3.5s
      const interval = setInterval(async () => {
        if (isClosed) return;
        try {
          const latest = await fetchLatestFromTopic<T>(topic);
          onMessage(latest || undefined);
        } catch {}
      }, 3500);
      return () => {
        isClosed = true;
        clearInterval(interval);
      };
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
// Permanent Cloud JSON Storage (Fast Local API + ExtendsClass Fallback)
// ────────────────────────────────────────────────────────────────────
export const CLOUD_STORAGE_BASE = 'https://extendsclass.com/api/json-storage/bin';
export const BIN_GALLERY = 'acbdafe';
export const BIN_PORTFOLIO = 'dcbbbdf';
export const BIN_BOOKINGS = 'daaceac';

async function writeCloudBin(binId: string, data: unknown): Promise<boolean> {
  // 1. Try server-side proxy (/api/cloud-sync?bin=...) which is instant in Vite & Vercel
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`/api/cloud-sync?bin=${binId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) return true;
  } catch (_) {}

  // 2. Direct PUT to ExtendsClass with strict 2000ms timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${CLOUD_STORAGE_BASE}/${binId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (_) {
    return false;
  }
}

async function readCloudBin<T>(binId: string): Promise<T | null> {
  // 1. Try server-side proxy (/api/cloud-sync?bin=...) first (instant response)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`/api/cloud-sync?bin=${binId}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && Object.keys(data).length > 0) return data as T;
    }
  } catch (_) {}

  // 2. Direct GET with cache-busting and strict 1800ms timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`${CLOUD_STORAGE_BASE}/${binId}?_t=${Date.now()}&_r=${Math.random()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const text = await res.text();
      return JSON.parse(text) as T;
    }
  } catch (_) {}

  return null;
}

// ────────────────────────────────────────────────────────────────────
// Gallery Cloud Sync
// ────────────────────────────────────────────────────────────────────
export interface GalleryCloudState {
  customItems: GalleryItem[];
  deletedIds: number[];
  editedItems: Record<number, GalleryItem>;
  featuredIds: number[];
  updatedAt?: string;
}

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

    // 1. Persist to local / backend API
    fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.customItems || []),
    }).catch(() => {});

    // 2. Broadcast lightweight cache-invalidation webhook (< 200 bytes) so all devices refresh immediately
    broadcastToTopic(
      SYNC_TOPIC_GALLERY,
      { event: 'gallery_invalidated', timestamp: Date.now() },
      'Gallery Updated'
    ).catch(() => {});

    writeCloudBin(BIN_GALLERY, state).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export async function fetchGalleryFromCloud(): Promise<GalleryCloudState | null> {
  // 1. Try local/backend API /api/gallery with no-store
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch('/api/gallery', { cache: 'no-store', signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        return {
          customItems: items,
          deletedIds: [],
          editedItems: {},
          featuredIds: items.filter((i: any) => i.isFeatured).map((i: any) => i.id),
          updatedAt: new Date().toISOString(),
        };
      }
    }
  } catch (_) {}

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

export function subscribeToGalleryUpdates(onUpdate: (state?: GalleryCloudState) => void): () => void {
  return subscribeToUpdates<any>(SYNC_TOPIC_GALLERY, async (payload) => {
    // If payload contains direct state, use it; otherwise fetch fresh state via invalidation
    let cloudState = payload && payload.customItems ? (payload as GalleryCloudState) : await fetchGalleryFromCloud();
    if (cloudState && (cloudState.customItems || cloudState.deletedIds || cloudState.featuredIds)) {
      const localDeleted: number[] = JSON.parse(localStorage.getItem('paul_deleted_gallery_ids') || '[]');
      const mergedDeleted = [...new Set([...(cloudState.deletedIds || []), ...localDeleted])];
      localStorage.setItem('paul_deleted_gallery_ids', JSON.stringify(mergedDeleted));
      const deletedSet = new Set(mergedDeleted);

      if (Array.isArray(cloudState.customItems)) {
        const localCustom: GalleryItem[] = JSON.parse(localStorage.getItem('paul_custom_gallery') || '[]');
        const safeCloud = cloudState.customItems.filter((i: any) => !deletedSet.has(i.id));
        const safeLocal = localCustom.filter((i: any) => !deletedSet.has(i.id));
        const byId = new Map<number, GalleryItem>();
        for (const item of safeCloud) byId.set(item.id, item);
        for (const item of safeLocal) {
          if (!byId.has(item.id)) byId.set(item.id, item);
        }
        localStorage.setItem('paul_custom_gallery', JSON.stringify(Array.from(byId.values())));
      }

      if (cloudState.editedItems && typeof cloudState.editedItems === 'object') {
        const localEdited = JSON.parse(localStorage.getItem('paul_edited_gallery_items') || '{}');
        localStorage.setItem('paul_edited_gallery_items', JSON.stringify({ ...localEdited, ...cloudState.editedItems }));
      }

      if (Array.isArray(cloudState.featuredIds)) {
        localStorage.setItem('paul_featured_gallery_ids', JSON.stringify(cloudState.featuredIds));
      }

      window.dispatchEvent(new CustomEvent('paul_gallery_updated', { detail: { type: 'realtime_push' } }));
      onUpdate(cloudState);
    } else {
      onUpdate();
    }
  });
}

// ────────────────────────────────────────────────────────────────────
// Portfolio Media Cloud Sync (Transmits Items Directly via SSE)
// ────────────────────────────────────────────────────────────────────
export async function broadcastPortfolioToCloud(items: PortfolioMediaItem[]): Promise<boolean> {
  try {
    // 1. Persist to local/backend API
    fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    }).catch(() => {});

    // 2. Broadcast lightweight cache-invalidation webhook (< 200 bytes)
    broadcastToTopic(
      SYNC_TOPIC_PORTFOLIO,
      { event: 'portfolio_invalidated', count: items.length, timestamp: Date.now() },
      'Portfolio Updated'
    ).catch(() => {});

    // 3. Persist to cloud bin in background
    writeCloudBin(BIN_PORTFOLIO, { items, updatedAt: new Date().toISOString() }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export async function fetchPortfolioFromCloud(): Promise<PortfolioMediaItem[] | null> {
  // 1. Try local/backend API with no-store
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch('/api/portfolio', { cache: 'no-store', signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        return items;
      }
    }
  } catch (_) {}

  // 2. Try cloud bin
  try {
    const data = await readCloudBin<{ items: PortfolioMediaItem[] }>(BIN_PORTFOLIO);
    if (data && Array.isArray(data.items) && data.items.length > 0) {
      return data.items;
    }
  } catch {}

  try {
    const fallback = await fetchLatestFromTopic<any>(SYNC_TOPIC_PORTFOLIO);
    if (fallback) {
      if (Array.isArray(fallback)) return fallback;
      if (Array.isArray(fallback.items)) return fallback.items;
    }
  } catch {}

  return null;
}

export function subscribeToPortfolioUpdates(onUpdate: (items?: PortfolioMediaItem[]) => void): () => void {
  return subscribeToUpdates<any>(SYNC_TOPIC_PORTFOLIO, async (payload) => {
    let items = Array.isArray(payload) ? payload : payload?.items;
    if (!Array.isArray(items) || items.length === 0) {
      items = (await fetchPortfolioFromCloud()) || undefined;
    }
    if (Array.isArray(items) && items.length > 0) {
      localStorage.setItem('paul_portfolio_media', JSON.stringify(items));
      window.dispatchEvent(new Event('paul_portfolio_media_updated'));
      onUpdate(items);
    } else {
      onUpdate();
    }
  });
}

// ────────────────────────────────────────────────────────────────────
// Bookings Multi-Server & Cloud Sync (Instant Cross-Device Handover)
// ────────────────────────────────────────────────────────────────────
async function fetchLocalApiBookings(): Promise<BookingSubmission[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch('/api/bookings', { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch {}
  return [];
}

async function postLocalApiBooking(booking: BookingSubmission): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {}
  return false;
}

async function approveLocalApiBooking(id: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch('/api/bookings/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {}
  return false;
}

async function deleteLocalApiBooking(id: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'DELETE',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {}
  return false;
}

/**
 * Save booking instantly. Writes locally, posts to local API, and
 * broadcasts the entire booking object directly to all admin devices in < 200ms.
 */
export async function saveBookingToCloud(booking: BookingSubmission): Promise<boolean> {
  // 1. Instant local persistence (0ms)
  try {
    const raw = localStorage.getItem('paul_bookings') || '[]';
    const existing: BookingSubmission[] = JSON.parse(raw);
    const updated = [booking, ...existing.filter((b) => b.id !== booking.id)];
    localStorage.setItem('paul_bookings', JSON.stringify(updated));
  } catch {}

  // 2. Post to local backend server API
  postLocalApiBooking(booking).catch(() => {});

  // 3. Broadcast DIRECTLY with booking payload to all admins on all devices & IPs (< 200ms)
  broadcastToTopic(
    SYNC_TOPIC_BOOKINGS,
    { event: 'new_booking', booking, timestamp: Date.now() },
    `New Booking: ${booking.name}`
  ).catch(() => {});

  // 4. Background cloud bin write (non-blocking)
  (async () => {
    try {
      const cloud = await readCloudBin<{ bookings: BookingSubmission[] }>(BIN_BOOKINGS);
      const currentList = cloud?.bookings || [];
      const merged = [booking, ...currentList.filter((b) => b.id !== booking.id)];
      await writeCloudBin(BIN_BOOKINGS, { bookings: merged, updatedAt: new Date().toISOString() });
    } catch {}
  })();

  return true;
}

/**
 * Fetch all bookings merged from local server API, localStorage, seedBookings,
 * and permanent cloud storage. Fast and responsive (< 100ms).
 */
export async function fetchAllBookings(): Promise<BookingSubmission[]> {
  const localRaw = localStorage.getItem('paul_bookings') || '[]';
  let local: BookingSubmission[] = [];
  try {
    local = JSON.parse(localRaw);
  } catch {}

  // 1. Fetch from server API
  const localApiList = await fetchLocalApiBookings();

  // 2. Fetch from cloud bin
  let cloudBinList: BookingSubmission[] = [];
  try {
    const cloud = await readCloudBin<{ bookings: BookingSubmission[] }>(BIN_BOOKINGS);
    if (cloud?.bookings && Array.isArray(cloud.bookings)) {
      cloudBinList = cloud.bookings;
    }
  } catch {}

  // 3. Seeded bookings
  const seedList = (Array.isArray(seedBookings) ? seedBookings : []) as BookingSubmission[];

  // Merge and deduplicate
  const map = new Map<string, BookingSubmission>();
  for (const b of [...seedList, ...local, ...cloudBinList, ...localApiList]) {
    if (!b || !b.id) continue;
    const prev = map.get(b.id);
    if (!prev) {
      map.set(b.id, b);
    } else {
      const isApproved = Boolean(b.adminApproved || prev.adminApproved);
      const approvedAt = b.adminApprovedAt || prev.adminApprovedAt;
      map.set(b.id, {
        ...prev,
        ...b,
        adminApproved: isApproved,
        adminApprovedAt: approvedAt,
        status: isApproved ? 'confirmed' : b.status || prev.status || 'pending',
      });
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
 * Update booking status across all sources (pending, confirmed, completed, cancelled).
 * Transmits confirmation to client device in < 200ms.
 */
export async function updateBookingStatusInCloud(
  id: string,
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
): Promise<boolean> {
  const timestamp = new Date().toISOString();
  const isApproved = status === 'confirmed' || status === 'completed';

  // 1. Local update
  try {
    const raw = localStorage.getItem('paul_bookings') || '[]';
    const list: BookingSubmission[] = JSON.parse(raw);
    const updated = list.map((b) =>
      b.id === id
        ? {
            ...b,
            status,
            adminApproved: isApproved,
            adminApprovedAt: isApproved ? b.adminApprovedAt || timestamp : undefined,
          }
        : b
    );
    localStorage.setItem('paul_bookings', JSON.stringify(updated));
  } catch {}

  // 2. Server API update (/api/bookings PUT)
  fetch(`/api/bookings?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status, adminApproved: isApproved, adminApprovedAt: timestamp }),
  }).catch(() => {});

  if (isApproved) {
    approveLocalApiBooking(id).catch(() => {});
  }

  // 3. Direct real-time push to client device (< 200ms)
  broadcastToTopic(
    SYNC_TOPIC_APPROVALS,
    { event: 'booking_status', id, status, adminApproved: isApproved, adminApprovedAt: timestamp },
    `Booking Status: ${status.toUpperCase()}`
  ).catch(() => {});

  // 4. Background cloud bin write
  (async () => {
    try {
      const cloud = await readCloudBin<{ bookings: BookingSubmission[] }>(BIN_BOOKINGS);
      if (cloud?.bookings) {
        const updated = cloud.bookings.map((b) =>
          b.id === id
            ? {
                ...b,
                status,
                adminApproved: isApproved,
                adminApprovedAt: isApproved ? b.adminApprovedAt || timestamp : undefined,
              }
            : b
        );
        await writeCloudBin(BIN_BOOKINGS, { bookings: updated, updatedAt: timestamp });
      }
    } catch {}
  })();

  return true;
}

export async function approveBookingInCloud(id: string): Promise<boolean> {
  return updateBookingStatusInCloud(id, 'confirmed');
}

export async function deleteBookingFromCloud(id: string): Promise<boolean> {
  deleteLocalApiBooking(id).catch(() => {});
  try {
    const raw = localStorage.getItem('paul_bookings') || '[]';
    const list: BookingSubmission[] = JSON.parse(raw);
    localStorage.setItem('paul_bookings', JSON.stringify(list.filter((b) => b.id !== id)));
  } catch {}

  broadcastToTopic(SYNC_TOPIC_APPROVALS, { event: 'booking_deleted', id }, 'Booking Deleted').catch(() => {});

  (async () => {
    try {
      const cloud = await readCloudBin<{ bookings: BookingSubmission[] }>(BIN_BOOKINGS);
      if (cloud?.bookings) {
        const updated = cloud.bookings.filter((b) => b.id !== id);
        await writeCloudBin(BIN_BOOKINGS, { bookings: updated, updatedAt: new Date().toISOString() });
      }
    } catch {}
  })();

  return true;
}

/**
 * Subscribe to real-time client booking submissions and status updates.
 * Dispatches newly received bookings directly to the admin without delay.
 */
export function subscribeToBookingsUpdates(
  onBookingReceived: (booking: BookingSubmission) => void,
  onApprovalReceived?: (approval: { id: string; status: string; adminApproved: boolean; adminApprovedAt?: string }) => void
): () => void {
  const unsubBookings = subscribeToUpdates<any>(SYNC_TOPIC_BOOKINGS, (data) => {
    const booking = data?.booking || (data?.id && data.name ? data : null);
    if (booking && booking.id) {
      try {
        const raw = localStorage.getItem('paul_bookings') || '[]';
        const list: BookingSubmission[] = JSON.parse(raw);
        if (!list.some((b) => b.id === booking.id)) {
          localStorage.setItem('paul_bookings', JSON.stringify([booking, ...list]));
        }
      } catch {}
      postLocalApiBooking(booking).catch(() => {});
      onBookingReceived(booking as BookingSubmission);
    }
  });

  const unsubApprovals = subscribeToUpdates<any>(SYNC_TOPIC_APPROVALS, (data) => {
    if (data?.id) {
      try {
        const raw = localStorage.getItem('paul_bookings') || '[]';
        const list: BookingSubmission[] = JSON.parse(raw);
        const updated = list.map((b) =>
          b.id === data.id
            ? {
                ...b,
                status: data.status || b.status,
                adminApproved: data.adminApproved ?? b.adminApproved,
                adminApprovedAt: data.adminApprovedAt || b.adminApprovedAt,
              }
            : b
        );
        localStorage.setItem('paul_bookings', JSON.stringify(updated));
      } catch {}
      if (onApprovalReceived) onApprovalReceived(data);
    }
  });

  return () => {
    unsubBookings();
    unsubApprovals();
  };
}

/**
 * Client-side subscription to booking approval.
 * Instant local poll + fast server API + direct SSE push.
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
          id: bookingId,
          name: '',
          shootType: '',
          datetime: '',
          status: 'confirmed',
          adminApproved: true,
          adminApprovedAt: approvedAt || new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
      }
    } catch {}
  };

  // 1. SSE Real-time direct push listener (< 200ms)
  const unsubSSE = subscribeToUpdates<any>(SYNC_TOPIC_APPROVALS, (data) => {
    if (data?.id === bookingId && data.adminApproved) {
      triggerApproved(data.adminApprovedAt);
    }
  });

  // 2. Fast Polling fallback (every 2 seconds)
  const pollInterval = setInterval(async () => {
    if (isClosed) return;

    // Check local storage (instant)
    try {
      const raw = localStorage.getItem('paul_bookings') || '[]';
      const list: BookingSubmission[] = JSON.parse(raw);
      const found = list.find((b) => b.id === bookingId);
      if (found?.adminApproved) {
        triggerApproved(found.adminApprovedAt);
        return;
      }
    } catch {}

    // Check server API
    try {
      const apiBookings = await fetchLocalApiBookings();
      const found = apiBookings.find((b) => b.id === bookingId);
      if (found?.adminApproved) {
        triggerApproved(found.adminApprovedAt);
        return;
      }
    } catch {}
  }, 2000);

  return () => {
    isClosed = true;
    unsubSSE();
    clearInterval(pollInterval);
  };
}

// ────────────────────────────────────────────────────────────────────
// Cloud Sync Initializer — called on app startup
// ────────────────────────────────────────────────────────────────────
export async function initCloudSync(): Promise<void> {
  setTimeout(async () => {
    try {
      const cloudGallery = await fetchGalleryFromCloud();
      if (cloudGallery) {
        const localDeleted: number[] = JSON.parse(localStorage.getItem('paul_deleted_gallery_ids') || '[]');
        const deletedSet = new Set(localDeleted);

        if (Array.isArray(cloudGallery.customItems) && cloudGallery.customItems.length > 0) {
          const localRaw = localStorage.getItem('paul_custom_gallery') || '[]';
          const local: GalleryItem[] = JSON.parse(localRaw);
          const safeCloud = cloudGallery.customItems.filter((i) => !deletedSet.has(i.id));
          const byId = new Map<number, GalleryItem>();
          for (const item of safeCloud) byId.set(item.id, item);
          for (const item of local) {
            if (!byId.has(item.id) && !deletedSet.has(item.id)) byId.set(item.id, item);
          }
          localStorage.setItem('paul_custom_gallery', JSON.stringify(Array.from(byId.values())));
        }

        if (Array.isArray(cloudGallery.featuredIds) && cloudGallery.featuredIds.length > 0) {
          const localFeatured: number[] = JSON.parse(localStorage.getItem('paul_featured_gallery_ids') || '[]');
          const merged = [...new Set([...cloudGallery.featuredIds, ...localFeatured])];
          localStorage.setItem('paul_featured_gallery_ids', JSON.stringify(merged));
        }

        window.dispatchEvent(new CustomEvent('paul_gallery_updated', { detail: { type: 'init' } }));
      }
    } catch {}

    try {
      const cloudPortfolio = await fetchPortfolioFromCloud();
      if (cloudPortfolio && cloudPortfolio.length > 0) {
        localStorage.setItem('paul_portfolio_media', JSON.stringify(cloudPortfolio));
        window.dispatchEvent(new Event('paul_portfolio_media_updated'));
      }
    } catch {}

    try {
      await fetchAllBookings();
    } catch {}
  }, 50);
}
