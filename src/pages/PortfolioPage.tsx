import React, { useState, useEffect } from 'react';
import { PageRoute } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Briefcase, Film, Calendar, CheckCircle, Sparkles, Play, Pause } from 'lucide-react';

interface PortfolioPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ onNavigate }) => {
  const profileImages = [
    "https://res.cloudinary.com/dirfcqs1f/image/upload/v1748599977/OBI_8725_arcf8s.jpg",
    "https://res.cloudinary.com/dirfcqs1f/image/upload/v1748599977/_MG_2308_ecpaj0.jpg",
    "https://res.cloudinary.com/dirfcqs1f/image/upload/v1748599978/IMG_9943_wdykjr.jpg",
    "https://res.cloudinary.com/dirfcqs1f/image/upload/v1748599976/_MG_0860_lms0rk.jpg",
    "https://res.cloudinary.com/dirfcqs1f/image/upload/v1748599977/_PIT9552_zdb4rf.jpg",
    "https://res.cloudinary.com/dirfcqs1f/image/upload/v1748599974/IMG_0154_ytjsqi.jpg",
    "https://res.cloudinary.com/dirfcqs1f/image/upload/v1748599975/OBI_8756_rgpico.jpg",
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlayingReel, setIsPlayingReel] = useState(true);

  // Auto-cycle profile images every 2.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % profileImages.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [profileImages.length]);

  const skills = [
    "Portrait Photography",
    "Landscape Photography",
    "Event Photography",
    "Photo Editing & Retouching",
    "Studio Lighting",
    "Cinematography",
    "Graphics Editing",
    "UI & UX Designer",
    "IT Personnel",
    "Motion Image Colorist"
  ];

  const experience = [
    {
      role: "Senior Photographer",
      company: "BUGEMA UNIVERSITY MEDIA",
      period: "2023 - Present",
      description: "Directing high-profile university events, official media documentation, and visual brand identity."
    },
    {
      role: "Cinematographer",
      company: "Nezer Studio",
      period: "2016 - Present",
      description: "Crafting cinematic commercials, music reels, high-end wedding films, and color grading."
    },
    {
      role: "Freelance Creative Director",
      company: "Independent",
      period: "2016 - 2022",
      description: "Delivered over 500 bespoke portraits, weddings, fashion shoots, and corporate coverage."
    },
    {
      role: "Photography Workshop Instructor",
      company: "Media Arts Initiative",
      period: "2016 - 2020",
      description: "Mentoring emerging photographers in manual exposure, lighting setups, and post-production."
    }
  ];

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Background ambient gradient */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/20 via-neutral-950 to-black pointer-events-none" />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden"
      >
        {/* Header Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-300 uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Creative Director & Lead Photographer</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
            KIBALAMA PAUL <span className="text-purple-400">(CEO)</span>
          </h1>
          <p className="text-sm text-gray-400 mt-2 font-light">
            Bugema University Media Senior Photographer • 10+ Years Industry Excellence
          </p>
        </div>

        {/* Profile Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center mb-14">
          {/* Dynamic Profile Image Rotator */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="relative w-64 h-80 sm:w-72 sm:h-96 rounded-3xl overflow-hidden shadow-2xl border-2 border-purple-500/30 group">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImageIndex}
                  src={profileImages[currentImageIndex]}
                  alt="Kibalama Paul"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                <span className="font-semibold bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-md">
                  Kibalama Paul
                </span>
                <span className="text-[10px] text-gray-300 bg-purple-900/60 px-2 py-0.5 rounded-md">
                  {currentImageIndex + 1} / {profileImages.length}
                </span>
              </div>
            </div>

            {/* Thumbnail dots selector */}
            <div className="flex gap-2 mt-4">
              {profileImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImageIndex(i)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    i === currentImageIndex ? 'w-6 bg-cyan-400' : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                  aria-label={`Photo ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Bio text */}
          <div className="md:col-span-7">
            <div className="glass-panel-light p-6 sm:p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span>About Me</span>
                <span className="w-12 h-0.5 bg-gradient-to-r from-cyan-400 to-transparent" />
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4 text-base">
                Hello! I'm <strong className="text-white font-semibold">Kibalama Paul</strong>, a passionate visual artist and cinematographer with over a decade of hands-on experience capturing life's most unforgettable moments.
              </p>
              <p className="text-gray-300 leading-relaxed mb-6 text-base">
                From high-fashion studio portraits to documentary-grade university ceremonies and commercial productions, I bring meticulous lighting, intentional composition, and premium color grading to every frame.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={() => onNavigate('booking')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-purple-900/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book with Kibalama Paul</span>
                </button>
                <button
                  onClick={() => onNavigate('gallery')}
                  className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span>View All 100+ Works</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Skills & Capabilities */}
        <div className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Award className="w-6 h-6 text-purple-400" />
            <span>Core Expertise & Skills</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {skills.map((skill, index) => (
              <motion.div
                key={skill}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index % 5), duration: 0.4 }}
                className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-purple-400/40 hover:bg-white/10 transition-all flex items-center gap-2.5 text-xs sm:text-sm font-medium text-gray-200"
              >
                <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{skill}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Work Experience */}
        <div className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-cyan-400" />
            <span>Work Experience & Milestones</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {experience.map((exp, idx) => (
              <motion.div
                key={exp.role + exp.company}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx, duration: 0.4 }}
                className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/30 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-bold text-white">{exp.role}</h3>
                  <span className="text-[11px] font-semibold text-purple-300 bg-purple-900/40 border border-purple-500/30 px-2 py-0.5 rounded-full">
                    {exp.period}
                  </span>
                </div>
                <div className="text-xs font-semibold text-cyan-300 mb-2">{exp.company}</div>
                <p className="text-xs text-gray-400 leading-relaxed">{exp.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* THE CEO REEL Video Section - Portrait Reel Format */}
        <div className="pt-8 border-t border-white/10">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-300 uppercase tracking-widest mb-2">
              <Film className="w-3.5 h-3.5 text-red-400" />
              <span>Portrait Reel Format</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">THE CEO REEL</h2>
            <p className="text-xs text-gray-400 mt-1">Official portrait video showreel featuring Kibalama Paul</p>
          </div>

          <div className="max-w-xs sm:max-w-sm mx-auto rounded-3xl overflow-hidden border-2 border-purple-500/40 shadow-2xl bg-black relative aspect-[9/16] group">
            <video
              controls
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            >
              <source
                src="https://res.cloudinary.com/dirfcqs1f/video/upload/v1762193474/paulo_fdm1ai.mp4"
                type="video/mp4"
              />
              Your browser does not support HTML5 video.
            </video>
            {/* Reel Badge Header */}
            <div className="absolute top-3 left-3 right-3 flex justify-between items-center pointer-events-none">
              <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                REEL • 9:16 PORTRAIT
              </span>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
