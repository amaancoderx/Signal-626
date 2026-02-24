import type { Metadata, Viewport } from 'next';
import { Orbitron, JetBrains_Mono, Rajdhani, Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const rajdhani = Rajdhani({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-rajdhani',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Signal 626 | UFO Sightings Global Intelligence Platform',
  description:
    'Interactive global map of 150,000+ UFO sightings spanning 626 years (1400-2026). Tactical intelligence interface for exploring NUFORC data.',
  keywords: ['UFO', 'sightings', 'NUFORC', 'map', 'Signal 626', 'UAP'],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${orbitron.variable} ${jetbrainsMono.variable} ${rajdhani.variable} ${inter.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <head />
      <body className="bg-[#05070B] text-signal-bright font-mono antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
        {/* Vignette — navy tinted */}
        <div className="vignette-overlay" />
        {/* Scanline overlay — blue tinted */}
        <div className="scanline-overlay" />
        <div className="scanline-bar" />
        {/* Grid overlay — cyan tinted */}
        <div className="grid-overlay" />
      </body>
    </html>
  );
}
