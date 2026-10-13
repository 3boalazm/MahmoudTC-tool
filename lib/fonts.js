/**
 * lib/fonts.js
 * ---------------------------------------------------------------------------
 * Typefaces, loaded once through next/font so they are self-hosted, preloaded
 * and never cause a layout shift.
 *
 *   thmanyah Serif Display → headings (`h1`, `h2`, `.font-display`)
 *   IBM Plex Sans          → body text, Latin
 *   IBM Plex Sans Arabic   → body text, Arabic (first in RTL, see globals.css)
 *   Geist Mono             → numbers, ids and code (kept from the original UI)
 */

import localFont from 'next/font/local';
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google';


export const thmanyahSerifDisplay = localFont({
  variable: '--font-thmanyah-serif',
  display: 'swap',
  src: [
    { path: '../public/fonts/thmanyah-serif-display/thmanyahserifdisplay-Light.woff2', weight: '300', style: 'normal' },
    { path: '../public/fonts/thmanyah-serif-display/thmanyahserifdisplay-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/thmanyah-serif-display/thmanyahserifdisplay-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/thmanyah-serif-display/thmanyahserifdisplay-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../public/fonts/thmanyah-serif-display/thmanyahserifdisplay-Black.woff2', weight: '900', style: 'normal' },
  ],
});

export const ibmPlexSans = IBM_Plex_Sans({
  variable: '--font-ibm-plex-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: '--font-ibm-plex-sans-arabic',
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});
