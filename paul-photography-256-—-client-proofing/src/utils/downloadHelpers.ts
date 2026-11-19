import JSZip from 'jszip';
import { PhotoItem } from '../types/gallery';

function sanitizeFilename(name: string, index: number, usedNames: Set<string>): string {
  const clean = (name || `photo-${index + 1}.jpg`).replace(/[\\/:*?"<>|]+/g, '_');
  const hasExt = /\.[a-z0-9]{2,5}$/i.test(clean);
  const baseName = hasExt ? clean : `${clean}.jpg`;

  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }

  const dotIdx = baseName.lastIndexOf('.');
  const stem = dotIdx > 0 ? baseName.slice(0, dotIdx) : baseName;
  const ext = dotIdx > 0 ? baseName.slice(dotIdx) : '.jpg';
  let counter = 2;
  while (usedNames.has(`${stem}_${counter}${ext}`)) {
    counter += 1;
  }
  const unique = `${stem}_${counter}${ext}`;
  usedNames.add(unique);
  return unique;
}

function ensureJpgExtension(filename: string): string {
  const clean = filename.replace(/[\\/:*?"<>|]+/g, '_');
  if (/\.jpe?g$/i.test(clean)) return clean;
  const dotIdx = clean.lastIndexOf('.');
  if (dotIdx > 0) {
    return `${clean.slice(0, dotIdx)}.jpg`;
  }
  return `${clean}.jpg`;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Converts any image blob to a standard .jpg Blob via canvas if its MIME type is not already JPEG,
 * or returns the original JPEG bytes untouched to preserve full quality.
 */
async function toJpgBlob(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/jpeg' || blob.type === 'image/jpg') {
    return blob;
  }

  return new Promise<Blob>((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(blob);
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (jpgBlob) => {
            URL.revokeObjectURL(objectUrl);
            resolve(jpgBlob || blob);
          },
          'image/jpeg',
          0.95
        );
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve(blob);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(blob);
    };
    img.src = objectUrl;
  });
}

/**
 * Bundles selected high-resolution images into a single .zip archive using JSZip.
 */
export async function downloadPhotosAsZip(
  photos: PhotoItem[],
  zipFilename: string,
  summaryText?: string,
  onProgress?: (completed: number, total: number, currentName: string) => void
): Promise<number> {
  if (photos.length === 0) {
    throw new Error('No photos selected to archive.');
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();
  let addedCount = 0;

  for (let i = 0; i < photos.length; i += 1) {
    const photo = photos[i];
    const safeName = sanitizeFilename(photo.filename, i, usedNames);
    onProgress?.(i, photos.length, safeName);

    const response = await fetch(photo.fullUrl);
    if (!response.ok) {
      throw new Error(`Unable to fetch ${photo.filename} (${response.status}).`);
    }
    const blob = await response.blob();
    zip.file(safeName, blob);
    addedCount += 1;
    onProgress?.(i + 1, photos.length, safeName);
  }

  if (summaryText) {
    zip.file('selection-summary.txt', summaryText);
  }

  const archiveBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'STORE',
  });

  triggerBlobDownload(archiveBlob, zipFilename);
  return addedCount;
}

interface DirectoryHandleLike {
  getFileHandle: (
    name: string,
    options: { create: boolean }
  ) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
}

/**
 * Photographer-only batch export: writes individual .jpg files directly into a chosen
 * folder on the device (via File System Access API when supported) or falls back to
 * sequential browser .jpg downloads directly to the device's Downloads/Gallery folder.
 */
export async function batchDownloadJpgsToDevice(
  photos: PhotoItem[],
  onProgress?: (completed: number, total: number, currentName: string) => void
): Promise<{ mode: 'directory' | 'browser-downloads'; count: number }> {
  if (photos.length === 0) {
    throw new Error('No photos available to download.');
  }

  const usedNames = new Set<string>();
  const win = window as unknown as {
    showDirectoryPicker?: (opts?: { mode?: 'readwrite' }) => Promise<DirectoryHandleLike>;
  };

  let directoryHandle: DirectoryHandleLike | null = null;
  if (typeof win.showDirectoryPicker === 'function') {
    try {
      directoryHandle = await win.showDirectoryPicker({ mode: 'readwrite' });
    } catch (err) {
      // If the user explicitly cancelled the native folder picker, abort cleanly
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('Folder selection cancelled.');
      }
      // Otherwise (e.g. iframe security policy), fall back to direct browser .jpg downloads
      directoryHandle = null;
    }
  }

  let savedCount = 0;

  for (let i = 0; i < photos.length; i += 1) {
    const photo = photos[i];
    const jpgName = sanitizeFilename(ensureJpgExtension(photo.filename), i, usedNames);
    onProgress?.(i, photos.length, jpgName);

    const response = await fetch(photo.fullUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${photo.filename} (${response.status}).`);
    }
    const rawBlob = await response.blob();
    const jpgBlob = await toJpgBlob(rawBlob);

    if (directoryHandle) {
      const fileHandle = await directoryHandle.getFileHandle(jpgName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(jpgBlob);
      await writable.close();
    } else {
      triggerBlobDownload(jpgBlob, jpgName);
      // Stagger downloads so the browser does not throttle consecutive .jpg saves
      if (i < photos.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 260));
      }
    }

    savedCount += 1;
    onProgress?.(i + 1, photos.length, jpgName);
  }

  return {
    mode: directoryHandle ? 'directory' : 'browser-downloads',
    count: savedCount,
  };
}
