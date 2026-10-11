import { PortfolioMediaItem } from '../types';

const STORAGE_KEY = 'paul_portfolio_media';
const EVENT_NAME = 'paul_portfolio_media_updated';

// Default CEO reel items that ship with the site
const DEFAULT_CEO_REEL: PortfolioMediaItem[] = [
  {
    id: 'ceo-reel-default-1',
    type: 'video',
    section: 'ceo-reel',
    url: 'https://res.cloudinary.com/dirfcqs1f/video/upload/v1762193474/paulo_fdm1ai.mp4',
    title: 'CEO Portrait Reel',
    order: 0,
    createdAt: new Date().toISOString(),
  },
];

// Default portfolio showcase images
const DEFAULT_PORTFOLIO: PortfolioMediaItem[] = [
  {
    id: 'portfolio-default-1',
    type: 'image',
    section: 'portfolio',
    url: 'https://res.cloudinary.com/dirfcqs1f/image/upload/v1748599977/OBI_8725_arcf8s.jpg',
    title: 'Studio Portrait',
    order: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'portfolio-default-2',
    type: 'image',
    section: 'portfolio',
    url: 'https://res.cloudinary.com/dirfcqs1f/image/upload/v1748599977/_MG_2308_ecpaj0.jpg',
    title: 'Outdoor Session',
    order: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'portfolio-default-3',
    type: 'image',
    section: 'portfolio',
    url: 'https://res.cloudinary.com/dirfcqs1f/image/upload/v1748599978/IMG_9943_wdykjr.jpg',
    title: 'Event Coverage',
    order: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'portfolio-default-4',
    type: 'image',
    section: 'portfolio',
    url: 'https://res.cloudinary.com/dirfcqs1f/image/upload/v1748599976/_MG_0860_lms0rk.jpg',
    title: 'Creative Direction',
    order: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'portfolio-default-5',
    type: 'image',
    section: 'portfolio',
    url: 'https://res.cloudinary.com/dirfcqs1f/image/upload/v1748599977/_PIT9552_zdb4rf.jpg',
    title: 'Fashion Photography',
    order: 4,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'portfolio-default-6',
    type: 'image',
    section: 'portfolio',
    url: 'https://res.cloudinary.com/dirfcqs1f/image/upload/v1748599974/IMG_0154_ytjsqi.jpg',
    title: 'Cinematic Portrait',
    order: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'portfolio-default-7',
    type: 'image',
    section: 'portfolio',
    url: 'https://res.cloudinary.com/dirfcqs1f/image/upload/v1748599975/OBI_8756_rgpico.jpg',
    title: 'Professional Headshot',
    order: 6,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Get all portfolio media items. Merges defaults with any custom items stored in localStorage.
 */
export const getPortfolioMedia = (): PortfolioMediaItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as PortfolioMediaItem[];
    }
    // First load — seed with defaults
    const defaults = [...DEFAULT_PORTFOLIO, ...DEFAULT_CEO_REEL];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  } catch (e) {
    console.error('Error reading portfolio media:', e);
    return [...DEFAULT_PORTFOLIO, ...DEFAULT_CEO_REEL];
  }
};

/**
 * Get media items for a specific section, sorted by order.
 */
export const getPortfolioMediaBySection = (section: 'portfolio' | 'ceo-reel'): PortfolioMediaItem[] => {
  return getPortfolioMedia()
    .filter((item) => item.section === section)
    .sort((a, b) => a.order - b.order);
};

/**
 * Add a new media item.
 */
export const addPortfolioMedia = (item: Omit<PortfolioMediaItem, 'id' | 'createdAt' | 'order'>): PortfolioMediaItem => {
  const all = getPortfolioMedia();
  const sectionItems = all.filter((m) => m.section === item.section);
  const nextOrder = sectionItems.length > 0 ? Math.max(...sectionItems.map((m) => m.order)) + 1 : 0;

  const newItem: PortfolioMediaItem = {
    ...item,
    id: `${item.section}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    order: nextOrder,
    createdAt: new Date().toISOString(),
  };

  const updated = [...all, newItem];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event(EVENT_NAME));
  return newItem;
};

/**
 * Update an existing media item.
 */
export const updatePortfolioMedia = (updatedItem: PortfolioMediaItem): void => {
  const all = getPortfolioMedia();
  const updated = all.map((m) => (m.id === updatedItem.id ? { ...updatedItem } : m));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event(EVENT_NAME));
};

/**
 * Delete a media item by ID.
 */
export const deletePortfolioMedia = (id: string): void => {
  const all = getPortfolioMedia();
  const updated = all.filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event(EVENT_NAME));
};

/**
 * Reorder items: move an item up or down within its section.
 */
export const reorderPortfolioMedia = (id: string, direction: 'up' | 'down'): void => {
  const all = getPortfolioMedia();
  const item = all.find((m) => m.id === id);
  if (!item) return;

  const sectionItems = all
    .filter((m) => m.section === item.section)
    .sort((a, b) => a.order - b.order);

  const idx = sectionItems.findIndex((m) => m.id === id);
  if (idx === -1) return;
  if (direction === 'up' && idx === 0) return;
  if (direction === 'down' && idx === sectionItems.length - 1) return;

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  const tempOrder = sectionItems[idx].order;
  sectionItems[idx].order = sectionItems[swapIdx].order;
  sectionItems[swapIdx].order = tempOrder;

  // Write back
  const otherItems = all.filter((m) => m.section !== item.section);
  const updated = [...otherItems, ...sectionItems];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event(EVENT_NAME));
};

/**
 * Reset portfolio media to defaults.
 */
export const resetPortfolioMedia = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(EVENT_NAME));
};

export const PORTFOLIO_MEDIA_EVENT = EVENT_NAME;
