import React, { useState } from 'react';
import { BookingSubmission } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, User, Mail, Sparkles, CheckCircle2, MessageCircle, ExternalLink, ShieldCheck } from 'lucide-react';

export const BookingPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    datetime: '',
    shootType: '',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newBooking: BookingSubmission = {
      id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
      name: formData.name,
      email: formData.email,
      datetime: formData.datetime,
      shootType: formData.shootType,
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
    }, 600);
  };

  const openWhatsAppBooking = (booking: BookingSubmission) => {
    const formattedDate = booking.datetime.replace('T', ' at ');
    const text = `Hello Paul Photography,%0A%0AI would like to book a photoshoot.%0A%0ABooking Ref: ${booking.id}%0AName: ${encodeURIComponent(booking.name)}%0AEmail: ${encodeURIComponent(booking.email)}%0ADate & Time: ${encodeURIComponent(formattedDate)}%0AShoot Type: ${encodeURIComponent(booking.shootType)}${booking.notes ? `%0ANotes: ${encodeURIComponent(booking.notes)}` : ''}%0A%0AThank you!`;
    const url = `https://wa.me/256757460297?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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
          {/* Top header badge */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-xs font-semibold text-cyan-200 uppercase tracking-widest mb-3">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>Direct Reservation</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Book Your Photoshoot
            </h1>
            <p className="text-sm text-gray-300 mt-2">
              Reserve your slot with Paul Photography. Confirmations are synced instantly via WhatsApp hotline.
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
                Type of Shoot *
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

            {/* Additional details / notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-2">
                Location & Details (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Preferred venue, outdoor location, or specific requirements..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 neu-inset"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-base shadow-xl shadow-purple-900/40 neu-button flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
            >
              {isSubmitting ? (
                <span>Generating Booking...</span>
              ) : (
                <>
                  <Calendar className="w-5 h-5" />
                  <span>Confirm Photoshoot Request</span>
                </>
              )}
            </button>
          </form>

          {/* Guarantee info */}
          <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-gray-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Fast response guaranteed within 2 hours via WhatsApp or Phone</span>
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
                Booking Request Recorded!
              </h2>

              <p className="text-xs text-gray-300 mb-6">
                Thank you <strong className="text-white">{submittedBooking.name}</strong>. Your requested date for a <strong className="text-cyan-300">{submittedBooking.shootType}</strong> session has been prepared.
              </p>

              <div className="bg-white/5 rounded-2xl p-4 text-left text-xs text-gray-300 space-y-2 mb-6 border border-white/10">
                <div className="flex justify-between">
                  <span className="text-gray-400">Date & Time:</span>
                  <span className="font-semibold text-white">{submittedBooking.datetime.replace('T', ' at ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="font-semibold text-white">{submittedBooking.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Category:</span>
                  <span className="font-semibold text-cyan-300">{submittedBooking.shootType}</span>
                </div>
              </div>

              {/* Direct WhatsApp dispatch button */}
              <button
                onClick={() => openWhatsAppBooking(submittedBooking)}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105 mb-3"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send to WhatsApp (+256 757460297)</span>
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
