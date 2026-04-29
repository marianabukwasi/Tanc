import type { Metadata } from 'next'
import './globals.css'
import ChatAssistant from '@/components/ChatAssistant'

export const metadata: Metadata = {
  title: 'TANC — Every Opportunity. One Place.',
  description:
    'Find scholarships, fellowships, internships, exchange programs and conferences. All in one place.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ChatAssistant />
      </body>
    </html>
  )
}
