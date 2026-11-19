import { GalleryDesignPreset, GalleryThemeId } from '../types/gallery';

export const GALLERY_DESIGN_PRESETS: GalleryDesignPreset[] = [
  {
    id: 'editorial-light',
    name: 'Editorial Light',
    description: 'Archival crisp off-white canvas with Playfair serif titles and hairline cards.',
    defaultLayout: 'masonry',
    defaultHeaderStyle: 'editorial',
    swatchBg: '#FAFAFA',
    swatchSurface: '#FFFFFF',
    swatchText: '#09090B',
    swatchAccent: '#E11D48',
  },
  {
    id: 'obsidian-dark',
    name: 'Obsidian Darkroom',
    description: 'Deep studio black canvas tailored for dramatic portraits and evening weddings.',
    defaultLayout: 'masonry',
    defaultHeaderStyle: 'split-cover',
    swatchBg: '#09090B',
    swatchSurface: '#18181B',
    swatchText: '#FAFAFA',
    swatchAccent: '#F43F5E',
  },
  {
    id: 'warm-monograph',
    name: 'Warm Monograph',
    description: 'Soft stone gallery paper with centered fine-art spacing and split cover hero.',
    defaultLayout: 'masonry',
    defaultHeaderStyle: 'split-cover',
    swatchBg: '#F4F2ED',
    swatchSurface: '#FFFFFF',
    swatchText: '#1C1917',
    swatchAccent: '#E11D48',
  },
  {
    id: 'bento-grid',
    name: 'Architectural Grid',
    description: 'Clean uniform 4:3 contact-sheet alignment with crisp monochromatic framing.',
    defaultLayout: 'grid',
    defaultHeaderStyle: 'editorial',
    swatchBg: '#FFFFFF',
    swatchSurface: '#F4F4F5',
    swatchText: '#09090B',
    swatchAccent: '#09090B',
  },
];

export interface ThemeClasses {
  pageBg: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  toolbarBg: string;
  tabContainerBg: string;
  tabActiveBg: string;
  primaryBtn: string;
  noteBox: string;
}

export function getGalleryThemeClasses(theme: GalleryThemeId = 'editorial-light'): ThemeClasses {
  switch (theme) {
    case 'obsidian-dark':
      return {
        pageBg: 'bg-zinc-950 text-zinc-100',
        surface: 'bg-zinc-900',
        surfaceMuted: 'bg-zinc-800',
        border: 'border-zinc-800',
        textPrimary: 'text-zinc-50',
        textSecondary: 'text-zinc-300',
        textMuted: 'text-zinc-400',
        toolbarBg: 'bg-zinc-900/95 border-zinc-800',
        tabContainerBg: 'bg-zinc-800',
        tabActiveBg: 'bg-zinc-950 text-white shadow-xs',
        primaryBtn: 'bg-white text-zinc-950 hover:bg-zinc-200',
        noteBox: 'border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:bg-zinc-800',
      };
    case 'warm-monograph':
      return {
        pageBg: 'bg-[#F4F2ED] text-stone-950',
        surface: 'bg-white',
        surfaceMuted: 'bg-[#EBE7DF]',
        border: 'border-stone-200',
        textPrimary: 'text-stone-950',
        textSecondary: 'text-stone-700',
        textMuted: 'text-stone-500',
        toolbarBg: 'bg-white/95 border-stone-200',
        tabContainerBg: 'bg-[#EBE7DF]',
        tabActiveBg: 'bg-white text-stone-950 shadow-xs',
        primaryBtn: 'bg-stone-950 text-white hover:bg-stone-800',
        noteBox: 'border-stone-200 bg-[#F9F7F3] text-stone-700 hover:bg-[#EBE7DF]',
      };
    case 'bento-grid':
      return {
        pageBg: 'bg-white text-zinc-950',
        surface: 'bg-zinc-50',
        surfaceMuted: 'bg-zinc-100',
        border: 'border-zinc-200',
        textPrimary: 'text-zinc-950',
        textSecondary: 'text-zinc-700',
        textMuted: 'text-zinc-500',
        toolbarBg: 'bg-white/95 border-zinc-200',
        tabContainerBg: 'bg-zinc-100',
        tabActiveBg: 'bg-white text-zinc-950 shadow-xs',
        primaryBtn: 'bg-zinc-950 text-white hover:bg-zinc-800',
        noteBox: 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100',
      };
    case 'editorial-light':
    default:
      return {
        pageBg: 'bg-zinc-50 text-zinc-950',
        surface: 'bg-white',
        surfaceMuted: 'bg-zinc-100',
        border: 'border-zinc-200',
        textPrimary: 'text-zinc-950',
        textSecondary: 'text-zinc-600',
        textMuted: 'text-zinc-500',
        toolbarBg: 'bg-white/95 border-zinc-200',
        tabContainerBg: 'bg-zinc-100',
        tabActiveBg: 'bg-white text-zinc-950 shadow-xs',
        primaryBtn: 'bg-zinc-950 text-white hover:bg-zinc-800',
        noteBox: 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100',
      };
  }
}
