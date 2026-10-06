export interface GalleryItem {
  id: number;
  frontImg: string;
  backImg: string;
  title: string;
  category: 'all' | 'portrait' | 'studio' | 'events' | 'monochrome';
  isFeatured?: boolean;
}

export type PageRoute = 'home' | 'gallery' | 'portfolio' | 'booking' | 'contact' | 'admin';

export interface BookingSubmission {
  id: string;
  name: string;
  email: string;
  phone?: string;
  datetime: string;
  shootType: string;
  location?: string;
  budget?: string;
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
