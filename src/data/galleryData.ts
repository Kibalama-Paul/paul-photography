import rawCards from './galleryData.json';
import { GalleryItem } from '../types';

const rawList = (rawCards as Array<{
  id: number;
  frontImg: string;
  backImg: string;
  title?: string;
  category?: GalleryItem['category'];
  isFeatured?: boolean;
}>);

const seenIds = new Set<number>();
const seenUrls = new Set<string>();
const uniqueList: GalleryItem[] = [];

rawList.forEach((card, idx) => {
  const normUrl = (card.frontImg || '').trim().toLowerCase();
  if (seenIds.has(card.id) || (normUrl && seenUrls.has(normUrl))) {
    return;
  }
  seenIds.add(card.id);
  if (normUrl) {
    seenUrls.add(normUrl);
  }

  let category: GalleryItem['category'] = card.category || 'portrait';
  if (!card.category) {
    const url = (card.frontImg + ' ' + card.backImg).toLowerCase();
    if (url.includes('b_w') || url.includes('black') || idx % 5 === 4) {
      category = 'monochrome';
    } else if (url.includes('detty') || url.includes('studio') || url.includes('kolapo') || idx % 5 === 1) {
      category = 'studio';
    } else if (url.includes('pau_') || url.includes('wedding') || idx % 5 === 2) {
      category = 'events';
    } else {
      category = 'portrait';
    }
  }

  uniqueList.push({
    id: card.id,
    frontImg: card.frontImg,
    backImg: card.backImg || card.frontImg,
    title: card.title || `Capture #${card.id.toString().padStart(3, '0')}`,
    category,
    isFeatured: !!card.isFeatured
  });
});

export const GALLERY_ITEMS: GalleryItem[] = uniqueList;

