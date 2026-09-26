import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider } from '@/lib/cart';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://printfiks.org'),
  title: {
    default: 'PrintFiksEB – 3D-print, reparasjon og design i Bergen',
    template: '%s · PrintFiksEB',
  },
  description:
    'PrintFiksEB er en elevbedrift på Skranevatnet skole. Vi 3D-printer, reparerer og designer det du trenger. Regn ut prisen selv, og få alltid et tilbud du må godkjenne før vi starter.',
  keywords: [
    '3D-print',
    '3D-printing Bergen',
    'elevbedrift',
    'Skranevatnet skole',
    'Sandsli',
    'reparasjon plast',
    'PLA',
    'PETG',
  ],
  openGraph: {
    type: 'website',
    locale: 'nb_NO',
    title: 'PrintFiksEB – ideer blir virkelighet',
    description:
      'Elevbedrift på Skranevatnet skole som 3D-printer, reparerer og designer. Regn ut prisen på sekunder.',
    images: ['/icon-512.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 24x24 32x32 48x48 64x64' },
      { url: '/icon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#6499F7',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
      </head>
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
