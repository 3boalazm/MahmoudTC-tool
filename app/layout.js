import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

import './globals.css';

const title = 'Speech to Text Studio';
const description =
  'Convert audio files or live microphone recordings into accurate text. Powered by Deepgram Nova-2 with an automatic Gladia fallback, proxied securely through Next.js API routes.';

export const metadata = {
  title: {
    default: title,
    template: `%s · ${title}`,
  },
  description,
  applicationName: title,
  keywords: [
    'speech to text',
    'transcription',
    'audio to text',
    'Deepgram',
    'Gladia',
    'Nova-2',
    'Next.js',
  ],
  authors: [{ name: 'MahmoudTC' }],
  openGraph: {
    title,
    description,
    type: 'website',
    siteName: title,
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  themeColor: '#070a13',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh bg-canvas font-sans text-ink-100 antialiased">
        <a
          href="#studio"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-iris-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to the transcriber
        </a>
        {children}
      </body>
    </html>
  );
}
