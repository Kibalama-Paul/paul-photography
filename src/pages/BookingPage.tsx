import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BookingSubmission } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, User, Phone, CheckCircle2, MessageCircle,
  ExternalLink, ShieldCheck, MapPin, Wallet, Copy, Check, Smartphone,
  AlertCircle, Hourglass, Sparkles, BadgeCheck, XCircle, ShieldX, FileDown, Printer
} from 'lucide-react';
import { bookingToReceiptData, printReceipt, downloadReceiptHTML } from '../utils/receiptGenerator';

// ────────────────────────────────────────────────────────────────────
// Airtel Money Uganda Transaction ID validator
// Format: MP + 6-digit date (YYMMDD) + . + 4-digit time (HHMM) + . + 3-8 alphanumeric
// Examples: MP261007.1420.A192  |  MP261008.0915.B34C
// ────────────────────────────────────────────────────────────────────
const AIRTEL_TXN_REGEX = /^MP\d{6}\.\d{4}\.[A-Z0-9]{3,8}$/i;

type TxnValidity = 'idle' | 'valid' | 'invalid';

const validateTxnId = (id: string): TxnValidity => {
  if (!id.trim()) return 'idle';
  return AIRTEL_TXN_REGEX.test(id.trim().toUpperCase()) ? 'valid' : 'invalid';
};

// ─── Floating particle for the celebration screen ───────────────────
const Particle: React.FC<{ delay: number; x: number; color: string }> = ({ delay, x, color }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-full pointer-events-none"
    style={{ left: `${x}%`, bottom: 0, background: color }}
    initial={{ y: 0, opacity: 1, scale: 1 }}
    animate={{ y: -320, opacity: 0, scale: 0, x: (Math.random() - 0.5) * 120 }}
    transition={{ duration: 1.6 + Math.random() * 0.8, delay, ease: 'easeOut' }}
  />
);

// ─── Pulsing ring around the hourglass ──────────────────────────────
const PulseRing: React.FC = () => (
  <>
    {[0, 0.6, 1.2].map((delay, i) => (
      <motion.div
        key={i}
        className="absolute inset-0 rounded-full border border-amber-400/40"
        initial={{ scale: 1, opacity: 0.8 }}
        animate={{ scale: 2.2 + i * 0.4, opacity: 0 }}
        transition={{ duration: 2, delay, repeat: Infinity, ease: 'easeOut' }}
      />
    ))}
  </>
);

export const BookingPage: React.FC = () => {
  // ── Form state ──────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    datetime: '',
    shootType: '',
    location: '',
    budget: '',
    notes: '',
    paymentConfirmed: true,
    transactionId: '',
    amountPaid: '',
    senderPhone: ''
  });

  const [copiedNumber, setCopiedNumber] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Transaction ID validation state ────────────────────────────────
  const [txnValidity, setTxnValidity] = useState<TxnValidity>('idle');
  const [txnTouched, setTxnTouched] = useState(false);

  // ── Phase: 'form' | 'pending' | 'approved' ─────────────────────────
  const [phase, setPhase] = useState<'form' | 'pending' | 'approved'>('form');
  const [pendingBooking, setPendingBooking] = useState<BookingSubmission | null>(null);
  const [approvedBooking, setApprovedBooking] = useState<BookingSubmission | null>(null);
  const [showParticles, setShowParticles] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const AIRTEL_NUMBER = '0757460297';
  const AIRTEL_INTL = '+256 757460297';
  const AIRTEL_NAME = 'Kawulukusi Godfrey';

  const shootTypes = [
    "Reels", "Wedding", "Graphics Design", "Web and APP development",
    "Kwanjula", "Nikkah", "Kuhingira", "Birthday party",
    "Indoor Photoshoot", "Outdoor Photoshoot", "Kukyala",
    "Baby shoot", "Graduation shoot"
  ];

  // ── Validate transaction ID reactively ─────────────────────────────
  const handleTxnChange = useCallback((val: string) => {
    setFormData(prev => ({ ...prev, transactionId: val }));
    if (txnTouched || val.length > 3) {
      setTxnTouched(true);
      setTxnValidity(validateTxnId(val));
    }
  }, [txnTouched]);

  // ── Poll localStorage for admin approval ────────────────────────────
  useEffect(() => {
    if (phase !== 'pending' || !pendingBooking) return;
    pollRef.current = setInterval(() => {
      try {
        const raw = localStorage.getItem('paul_bookings') || '[]';
        const bookings: BookingSubmission[] = JSON.parse(raw);
        const found = bookings.find((b) => b.id === pendingBooking.id);
        if (found?.adminApproved) {
          clearInterval(pollRef.current!);
          setApprovedBooking(found);
          setPhase('approved');
          setShowParticles(true);
          setTimeout(() => setShowParticles(false), 2500);
        }
      } catch (_) {}
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [phase, pendingBooking]);

  // ── Helpers ─────────────────────────────────────────────────────────
  const handleCopyAirtel = () => {
    navigator.clipboard.writeText(AIRTEL_NUMBER);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2500);
  };

  const openWhatsApp = (booking: BookingSubmission) => {
    const lines = [
      `📸 BOOKING REQUEST - PAUL PHOTOGRAPHY`,
      `----------------------------------------`,
      `Booking Ref: ${booking.id}`,
      `Client Name: ${booking.name}`,
      `Phone / WhatsApp: ${booking.phone || 'N/A'}`,
      `Shoot / Service Category: ${booking.shootType}`,
      `Preferred Date & Time: ${booking.datetime?.replace('T', ' at ')}`,
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
      booking.senderPhone ? `Sender Phone: ${booking.senderPhone}` : '',
      `----------------------------------------`,
      `Sent directly via Paul Photography Booking Hub`
    ].filter(Boolean);
    window.open(`https://wa.me/256757460297?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer');
  };

  // ── Submit ──────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Block if transaction ID is entered but invalid
    if (formData.paymentConfirmed && formData.transactionId.trim()) {
      const validity = validateTxnId(formData.transactionId);
      setTxnTouched(true);
      setTxnValidity(validity);
      if (validity === 'invalid') return;
    }

    setIsSubmitting(true);

    const newBooking: BookingSubmission = {
      id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
      name: formData.name,
      email: '',
      phone: formData.phone,
      datetime: formData.datetime,
      shootType: formData.shootType,
      location: formData.location,
      budget: formData.budget,
      notes: formData.notes,
      status: 'pending',
      paymentMethod: 'Airtel Money',
      paymentStatus: formData.paymentConfirmed ? 'confirmed' : 'pending',
      transactionId: formData.transactionId.trim() || undefined,
      amountPaid: formData.amountPaid.trim() || undefined,
      senderPhone: formData.senderPhone.trim() || undefined,
      createdAt: new Date().toISOString(),
      adminApproved: false
    };

    try {
      const existing = JSON.parse(localStorage.getItem('paul_bookings') || '[]');
      localStorage.setItem('paul_bookings', JSON.stringify([newBooking, ...existing]));
    } catch (_) {}

    setTimeout(() => {
      setIsSubmitting(false);
      setPendingBooking(newBooking);
      setPhase('pending');
      openWhatsApp(newBooking);
    }, 600);
  };

  // ── Particle config ─────────────────────────────────────────────────
  const particles = Array.from({ length: 28 }).map((_, i) => ({
    delay: i * 0.07,
    x: 5 + (i * 3.5) % 90,
    color: ['#34d399', '#60a5fa', '#f59e0b', '#a78bfa', '#f472b6'][i % 5]
  }));

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="relative min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 flex items-center justify-center">

      {/* Background Video */}
      <div className="fixed inset-0 -z-20 overflow-hidden">
        <video autoPlay muted loop playsInline className="w-full h-full object-cover scale-105">
          <source src="https://res.cloudinary.com/dirfcqs1f/video/upload/v1748599938/bedroom_w0zjbg.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="fixed inset-0 -z-10 bg-black/60 backdrop-blur-[10px]" />

      {/* ── PHASE: PENDING APPROVAL OVERLAY ─────────────────────────── */}
      <AnimatePresence>
        {phase === 'pending' && pendingBooking && (
          <motion.div
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.85, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 22 }}
              className="max-w-sm w-full text-center"
            >
              <div className="relative w-24 h-24 mx-auto mb-8">
                <PulseRing />
                <div className="absolute inset-0 rounded-full bg-amber-500/10 border-2 border-amber-400/60 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: [0, 0, 180, 180, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.4, 0.5, 0.9, 1] }}
                  >
                    <Hourglass className="w-10 h-10 text-amber-400" />
                  </motion.div>
                </div>
              </div>

              <span className="inline-block text-xs font-mono uppercase tracking-widest text-amber-400 bg-amber-950/70 px-4 py-1.5 rounded-full border border-amber-500/40 mb-5">
                {pendingBooking.id}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">Awaiting Admin Approval</h2>
              <p className="text-sm text-gray-300 mb-2 leading-relaxed">
                Your booking &amp; payment details have been sent to CEO <strong className="text-white">Kibalama Paul</strong> via WhatsApp.
              </p>
              <p className="text-xs text-gray-400 mb-8 leading-relaxed">
                Please keep this page open. You'll see a confirmation here <strong className="text-amber-300">as soon as the admin approves your booking</strong>. This usually takes under 2 hours.
              </p>

              <div className="flex items-center justify-center gap-2 mb-8">
                {[0, 0.2, 0.4].map((delay, i) => (
                  <motion.div key={i} className="w-2.5 h-2.5 rounded-full bg-amber-400"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.4, delay, repeat: Infinity, ease: 'easeInOut' }} />
                ))}
              </div>

              <div className="bg-white/5 rounded-2xl p-4 text-left text-xs text-gray-300 space-y-2 border border-white/10 mb-6">
                <div className="flex justify-between"><span className="text-gray-400">Name</span><span className="font-semibold text-white">{pendingBooking.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Service</span><span className="font-semibold text-cyan-300">{pendingBooking.shootType}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Date</span><span className="font-semibold text-white">{pendingBooking.datetime.replace('T', ' at ')}</span></div>
                {pendingBooking.amountPaid && (
                  <div className="flex justify-between"><span className="text-gray-400">Paid</span><span className="font-bold text-emerald-400">UGX {pendingBooking.amountPaid}</span></div>
                )}
                {pendingBooking.transactionId && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Txn ID</span>
                    <span className="font-mono text-[11px] text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">{pendingBooking.transactionId}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 border-t border-white/10">
                  <span className="text-gray-400">Status</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40 uppercase tracking-wide">⏳ Pending Admin Review</span>
                </div>
              </div>

              <button onClick={() => openWhatsApp(pendingBooking)}
                className="w-full py-3 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105 mb-3">
                <MessageCircle className="w-4 h-4" /><span>Resend to CEO WhatsApp</span><ExternalLink className="w-3.5 h-3.5" />
              </button>
              <p className="text-[11px] text-gray-500 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />Do not close this tab — approval check is running every 3 seconds
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PHASE: APPROVED CELEBRATION OVERLAY ─────────────────────── */}
      <AnimatePresence>
        {phase === 'approved' && approvedBooking && (
          <motion.div key="approved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 overflow-hidden">
            {showParticles && particles.map((p, i) => <Particle key={i} {...p} />)}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl" />
            </div>

            <motion.div initial={{ scale: 0.7, y: 60 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 20, delay: 0.1 }}
              className="max-w-md w-full text-center relative z-10">

              <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.3 }}
                className="relative w-28 h-28 mx-auto mb-6">
                <motion.div className="absolute inset-0 rounded-full bg-emerald-400/20 border-2 border-emerald-400/60"
                  animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                  <BadgeCheck className="w-12 h-12 text-white" strokeWidth={1.5} />
                </div>
                {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                  <motion.div key={i} className="absolute top-1/2 left-1/2 w-2 h-2"
                    style={{ transformOrigin: '50% 0px' }} initial={{ rotate: deg, y: -52 }}
                    animate={{ rotate: deg + 360 }} transition={{ duration: 6 + i * 0.3, repeat: Infinity, ease: 'linear' }}>
                    <Sparkles className="w-3 h-3 text-emerald-300 -translate-x-1/2 -translate-y-1/2" />
                  </motion.div>
                ))}
              </motion.div>

              <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="inline-block text-xs font-mono uppercase tracking-widest text-emerald-400 bg-emerald-950/70 px-4 py-1.5 rounded-full border border-emerald-500/40 mb-5">
                {approvedBooking.id} — APPROVED
              </motion.span>
              <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                className="text-3xl sm:text-4xl font-extrabold text-white mb-3">🎉 Booking Confirmed!</motion.h2>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
                className="text-sm text-gray-300 mb-2 leading-relaxed">
                <strong className="text-white">{approvedBooking.name}</strong>, your booking has been{' '}
                <span className="text-emerald-400 font-bold">officially approved</span> by CEO Kibalama Paul. You're all set!
              </motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}
                className="text-xs text-gray-400 mb-8">
                Expect a personal WhatsApp message from the CEO with your final shoot details.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                className="bg-white/5 rounded-2xl p-4 text-left text-xs text-gray-300 space-y-2 border border-emerald-500/20 mb-6">
                <div className="flex justify-between"><span className="text-gray-400">Name</span><span className="font-semibold text-white">{approvedBooking.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Phone</span><span className="font-semibold text-emerald-400">{approvedBooking.phone || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Service</span><span className="font-semibold text-cyan-300">{approvedBooking.shootType}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Date &amp; Time</span><span className="font-semibold text-white">{approvedBooking.datetime.replace('T', ' at ')}</span></div>
                {approvedBooking.location && (<div className="flex justify-between"><span className="text-gray-400">Location</span><span className="font-semibold text-gray-200 truncate max-w-[180px]">{approvedBooking.location}</span></div>)}
                {approvedBooking.amountPaid && (<div className="flex justify-between"><span className="text-gray-400">Amount Paid</span><span className="font-bold text-emerald-400">UGX {approvedBooking.amountPaid}</span></div>)}
                <div className="flex justify-between items-center pt-1 border-t border-white/10">
                  <span className="text-gray-400">Status</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 uppercase tracking-wide flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Admin Approved
                  </span>
                </div>
                {approvedBooking.adminApprovedAt && (
                  <div className="flex justify-between"><span className="text-gray-400">Approved at</span><span className="text-gray-300 text-[11px]">{new Date(approvedBooking.adminApprovedAt).toLocaleString()}</span></div>
                )}
              </motion.div>

              {/* Action buttons */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
                className="flex flex-col sm:flex-row gap-2.5 mb-3">
                <button
                  onClick={() => printReceipt(bookingToReceiptData(approvedBooking))}
                  className="flex-1 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105 shadow-lg shadow-violet-900/40">
                  <Printer className="w-4 h-4" /><span>Print Receipt</span>
                </button>
                <button
                  onClick={() => downloadReceiptHTML(bookingToReceiptData(approvedBooking))}
                  className="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105 shadow-lg shadow-indigo-900/40">
                  <FileDown className="w-4 h-4" /><span>Download Receipt</span>
                </button>
              </motion.div>
              <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05 }}
                onClick={() => openWhatsApp(approvedBooking)}
                className="w-full py-3 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105 mb-3">
                <MessageCircle className="w-4 h-4" /><span>Message CEO on WhatsApp</span><ExternalLink className="w-3.5 h-3.5" />
              </motion.button>

              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
                onClick={() => {
                  setPhase('form'); setPendingBooking(null); setApprovedBooking(null);
                  setTxnValidity('idle'); setTxnTouched(false);
                  setFormData({ name: '', phone: '', datetime: '', shootType: '', location: '', budget: '', notes: '', paymentConfirmed: true, transactionId: '', amountPaid: '', senderPhone: '' });
                }}
                className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer py-1">
                Make another booking
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PHASE: BOOKING FORM ──────────────────────────────────────── */}
      <div className="max-w-2xl w-full">
        <motion.div initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6 }} className="glass-panel-light rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Book Your Photoshoot</h1>
            <p className="text-sm text-gray-300 mt-2">
              Reserve your slot with Paul Photography. After payment, your booking goes to CEO Kibalama Paul for review — you'll be notified here once approved.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-2">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                <input type="text" required placeholder="e.g. Sarah Jenkins"
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 neu-inset" />
              </div>
            </div>

            {/* Phone only (email removed) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-2">Phone / WhatsApp *</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                <input type="tel" required placeholder="+256 700 000 000"
                  value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 neu-inset" />
              </div>
            </div>

            {/* Date & Time */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-2">Preferred Date & Time *</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                <input type="datetime-local" required
                  value={formData.datetime} onChange={(e) => setFormData({ ...formData, datetime: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 neu-inset" />
              </div>
            </div>

            {/* Type of Shoot */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-2">Type of Shoot / Service *</label>
              <select required value={formData.shootType} onChange={(e) => setFormData({ ...formData, shootType: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-900 border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 neu-inset">
                <option value="" disabled className="bg-neutral-900 text-gray-400">Select a shoot category...</option>
                {shootTypes.map((type) => (
                  <option key={type} value={type} className="bg-neutral-900 text-white">{type}</option>
                ))}
              </select>
            </div>

            {/* Location & Budget */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-2">Location / Venue</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="e.g. Kampala / Speke Resort / Studio"
                    value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 neu-inset" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-2">Estimated Budget / Package</label>
                <div className="relative">
                  <Wallet className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="e.g. UGX 500,000 / Flexible"
                    value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 neu-inset" />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-2">Special Requests / Additional Details</label>
              <textarea rows={3} placeholder="Specific requirements, theme ideas, outfit changes, number of guests..."
                value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 neu-inset" />
            </div>

            {/* ── Airtel Money Section ── */}
            <div className="rounded-2xl border-2 border-red-500/40 bg-gradient-to-br from-red-950/30 via-neutral-900 to-black p-5 sm:p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-500/40 text-[10px] font-extrabold uppercase tracking-widest inline-flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" /><span>Airtel Money Uganda</span>
                </span>
                <span className="text-[11px] text-gray-400 font-medium">Direct CEO Line</span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white mb-1">Pay Directly via Airtel Money</h3>
              <p className="text-xs text-gray-300 mb-4 leading-relaxed font-light">
                Secure your photoshoot slot by transferring your deposit or full payment to our official Airtel Money number.
              </p>

              {/* Number box */}
              <div className="bg-black/60 rounded-xl p-4 border border-red-500/30 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block mb-0.5">Airtel Merchant / Phone Number</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl font-black text-white tracking-wider font-mono">{AIRTEL_INTL}</span>
                    <span className="text-xs text-gray-400">({AIRTEL_NUMBER})</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 block mt-0.5">
                    Account Name: <strong className="text-white">{AIRTEL_NAME}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button type="button" onClick={handleCopyAirtel}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-200 border border-red-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95">
                    {copiedNumber ? (
                      <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /><span className="text-emerald-300 font-bold">Number Copied!</span></span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5"><Copy className="w-4 h-4 shrink-0" /><span>Copy Number</span></span>
                    )}
                  </button>
                  <a href="tel:*185*1*0757460297%23"
                    className="px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 border border-white/20 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all" title="Dial USSD on phone">
                    <span>Dial *185#</span>
                  </a>
                </div>
              </div>

              {/* Steps */}
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

              {/* Payment confirmation toggle */}
              <div className="pt-3 border-t border-white/10">
                <label className="flex items-center gap-3 cursor-pointer select-none mb-4">
                  <input type="checkbox" checked={formData.paymentConfirmed}
                    onChange={(e) => setFormData({ ...formData, paymentConfirmed: e.target.checked })}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-neutral-900 border-white/30 cursor-pointer shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-white leading-normal">
                    I have sent / confirm my Airtel Money payment for this shoot
                  </span>
                </label>

                {formData.paymentConfirmed && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 bg-black/40 p-4 rounded-xl border border-red-500/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                      {/* ── Transaction ID with live validation ── */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-1.5">
                          Airtel Transaction ID / Ref *
                        </label>

                        {/* Input wrapper */}
                        <div className="relative">
                          <input
                            type="text"
                            required={formData.paymentConfirmed}
                            placeholder="e.g. MP261007.1420.A192"
                            value={formData.transactionId}
                            onChange={(e) => handleTxnChange(e.target.value)}
                            onBlur={() => {
                              if (formData.transactionId.trim()) {
                                setTxnTouched(true);
                                setTxnValidity(validateTxnId(formData.transactionId));
                              }
                            }}
                            className={`w-full px-3.5 py-2.5 pr-10 bg-neutral-900 border rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none font-mono transition-all ${
                              txnValidity === 'valid'
                                ? 'border-emerald-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400'
                                : txnValidity === 'invalid'
                                ? 'border-red-500 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                                : 'border-white/20 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                            }`}
                          />
                          {/* Validity icon */}
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <AnimatePresence mode="wait">
                              {txnValidity === 'valid' && (
                                <motion.div key="valid" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                </motion.div>
                              )}
                              {txnValidity === 'invalid' && (
                                <motion.div key="invalid" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                  <XCircle className="w-4 h-4 text-red-400" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Validation feedback banner */}
                        <AnimatePresence>
                          {txnValidity === 'valid' && (
                            <motion.div key="valid-msg"
                              initial={{ opacity: 0, y: -4, height: 0 }}
                              animate={{ opacity: 1, y: 0, height: 'auto' }}
                              exit={{ opacity: 0, y: -4, height: 0 }}
                              className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-300 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>✅ Valid Airtel Money Transaction ID detected — your payment is verifiable.</span>
                            </motion.div>
                          )}
                          {txnValidity === 'invalid' && (
                            <motion.div key="invalid-msg"
                              initial={{ opacity: 0, y: -4, height: 0 }}
                              animate={{ opacity: 1, y: 0, height: 'auto' }}
                              exit={{ opacity: 0, y: -4, height: 0 }}
                              className="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-950/70 border border-red-500/40">
                              <ShieldX className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs text-red-300 font-bold">Invalid Transaction ID Format</p>
                                <p className="text-[11px] text-red-400/80 mt-0.5 leading-relaxed">
                                  Airtel Money IDs follow the format <span className="font-mono text-red-300">MP261007.1420.A192</span>.
                                  Please copy the exact ID from your Airtel confirmation SMS.
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Format hint when idle */}
                        {txnValidity === 'idle' && (
                          <p className="text-[10px] text-gray-500 mt-1">
                            Format: <span className="font-mono text-gray-400">MP</span> + date + <span className="font-mono text-gray-400">.</span> + time + <span className="font-mono text-gray-400">.</span> + code &nbsp;•&nbsp; Copied from your Airtel SMS
                          </p>
                        )}
                      </div>

                      {/* Amount Paid */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-1.5">Amount Paid (UGX) *</label>
                        <input type="text" required={formData.paymentConfirmed} placeholder="e.g. 100,000"
                          value={formData.amountPaid} onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-neutral-900 border border-white/20 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400" />
                        {/* Quick amount presets */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-[10px] text-gray-400 uppercase font-medium mr-1">Quick:</span>
                          {['50,000', '100,000', '150,000', '200,000', '300,000', '500,000'].map((amt) => (
                            <button key={amt} type="button" onClick={() => setFormData({ ...formData, amountPaid: amt })}
                              className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-white/10 hover:bg-white/20 text-gray-200 border border-white/10 transition-colors cursor-pointer">
                              {amt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Sender Phone */}
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-300 mb-1">Sender's Phone Number (MTN, Airtel, or Any Network)</label>
                      <input type="tel" placeholder="e.g. 077... / 078... / 070... / 075..."
                        value={formData.senderPhone} onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-neutral-900 border border-white/20 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-400" />
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        If sending from an MTN, Airtel, or friend's line, enter that number so we can confirm the sender.
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Invalid TXN ID block warning just above submit */}
            <AnimatePresence>
              {txnValidity === 'invalid' && formData.paymentConfirmed && (
                <motion.div
                  key="submit-block"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-950/60 border border-red-500/50 text-xs text-red-300">
                  <ShieldX className="w-4 h-4 shrink-0 text-red-400" />
                  <span><strong>Submission blocked.</strong> Please enter a valid Airtel Money Transaction ID from your SMS before proceeding.</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button type="submit" disabled={isSubmitting || (txnValidity === 'invalid' && formData.paymentConfirmed)}
              className={`w-full py-4 px-4 rounded-2xl text-white font-bold text-sm sm:text-base shadow-xl neu-button flex items-center justify-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                formData.paymentConfirmed
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-emerald-600 hover:from-red-500 hover:to-emerald-500 shadow-red-900/30'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 shadow-emerald-900/40'
              }`}>
              {isSubmitting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  <span>Transmitting to CEO Kibalama Paul...</span>
                </span>
              ) : formData.paymentConfirmed ? (
                <span className="inline-flex items-center justify-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                  <span>Confirm Payment & Submit for Admin Approval</span>
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2.5">
                  <MessageCircle className="w-5 h-5 text-emerald-200 shrink-0" />
                  <span>Send Booking to CEO WhatsApp</span>
                </span>
              )}
            </button>
          </form>

          {/* Info footer */}
          <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-gray-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />Fast response within 2 hours by Kibalama Paul
            </span>
            <span className="hidden sm:block text-gray-600">•</span>
            <span className="flex items-center gap-1.5 text-amber-400/80">
              <Hourglass className="w-3.5 h-3.5" /><span>You'll see a live approval notification on this page</span>
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
