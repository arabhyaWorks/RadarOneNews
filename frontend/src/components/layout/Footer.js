import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Newspaper, MapPin, Phone, Mail, ChevronRight } from 'lucide-react';
import branding from '../../config/branding';

export const Footer = () => {
  const { t, isHindi } = useLanguage();
  const { isAuthenticated } = useAuth();

  const categories = [
    { id: 'sports', name: t('sports') },
    { id: 'crime', name: t('crime') },
    { id: 'politics', name: t('politics') },
    { id: 'entertainment', name: t('entertainment') },
    { id: 'business', name: t('business') },
    { id: 'technology', name: t('technology') },
  ];

  const font = isHindi ? 'font-hindi' : '';
  const headFont = isHindi ? 'font-hindi-heading' : 'font-heading';

  return (
    <footer className="footer mt-16">

      {/* Top wave divider */}
      <div style={{ lineHeight: 0, overflow: 'hidden' }}>
        <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"
          style={{ display: 'block', width: '100%', height: '60px' }}>
          <path
            d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z"
            fill="rgba(255,255,255,0.06)"
          />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-10 pb-4">

        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-12 gap-x-6 gap-y-8 md:gap-10 pb-8 md:pb-10 border-b border-white/10">

          {/* Brand col — wider */}
          <div className="col-span-2 md:col-span-4 md:mb-0">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-5">
              <div className="relative w-11 h-11 flex-shrink-0">
                <div className="w-11 h-11 rounded-full bg-white/10 border-2 border-[#f4c430] flex items-center justify-center">
                  <Newspaper className="w-5 h-5 text-[#f4c430]" />
                </div>
              </div>
              <div>
                <h3 className={`text-xl font-bold text-white leading-none ${headFont}`}>
                  {isHindi ? branding.nameHi : branding.name}
                </h3>
                <p className="text-[#f4c430] text-[10px] md:text-xs font-semibold tracking-widest uppercase mt-1 md:mt-0.5">
                  {isHindi ? 'हिंदी न्यूज़' : 'Hindi & English News'}
                </p>
              </div>
            </div>

            <p className={`text-white/60 text-xs md:text-sm leading-relaxed mb-4 md:mb-6 ${font}`}>
              {isHindi
                ? `${branding.nameHi} — ${branding.descriptionHi}`
                : `${branding.name} — ${branding.description}`}
            </p>

            {/* Contact info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white/50 text-xs">
                <MapPin className="w-3.5 h-3.5 text-[#f4c430] flex-shrink-0" />
                <span className={font}>{isHindi ? branding.addressHi : branding.address}</span>
              </div>
              <div className="flex items-center gap-2 text-white/50 text-xs">
                <Mail className="w-3.5 h-3.5 text-[#f4c430] flex-shrink-0" />
                <span>{branding.email}</span>
              </div>
              <div className="flex items-center gap-2 text-white/50 text-xs">
                <Phone className="w-3.5 h-3.5 text-[#f4c430] flex-shrink-0" />
                <span>{branding.phone}</span>
              </div>
            </div>
          </div>

          {/* Categories col */}
          <div className="col-span-1 md:col-span-3">
            <h4 className={`text-[#f4c430] text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3 md:mb-5 ${font}`}>
              {isHindi ? 'श्रेणियां' : 'Categories'}
            </h4>
            <ul className="space-y-1.5 md:space-y-2.5">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/category/${cat.id}`}
                    className={`group flex items-center gap-1.5 text-xs md:text-sm text-white/60 hover:text-[#f4c430] transition-colors ${font}`}
                  >
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#f4c430]" />
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links col */}
          <div className="col-span-1 md:col-span-2">
            <h4 className={`text-[#f4c430] text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3 md:mb-5 ${font}`}>
              {isHindi ? 'त्वरित लिंक' : 'Quick Links'}
            </h4>
            <ul className="space-y-1.5 md:space-y-2.5">
              {[
                { to: '/', label: t('home') },
                { to: '/login', label: t('login') },
                { to: '/signup', label: t('signup') },
                { to: '/dashboard', label: t('dashboard') },
                isAuthenticated && { to: '/leaderboard', label: isHindi ? 'लीडरबोर्ड' : 'Leaderboard' },
              ].filter(Boolean).map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className={`group flex items-center gap-1.5 text-xs md:text-sm text-white/60 hover:text-[#f4c430] transition-colors ${font}`}
                  >
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#f4c430]" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal col */}
          <div className="col-span-2 sm:col-span-1 md:col-span-3">
            <h4 className={`text-[#f4c430] text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3 md:mb-5 ${font}`}>
              {isHindi ? 'कानूनी' : 'Legal'}
            </h4>
            <ul className="space-y-1.5 md:space-y-2.5 grid grid-cols-2 sm:grid-cols-1">
              {[
                t('aboutUs'),
                t('contactUs'),
                t('privacyPolicy'),
                t('termsOfService'),
              ].map((item) => (
                <li key={item}>
                  <span className={`text-xs md:text-sm text-white/60 cursor-default select-none ${font}`}>{item}</span>
                </li>
              ))}
            </ul>

            {/* Tagline badge */}
            <div className="mt-8 inline-flex items-center gap-2 px-3 py-2 rounded bg-white/5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className={`text-xs text-white/50 ${font}`}>
                {isHindi ? 'लाइव न्यूज़ अपडेट' : 'Live News Updates'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-3 text-center md:text-left">
          <div className={`text-xs text-white/40 ${font} flex flex-col md:flex-row items-center gap-1.5`}>
            <span>© {new Date().getFullYear()} {isHindi ? branding.nameHi : branding.name}.</span>
            <span className="hidden md:inline">|</span>
            <span>
              Designed and developed by{' '}
              <a
                href="https://civiccraft.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#f4c430] hover:text-[#f4c430]/80 font-medium transition-colors"
              >
                Civiccraft Online Solutions Pvt. Ltd.
              </a>
            </span>
          </div>
          <div className="flex items-center gap-4">
            {['Sports', 'Politics', 'Technology', 'Business'].map((tag) => (
              <Link
                key={tag}
                to={`/category/${tag.toLowerCase()}`}
                className="text-xs text-white/25 hover:text-white/60 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
