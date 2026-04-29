'use client'

import { useEffect } from 'react'

type AdSize = 'banner' | 'rectangle' | 'leaderboard'

const SIZE_STYLES: Record<AdSize, { minHeight: number; maxWidth?: number }> = {
  banner:      { minHeight: 90 },
  rectangle:   { minHeight: 250 },
  leaderboard: { minHeight: 90, maxWidth: 728 },
}

interface AdBannerProps {
  slot: string
  size?: AdSize
}

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

export default function AdBanner({ slot, size = 'banner' }: AdBannerProps) {
  const { minHeight, maxWidth } = SIZE_STYLES[size]

  useEffect(() => {
    if (!CLIENT) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).adsbygoogle = (window as any).adsbygoogle || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).adsbygoogle.push({})
    } catch {
      // ignore
    }
  }, [])

  if (!CLIENT) {
    return (
      <div
        style={{
          minHeight,
          maxWidth,
          width: '100%',
          backgroundColor: '#f8fafc',
          border: '1px dashed #e2e8f0',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: '12px',
          letterSpacing: '0.05em',
          userSelect: 'none',
        }}
      >
        Advertisement
      </div>
    )
  }

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', minHeight, maxWidth, width: '100%' }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}
