'use client'

import Link from 'next/link'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '40px 24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0a1628', margin: '0 0 8px' }}>
          Couldn&apos;t load this opportunity
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px' }}>
          There was a problem fetching this page. It may have been removed or there&apos;s a temporary issue.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{ padding: '10px 20px', backgroundColor: '#1B2A6B', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
          >
            Try again
          </button>
          <Link
            href="/opportunities"
            style={{ padding: '10px 20px', backgroundColor: '#ffffff', color: '#0a1628', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}
          >
            Browse all
          </Link>
        </div>
      </div>
    </div>
  )
}
