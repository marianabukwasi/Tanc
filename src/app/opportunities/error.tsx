'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '40px 24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0a1628', margin: '0 0 8px' }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px' }}>
          We couldn&apos;t load the opportunities. Please try again.
        </p>
        <button
          onClick={reset}
          style={{ padding: '10px 24px', backgroundColor: '#d4a017', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
