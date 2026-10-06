export interface GalleryItem {
  id: number;
  frontImg: string;
  backImg: string;
  title: string;
  category: 'all' | 'portrait' | 'studio' | 'events' | 'monochrome';
}

export type PageRoute = 'home' | 'gallery' | 'portfolio' | 'booking' | 'contact';

export interface BookingSubmission {
  id: string;
  name: string;
  email: string;
  datetime: string;
  shootType: string;
  notes?: string;
  status: 'pending' | 'confirmed';
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}
