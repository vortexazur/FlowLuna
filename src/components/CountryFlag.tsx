import React from 'react';
import { LanguageCode } from '../types';

interface CountryFlagProps {
  code: LanguageCode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * High-definition vector national flags for FlowLuna.
 * Avoids Windows Segoe UI Emoji regional indicator letter fallbacks (e.g. 'FR', 'GB' boxes).
 */
export const CountryFlag: React.FC<CountryFlagProps> = ({ code, className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-3',
    md: 'w-5 h-3.5',
    lg: 'w-6 h-4.5',
  }[size];

  const baseStyle = `inline-block shrink-0 rounded-[3px] overflow-hidden shadow-xs border border-black/15 dark:border-white/20 align-middle ${sizeClasses} ${className}`;

  switch (code) {
    case 'fr':
      // 🇫🇷 France: Blue, White, Red vertical tricolor
      return (
        <svg viewBox="0 0 900 600" className={baseStyle} aria-label="Français (France)">
          <rect width="300" height="600" fill="#002654" />
          <rect x="300" width="300" height="600" fill="#FFFFFF" />
          <rect x="600" width="300" height="600" fill="#CE1126" />
        </svg>
      );

    case 'en':
      // 🇬🇧 United Kingdom: Union Jack
      return (
        <svg viewBox="0 0 60 30" className={baseStyle} aria-label="English (UK/US)">
          <clipPath id="uk-clip">
            <rect width="60" height="30" />
          </clipPath>
          <g clipPath="url(#uk-clip)">
            <rect width="60" height="30" fill="#012169" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
            <path d="M0,0 L60,30" stroke="#C8102E" strokeWidth="2" />
            <path d="M60,0 L0,30" stroke="#C8102E" strokeWidth="2" />
            <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
            <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
          </g>
        </svg>
      );

    case 'es':
      // 🇪🇸 Spain: Red, Yellow (double height), Red horizontal bands
      return (
        <svg viewBox="0 0 750 500" className={baseStyle} aria-label="Español (España)">
          <rect width="750" height="500" fill="#AA151B" />
          <rect y="125" width="750" height="250" fill="#F1BF00" />
          {/* Stylized coat of arms marker */}
          <circle cx="230" cy="250" r="45" fill="#AA151B" opacity="0.85" />
          <circle cx="230" cy="250" r="32" fill="#F1BF00" />
        </svg>
      );

    case 'de':
      // 🇩🇪 Germany: Black, Red, Gold horizontal bands
      return (
        <svg viewBox="0 0 5 3" className={baseStyle} aria-label="Deutsch (Deutschland)">
          <rect width="5" height="1" y="0" fill="#000000" />
          <rect width="5" height="1" y="1" fill="#DD0000" />
          <rect width="5" height="1" y="2" fill="#FFCE00" />
        </svg>
      );

    case 'it':
      // 🇮🇹 Italy: Green, White, Red vertical tricolor
      return (
        <svg viewBox="0 0 900 600" className={baseStyle} aria-label="Italiano (Italia)">
          <rect width="300" height="600" fill="#009246" />
          <rect x="300" width="300" height="600" fill="#FFFFFF" />
          <rect x="600" width="300" height="600" fill="#CE2B37" />
        </svg>
      );

    case 'pt':
      // 🇵🇹 Portugal: Green (2/5), Red (3/5) with armillary emblem
      return (
        <svg viewBox="0 0 600 400" className={baseStyle} aria-label="Português (Portugal/Brasil)">
          <rect width="240" height="400" fill="#046A38" />
          <rect x="240" width="360" height="400" fill="#DA291C" />
          <circle cx="240" cy="200" r="65" fill="#FFC72C" />
          <circle cx="240" cy="200" r="48" fill="#DA291C" />
          <rect x="226" y="180" width="28" height="40" fill="#FFFFFF" rx="4" />
        </svg>
      );

    case 'ja':
      // 🇯🇵 Japan: White field with Red sun disc
      return (
        <svg viewBox="0 0 900 600" className={baseStyle} aria-label="日本語 (日本)">
          <rect width="900" height="600" fill="#FFFFFF" />
          <circle cx="450" cy="300" r="180" fill="#BC002D" />
        </svg>
      );

    case 'zh':
      // 🇨🇳 China: Red field with gold stars
      return (
        <svg viewBox="0 0 900 600" className={baseStyle} aria-label="中文 (中国)">
          <rect width="900" height="600" fill="#DE2910" />
          {/* Main big star */}
          <polygon
            points="150,50 178,136 268,136 195,189 223,275 150,222 77,275 105,189 32,136 122,136"
            fill="#FFDE00"
            transform="scale(0.8) translate(30, 20)"
          />
          {/* 4 small surrounding stars */}
          <polygon points="300,60 309,87 338,87 314,104 323,131 300,114 277,131 286,104 262,87 291,87" fill="#FFDE00" transform="scale(0.4) translate(400, 30)" />
          <polygon points="360,120 369,147 398,147 374,164 383,191 360,174 337,191 346,164 322,147 351,147" fill="#FFDE00" transform="scale(0.4) translate(500, 110)" />
          <polygon points="360,210 369,237 398,237 374,254 383,281 360,264 337,281 346,254 322,237 351,237" fill="#FFDE00" transform="scale(0.4) translate(500, 260)" />
          <polygon points="300,270 309,297 338,297 314,314 323,341 300,324 277,341 286,314 262,297 291,297" fill="#FFDE00" transform="scale(0.4) translate(400, 370)" />
        </svg>
      );

    case 'ru':
      // 🇷🇺 Russia: White, Blue, Red horizontal bands
      return (
        <svg viewBox="0 0 900 600" className={baseStyle} aria-label="Русский (Россия)">
          <rect width="900" height="200" y="0" fill="#FFFFFF" />
          <rect width="900" height="200" y="200" fill="#0039A6" />
          <rect width="900" height="200" y="400" fill="#D52B1E" />
        </svg>
      );

    default:
      return (
        <span className={`${baseStyle} bg-neutral-700 text-white text-[9px] font-mono flex items-center justify-center font-bold`}>
          {code.toUpperCase()}
        </span>
      );
  }
};
