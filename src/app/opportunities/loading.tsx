export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      {/* Search bar skeleton */}
      <div style={{ backgroundColor: '#0a1628', padding: '32px 24px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <div style={{ width: '300px', height: '28px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div style={{ width: '100%', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
        </div>
      </div>

      {/* Cards skeleton */}
      <div style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: '70px', height: '22px', borderRadius: '20px', backgroundColor: '#f1f5f9' }} />
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#f1f5f9' }} />
            </div>
            <div style={{ width: '85%', height: '18px', borderRadius: '4px', backgroundColor: '#f1f5f9' }} />
            <div style={{ width: '55%', height: '14px', borderRadius: '4px', backgroundColor: '#f1f5f9' }} />
            <div style={{ width: '70%', height: '14px', borderRadius: '4px', backgroundColor: '#f1f5f9' }} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <div style={{ width: '80px', height: '32px', borderRadius: '8px', backgroundColor: '#f1f5f9' }} />
              <div style={{ width: '80px', height: '32px', borderRadius: '8px', backgroundColor: '#f1f5f9' }} />
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        div[style*="background-color: #f1f5f9"] { animation: pulse 1.5s ease-in-out infinite; }
        div[style*="background-color: rgba(255,255,255,0.1)"],
        div[style*="background-color: rgba(255,255,255,0.08)"] { animation: pulse 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
