import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Signal 626 | UFO Sightings Global Intelligence Platform',
  description:
    'Interactive global map of 150,000+ UFO sightings spanning 626 years (1400-2026). Tactical intelligence interface for exploring NUFORC data.',
  keywords: ['UFO', 'sightings', 'NUFORC', 'map', 'Signal 626', 'UAP'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
      </head>
      <body className="bg-signal-darker text-gray-200 font-mono antialiased">
        <Providers>{children}</Providers>
        {/* Vignette */}
        <div className="vignette-overlay" />
        {/* Scanline overlay */}
        <div className="scanline-overlay" />
        <div className="scanline-bar" />
        {/* Grid overlay */}
        <div className="grid-overlay" />
      </body>
    </html>
  );
}
