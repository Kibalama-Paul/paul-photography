import rawCards from './galleryData.json';
import { GalleryItem } from '../types';

export const GALLERY_ITEMS: GalleryItem[] = (rawCards as Array<{ id: number; frontImg: string; backImg: string; title: string }>).map((card, idx) => {
  let category: GalleryItem['category'] = 'portrait';
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

  return {
    id: card.id,
    frontImg: card.frontImg,
    backImg: card.backImg,
    title: `Capture #${card.id.toString().padStart(3, '0')}`,
    category
  };
});
