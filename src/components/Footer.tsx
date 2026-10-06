import React from 'react';
import { PageRoute } from '../types';
import { Mail, Phone, ExternalLink } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: PageRoute) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const socials = [
    {
      name: 'WhatsApp Channel',
      url: 'https://whatsapp.com/channel/0029VauzDn7BVJl79HfkFx0h',
      color: 'hover:border-emerald-500 hover:text-emerald-400',
    },
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/paul_photography256?igsh=MWk4MW04b2hreWJwYQ==',
      color: 'hover:border-pink-500 hover:text-pink-400',
    },
    {
      name: 'TikTok',
      url: 'https://www.tiktok.com/@paulphotography256?_t=ZM-8whyFA0vtdo&_r=1',
      color: 'hover:border-neutral-300 hover:text-white',
    },
    {
      name: 'YouTube',
      url: 'https://youtube.com/@paulphotography256?si=D0AT51krGUbT07LV',
      color: 'hover:border-red-500 hover:text-red-400',
    },
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/kibalama.paul.94',
      color: 'hover:border-blue-500 hover:text-blue-400',
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/paul-photography-700861303?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
      color: 'hover:border-sky-500 hover:text-sky-400',
    },
  ];

  return (
    <footer className="relative z-20 border-t border-white/10 bg-black/80 backdrop-blur-md text-gray-300 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10 border-b border-white/10">
          {/* Brand info */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <img
                src="https://res.cloudinary.com/dirfcqs1f/image/upload/v1748599973/Group_1_tppp56.png"
                alt="Paul Photography"
                className="w-10 h-10 object-contain rounded-full bg-white/10 p-1"
              />
              <span className="text-lg font-bold tracking-wider text-white">PAUL PHOTOGRAPHY</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              Capturing moments, preserving memories. High-end portraiture, cinematography, weddings, and commercial photography by Kibalama Paul.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col space-y-2">
            <span className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Explore</span>
            <button
              onClick={() => onNavigate('home')}
              className="text-left text-sm text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Home Page
            </button>
            <button
              onClick={() => onNavigate('gallery')}
              className="text-left text-sm text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Photos by Paul (Flip Card Gallery)
            </button>
            <button
              onClick={() => onNavigate('portfolio')}
              className="text-left text-sm text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer"
            >
              The CEO Portfolio & Reels
            </button>
            <button
              onClick={() => onNavigate('booking')}
              className="text-left text-sm text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Book a Photoshoot
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className="text-left text-sm text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Get in Touch
            </button>
          </div>

          {/* Direct Contact info */}
          <div>
            <span className="text-sm font-semibold text-white uppercase tracking-wider mb-3 block">Direct Inquiries</span>
            <div className="space-y-3 text-sm text-gray-400">
              <a
                href="tel:+256757460297"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4 text-cyan-400" />
                <span>+256 757460297</span>
              </a>
              <a
                href="mailto:kibalamapaul70@gmail.com"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Mail className="w-4 h-4 text-purple-400" />
                <span>kibalamapaul70@gmail.com</span>
              </a>
              <a
                href="https://wa.me/256757460297"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-600/30 transition-all mt-2"
              >
                <span>Instant WhatsApp Hotline</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Social Badges Row */}
        <div className="pt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {socials.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-gray-300 transition-all ${s.color}`}
              >
                {s.name}
              </a>
            ))}
          </div>

          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Paul Photography. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
