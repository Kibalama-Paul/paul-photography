// ────────────────────────────────────────────────────────────────────
// Paul Photography — Real-Time Visitor Tracking & Analytics Engine
// Tracks page visits, device types, locations (City/Country/Flag/IP),
// and broadcasts live to the Admin Dashboard via ntfy.sh SSE.
// ────────────────────────────────────────────────────────────────────

export interface VisitorRecord {
  id: string;            // unique visit id
  visitorId: string;     // persistent unique visitor UUID
  ip: string;
  country: string;
  countryCode: string;
  city: string;
  flag: string;          // emoji flag
  page: string;
  device: 'Mobile' | 'Desktop' | 'Tablet';
  browser: string;
  os: string;
  screen: string;
  referrer: string;
  timestamp: string;     // ISO timestamp
}

const NTFY_BASE = 'https://ntfy.sh';
export const SYNC_TOPIC_VISITORS = 'paul_photo_visitors_256_dirfcqs1f';
const STORAGE_KEY_VISITORS = 'paul_website_visitors';
const STORAGE_KEY_VISITOR_ID = 'paul_unique_visitor_id';
const SESSION_KEY_GEO = 'paul_visitor_geo_cache';

// Country code to emoji flag helper
function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  const upper = code.toUpperCase();
  const codePoints = [...upper].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Get or generate persistent unique visitor ID
export function getOrCreateVisitorId(): string {
  let id = localStorage.getItem(STORAGE_KEY_VISITOR_ID);
  if (!id) {
    id = 'v_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    try {
      localStorage.setItem(STORAGE_KEY_VISITOR_ID, id);
    } catch {}
  }
  return id;
}

// Detect device category
export function detectDevice(): 'Mobile' | 'Tablet' | 'Desktop' {
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua) || (width >= 768 && width <= 1024)) {
    return 'Tablet';
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua) || width < 768) {
    return 'Mobile';
  }
  return 'Desktop';
}

// Detect operating system
export function detectOS(): string {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/android/i.test(ua)) return 'Android';
  if (/macintosh|mac os x/i.test(ua)) return 'macOS';
  if (/windows/i.test(ua)) return 'Windows';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Other OS';
}

// Detect browser
export function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome|crios/i.test(ua) && !/opr|opera/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return 'Safari';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/opr|opera/i.test(ua)) return 'Opera';
  return 'Browser';
}

// Parse referrer
export function parseReferrer(): string {
  const ref = document.referrer;
  if (!ref) return 'Direct Visit';
  try {
    const url = new URL(ref);
    const host = url.hostname.toLowerCase();
    if (host.includes('instagram')) return 'Instagram';
    if (host.includes('facebook') || host.includes('fb.me')) return 'Facebook';
    if (host.includes('tiktok')) return 'TikTok';
    if (host.includes('whatsapp') || host.includes('wa.me')) return 'WhatsApp';
    if (host.includes('youtube')) return 'YouTube';
    if (host.includes('linkedin')) return 'LinkedIn';
    if (host.includes('google')) return 'Google Search';
    if (host.includes('bing') || host.includes('yahoo')) return 'Search Engine';
    if (host.includes('paulphotography256.com')) return 'Internal Navigation';
    return host;
  } catch {
    return 'Web Link';
  }
}

// Fetch Geo IP details (cached in sessionStorage to avoid repetitive API requests)
interface GeoData {
  ip: string;
  country: string;
  countryCode: string;
  city: string;
  flag: string;
}

async function getVisitorGeo(): Promise<GeoData> {
  try {
    const cached = sessionStorage.getItem(SESSION_KEY_GEO);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  const defaultGeo: GeoData = {
    ip: 'Unknown IP',
    country: 'Uganda',
    countryCode: 'UG',
    city: 'Kampala',
    flag: '🇺🇬',
  };

  try {
    // Free, reliable CORS-enabled geo IP API
    const res = await fetch('https://ipwho.is/', { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false) {
        const result: GeoData = {
          ip: data.ip || 'Unknown IP',
          country: data.country || 'Uganda',
          countryCode: data.country_code || 'UG',
          city: data.city || 'Kampala',
          flag: countryCodeToFlag(data.country_code || 'UG'),
        };
        try {
          sessionStorage.setItem(SESSION_KEY_GEO, JSON.stringify(result));
        } catch {}
        return result;
      }
    }
  } catch {
    // Secondary fallback
    try {
      const fallbackRes = await fetch('https://api.country.is/');
      if (fallbackRes.ok) {
        const fbData = await fallbackRes.json();
        const result: GeoData = {
          ip: fbData.ip || 'Unknown IP',
          country: fbData.country || 'Uganda',
          countryCode: fbData.country || 'UG',
          city: 'Unknown City',
          flag: countryCodeToFlag(fbData.country || 'UG'),
        };
        try {
          sessionStorage.setItem(SESSION_KEY_GEO, JSON.stringify(result));
        } catch {}
        return result;
      }
    } catch {}
  }

  return defaultGeo;
}

// Throttle tracking so rapid tab switches don't flood
let lastTrackedPage = '';
let lastTrackedTime = 0;

/**
 * Track a page view. Saves locally and broadcasts to ntfy topic.
 */
export async function trackPageView(pageName: string): Promise<void> {
  const now = Date.now();
  // Avoid duplicate pings within 4 seconds for the same page
  if (pageName === lastTrackedPage && now - lastTrackedTime < 4000) {
    return;
  }
  lastTrackedPage = pageName;
  lastTrackedTime = now;

  const geo = await getVisitorGeo();
  const visitorId = getOrCreateVisitorId();
  const device = detectDevice();
  const browser = detectBrowser();
  const os = detectOS();
  const screen = `${window.innerWidth}x${window.innerHeight}`;
  const referrer = parseReferrer();

  const record: VisitorRecord = {
    id: 'vis_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
    visitorId,
    ip: geo.ip,
    country: geo.country,
    countryCode: geo.countryCode,
    city: geo.city,
    flag: geo.flag,
    page: pageName,
    device,
    browser,
    os,
    screen,
    referrer,
    timestamp: new Date().toISOString(),
  };

  // 1. Store in localStorage (keep up to 300 recent visits)
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VISITORS) || '[]';
    const list: VisitorRecord[] = JSON.parse(raw);
    const updated = [record, ...list].slice(0, 300);
    localStorage.setItem(STORAGE_KEY_VISITORS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('paul_visitor_logged', { detail: record }));
  } catch {}

  // 2. Broadcast to cloud ntfy.sh topic for live admin dashboard reception
  try {
    await fetch(`${NTFY_BASE}/${SYNC_TOPIC_VISITORS}`, {
      method: 'POST',
      body: JSON.stringify(record),
      headers: {
        'Title': `Visitor on ${pageName} (${geo.flag} ${geo.city})`,
        'Tags': 'bust_in_silhouette,globe_with_meridians',
        'Cache': 'yes',
      },
    });
  } catch (e) {
    console.warn('[VisitorTracker] Cloud broadcast failed:', e);
  }
}

/**
 * Fetch all visitors from cloud cache + local storage.
 */
export async function fetchAllVisitors(): Promise<VisitorRecord[]> {
  const localRaw = localStorage.getItem(STORAGE_KEY_VISITORS) || '[]';
  let local: VisitorRecord[] = [];
  try {
    local = JSON.parse(localRaw);
  } catch {}

  const cloudRecords: VisitorRecord[] = [];
  try {
    const res = await fetch(`${NTFY_BASE}/${SYNC_TOPIC_VISITORS}/json?poll=1&since=7d`);
    if (res.ok) {
      const text = await res.text();
      const lines = text.trim().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const env = JSON.parse(line);
          if (env.message) {
            const v: VisitorRecord = JSON.parse(env.message);
            if (v && v.timestamp) cloudRecords.push(v);
          }
        } catch {}
      }
    }
  } catch {}

  // Merge and deduplicate by ID
  const map = new Map<string, VisitorRecord>();
  for (const v of [...cloudRecords, ...local]) {
    if (v && v.id) {
      map.set(v.id, v);
    }
  }

  // Sort descending by timestamp (newest first)
  const sorted = Array.from(map.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Save back to local storage
  try {
    localStorage.setItem(STORAGE_KEY_VISITORS, JSON.stringify(sorted.slice(0, 300)));
  } catch {}

  return sorted;
}

/**
 * Subscribe to real-time visitor pings in the Admin Dashboard via SSE.
 */
export function subscribeToLiveVisitors(
  onVisitor: (visitor: VisitorRecord) => void
): () => void {
  let isClosed = false;
  let eventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (isClosed) return;
    try {
      eventSource = new EventSource(`${NTFY_BASE}/${SYNC_TOPIC_VISITORS}/sse`);
      eventSource.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data);
          if (envelope.message) {
            const record: VisitorRecord = JSON.parse(envelope.message);
            if (record && record.timestamp && !isClosed) {
              onVisitor(record);
            }
          }
        } catch {}
      };
      eventSource.onerror = () => {
        if (!isClosed) {
          eventSource?.close();
          reconnectTimer = setTimeout(connect, 5000);
        }
      };
    } catch {
      // Fallback
    }
  };

  connect();

  return () => {
    isClosed = true;
    eventSource?.close();
    if (reconnectTimer) clearTimeout(reconnectTimer);
  };
}
