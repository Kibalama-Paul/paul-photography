import React, { useState } from 'react';
import { BookingSubmission } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, User, Mail, Phone, Sparkles, CheckCircle2, MessageCircle, ExternalLink, ShieldCheck, MapPin, Wallet } from 'lucide-react';

export const BookingPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    datetime: '',
    shootType: '',
    location: '',
    budget: '',
    notes: ''
  });

  const [submittedBooking, setSubmittedBooking] = useState<BookingSubmission | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shootTypes = [
    "Reels",
    "Wedding",
    "Graphics Design",
    "Web and APP development",
    "Kwanjula",
    "Niha",
    "Kuhingira",
    "Birthday party",
    "Indoor Photoshoot",
    "Outdoor Photoshoot",
    "Kukyala",
    "Baby shoot",
    "Graduation shoot"
  ];

  const openWhatsAppBooking = (booking: BookingSubmission) => {
    const formattedDate = booking.datetime ? booking.datetime.replace('T', ' at ') : 'N/A';
    
    const lines = [
      `NEW BOOKING REQUEST - PAUL PHOTOGRAPHY`,
      `----------------------------------------`,
      `Booking Ref: ${booking.id}`,
      `Client Name: ${booking.name}`,
      `Phone / WhatsApp: ${booking.phone || 'N/A'}`,
      `Email Address: ${booking.email || 'N/A'}`,
      `Shoot / Service Category: ${booking.shootType}`,
      `Preferred Date & Time: ${formattedDate}`,
      `Location / Venue: ${booking.location || 'Not specified'}`,
      `Estimated Budget / Package: ${booking.budget || 'Not specified'}`,
      `Special Notes / Details: ${booking.notes || 'None provided'}`,
      `----------------------------------------`,
      `Sent directly via Paul Photography Booking Hub`
    ];

    const messageText = lines.join('\n');
    const url = `https://wa.me/256757460297?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newBooking: BookingSubmission = {
      id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      datetime: formData.datetime,
      shootType: formData.shootType,
      location: formData.location,
      budget: formData.budget,
      notes: formData.notes,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    // Store in localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('paul_bookings') || '[]');
      localStorage.setItem('paul_bookings', JSON.stringify([newBooking, ...existing]));
    } catch (err) {
      console.warn('Local storage write ignored:', err);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedBooking(newBooking);
      // Auto dispatch to CEO WhatsApp with all captured data
      openWhatsAppBooking(newBooking);
    }, 500);
  };

  return (
    <div className="relative min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      {/* Background Video */}
      <div className="fixed inset-0 -z-20 overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover scale-105"
        >
          <source
            src="https://res.cloudinary.com/dirfcqs1f/video/upload/v1748599938/bedroom_w0zjbg.mp4"
            type="video/mp4"
          />
        </video>
      </div>

      {/* Frosted Glass Overlay */}
      <div className="fixed inset-0 -z-10 bg-black/60 backdrop-blur-[10px]" />

      <div className="max-w-2xl w-full">
        {/* Main Booking Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="glass-panel-light rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Book Your Photoshoot
            </h1>
            <p className="text-sm text-gray-300 mt-2">
              Reserve your slot with Paul Photography. Every detail entered is captured and transmitted directly to CEO Kibalama Paul on WhatsApp (+256 757460297).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 neu-inset"
                />
              </div>
            </div>

            {/* Email & Phone grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 neu-inset"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-2">
                  Phone / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    required
                    placeholder="+256 700 000 000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 neu-inset"
                  />
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-2">
                Preferred Date & Time *
              </label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="datetime-local"
                  required
                  value={formData.datetime}
                  onChange={(e) => setFormData({ ...formData, datetime: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 neu-inset"
                />
              </div>
            </div>

            {/* Type of Shoot */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-2">
                Type of Shoot / Service *
              </label>
              <select
                required
                value={formData.shootType}
                onChange={(e) => setFormData({ ...formData, shootType: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-900 border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 neu-inset"
              >
                <option value="" disabled className="bg-neutral-900 text-gray-400">
                  Select a shoot category...
                </option>
                {shootTypes.map((type) => (
                  <option key={type} value={type} className="bg-neutral-900 text-white">
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Location & Budget grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Location / Venue */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-2">
                  Location / Venue
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="e.g. Kampala / Speke Resort / Studio"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 neu-inset"
                  />
                </div>
              </div>

              {/* Estimated Budget */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-2">
                  Estimated Budget / Package
                </label>
                <div className="relative">
                  <Wallet className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="e.g. UGX 500,000 / Flexible"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 neu-inset"
                  />
                </div>
              </div>
            </div>

            {/* Additional details / notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-2">
                Special Requests / Additional Details
              </label>
              <textarea
                rows={3}
                placeholder="Specific requirements, theme ideas, outfit changes, number of guests..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 neu-inset"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-white font-bold text-base shadow-xl shadow-emerald-900/40 neu-button flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
            >
              {isSubmitting ? (
                <span>Transmitting Booking...</span>
              ) : (
                <>
                  <MessageCircle className="w-5 h-5 text-emerald-200" />
                  <span>Send Booking to CEO WhatsApp (+256 757460297)</span>
                </>
              )}
            </button>
          </form>

          {/* Guarantee info */}
          <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-gray-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Fast response guaranteed within 2 hours by Kibalama Paul</span>
          </div>
        </motion.div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {submittedBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setSubmittedBooking(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel max-w-md w-full rounded-3xl p-6 sm:p-8 text-center border border-white/20 shadow-2xl relative"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
                {submittedBooking.id}
              </span>

              <h2 className="text-2xl font-bold text-white mt-3 mb-2">
                Booking Recorded & Sent!
              </h2>

              <p className="text-xs text-gray-300 mb-6">
                Thank you <strong className="text-white">{submittedBooking.name}</strong>. All your entered details have been compiled and transmitted to CEO Kibalama Paul on WhatsApp.
              </p>

              <div className="bg-white/5 rounded-2xl p-4 text-left text-xs text-gray-300 space-y-2 mb-6 border border-white/10">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="font-semibold text-white">{submittedBooking.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Phone:</span>
                  <span className="font-semibold text-emerald-400">{submittedBooking.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="font-semibold text-white">{submittedBooking.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Date & Time:</span>
                  <span className="font-semibold text-white">{submittedBooking.datetime.replace('T', ' at ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Category:</span>
                  <span className="font-semibold text-cyan-300">{submittedBooking.shootType}</span>
                </div>
                {submittedBooking.location && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Location:</span>
                    <span className="font-semibold text-gray-200 truncate max-w-[180px]">{submittedBooking.location}</span>
                  </div>
                )}
                {submittedBooking.budget && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Budget:</span>
                    <span className="font-semibold text-emerald-300 truncate max-w-[180px]">{submittedBooking.budget}</span>
                  </div>
                )}
                {submittedBooking.notes && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Notes:</span>
                    <span className="font-semibold text-gray-200 truncate max-w-[180px]">{submittedBooking.notes}</span>
                  </div>
                )}
              </div>

              {/* Direct WhatsApp dispatch button */}
              <button
                onClick={() => openWhatsAppBooking(submittedBooking)}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105 mb-3"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Open WhatsApp to Resend Details (+256 757460297)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setSubmittedBooking(null)}
                className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer py-1"
              >
                Close & Return
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

