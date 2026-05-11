import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import ChatAssistant from '@/components/ChatAssistant'
import NavBar from '@/components/Navbar'

export const metadata: Metadata = {
  title: {
    default: 'TANC — Global Opportunity Platform',
    template: '%s | TANC',
  },
  description:
    'Discover scholarships, fellowships, retreats, conferences, sports events and more — matched to your profile. Free forever.',
  openGraph: {
    title: 'TANC — Global Opportunity Platform',
    description:
      'Discover scholarships, fellowships, retreats, conferences, sports events and more — matched to your profile. Free forever.',
    url: 'https://tancglobal.com',
    siteName: 'TANC',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TANC — Global Opportunity Platform',
    description:
      'Discover scholarships, fellowships, retreats, conferences, sports events and more — matched to your profile. Free forever.',
  },
  metadataBase: new URL('https://tancglobal.com'),
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        {ADSENSE_CLIENT && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body>
        <NavBar />
        {children}
        <ChatAssistant />
      </body>
    </html>
  )
}
