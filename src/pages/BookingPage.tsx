import React, { useState } from 'react';
import { BookingSubmission } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, User, Mail, Phone, CheckCircle2, MessageCircle,
  ExternalLink, ShieldCheck, MapPin, Wallet, Copy, Check, Smartphone,
  CreditCard, AlertCircle
} from 'lucide-react';

export const BookingPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    datetime: '',
    shootType: '',
    location: '',
    budget: '',
    notes: '',
    paymentMethod: 'Airtel Money',
    paymentConfirmed: true,
    transactionId: '',
    amountPaid: '',
    senderPhone: ''
  });

  const [copiedNumber, setCopiedNumber] = useState(false);
  const [submittedBooking, setSubmittedBooking] = useState<BookingSubmission | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const AIRTEL_NUMBER = '0757460297';
  const AIRTEL_INTL = '+256 757460297';
  const AIRTEL_NAME = 'Kawulukusi Godfrey';

  const handleCopyAirtel = () => {
    navigator.clipboard.writeText(AIRTEL_NUMBER);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2500);
  };

  const shootTypes = [
    "Reels",
    "Wedding",
    "Graphics Design",
    "Web and APP development",
    "Kwanjula",
    "Nikkah",
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
      `📸 BOOKING REQUEST - PAUL PHOTOGRAPHY`,
      `----------------------------------------`,
      `Booking Ref: ${booking.id}`,
      `Client Name: ${booking.name}`,
      `Phone / WhatsApp: ${booking.phone || 'N/A'}`,
      `Email Address: ${booking.email || 'N/A'}`,
      `Shoot / Service Category: ${booking.shootType}`,
      `Preferred Date & Time: ${formattedDate}`,
      `Location / Venue: ${booking.location || 'Not specified'}`,
      `Estimated Budget / Package: ${booking.budget || 'Not specified'}`,
      `Special Notes: ${booking.notes || 'None provided'}`,
      `----------------------------------------`,
      `💳 AIRTEL MONEY PAYMENT:`,
      booking.paymentStatus === 'confirmed'
        ? `✅ PAYMENT STATUS: CONFIRMED BY CLIENT`
        : `⏳ PAYMENT STATUS: PENDING / TO BE PAID`,
      `Recipient: ${AIRTEL_INTL} (${AIRTEL_NAME})`,
      booking.amountPaid ? `Amount Paid: UGX ${booking.amountPaid}` : `Amount Paid: N/A`,
      booking.transactionId ? `Airtel Transaction ID: ${booking.transactionId}` : `Transaction ID: None`,
      booking.senderPhone ? `Sender Phone (MTN/Airtel/All Networks): ${booking.senderPhone}` : '',
      `----------------------------------------`,
      `Sent directly via Paul Photography Booking Hub`
    ].filter(Boolean);

    const messageText = lines.join('\n');
    const url = `https://wa.me/256757460297?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const isConfirmed = formData.paymentConfirmed;

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
      paymentMethod: 'Airtel Money',
      paymentStatus: isConfirmed ? 'confirmed' : 'pending',
      transactionId: formData.transactionId.trim() || undefined,
      amountPaid: formData.amountPaid.trim() || undefined,
      senderPhone: formData.senderPhone.trim() || undefined,
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

            {/* Direct Airtel Money Payment Section */}
            <div className="rounded-2xl border-2 border-red-500/40 bg-gradient-to-br from-red-950/30 via-neutral-900 to-black p-5 sm:p-6 shadow-xl relative overflow-hidden">
              {/* Glow accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 text-[10px] font-extrabold uppercase tracking-widest inline-flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Airtel Money Uganda</span>
                </span>
                <span className="text-[11px] text-gray-400 font-medium">Direct CEO Line</span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                Pay Directly via Airtel Money
              </h3>
              <p className="text-xs text-gray-300 mb-4 leading-relaxed font-light">
                Secure your photoshoot slot by transferring your deposit or full payment directly to our official Airtel Money number.
              </p>

              {/* Account Number Box */}
              <div className="bg-black/60 rounded-xl p-4 border border-red-500/30 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block mb-0.5">
                    Airtel Merchant / Phone Number
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl font-black text-white tracking-wider font-mono">
                      {AIRTEL_INTL}
                    </span>
                    <span className="text-xs text-gray-400">({AIRTEL_NUMBER})</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 block mt-0.5">
                    Account Name: <strong className="text-white">{AIRTEL_NAME}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyAirtel}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-200 border border-red-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    {copiedNumber ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-emerald-300 font-bold">Number Copied!</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <Copy className="w-4 h-4 shrink-0" />
                        <span>Copy Number</span>
                      </span>
                    )}
                  </button>
                  <a
                    href="tel:*185*1*0757460297%23"
                    className="px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 border border-white/20 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all"
                    title="Dial USSD on phone"
                  >
                    <span>Dial *185#</span>
                  </a>
                </div>
              </div>

              {/* Quick 3-Step Instruction */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5 text-[11px] text-gray-300">
                <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                  <span className="font-bold text-red-400 block mb-0.5">1. Dial *185#</span>
                  <span>Select Send Money to <strong>0757460297</strong></span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                  <span className="font-bold text-red-400 block mb-0.5">2. Verify Name</span>
                  <span>Confirm recipient displays <strong>Kawulukusi Godfrey</strong></span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                  <span className="font-bold text-red-400 block mb-0.5">3. Copy Txn ID</span>
                  <span>Input the SMS Transaction ID below to confirm</span>
                </div>
              </div>

              {/* Toggle to Confirm Payment */}
              <div className="pt-3 border-t border-white/10">
                <label className="flex items-center gap-3 cursor-pointer select-none mb-4 group">
                  <input
                    type="checkbox"
                    checked={formData.paymentConfirmed}
                    onChange={(e) => setFormData({ ...formData, paymentConfirmed: e.target.checked })}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-neutral-900 border-white/30 cursor-pointer shrink-0"
                  />
                  <span className="text-xs sm:text-sm font-semibold text-white leading-normal">
                    I have sent / confirm my Airtel Money payment for this shoot
                  </span>
                </label>

                {formData.paymentConfirmed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 bg-black/40 p-4 rounded-xl border border-red-500/20"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Transaction ID */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-1.5">
                          Airtel Transaction ID / Ref *
                        </label>
                        <input
                          type="text"
                          required={formData.paymentConfirmed}
                          placeholder="e.g. MP261007.1420.A192"
                          value={formData.transactionId}
                          onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-neutral-900 border border-white/20 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 font-mono"
                        />
                      </div>

                      {/* Amount Paid */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-1.5">
                          Amount Paid (UGX) *
                        </label>
                        <input
                          type="text"
                          required={formData.paymentConfirmed}
                          placeholder="e.g. 100,000"
                          value={formData.amountPaid}
                          onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-neutral-900 border border-white/20 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
                        />
                      </div>
                    </div>

                    {/* Quick amount presets */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-gray-400 uppercase font-medium mr-1">Quick Select:</span>
                      {['50,000', '100,000', '150,000', '200,000', '300,000', '500,000'].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setFormData({ ...formData, amountPaid: amt })}
                          className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-white/10 hover:bg-white/20 text-gray-200 border border-white/10 transition-colors cursor-pointer"
                        >
                          {amt}
                        </button>
                      ))}
                    </div>

                    {/* Sender's Phone Number (All Networks) */}
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-300 mb-1">
                        Sender's Phone Number (MTN, Airtel, or Any Network)
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 077... / 078... / 070... / 075... (All networks accepted)"
                        value={formData.senderPhone}
                        onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-neutral-900 border border-white/20 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
                      />
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        If sending from an MTN, Airtel, or friend's line, enter that number here so we can confirm the sender.
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 px-4 rounded-2xl text-white font-bold text-sm sm:text-base shadow-xl neu-button flex items-center justify-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] mt-4 ${
                formData.paymentConfirmed
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-emerald-600 hover:from-red-500 hover:to-emerald-500 shadow-red-900/30'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 shadow-emerald-900/40'
              }`}
            >
              {isSubmitting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  <span>Transmitting Booking & Payment Details...</span>
                </span>
              ) : formData.paymentConfirmed ? (
                <span className="inline-flex items-center justify-center gap-2.5 text-center leading-none">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 self-center" />
                  <span className="translate-y-[0.5px]">Confirm Airtel Payment & Submit Booking</span>
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2.5 text-center leading-none">
                  <MessageCircle className="w-5 h-5 text-emerald-200 shrink-0 self-center" />
                  <span className="translate-y-[0.5px]">Send Booking to CEO WhatsApp (+256 757460297)</span>
                </span>
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

              {/* Confirmed Airtel Money Payment Card */}
              {submittedBooking.paymentStatus === 'confirmed' ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-red-950/60 to-black border-2 border-red-500/50 text-left mb-6 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Airtel Money Confirmed</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                      Paid to 0757460297
                    </span>
                  </div>
                  {submittedBooking.amountPaid && (
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-white/10">
                      <span className="text-gray-300">Amount Paid:</span>
                      <span className="font-bold text-sm text-emerald-300">UGX {submittedBooking.amountPaid}</span>
                    </div>
                  )}
                  {submittedBooking.transactionId && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300">Airtel Txn ID:</span>
                      <span className="font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded border border-white/10">
                        {submittedBooking.transactionId}
                      </span>
                    </div>
                  )}
                  {submittedBooking.senderPhone && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300">Sender Number:</span>
                      <span className="font-mono text-gray-200">{submittedBooking.senderPhone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-neutral-900 border border-white/10 text-xs text-gray-300 text-left mb-6">
                  <span className="text-gray-400">Payment: </span>
                  <span>Pending / To be finalized during consultation.</span>
                </div>
              )}

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

