import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, MessageSquare, Send, CheckCircle2, Clock, MapPin, Sparkles } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleSendWhatsApp = () => {
    const text = `Hello Paul Photography,%0A%0AContact Inquiry:%0AName: ${encodeURIComponent(formData.name)}%0AEmail: ${encodeURIComponent(formData.email)}%0AMessage: ${encodeURIComponent(formData.message)}%0A%0AThank you!`;
    window.open(`https://wa.me/256757460297?text=${text}`, '_blank', 'noopener,noreferrer');
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
            src="https://res.cloudinary.com/dirfcqs1f/video/upload/v1748599923/0527_vf9mcb.mp4"
            type="video/mp4"
          />
        </video>
      </div>

      {/* Frosted Glass Overlay */}
      <div className="fixed inset-0 -z-10 bg-black/65 backdrop-blur-[10px]" />

      <div className="max-w-4xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass-panel-light rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-xs font-semibold text-cyan-200 uppercase tracking-widest mb-3">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>24/7 Rapid Response</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Get In Touch
            </h1>
            <p className="text-sm text-gray-300 mt-2">
              Have questions about pricing, dates, or custom projects? We'd love to hear from you.
            </p>
          </div>

          {/* Quick Communication Channels Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* Phone */}
            <a
              href="tel:+256757460297"
              className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all text-center flex flex-col items-center group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Phone className="w-5 h-5" />
              </div>
              <span className="text-xs uppercase font-bold text-gray-300">Call Direct</span>
              <span className="text-sm font-bold text-white mt-1">+256 757460297</span>
              <span className="text-[10px] text-cyan-300 mt-0.5">Click to dial</span>
            </a>

            {/* Email */}
            <a
              href="mailto:kibalamapaul70@gmail.com"
              className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all text-center flex flex-col items-center group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-xs uppercase font-bold text-gray-300">Email Us</span>
              <span className="text-xs font-bold text-white mt-1 break-all">kibalamapaul70@gmail.com</span>
              <span className="text-[10px] text-purple-300 mt-0.5">Direct inbox</span>
            </a>

            {/* WhatsApp */}
            <a
              href="https://wa.me/256757460297"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 transition-all text-center flex flex-col items-center group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-xs uppercase font-bold text-emerald-300">WhatsApp Chat</span>
              <span className="text-sm font-bold text-white mt-1">+256 757460297</span>
              <span className="text-[10px] text-emerald-400 mt-0.5">Instant messaging</span>
            </a>
          </div>

          {/* Form */}
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-1.5">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 neu-inset"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-1.5">
                    Your Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 neu-inset"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-200 mb-1.5">
                  Message *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tell us about your shoot requirements, date preferences, or vision..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 neu-inset"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Direct Message</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send via WhatsApp</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white/10 rounded-2xl p-6 sm:p-8 text-center border border-white/20">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Message Received!</h2>
              <p className="text-sm text-gray-300 max-w-md mx-auto mb-6">
                Thank you, <strong className="text-white">{formData.name}</strong>. Kibalama Paul has received your inquiry and will reach back out shortly.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleSendWhatsApp}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Follow up on WhatsApp</span>
                </button>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({ name: '', email: '', message: '' });
                  }}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer transition-all"
                >
                  Send Another Message
                </button>
              </div>
            </div>
          )}

          {/* Location & studio details */}
          <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Studio & On-Location available across Kampala & Uganda</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Operating Hours: Monday – Saturday (8:00 AM – 8:00 PM)</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
