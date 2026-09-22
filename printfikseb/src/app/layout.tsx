import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider } from '@/lib/cart';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
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
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#2559C7',
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
