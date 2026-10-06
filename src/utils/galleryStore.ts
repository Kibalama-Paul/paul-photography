import { GALLERY_ITEMS } from '../data/galleryData';
import { GalleryItem } from '../types';

const STORAGE_KEY = 'paul_custom_gallery';
const DELETED_KEY = 'paul_deleted_gallery_ids';
const EDITED_KEY = 'paul_edited_gallery_items';
const FEATURED_KEY = 'paul_featured_gallery_ids';

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
    return combined.map((item) => ({
      ...item,
      isFeatured: featuredIds.includes(item.id)
    }));
  } catch (e) {
    console.error('Failed to parse gallery from storage:', e);
    return GALLERY_ITEMS;
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

export const addGalleryItem = (newItem: Omit<GalleryItem, 'id'> & { id?: number; isFeatured?: boolean }): GalleryItem => {
  const existing = getGalleryItems();
  const nextId = newItem.id || Math.max(0, ...existing.map((i) => i.id)) + 1;

  const itemToAdd: GalleryItem = {
    id: nextId,
    frontImg: newItem.frontImg,
    backImg: newItem.backImg || newItem.frontImg,
    title: newItem.title || `Capture #${nextId.toString().padStart(3, '0')}`,
    category: newItem.category || 'portrait',
    isFeatured: !!newItem.isFeatured
  };

  try {
    const customItemsRaw = localStorage.getItem(STORAGE_KEY);
    const customItems: GalleryItem[] = customItemsRaw ? JSON.parse(customItemsRaw) : [];
    const updatedCustom = [itemToAdd, ...customItems];
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    localStorage.removeItem(DELETED_KEY);
    localStorage.removeItem(EDITED_KEY);
    localStorage.removeItem(FEATURED_KEY);
    window.dispatchEvent(new Event('paul_gallery_updated'));
  } catch (e) {
    console.error('Error importing gallery items:', e);
  }
};

