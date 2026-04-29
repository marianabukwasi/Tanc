import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import ChatAssistant from '@/components/ChatAssistant'

export const metadata: Metadata = {
  title: 'TANC — Every Opportunity. One Place.',
  description:
    'Find scholarships, fellowships, internships, exchange programs and conferences. All in one place.',
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
        {children}
        <ChatAssistant />
      </body>
    </html>
  )
}
