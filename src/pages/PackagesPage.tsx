import React, { useState } from 'react';
import { PageRoute } from '../types';
import { motion } from 'framer-motion';
import { CheckCircle2, MessageSquare, ArrowRight, Monitor, Video, Gift, Info, Car } from 'lucide-react';

interface PackagesPageProps {
  onNavigate: (page: PageRoute) => void;
}

export interface PackageItem {
  id: string;
  category: 'studio' | 'outdoor' | 'wedding' | 'kwanjula' | 'nikkah-kukyala';
  title: string;
  price: string;
  description?: string;
  badge?: string;
  isPopular?: boolean;
  isEditableSample?: boolean;
  features: string[];
}

export const PackagesPage: React.FC<PackagesPageProps> = ({ onNavigate }) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'studio' | 'outdoor' | 'wedding' | 'kwanjula' | 'nikkah-kukyala'>('all');

  const packages: PackageItem[] = [
    // STUDIO SESSION PACKAGES
    {
      id: 'studio-8',
      category: 'studio',
      title: 'Studio Essentials',
      price: '150,000 UGX',
      description: 'Ideal for clean professional portraits, quick profile shoots, and headshots.',
      features: [
        '8 High-Definition Edited Images',
        'Professional Studio Lighting & Background Setup',
        'Retouched High-Resolution Copies',
        'Digital Delivery via Cloud'
      ]
    },
    {
      id: 'studio-10-board',
      category: 'studio',
      title: 'Studio Classic + Photoboard',
      price: '200,000 UGX',
      description: 'Our most popular studio package featuring a physical wall display board.',
      badge: 'Popular Choice',
      isPopular: true,
      features: [
        '10 High-Definition Edited Images',
        '1 Premium A3 Photoboard Included',
        'Multiple Outfit Switches Allowed',
        'Professional Retouching & Color Grading',
        'High-Res Digital Album Delivery'
      ]
    },
    {
      id: 'studio-10-reel-board',
      category: 'studio',
      title: 'Studio Executive VIP',
      price: '300,000 UGX',
      description: 'Complete studio experience combining high-res photos, video reel, and wall art.',
      badge: 'Full VIP Package',
      features: [
        '10 High-Definition Edited Images',
        '1 Cinematic Video Reel (HD)',
        '1 Premium A3 Photoboard Included',
        'Unlimited Outfit Switches & Creative Direction',
        'High-Res Digital Delivery'
      ]
    },

    // OUTDOOR PHOTOSHOOT PACKAGES
    {
      id: 'outdoor-6',
      category: 'outdoor',
      title: 'Outdoor Lite',
      price: '100,000 UGX',
      description: 'Perfect for quick outdoor creative portraits, birthdays, and lifestyle shoots.',
      features: [
        '6 High-Definition Edited Images',
        'Natural Light Location Session',
        'Professional Retouching',
        'High-Res Digital Album Delivery'
      ]
    },
    {
      id: 'outdoor-10-board',
      category: 'outdoor',
      title: 'Outdoor Standard + Photoboard',
      price: '150,000 UGX',
      description: 'Great outdoor coverage with a physical A3 wall print to take home.',
      badge: 'Best Value',
      isPopular: true,
      features: [
        '10 High-Definition Edited Images',
        '1 Premium A3 Photoboard Included',
        'Location Creative Direction & Posing',
        'Color Grading & Enhancement',
        'High-Res Digital Album Delivery'
      ]
    },
    {
      id: 'outdoor-10-reel-board',
      category: 'outdoor',
      title: 'Outdoor Supreme Reel',
      price: '250,000 UGX',
      description: 'Ultimate outdoor session complete with video reel and wall photo board.',
      badge: 'Full Media Coverage',
      features: [
        '10 High-Definition Edited Images',
        '1 Cinematic Video Reel (HD)',
        '1 Premium A3 Photoboard Included',
        'Full Location Coverage & Creative Direction',
        'High-Res Digital Delivery'
      ]
    },

    // COMBINED NIKKAH & KUKYALA PACKAGES (UNIFIED PRICING LIST FROM POSTERS)
    {
      id: 'nikkah-kukyala-platinum',
      category: 'nikkah-kukyala',
      title: 'PLATINUM NIKKAH & KUKYALA PACKAGE',
      price: '1,200,000 UGX',
      description: 'Top-tier Nikkah & Kukyala media coverage with full video filming, short film, 80-page Photobook & multiple boards.',
      badge: 'VIP Full Media',
      isPopular: true,
      features: [
        'Full Video Filming & Short Film for the full video',
        'PhotoBook 80 Pages',
        '3 Big (8x12) Boards',
        '1 (12x16) Frame & 1 (12x16) Board',
        'Flash Drive for all Photos',
        'Flash Drive for Video'
      ]
    },
    {
      id: 'nikkah-kukyala-gold',
      category: 'nikkah-kukyala',
      title: 'GOLD NIKKAH & KUKYALA PACKAGE',
      price: '800,000 UGX',
      description: 'Comprehensive Nikkah & Kukyala photo & video package featuring short film and 40-page Photobook.',
      badge: 'Most Popular',
      features: [
        '3 Big (8x12) Boards',
        '100 Soft Copies',
        'PhotoBook 40 Pages',
        'Short Film for the full video',
        'Flash drive for all Photos'
      ]
    },
    {
      id: 'nikkah-kukyala-silver',
      category: 'nikkah-kukyala',
      title: 'SILVER NIKKAH & KUKYALA PACKAGE',
      price: '600,000 UGX',
      description: 'Standard Nikkah & Kukyala photography coverage with 40-page Photobook and 2 wall boards.',
      badge: 'Standard Package',
      features: [
        '2 Big (8x12) Boards',
        '100 Soft Copies',
        'PhotoBook 40 Pages'
      ]
    },
    {
      id: 'nikkah-kukyala-bronze',
      category: 'nikkah-kukyala',
      title: 'BRONZE NIKKAH & KUKYALA PACKAGE',
      price: '400,000 UGX',
      description: 'Essential Nikkah & Kukyala photo album package with 100 printed copies and wall display board.',
      badge: 'Essential Package',
      features: [
        '1 Big (8x12) Board',
        '100 Soft Copies',
        'PhotoAlbum (100 Copies)'
      ]
    },
    {
      id: 'nikkah-kukyala-photos-only',
      category: 'nikkah-kukyala',
      title: 'NIKKAH & KUKYALA PHOTOS ONLY',
      price: '300,000 UGX',
      description: 'Soft copies digital delivery only for Nikkah and Kukyala visitation ceremonies.',
      badge: 'Soft Copies Only',
      features: [
        'Complete Retouched Soft Copies Digital Gallery',
        'High-Resolution Retouched Photos',
        'Cloud & Flash Drive Delivery'
      ]
    },

    // OFFICIAL INTRODUCTION / KWANJULA PACKAGES (FROM OFFICIAL INTRODUCTION POSTER)
    {
      id: 'kwanjula-gold',
      category: 'kwanjula',
      title: 'GOLD INTRODUCTION PACKAGE',
      price: '3,500,000 UGX',
      description: 'Premier Introduction coverage with 2 Photographers, 2 Videographers, 40-page Photobook & 4 DVDs.',
      badge: 'Top Tier VIP',
      isPopular: true,
      features: [
        '2 Professional Photographers & 2 Professional Videographers',
        'PhotoBook 40 Pages',
        '2 Big (8x12) Boards',
        '1 (12x16) Frame & 1 (12x16) Board',
        'DVD for all Photos & 4 Video DVDs'
      ]
    },
    {
      id: 'kwanjula-silver',
      category: 'kwanjula',
      title: 'SILVER INTRODUCTION PACKAGE',
      price: '2,500,000 UGX',
      description: 'Full dual crew photo & video coverage with 30-page Photobook and multiple wall boards.',
      badge: 'Most Popular',
      features: [
        '2 Professional Photographers & 2 Professional Videographers',
        'PhotoBook 30 Pages',
        '2 Big (8x12) Boards',
        '1 (12x16) Frame & 1 (11x14) Board',
        'DVD for all Photos & 4 Video DVDs'
      ]
    },
    {
      id: 'kwanjula-bronze',
      category: 'kwanjula',
      title: 'BRONZE INTRODUCTION PACKAGE',
      price: '1,800,000 UGX',
      description: 'Standard Introduction coverage with dual photo/video team, album/photobook choice.',
      badge: 'Standard Package',
      features: [
        '2 Professional Photographers & 2 Professional Videographers',
        '220 (4x6) in Adhesive Album OR PhotoBook 20 Pages',
        '2 Big (8x12) Boards & 1 (8x12) Frame',
        'DVD for all Photos & 2 Video DVDs'
      ]
    },
    {
      id: 'kwanjula-budget',
      category: 'kwanjula',
      title: 'BUDGET INTRODUCTION PACKAGE',
      price: '1,000,000 UGX',
      description: 'Compact Introduction ceremony coverage for intimate family gatherings.',
      badge: 'Budget Friendly',
      features: [
        '1 Professional Photographer & 1 Professional Videographer',
        '120 (4x6) in Adhesive Album',
        '1 Video DVD'
      ]
    },

    // OFFICIAL WEDDING PACKAGES (FROM OFFICIAL WEDDING POSTER)
    {
      id: 'wedding-platinum',
      category: 'wedding',
      title: 'PLATINUM WEDDING PACKAGE',
      price: '6,000,000 UGX',
      description: 'The ultimate royal wedding coverage with 4 LED screens, mobile studio & full crew.',
      badge: 'Ultimate VIP Package',
      isPopular: true,
      features: [
        '2 Photographers & 2 Cinematographers (Up to location)',
        '4 LED Screens (Size 42" to 52")',
        'Pre-Wedding Photoshoot Session',
        '(12x18) Premium Hardcover PhotoBook',
        'Large A1 Photo Board',
        'Memory Lane Video Film',
        'Mobile Studio Setup on Location',
        'DVD with High-Resolution Photos & 6 Branded DVDs'
      ]
    },
    {
      id: 'wedding-gold',
      category: 'wedding',
      title: 'GOLD WEDDING PACKAGE',
      price: '3,500,000 UGX',
      description: 'Comprehensive wedding coverage featuring 2 LED screens and dual photo/video crew.',
      badge: 'Most Popular',
      features: [
        '2 Photographers & 2 Cinematographers (Up to location)',
        '2 LED Screens (Size 42" to 52")',
        '(12x18) Premium Hardcover PhotoBook',
        'Large A1 Photo Board',
        'DVD with High-Resolution Photos',
        '3 Branded DVDs'
      ]
    },
    {
      id: 'wedding-silver',
      category: 'wedding',
      title: 'SILVER WEDDING PACKAGE',
      price: '2,500,000 UGX',
      description: 'Full-day single-lead photo & video coverage with photobook and wall board.',
      badge: 'Standard Coverage',
      features: [
        '1 Photographer & 1 Cinematographer (Up to location)',
        '(12x16) Hardcover PhotoBook',
        'Large A2 Photo Board',
        'DVD with High-Resolution Photos',
        '3 Branded DVDs'
      ]
    },
    {
      id: 'wedding-bronze',
      category: 'wedding',
      title: 'BRONZE WEDDING PACKAGE',
      price: '2,000,000 UGX',
      description: 'Essential wedding coverage with 320-picture photo album and A3 board.',
      badge: 'Essential Wedding',
      features: [
        '1 Photographer & 1 Cinematographer',
        'Photo Album (320 Pictures)',
        'A3 Photo Board',
        'DVD with High-Resolution Images',
        '2 Branded DVDs'
      ]
    },
    {
      id: 'wedding-budget',
      category: 'wedding',
      title: 'BUDGET WEDDING PACKAGE',
      price: '1,000,000 UGX',
      description: 'Compact coverage for intimate weddings, civil ceremonies, and budget celebrations.',
      badge: 'Budget Friendly',
      features: [
        '1 Photographer & 1 Videographer',
        '120 (4x6) Pictures in Adhesive Album',
        '1 Video DVD'
      ]
    }
  ];

  const filteredPackages = selectedCategory === 'all'
    ? packages
    : packages.filter(p => p.category === selectedCategory);

  const handleWhatsAppBooking = (pkg: PackageItem) => {
    const lines = [
      `INQUIRY FOR PACKAGE: ${pkg.title.toUpperCase()}`,
      `----------------------------------------`,
      `Selected Package: ${pkg.title}`,
      `Listed Price: ${pkg.price}`,
      `Category: ${pkg.category.toUpperCase()}`,
      `----------------------------------------`,
      `Hello Paul, I would like to book or inquire about this package for my upcoming event/photoshoot.`
    ];
    const messageText = lines.join('\n');
    window.open(`https://wa.me/256757460297?text=${encodeURIComponent(messageText)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Background radial highlight */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-purple-950/30 via-neutral-950 to-black pointer-events-none" />

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase mb-4">
          OUR PACKAGES & PRICING
        </h1>
        <p className="text-sm sm:text-base text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
          Explore official photography & videography packages for Nikkah & Kukyala Ceremonies, Introduction (Kwanjula), Grand Weddings, Studio Sessions, and Outdoor Shoots.
        </p>

        {/* Category Tabs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 max-w-5xl mx-auto glass-panel p-2 rounded-2xl">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            All Packages
          </button>
          <button
            onClick={() => setSelectedCategory('nikkah-kukyala')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              selectedCategory === 'nikkah-kukyala'
                ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Nikkah & Kukyala Packages
          </button>
          <button
            onClick={() => setSelectedCategory('kwanjula')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              selectedCategory === 'kwanjula'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-semibold shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Introduction (Kwanjula)
          </button>
          <button
            onClick={() => setSelectedCategory('wedding')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              selectedCategory === 'wedding'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Wedding Packages
          </button>
          <button
            onClick={() => setSelectedCategory('studio')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              selectedCategory === 'studio'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Studio Sessions
          </button>
          <button
            onClick={() => setSelectedCategory('outdoor')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              selectedCategory === 'outdoor'
                ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Outdoor Shoots
          </button>
        </div>
      </motion.div>

      {/* Prominent Travel & Transportation Note */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-10 max-w-4xl mx-auto rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 p-4 sm:p-5 backdrop-blur-md shadow-lg shadow-amber-950/20"
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 shrink-0 mt-0.5 sm:mt-0">
            <Car className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-md border border-amber-400/30">
                Important Travel Policy
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed font-normal">
              <strong className="text-white font-bold">NOTE:</strong> Transportation fee of the team that's to shoot for the event (fuel charges are separate from the rate cards..) it's to be catered for by the client since the event is outside Kampala...and the team travels in a rental.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
        {filteredPackages.map((pkg, idx) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.05 }}
            className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
              pkg.isPopular
                ? 'glass-panel border-2 border-purple-500/60 shadow-2xl shadow-purple-900/30'
                : 'glass-panel-light border border-white/15 hover:border-white/30 shadow-xl'
            }`}
          >
            <div>
              {/* Top Badge Row */}
              <div className="flex items-center justify-between min-h-[28px] mb-3">
                {pkg.badge ? (
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    pkg.category === 'nikkah-kukyala'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : pkg.category === 'kwanjula'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                      : 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-md'
                  }`}>
                    {pkg.badge}
                  </span>
                ) : (
                  <span className="block h-5" />
                )}
              </div>

              {/* Title & Price */}
              <h3 className="text-xl font-extrabold text-white mb-4 leading-snug">{pkg.title}</h3>

              <div className="mb-6 pt-2 border-t border-white/10">
                <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-purple-300">
                  {pkg.price}
                </span>
              </div>

              {/* Features List */}
              <ul className="space-y-3 mb-8">
                {pkg.features.map((feat, fIdx) => (
                  <li key={fIdx} className="flex items-start gap-2.5 text-xs text-gray-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <button
                onClick={() => handleWhatsAppBooking(pkg)}
                className="w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-950/40"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Book via WhatsApp</span>
              </button>

              <button
                onClick={() => onNavigate('booking')}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Fill Booking Form</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Official Add-Ons & Extras Banner */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-16 glass-panel rounded-3xl p-6 sm:p-10 border border-cyan-500/30 shadow-2xl relative overflow-hidden"
      >
        <div className="text-center mb-8">
          <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-bold uppercase tracking-widest inline-block mb-3">
            Optional Enhancements & Referral Bonus
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Add-On Services & Special Offers</h2>
          <p className="text-xs sm:text-sm text-gray-300 mt-2 font-light">
            Customize your Nikkah, Kukyala, Introduction, or Wedding ceremony coverage with aerial drone shots, live projection, or referral rewards.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Drone Coverage</h3>
            </div>
            <p className="text-xs text-gray-300 mb-4 font-light">High-altitude 4K aerial videography & cinematic venue shots.</p>
            <span className="text-lg font-black text-cyan-300">500,000 UGX</span>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300">
                <Monitor className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Projector Screen</h3>
            </div>
            <p className="text-xs text-gray-300 mb-4 font-light">Live reception screening & real-time slideshow presentation.</p>
            <span className="text-lg font-black text-cyan-300">500,000 UGX</span>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300">
                <Gift className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-emerald-300">Referral Cash Bonus</h3>
            </div>
            <p className="text-xs text-emerald-200/80 mb-4 font-light">Tell a friend about us and earn cash when they book!</p>
            <span className="text-lg font-black text-emerald-400">Earn 100,000 UGX</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 space-y-4 text-center">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
              <strong className="text-amber-300 font-bold uppercase tracking-wider">NOTE:</strong> Transportation fee of the team that's to shoot for the event (fuel charges are separate from the rate cards..) it's to be catered for by the client since the event is outside Kampala...and the team travels in a rental.
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">
              Other Events We Cover
            </span>
            <p className="text-xs text-gray-300">
              Graduations • Birthdays • Bachelor Parties • Engagements • Baby Showers • Corporate Events & Music Reels
            </p>
          </div>
        </div>
      </motion.div>

      {/* Special Request Callout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-12 glass-panel rounded-3xl p-8 text-center border border-purple-500/30 max-w-4xl mx-auto"
      >
        <h3 className="text-xl font-bold text-white mb-2">Need a Custom Event Package?</h3>
        <p className="text-xs sm:text-sm text-gray-300 max-w-2xl mx-auto mb-6 font-light">
          Have a multi-day Nikkah or Kukyala ceremony, custom photobook size, or special location request? Contact CEO Kibalama Paul directly.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="https://wa.me/256757460297"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat Directly on WhatsApp (+256 757460297)</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
};
