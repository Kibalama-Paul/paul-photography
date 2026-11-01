import { GALLERY_ITEMS } from '../data/galleryData';
import { GalleryItem } from '../types';
import { broadcastGalleryToCloud, fetchGalleryFromCloud } from './cloudSync';

const STORAGE_KEY = 'paul_custom_gallery';
const DELETED_KEY = 'paul_deleted_gallery_ids';
const EDITED_KEY = 'paul_edited_gallery_items';
const FEATURED_KEY = 'paul_featured_gallery_ids';

/**
 * Deduplicate items by ID and by image URL.
 */
export const deduplicateItems = (items: GalleryItem[]): GalleryItem[] => {
  const seenIds = new Set<number>();
  const seenUrls = new Set<string>();
  const result: GalleryItem[] = [];

  for (const item of items) {
    if (!item) continue;
    const normUrl = (item.frontImg || '').trim().toLowerCase();

    // Check if ID or image URL is already present
    if (seenIds.has(item.id) || (normUrl && seenUrls.has(normUrl))) {
      continue;
    }

    seenIds.add(item.id);
    if (normUrl) {
      seenUrls.add(normUrl);
    }
    result.push(item);
  }

  return result;
};

/**
 * Default IDs that ship featured from galleryData.
 */
const getDefaultFeaturedIds = (): number[] => {
  const defaults = GALLERY_ITEMS.filter((item) => item.isFeatured).map((item) => item.id);
  // Ensure we have at least 4 default featured items for homepage flip cards
  if (defaults.length < 4) {
    const additional = GALLERY_ITEMS.slice(0, 4).map((i) => i.id);
    return [...new Set([...defaults, ...additional])];
  }
  return defaults;
};

/**
 * Get active featured IDs, initializing with default dataset if never set.
 */
export const getActiveFeaturedIds = (): number[] => {
  try {
    const featuredIdsRaw = localStorage.getItem(FEATURED_KEY);
    if (featuredIdsRaw) {
      const parsed: number[] = JSON.parse(featuredIdsRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  const defaults = getDefaultFeaturedIds();
  try {
    localStorage.setItem(FEATURED_KEY, JSON.stringify(defaults));
  } catch {}
  return defaults;
};

/**
 * Deduplicate entire gallery storage.
 */
export const deduplicateGallery = (): { removedCount: number } => {
  try {
    const rawCustomRaw = localStorage.getItem(STORAGE_KEY);
    const customItems: GalleryItem[] = rawCustomRaw ? JSON.parse(rawCustomRaw) : [];

    const beforeCount = customItems.length;
    const dedupedCustom = deduplicateItems(customItems);

    // Further filter out custom items that already exist in default GALLERY_ITEMS
    const defaultUrls = new Set(GALLERY_ITEMS.map((g) => (g.frontImg || '').trim().toLowerCase()));
    const defaultIds = new Set(GALLERY_ITEMS.map((g) => g.id));
    const finalCustom = dedupedCustom.filter(
      (c) => !defaultIds.has(c.id) && !defaultUrls.has((c.frontImg || '').trim().toLowerCase())
    );

    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalCustom));

    // Deduplicate featured IDs
    const featuredIds = getActiveFeaturedIds();
    localStorage.setItem(FEATURED_KEY, JSON.stringify([...new Set(featuredIds)]));

    // Deduplicate deleted IDs
    const deletedIdsRaw = localStorage.getItem(DELETED_KEY);
    if (deletedIdsRaw) {
      const deletedIds: number[] = JSON.parse(deletedIdsRaw);
      localStorage.setItem(DELETED_KEY, JSON.stringify([...new Set(deletedIds)]));
    }

    const removedCount = Math.max(0, beforeCount - finalCustom.length);
    window.dispatchEvent(new CustomEvent('paul_gallery_updated', { detail: { type: 'deduplicate' } }));
    broadcastCurrentGallery();
    return { removedCount };
  } catch (e) {
    console.error('Error deduplicating gallery:', e);
    return { removedCount: 0 };
  }
};

/**
 * Get all gallery items merged from custom uploads, edits, and defaults,
 * with deleted items properly filtered and real-time featured status attached.
 */
export const getGalleryItems = (): GalleryItem[] => {
  try {
    const customItemsRaw = localStorage.getItem(STORAGE_KEY);
    const customItems: GalleryItem[] = customItemsRaw ? JSON.parse(customItemsRaw) : [];

    const deletedIdsRaw = localStorage.getItem(DELETED_KEY);
    const deletedIds: number[] = deletedIdsRaw ? JSON.parse(deletedIdsRaw) : [];
    const deletedSet = new Set(deletedIds);

    const editedItemsRaw = localStorage.getItem(EDITED_KEY);
    const editedItems: Record<number, GalleryItem> = editedItemsRaw ? JSON.parse(editedItemsRaw) : {};

    const featuredIds = getActiveFeaturedIds();
    const featuredSet = new Set(featuredIds);

    // Filter and apply edits to custom items
    const filteredCustom = customItems
      .filter((item) => !deletedSet.has(item.id))
      .map((item) => {
        if (editedItems[item.id]) {
          return { ...item, ...editedItems[item.id] };
        }
        return item;
      });

    // Filter and apply edits to default items
    const filteredDefaults = GALLERY_ITEMS
      .filter((item) => !deletedSet.has(item.id))
      .map((item) => {
        if (editedItems[item.id]) {
          return { ...item, ...editedItems[item.id] };
        }
        return item;
      });

    const combined = [...filteredCustom, ...filteredDefaults];

    // Attach real-time isFeatured property
    const withFeatured = combined.map((item) => ({
      ...item,
      isFeatured: featuredSet.has(item.id),
    }));

    return deduplicateItems(withFeatured);
  } catch (e) {
    console.error('Failed to parse gallery from storage:', e);
    return deduplicateItems(GALLERY_ITEMS);
  }
};

/**
 * Get featured gallery items for the Homepage 3D Flip Card sampler.
 * Guarantees featured items are returned in real-time.
 */
export const getFeaturedGalleryItems = (): GalleryItem[] => {
  const allItems = getGalleryItems();
  const featured = allItems.filter((item) => item.isFeatured);

  if (featured.length >= 4) {
    return featured.slice(0, 8); // Display up to 8 top favorite flip cards
  }

  // Fill up to 4 items with non-featured items if fewer than 4 items are explicitly starred
  const featuredIds = new Set(featured.map((item) => item.id));
  const remaining = allItems.filter((item) => !featuredIds.has(item.id));
  return [...featured, ...remaining].slice(0, 4);
};

/**
 * Add a new photo to the gallery.
 */
export const addGalleryItem = (
  newItem: Omit<GalleryItem, 'id'> & { id?: number; isFeatured?: boolean }
): GalleryItem | null => {
  const existing = getGalleryItems();
  const normFront = (newItem.frontImg || '').trim().toLowerCase();

  // Prevent duplicate if an image with this URL already exists
  const existingDuplicate = existing.find(
    (item) => (item.frontImg || '').trim().toLowerCase() === normFront
  );
  if (existingDuplicate) {
    console.warn('Image already exists in gallery as #' + existingDuplicate.id);
    return null;
  }

  const nextId = newItem.id || Math.max(0, ...existing.map((i) => i.id)) + 1;

  const itemToAdd: GalleryItem = {
    id: nextId,
    frontImg: newItem.frontImg.trim(),
    backImg: (newItem.backImg || newItem.frontImg).trim(),
    title: newItem.title || `Capture #${nextId.toString().padStart(3, '0')}`,
    category: newItem.category || 'portrait',
    isFeatured: !!newItem.isFeatured,
  };

  try {
    // 1. Remove from deleted IDs if re-uploaded
    const deletedIdsRaw = localStorage.getItem(DELETED_KEY);
    if (deletedIdsRaw) {
      const deletedIds: number[] = JSON.parse(deletedIdsRaw);
      localStorage.setItem(DELETED_KEY, JSON.stringify(deletedIds.filter((id) => id !== nextId)));
    }

    // 2. Save in custom items
    const customItemsRaw = localStorage.getItem(STORAGE_KEY);
    const customItems: GalleryItem[] = customItemsRaw ? JSON.parse(customItemsRaw) : [];
    const updatedCustom = deduplicateItems([itemToAdd, ...customItems]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustom));

    // 3. Update featured list if marked featured
    if (newItem.isFeatured) {
      toggleFeaturedGalleryItem(nextId, true, false);
    }

    // 4. Save to local backend API asynchronously
    fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemToAdd),
    }).catch(() => {});

    // 5. Broadcast real-time event to all components
    window.dispatchEvent(new CustomEvent('paul_gallery_updated', { detail: { item: itemToAdd, type: 'add' } }));
    broadcastCurrentGallery();
  } catch (e) {
    console.error('Error saving gallery item:', e);
  }

  return itemToAdd;
};

/**
 * Update an existing photo's details (title, category, front/back image, isFeatured).
 */
export const updateGalleryItem = (updatedItem: GalleryItem): void => {
  try {
    const customItemsRaw = localStorage.getItem(STORAGE_KEY);
    const customItems: GalleryItem[] = customItemsRaw ? JSON.parse(customItemsRaw) : [];
    const isCustom = customItems.some((i) => i.id === updatedItem.id);

    if (isCustom) {
      const updatedCustom = customItems.map((i) => (i.id === updatedItem.id ? { ...updatedItem } : i));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustom));
    } else {
      const editedItemsRaw = localStorage.getItem(EDITED_KEY);
      const editedItems: Record<number, GalleryItem> = editedItemsRaw ? JSON.parse(editedItemsRaw) : {};
      editedItems[updatedItem.id] = { ...updatedItem };
      localStorage.setItem(EDITED_KEY, JSON.stringify(editedItems));
    }

    if (updatedItem.isFeatured !== undefined) {
      toggleFeaturedGalleryItem(updatedItem.id, updatedItem.isFeatured, false);
    }

    // Save to local backend API
    fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedItem),
    }).catch(() => {});

    // Broadcast real-time update
    window.dispatchEvent(new CustomEvent('paul_gallery_updated', { detail: { item: updatedItem, type: 'update' } }));
    broadcastCurrentGallery();
  } catch (e) {
    console.error('Error updating gallery item:', e);
  }
};

/**
 * Toggle or set the Featured (favorite flip cards) state of a photo.
 */
export const toggleFeaturedGalleryItem = (
  id: number,
  forceState?: boolean,
  shouldBroadcast = true
): void => {
  try {
    let featuredIds = getActiveFeaturedIds();
    const isCurrentlyFeatured = featuredIds.includes(id);
    const targetState = forceState !== undefined ? forceState : !isCurrentlyFeatured;

    if (targetState && !isCurrentlyFeatured) {
      featuredIds = [id, ...featuredIds];
    } else if (!targetState && isCurrentlyFeatured) {
      featuredIds = featuredIds.filter((itemKey) => itemKey !== id);
    }

    localStorage.setItem(FEATURED_KEY, JSON.stringify(featuredIds));

    // Also update custom item isFeatured flag if custom
    const customItemsRaw = localStorage.getItem(STORAGE_KEY);
    if (customItemsRaw) {
      const customItems: GalleryItem[] = JSON.parse(customItemsRaw);
      if (customItems.some((i) => i.id === id)) {
        const updated = customItems.map((i) => (i.id === id ? { ...i, isFeatured: targetState } : i));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    }

    // Save to local backend API
    fetch('/api/gallery/featured', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isFeatured: targetState }),
    }).catch(() => {});

    window.dispatchEvent(
      new CustomEvent('paul_gallery_updated', { detail: { id, isFeatured: targetState, type: 'featured' } })
    );

    if (shouldBroadcast) {
      broadcastCurrentGallery();
    }
  } catch (e) {
    console.error('Error toggling featured item:', e);
  }
};

/**
 * Delete a photo from the gallery permanently.
 */
export const deleteGalleryItem = (id: number): void => {
  try {
    // 1. Remove from custom items
    const customItemsRaw = localStorage.getItem(STORAGE_KEY);
    const customItems: GalleryItem[] = customItemsRaw ? JSON.parse(customItemsRaw) : [];
    const updatedCustom = customItems.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustom));

    // 2. ALWAYS add to deleted IDs list so it remains permanently deleted across all sources
    const deletedIdsRaw = localStorage.getItem(DELETED_KEY);
    const deletedIds: number[] = deletedIdsRaw ? JSON.parse(deletedIdsRaw) : [];
    if (!deletedIds.includes(id)) {
      localStorage.setItem(DELETED_KEY, JSON.stringify([...deletedIds, id]));
    }

    // 3. Remove from edited items if present
    const editedItemsRaw = localStorage.getItem(EDITED_KEY);
    if (editedItemsRaw) {
      const editedItems: Record<number, GalleryItem> = JSON.parse(editedItemsRaw);
      if (editedItems[id]) {
        delete editedItems[id];
        localStorage.setItem(EDITED_KEY, JSON.stringify(editedItems));
      }
    }

    // 4. Remove from featured IDs if present
    toggleFeaturedGalleryItem(id, false, false);

    // 5. Delete on backend API
    fetch('/api/gallery/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});

    // 6. Broadcast real-time update
    window.dispatchEvent(new CustomEvent('paul_gallery_updated', { detail: { id, type: 'delete' } }));
    broadcastCurrentGallery();
  } catch (e) {
    console.error('Error deleting gallery item:', e);
  }
};

/**
 * Reset gallery to default dataset.
 */
export const resetGallery = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DELETED_KEY);
    localStorage.removeItem(EDITED_KEY);
    localStorage.removeItem(FEATURED_KEY);
    // Re-seed featured IDs from default
    const defaults = getDefaultFeaturedIds();
    localStorage.setItem(FEATURED_KEY, JSON.stringify(defaults));

    window.dispatchEvent(new CustomEvent('paul_gallery_updated', { detail: { type: 'reset' } }));
    broadcastCurrentGallery();
  } catch (e) {
    console.error('Error resetting gallery:', e);
  }
};

export const importGalleryItems = (items: GalleryItem[]): void => {
  try {
    const unique = deduplicateItems(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
    localStorage.removeItem(DELETED_KEY);
    localStorage.removeItem(EDITED_KEY);
    localStorage.removeItem(FEATURED_KEY);
    window.dispatchEvent(new CustomEvent('paul_gallery_updated', { detail: { type: 'import' } }));
    broadcastCurrentGallery();
  } catch (e) {
    console.error('Error importing gallery items:', e);
  }
};

/**
 * Broadcast current full gallery state to cloud storage.
 */
export const broadcastCurrentGallery = (): void => {
  try {
    const customItems: GalleryItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const deletedIds: number[] = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');
    const editedItems: Record<number, GalleryItem> = JSON.parse(localStorage.getItem(EDITED_KEY) || '{}');
    const featuredIds: number[] = getActiveFeaturedIds();

    broadcastGalleryToCloud({
      customItems,
      deletedIds,
      editedItems,
      featuredIds,
    }).catch(() => {});
  } catch (e) {
    console.warn('[GalleryStore] Cloud broadcast failed:', e);
  }
};

/**
 * Pull full gallery state from cloud storage and merge safely into local store.
 * Respects locally deleted items and never resurrects them.
 */
export const syncGalleryFromCloud = async (): Promise<void> => {
  try {
    const cloudState = await fetchGalleryFromCloud();
    if (!cloudState) return;

    const localDeleted: number[] = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');
    const deletedSet = new Set(localDeleted);

    if (Array.isArray(cloudState.deletedIds)) {
      const mergedDeleted = [...new Set([...cloudState.deletedIds, ...localDeleted])];
      localStorage.setItem(DELETED_KEY, JSON.stringify(mergedDeleted));
      for (const id of mergedDeleted) deletedSet.add(id);
    }

    if (Array.isArray(cloudState.customItems)) {
      const localCustom: GalleryItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      // Filter out any items that have been deleted
      const safeCloudCustom = cloudState.customItems.filter((item) => !deletedSet.has(item.id));
      const safeLocalCustom = localCustom.filter((item) => !deletedSet.has(item.id));
      const mergedCustom = deduplicateItems([...safeCloudCustom, ...safeLocalCustom]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedCustom));
    }

    if (cloudState.editedItems && typeof cloudState.editedItems === 'object') {
      const localEdited = JSON.parse(localStorage.getItem(EDITED_KEY) || '{}');
      const mergedEdited = { ...localEdited, ...cloudState.editedItems };
      localStorage.setItem(EDITED_KEY, JSON.stringify(mergedEdited));
    }

    if (Array.isArray(cloudState.featuredIds) && cloudState.featuredIds.length > 0) {
      const localFeatured: number[] = JSON.parse(localStorage.getItem(FEATURED_KEY) || '[]');
      const mergedFeatured = [...new Set([...cloudState.featuredIds, ...localFeatured])];
      localStorage.setItem(FEATURED_KEY, JSON.stringify(mergedFeatured));
    }

    window.dispatchEvent(new CustomEvent('paul_gallery_updated', { detail: { type: 'cloud_sync' } }));
  } catch (e) {
    console.error('Error syncing gallery from cloud:', e);
  }
};
