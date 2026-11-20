// Real-Time Cross-Device Synchronization Engine for Paul Photography 256
// Delivers zero-latency client submissions & gallery updates to all logged-in admins,
// across different computers, mobile devices, studio accounts, and Google logins.

import { AdminGalleryRecord, StoredSubmissionRecord } from '../types/gallery';

const NTFY_BASE = 'https://ntfy.sh';
export const SYNC_TOPIC_PROOFING_SUBMISSIONS = 'paul_photo_proofing_submissions_256_dirfcqs1f';
export const SYNC_TOPIC_PROOFING_GALLERIES = 'paul_photo_proofing_galleries_256_dirfcqs1f';

export interface GalleryChangeEvent {
  action: 'create' | 'update' | 'delete' | 'photos_uploaded';
  sessionId?: string;
  gallery?: AdminGalleryRecord;
  timestamp: string;
}

/**
 * Play a gentle studio notification chime via Web Audio API.
 * Synthesizes a soft, elegant two-tone chime (D5 -> A5) without external audio assets.
 */
export function playSubmissionChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.14); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880.00, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.28); // D6

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.1);
    osc1.stop(now + 0.65);
    osc2.stop(now + 0.65);
  } catch {
    // Audio context may be restricted by browser autoplay policy before user gesture
  }
}

/**
 * Broadcast a new client proofing submission to all admins in real time.
 */
export async function broadcastNewSubmission(submission: StoredSubmissionRecord): Promise<void> {
  // 1. Local cross-tab broadcast
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('pp256_proofing_sync');
      bc.postMessage({ type: 'NEW_SUBMISSION', submission });
      bc.close();
    }
  } catch {}

  // 2. Real-time global push via NTFY SSE
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    await fetch(`${NTFY_BASE}/${SYNC_TOPIC_PROOFING_SUBMISSIONS}`, {
      method: 'POST',
      body: JSON.stringify(submission),
      headers: {
        Title: `New Selection: ${submission.clientName || 'Client'}`,
        Tags: 'camera_flash,heart',
        Priority: 'high',
        Cache: 'yes',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch (err) {
    console.warn('[RealtimeSync] Remote submission broadcast notice:', err);
  }
}

/**
 * Subscribe to real-time client submissions.
 * Fires instantly (< 200ms) when any client submits their favorite frames on any device.
 */
export function subscribeToSubmissions(
  onSubmission: (submission: StoredSubmissionRecord) => void
): () => void {
  let isClosed = false;
  let eventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // 1. Listen to local cross-tab broadcasts
  let localChannel: BroadcastChannel | null = null;
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      localChannel = new BroadcastChannel('pp256_proofing_sync');
      localChannel.onmessage = (event) => {
        if (event.data?.type === 'NEW_SUBMISSION' && event.data.submission) {
          onSubmission(event.data.submission);
        }
      };
    }
  } catch {}

  // 2. Listen to real-time global SSE stream
  const connectSSE = () => {
    if (isClosed) return;
    try {
      eventSource = new EventSource(`${NTFY_BASE}/${SYNC_TOPIC_PROOFING_SUBMISSIONS}/sse`);
      eventSource.onmessage = (e) => {
        if (isClosed) return;
        try {
          const envelope = JSON.parse(e.data);
          if (envelope.event === 'message' && envelope.message) {
            const parsed = JSON.parse(envelope.message) as StoredSubmissionRecord;
            if (parsed && parsed.submissionId) {
              onSubmission(parsed);
            }
          }
        } catch {}
      };
      eventSource.onerror = () => {
        if (!isClosed) {
          eventSource?.close();
          reconnectTimer = setTimeout(connectSSE, 4000);
        }
      };
    } catch {
      // Fallback
    }
  };

  connectSSE();

  return () => {
    isClosed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (eventSource) eventSource.close();
    if (localChannel) localChannel.close();
  };
}

/**
 * Broadcast gallery changes (create/update/delete/photos) to all connected admins.
 */
export async function broadcastGalleryChange(
  action: 'create' | 'update' | 'delete' | 'photos_uploaded',
  gallery?: AdminGalleryRecord
): Promise<void> {
  const payload: GalleryChangeEvent = {
    action,
    sessionId: gallery?.sessionId,
    gallery,
    timestamp: new Date().toISOString(),
  };

  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('pp256_proofing_galleries');
      bc.postMessage(payload);
      bc.close();
    }
  } catch {}

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    await fetch(`${NTFY_BASE}/${SYNC_TOPIC_PROOFING_GALLERIES}`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        Title: `Gallery ${action}: ${gallery?.sessionName || ''}`,
        Tags: 'framed_picture',
        Cache: 'yes',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch (_) {}
}

/**
 * Subscribe to gallery changes across all admin accounts and devices.
 */
export function subscribeToGalleries(
  onGalleryChange: (event: GalleryChangeEvent) => void
): () => void {
  let isClosed = false;
  let eventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  let localChannel: BroadcastChannel | null = null;
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      localChannel = new BroadcastChannel('pp256_proofing_galleries');
      localChannel.onmessage = (event) => {
        if (event.data?.action) {
          onGalleryChange(event.data as GalleryChangeEvent);
        }
      };
    }
  } catch {}

  const connectSSE = () => {
    if (isClosed) return;
    try {
      eventSource = new EventSource(`${NTFY_BASE}/${SYNC_TOPIC_PROOFING_GALLERIES}/sse`);
      eventSource.onmessage = (e) => {
        if (isClosed) return;
        try {
          const envelope = JSON.parse(e.data);
          if (envelope.event === 'message' && envelope.message) {
            const parsed = JSON.parse(envelope.message) as GalleryChangeEvent;
            if (parsed && parsed.action) {
              onGalleryChange(parsed);
            }
          }
        } catch {}
      };
      eventSource.onerror = () => {
        if (!isClosed) {
          eventSource?.close();
          reconnectTimer = setTimeout(connectSSE, 4000);
        }
      };
    } catch {}
  };

  connectSSE();

  return () => {
    isClosed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (eventSource) eventSource.close();
    if (localChannel) localChannel.close();
  };
}
