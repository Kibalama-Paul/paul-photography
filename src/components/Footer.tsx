import React from 'react';
import { PageRoute } from '../types';
import { Mail, Phone, ExternalLink } from 'lucide-react';

interface FooterProps {
  onNavigate?: (page: PageRoute) => void;
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="relative z-20 border-t border-white/10 bg-black/80 backdrop-blur-md text-gray-300 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Direct Contact info */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 text-sm text-gray-400">
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-600/30 transition-all"
            >
              <span>Instant WhatsApp Hotline</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="text-xs text-gray-500 text-center sm:text-right">
            <span>© {new Date().getFullYear()} Paul Photography. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

