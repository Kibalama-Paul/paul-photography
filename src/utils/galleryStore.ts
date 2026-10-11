import { GALLERY_ITEMS } from '../data/galleryData';
import { GalleryItem } from '../types';

const STORAGE_KEY = 'paul_custom_gallery';
const DELETED_KEY = 'paul_deleted_gallery_ids';
const EDITED_KEY = 'paul_edited_gallery_items';
const FEATURED_KEY = 'paul_featured_gallery_ids';

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
    const featuredIdsRaw = localStorage.getItem(FEATURED_KEY);
    if (featuredIdsRaw) {
      const featuredIds: number[] = JSON.parse(featuredIdsRaw);
      localStorage.setItem(FEATURED_KEY, JSON.stringify([...new Set(featuredIds)]));
    }

    // Deduplicate deleted IDs
    const deletedIdsRaw = localStorage.getItem(DELETED_KEY);
    if (deletedIdsRaw) {
      const deletedIds: number[] = JSON.parse(deletedIdsRaw);
      localStorage.setItem(DELETED_KEY, JSON.stringify([...new Set(deletedIds)]));
    }

    const removedCount = Math.max(0, beforeCount - finalCustom.length);
    window.dispatchEvent(new Event('paul_gallery_updated'));
    return { removedCount };
  } catch (e) {
    console.error('Error deduplicating gallery:', e);
    return { removedCount: 0 };
  }
};

export const getGalleryItems = (): GalleryItem[] => {
  try {
    const customItemsRaw = localStorage.getItem(STORAGE_KEY);
    const customItems: GalleryItem[] = customItemsRaw ? JSON.parse(customItemsRaw) : [];

    const deletedIdsRaw = localStorage.getItem(DELETED_KEY);
    const deletedIds: number[] = deletedIdsRaw ? JSON.parse(deletedIdsRaw) : [];

    const editedItemsRaw = localStorage.getItem(EDITED_KEY);
    const editedItems: Record<number, GalleryItem> = editedItemsRaw ? JSON.parse(editedItemsRaw) : {};

    const featuredIdsRaw = localStorage.getItem(FEATURED_KEY);
    const featuredIds: number[] = featuredIdsRaw ? JSON.parse(featuredIdsRaw) : [];

    const filteredDefaults = GALLERY_ITEMS.filter((item) => !deletedIds.includes(item.id)).map((item) => {
      if (editedItems[item.id]) {
        return { ...editedItems[item.id] };
      }
      return item;
    });

    const combined = [...customItems, ...filteredDefaults];

    // Attach isFeatured property
    const withFeatured = combined.map((item) => ({
      ...item,
      isFeatured: featuredIds.includes(item.id)
    }));

    return deduplicateItems(withFeatured);
  } catch (e) {
    console.error('Failed to parse gallery from storage:', e);
    return deduplicateItems(GALLERY_ITEMS);
  }
};

export const getFeaturedGalleryItems = (): GalleryItem[] => {
  const allItems = getGalleryItems();
  const featured = allItems.filter((item) => item.isFeatured);
  
  if (featured.length >= 4) {
    return featured.slice(0, 4);
  }
  
  // Fill up to 4 items with non-featured items if fewer than 4 items are explicitly featured
  const featuredIds = new Set(featured.map((item) => item.id));
  const remaining = allItems.filter((item) => !featuredIds.has(item.id));
  return [...featured, ...remaining].slice(0, 4);
};

export const addGalleryItem = (newItem: Omit<GalleryItem, 'id'> & { id?: number; isFeatured?: boolean }): GalleryItem | null => {
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
    isFeatured: !!newItem.isFeatured
  };

  try {
    const customItemsRaw = localStorage.getItem(STORAGE_KEY);
    const customItems: GalleryItem[] = customItemsRaw ? JSON.parse(customItemsRaw) : [];
    const updatedCustom = deduplicateItems([itemToAdd, ...customItems]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustom));

    if (newItem.isFeatured) {
      toggleFeaturedGalleryItem(nextId, true);
    }
    
    window.dispatchEvent(new Event('paul_gallery_updated'));
  } catch (e) {
    console.error('Error saving gallery item:', e);
  }

  return itemToAdd;
};

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
      toggleFeaturedGalleryItem(updatedItem.id, updatedItem.isFeatured);
    }

    window.dispatchEvent(new Event('paul_gallery_updated'));
  } catch (e) {
    console.error('Error updating gallery item:', e);
  }
};

export const toggleFeaturedGalleryItem = (id: number, forceState?: boolean): void => {
  try {
    const featuredIdsRaw = localStorage.getItem(FEATURED_KEY);
    let featuredIds: number[] = featuredIdsRaw ? JSON.parse(featuredIdsRaw) : [];

    const isCurrentlyFeatured = featuredIds.includes(id);
    const targetState = forceState !== undefined ? forceState : !isCurrentlyFeatured;

    if (targetState && !isCurrentlyFeatured) {
      featuredIds = [id, ...featuredIds];
    } else if (!targetState && isCurrentlyFeatured) {
      featuredIds = featuredIds.filter((itemKey) => itemKey !== id);
    }

    localStorage.setItem(FEATURED_KEY, JSON.stringify(featuredIds));
    window.dispatchEvent(new Event('paul_gallery_updated'));
  } catch (e) {
    console.error('Error toggling featured item:', e);
  }
};

export const deleteGalleryItem = (id: number): void => {
  try {
    const customItemsRaw = localStorage.getItem(STORAGE_KEY);
    const customItems: GalleryItem[] = customItemsRaw ? JSON.parse(customItemsRaw) : [];
    
    if (customItems.some((i) => i.id === id)) {
      const updatedCustom = customItems.filter((i) => i.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustom));
    } else {
      const deletedIdsRaw = localStorage.getItem(DELETED_KEY);
      const deletedIds: number[] = deletedIdsRaw ? JSON.parse(deletedIdsRaw) : [];
      if (!deletedIds.includes(id)) {
        localStorage.setItem(DELETED_KEY, JSON.stringify([...deletedIds, id]));
      }
    }

    // Remove from featured if present
    toggleFeaturedGalleryItem(id, false);

    window.dispatchEvent(new Event('paul_gallery_updated'));
  } catch (e) {
    console.error('Error deleting gallery item:', e);
  }
};

export const resetGallery = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DELETED_KEY);
    localStorage.removeItem(EDITED_KEY);
    localStorage.removeItem(FEATURED_KEY);
    window.dispatchEvent(new Event('paul_gallery_updated'));
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
    window.dispatchEvent(new Event('paul_gallery_updated'));
  } catch (e) {
    console.error('Error importing gallery items:', e);
  }
};

