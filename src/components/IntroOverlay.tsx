import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface IntroOverlayProps {
  onComplete?: () => void;
}

export const IntroOverlay: React.FC<IntroOverlayProps> = ({ onComplete }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Show intro animation then dismiss
    const timer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, 2200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleSkip = () => {
    setVisible(false);
    if (onComplete) onComplete();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl"
          onClick={handleSkip}
        >
          <div className="relative flex flex-col items-center text-center p-6 cursor-pointer">
            {/* Spinning logo with glow */}
            <motion.div
              initial={{ scale: 0.7, rotate: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ duration: 1.8, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative w-36 h-36 md:w-44 md:h-44 flex items-center justify-center mb-6"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600/30 to-cyan-500/30 blur-xl animate-pulse" />
              <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full p-1 bg-gradient-to-tr from-purple-500 via-pink-500 to-cyan-400 shadow-[0_0_35px_rgba(168,85,247,0.4)]">
                <div className="w-full h-full rounded-full bg-black/90 flex items-center justify-center p-5">
                  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-cyan-300" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3.8" stroke="url(#cameraIntroGrad)" strokeWidth="1.8" />
                    <circle cx="12" cy="13" r="1.8" fill="url(#cameraIntroGrad)" />
                    <defs>
                      <linearGradient id="cameraIntroGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#c084fc" />
                        <stop offset="100%" stopColor="#22d3ee" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-2xl md:text-3xl font-bold tracking-wider text-white uppercase font-sans"
            >
              Paul Photography
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="text-xs md:text-sm text-gray-300 mt-2 tracking-widest uppercase"
            >
              Capturing Moments • Preserving Memories
            </motion.p>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '120px' }}
              transition={{ delay: 0.5, duration: 1.2 }}
              className="h-0.5 bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-500 rounded-full mt-4"
            />

            <span className="text-[11px] text-gray-500 mt-6 tracking-wide">
              Click anywhere to skip
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
