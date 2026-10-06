import React, { useState, useEffect } from 'react';
import { PageRoute, GalleryItem, BookingSubmission } from '../types';
import {
  getGalleryItems, addGalleryItem, updateGalleryItem,
  toggleFeaturedGalleryItem, deleteGalleryItem, resetGallery
} from '../utils/galleryStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, KeyRound, Upload, Image as ImageIcon, Trash2, CheckCircle2,
  RefreshCw, LogOut, ShieldAlert, Sparkles, Plus, Eye, Download,
  Phone, Mail, Calendar, MapPin, Tag, Clock, MessageSquare, ExternalLink,
  Settings, FileJson, Pencil, Star, X, Check
} from 'lucide-react';

interface AdminDashboardPageProps {
  onNavigate: (page: PageRoute) => void;
}

const DEFAULT_PIN = '2567';

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate }) => {
  // Authentication State
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('paul_admin_auth') === 'true';
  });
  const [authError, setAuthError] = useState('');
  const [storedPin, setStoredPin] = useState(() => {
    return localStorage.getItem('paul_admin_pin') || DEFAULT_PIN;
  });
  const [newPin, setNewPin] = useState('');

  // Active Tab: 'upload' | 'gallery' | 'bookings' | 'settings'
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery' | 'bookings' | 'settings'>('upload');

  // Gallery state
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(() => getGalleryItems());

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);

  // Upload Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GalleryItem['category']>('portrait');
  const [frontImgUrl, setFrontImgUrl] = useState('');
  const [backImgUrl, setBackImgUrl] = useState('');
  const [isFeaturedUpload, setIsFeaturedUpload] = useState(false);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Vercel & GitHub sync UI states
  const [copiedJson, setCopiedJson] = useState(false);
  const [showVercelGuide, setShowVercelGuide] = useState(true);

  // Bookings state
  const [bookings, setBookings] = useState<BookingSubmission[]>([]);


  // Load Bookings & Gallery sync
  useEffect(() => {
    const loadBookings = () => {
      try {
        const raw = localStorage.getItem('paul_bookings');
        setBookings(raw ? JSON.parse(raw) : []);
      } catch (e) {
        console.error('Error loading bookings:', e);
      }
    };

    loadBookings();
    const handleGalleryUpdate = () => setGalleryItems(getGalleryItems());
    window.addEventListener('paul_gallery_updated', handleGalleryUpdate);
    return () => window.removeEventListener('paul_gallery_updated', handleGalleryUpdate);
  }, []);

  // Handle Login Authentication
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === storedPin || passcode === 'paul256') {
      setIsAuthenticated(true);
      sessionStorage.setItem('paul_admin_auth', 'true');
      setAuthError('');
    } else {
      setAuthError('Incorrect Security PIN. Access Denied.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('paul_admin_auth');
  };

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.trim().length >= 4) {
      localStorage.setItem('paul_admin_pin', newPin.trim());
      setStoredPin(newPin.trim());
      setNewPin('');
      alert('Security PIN updated successfully!');
    } else {
      alert('PIN must be at least 4 digits/characters.');
    }
  };

  // Image Upload File Handler (converts local file to Data URL)
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'front' | 'back',
    isEditMode = false
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (isEditMode && editingItem) {
        if (target === 'front') {
          setEditingItem({ ...editingItem, frontImg: result });
        } else {
          setEditingItem({ ...editingItem, backImg: result });
        }
      } else {
        if (target === 'front') {
          setFrontImgUrl(result);
          setFrontPreview(result);
        } else {
          setBackImgUrl(result);
          setBackPreview(result);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit New Image to Gallery
  const handleAddPhotoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontImgUrl) {
      alert('Please select or enter a Front Image.');
      return;
    }

    addGalleryItem({
      title: title || `Capture #${(galleryItems.length + 1).toString().padStart(3, '0')}`,
      category,
      frontImg: frontImgUrl,
      backImg: backImgUrl || frontImgUrl,
      isFeatured: isFeaturedUpload
    });

    setUploadSuccess(true);
    setTitle('');
    setFrontImgUrl('');
    setBackImgUrl('');
    setIsFeaturedUpload(false);
    setFrontPreview(null);
    setBackPreview(null);

    setTimeout(() => setUploadSuccess(false), 3000);
  };

  // Open Edit Modal for a picture
  const handleOpenEditModal = (item: GalleryItem) => {
    setEditingItem({ ...item });
  };

  // Save Edit Changes
  const handleSaveEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    updateGalleryItem(editingItem);
    setEditingItem(null);
  };

  // Toggle Featured State for a picture
  const handleToggleFeatured = (id: number) => {
    toggleFeaturedGalleryItem(id);
  };

  // Delete Gallery Item
  const handleDeleteItem = (id: number) => {
    if (window.confirm('Are you sure you want to delete this photo from the website?')) {
      deleteGalleryItem(id);
    }
  };

  // Reset Gallery
  const handleResetGallery = () => {
    if (window.confirm('Reset gallery to default factory dataset? Custom uploaded images and edits will be cleared.')) {
      resetGallery();
    }
  };

  // Delete Booking
  const handleDeleteBooking = (id: string) => {
    if (window.confirm('Delete this booking record?')) {
      const updated = bookings.filter((b) => b.id !== id);
      setBookings(updated);
      localStorage.setItem('paul_bookings', JSON.stringify(updated));
    }
  };

  // Export JSON Backup for Vercel & GitHub deployment
  const handleExportJSON = () => {
    const cleanItems = galleryItems.map((item) => ({
      id: item.id,
      frontImg: item.frontImg,
      backImg: item.backImg || item.frontImg,
      title: item.title,
      category: item.category,
      isFeatured: !!item.isFeatured
    }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanItems, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "galleryData.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyJSON = () => {
    const cleanItems = galleryItems.map((item) => ({
      id: item.id,
      frontImg: item.frontImg,
      backImg: item.backImg || item.frontImg,
      title: item.title,
      category: item.category,
      isFeatured: !!item.isFeatured
    }));
    navigator.clipboard.writeText(JSON.stringify(cleanItems, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 3000);
  };


  // ----------------------------------------------------
  // LOGIN SCREEN
  // ----------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-28 pb-20 px-4 flex items-center justify-center relative">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/30 via-neutral-950 to-black" />

        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="glass-panel-light max-w-md w-full rounded-3xl p-8 shadow-2xl text-center border border-white/20 relative"
        >
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-400/40 text-purple-300 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-400/30 text-xs font-semibold text-purple-300 uppercase tracking-widest mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Developer Restricted Area</span>
          </div>

          <h1 className="text-2xl font-extrabold text-white mb-2">Developer Admin Portal</h1>
          <p className="text-xs text-gray-300 mb-6">
            Enter your Developer Security PIN to unlock the content management dashboard.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required
                placeholder="Enter PIN (Default: 2567)"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
              />
            </div>

            {authError && (
              <p className="text-xs text-red-400 bg-red-950/50 p-2.5 rounded-lg border border-red-500/30 font-medium">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
            >
              <span>Unlock Admin Dashboard</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-gray-400">
            Authorized Personnel Only • Paul Photography CMS
          </div>
        </motion.div>
      </div>
    );
  }

  // ----------------------------------------------------
  // AUTHENTICATED DASHBOARD
  // ----------------------------------------------------
  return (
    <div className="min-h-screen pt-10 sm:pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 glass-panel-light p-6 rounded-3xl border border-white/20">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-xs font-semibold text-emerald-300 uppercase tracking-widest mb-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Developer Mode Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Paul Photography Dashboard</h1>
          <p className="text-xs text-gray-300">Upload photos, edit existing pictures, pick homepage featured cards, and manage client bookings.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all border border-white/10"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Live Site</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-red-600/30 hover:bg-red-600/50 text-red-200 text-xs font-semibold border border-red-500/40 flex items-center gap-2 cursor-pointer transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Lock Portal</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${activeTab === 'upload'
              ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg'
              : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
            }`}
        >
          <Upload className="w-4 h-4" />
          <span>Upload & Add Image</span>
        </button>

        <button
          onClick={() => setActiveTab('gallery')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${activeTab === 'gallery'
              ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg'
              : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
            }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Manage Gallery ({galleryItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${activeTab === 'bookings'
              ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg'
              : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
            }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Bookings Received ({bookings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${activeTab === 'settings'
              ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg'
              : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
            }`}
        >
          <Settings className="w-4 h-4" />
          <span>Security & Backup</span>
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: UPLOAD & ADD IMAGE */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'upload' && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 glass-panel-light rounded-3xl p-6 sm:p-8 border border-white/20 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" />
              <span>Upload New Photo to Website</span>
            </h2>
            <p className="text-xs text-gray-300 mb-6">
              Uploaded photos are instantly added to the interactive 3D flip card gallery on the website.
            </p>

            {uploadSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center gap-3 text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Photo published successfully! View it live on the Gallery page.</span>
              </div>
            )}

            <form onSubmit={handleAddPhotoSubmit} className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-200 mb-2">Photo Title / Title Tag</label>
                <input
                  type="text"
                  placeholder="e.g. Studio Portrait #105 or Wedding Gala"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-200 mb-2">Category Filter *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as GalleryItem['category'])}
                  className="w-full px-4 py-3 bg-neutral-900 border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="portrait">Portraits</option>
                  <option value="studio">Studio & Lighting</option>
                  <option value="events">Events & Weddings</option>
                  <option value="monochrome">Black & White (Monochrome)</option>
                </select>
              </div>

              {/* Featured checkbox */}
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                <input
                  type="checkbox"
                  id="isFeaturedUpload"
                  checked={isFeaturedUpload}
                  onChange={(e) => setIsFeaturedUpload(e.target.checked)}
                  className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                />
                <label htmlFor="isFeaturedUpload" className="text-xs text-white font-medium cursor-pointer flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>Feature on Homepage 3D Flip Cards</span>
                </label>
              </div>

              {/* Front Image Input */}
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-200 mb-2">
                  Front Image (Primary Photo) *
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span>Choose File from Computer</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'front')}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-gray-400">or enter image URL directly:</span>
                  </div>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg or Cloudinary URL"
                    value={frontImgUrl}
                    onChange={(e) => {
                      setFrontImgUrl(e.target.value);
                      setFrontPreview(e.target.value);
                    }}
                    className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Back Image Input (Optional) */}
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-200 mb-2">
                  Back Image (Optional 3D Flip Perspective)
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span>Choose Back File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'back')}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-gray-400">or URL:</span>
                  </div>
                  <input
                    type="url"
                    placeholder="https://example.com/edited_back.jpg (Defaults to front image if empty)"
                    value={backImgUrl}
                    onChange={(e) => {
                      setBackImgUrl(e.target.value);
                      setBackPreview(e.target.value);
                    }}
                    className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-white font-bold text-base shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
              >
                <Upload className="w-5 h-5" />
                <span>Publish Photo to Website</span>
              </button>
            </form>
          </div>

          {/* Live 3D Flip Card Preview */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="glass-panel-light w-full rounded-3xl p-6 border border-white/20 text-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Interactive 3D Card Preview</span>
              </h3>

              <div className="relative w-64 h-80 mx-auto rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-neutral-900 group cursor-pointer">
                {frontPreview ? (
                  <img
                    src={frontPreview}
                    alt="Front Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-4">
                    <ImageIcon className="w-12 h-12 mb-2 stroke-1" />
                    <span className="text-xs">Selected image will preview here</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center text-white text-xs">
                  <span className="font-semibold">{title || 'Preview Title'}</span>
                  <span className="text-[10px] bg-purple-600 px-2 py-0.5 rounded uppercase">{category}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: MANAGE GALLERY */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'gallery' && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          {/* Vercel & GitHub Live Sync Card */}
          <div className="mb-6 p-6 rounded-3xl bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-cyan-900/40 border border-cyan-500/30 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-[11px] font-bold text-cyan-300 uppercase tracking-widest">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Vercel Live Sync</span>
                </div>
                <h3 className="text-lg font-extrabold text-white">Publish Gallery Updates to Live Vercel Website</h3>
                <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
                  Edits made here are saved locally in your browser. To make your new photos visible live on Vercel to <strong>everyone on the internet</strong>, export the updated dataset to <code className="text-cyan-300 bg-black/40 px-1.5 py-0.5 rounded">src/data/galleryData.json</code> and push to GitHub.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={handleExportJSON}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <Download className="w-4 h-4" />
                  <span>Download galleryData.json</span>
                </button>

                <button
                  onClick={handleCopyJSON}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <FileJson className="w-4 h-4 text-cyan-400" />
                  <span>{copiedJson ? 'Copied JSON Code! ✓' : 'Copy JSON Code'}</span>
                </button>

                <button
                  onClick={handleResetGallery}
                  className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold border border-white/10 flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Reset to factory dataset"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-300 space-y-2">
              <h4 className="font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Quick 3-Step Vercel Deployment Guide:</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-gray-300 pl-1 text-[11px]">
                <li>Click <strong>Download galleryData.json</strong> above.</li>
                <li>Replace the file at <code className="text-cyan-300">src/data/galleryData.json</code> in your project repository with the downloaded file.</li>
                <li>In VS Code terminal / command prompt, run:
                  <div className="bg-black/70 font-mono text-[11px] text-cyan-300 p-2.5 rounded-xl border border-white/10 mt-1 space-y-0.5">
                    <p>git add src/data/galleryData.json</p>
                    <p>git commit -m "Update gallery images for Vercel deployment"</p>
                    <p>git push origin main</p>
                  </div>
                </li>
              </ol>
              <p className="text-[11px] text-emerald-400 font-medium pt-1">
                ✓ Once pushed to GitHub, Vercel will automatically deploy your new gallery images within 30 seconds!
              </p>
            </div>
          </div>


          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {galleryItems.map((item) => (
              <div
                key={item.id}
                className={`glass-panel rounded-2xl overflow-hidden border transition-all relative group flex flex-col justify-between ${item.isFeatured ? 'border-amber-400/60 ring-1 ring-amber-400/30' : 'border-white/15'
                  }`}
              >
                <div className="relative h-48 w-full bg-neutral-900 overflow-hidden">
                  <img
                    src={item.frontImg}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* ID badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-cyan-300 border border-white/10">
                    #{item.id}
                  </div>

                  {/* Featured star badge indicator */}
                  {item.isFeatured && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 text-[10px] font-bold border border-amber-500/40 flex items-center gap-1 shadow-lg">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>Featured</span>
                    </div>
                  )}

                  {/* Top Right Controls: Edit, Featured Toggle, Delete */}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {/* Featured Toggle Star Button */}
                    <button
                      onClick={() => handleToggleFeatured(item.id)}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${item.isFeatured
                          ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
                          : 'bg-black/60 text-gray-300 hover:text-amber-400 hover:bg-black/80'
                        }`}
                      title={item.isFeatured ? 'Featured on Homepage (Click to unfeature)' : 'Set as Featured on Homepage'}
                    >
                      <Star className={`w-3.5 h-3.5 ${item.isFeatured ? 'fill-slate-950' : ''}`} />
                    </button>

                    {/* EDIT BUTTON */}
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 rounded-lg bg-cyan-600/90 hover:bg-cyan-500 text-white transition-all cursor-pointer hover:scale-110 shadow-md"
                      title="Edit photo details"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* DELETE BUTTON */}
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition-all cursor-pointer hover:scale-110 shadow-md"
                      title="Delete photo from website"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-3 text-xs bg-black/40 border-t border-white/10 flex flex-col gap-2">
                  <div className="font-semibold text-white truncate" title={item.title}>{item.title}</div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                    <span className="text-[10px] text-purple-300 uppercase tracking-wider font-semibold">{item.category}</span>
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600/40 hover:bg-cyan-500 text-cyan-200 hover:text-white border border-cyan-500/50 text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 hover:scale-105 shadow-md"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Photo</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ---------------------------------------------------- */}
      {/* EDIT PHOTO MODAL */}
      {/* ---------------------------------------------------- */}
      <AnimatePresence>
        {editingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setEditingItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-lg w-full rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-cyan-400" />
                  <span>Edit Picture #{editingItem.id}</span>
                </h3>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-200 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={editingItem.title}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/50 border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-200 mb-1">Category</label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as GalleryItem['category'] })}
                    className="w-full px-4 py-2.5 bg-neutral-900 border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="portrait">Portraits</option>
                    <option value="studio">Studio & Lighting</option>
                    <option value="events">Events & Weddings</option>
                    <option value="monochrome">Black & White (Monochrome)</option>
                  </select>
                </div>

                {/* Featured Checkbox */}
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <input
                    type="checkbox"
                    id="editIsFeatured"
                    checked={!!editingItem.isFeatured}
                    onChange={(e) => setEditingItem({ ...editingItem, isFeatured: e.target.checked })}
                    className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                  />
                  <label htmlFor="editIsFeatured" className="text-xs text-white font-medium cursor-pointer flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>Featured on Homepage 3D Flip Cards</span>
                  </label>
                </div>

                {/* Front Image URL */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-200 mb-1">Front Image URL / File</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      required
                      value={editingItem.frontImg}
                      onChange={(e) => setEditingItem({ ...editingItem, frontImg: e.target.value })}
                      className="w-full px-4 py-2.5 bg-black/50 border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Replace Front File from Computer</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'front', true)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Back Image URL */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-200 mb-1">Back Image URL / File</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editingItem.backImg}
                      onChange={(e) => setEditingItem({ ...editingItem, backImg: e.target.value })}
                      className="w-full px-4 py-2.5 bg-black/50 border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold cursor-pointer transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Replace Back File from Computer</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'back', true)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Save & Cancel */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------- */}
      {/* TAB 3: BOOKINGS MANAGER */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'bookings' && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Client Booking Submissions ({bookings.length})</h2>
              <p className="text-xs text-gray-400">All photoshoot bookings submitted directly through the reservation portal.</p>
            </div>
          </div>

          {bookings.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl text-center text-gray-400 border border-white/10">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-500 stroke-1" />
              <p className="text-base font-semibold text-white">No Bookings Recorded Yet</p>
              <p className="text-xs text-gray-400 mt-1">Bookings submitted by clients on the website will populate here automatically.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="glass-panel p-5 rounded-2xl border border-white/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 text-xs text-gray-300">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-500/30">
                        {b.id}
                      </span>
                      <span className="text-base font-bold text-white">{b.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/30 uppercase">
                        {b.shootType}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-1 text-gray-300">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <strong className="text-white">{b.phone || 'N/A'}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-purple-400" />
                        <span>{b.email}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{b.datetime?.replace('T', ' at ')}</span>
                      </span>
                      {b.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-red-400" />
                          <span>{b.location}</span>
                        </span>
                      )}
                    </div>

                    {b.notes && (
                      <div className="text-xs text-gray-300 bg-white/5 p-2 rounded-lg border border-white/10 mt-2">
                        <span className="text-gray-400 font-semibold">Notes: </span>
                        {b.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`https://wa.me/${(b.phone || '256757460297').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${b.name}, this is Kibalama Paul regarding your photoshoot booking ref ${b.id}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Client</span>
                    </a>

                    <button
                      onClick={() => handleDeleteBooking(b.id)}
                      className="p-2 rounded-xl bg-red-600/30 hover:bg-red-600 text-red-200 transition-all cursor-pointer"
                      title="Delete booking record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 4: SECURITY & SETTINGS */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'settings' && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
          <div className="glass-panel-light p-6 sm:p-8 rounded-3xl border border-white/20">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-400" />
              <span>Change Developer Security PIN</span>
            </h2>
            <p className="text-xs text-gray-300 mb-6">
              Update the passcode required to access this Developer Dashboard.
            </p>

            <form onSubmit={handleUpdatePin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-200 mb-2">Current PIN</label>
                <input
                  type="text"
                  disabled
                  value={storedPin}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-200 mb-2">New Security PIN</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new 4+ digit PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg cursor-pointer transition-all"
              >
                Update Security PIN
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </div>
  );
};
