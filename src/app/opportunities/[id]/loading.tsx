export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '28px' }}>

        {/* Main content skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Breadcrumb */}
          <div style={{ width: '200px', height: '14px', borderRadius: '4px', backgroundColor: '#e2e8f0' }} />
          {/* Type badge */}
          <div style={{ width: '100px', height: '24px', borderRadius: '20px', backgroundColor: '#e2e8f0' }} />
          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ width: '90%', height: '28px', borderRadius: '6px', backgroundColor: '#e2e8f0' }} />
            <div style={{ width: '60%', height: '28px', borderRadius: '6px', backgroundColor: '#e2e8f0' }} />
          </div>
          {/* Org */}
          <div style={{ width: '45%', height: '18px', borderRadius: '4px', backgroundColor: '#e2e8f0' }} />
          {/* Meta tags */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[120, 100, 130, 90].map((w, i) => (
              <div key={i} style={{ width: `${w}px`, height: '30px', borderRadius: '8px', backgroundColor: '#e2e8f0' }} />
            ))}
          </div>
          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {[100, 95, 88, 72].map((w, i) => (
              <div key={i} style={{ width: `${w}%`, height: '14px', borderRadius: '4px', backgroundColor: '#e2e8f0' }} />
            ))}
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ width: '100%', height: '44px', borderRadius: '10px', backgroundColor: '#e2e8f0' }} />
            <div style={{ width: '100%', height: '44px', borderRadius: '10px', backgroundColor: '#e2e8f0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {[80, 70, 90, 65].map((w, i) => (
                <div key={i} style={{ width: `${w}%`, height: '14px', borderRadius: '4px', backgroundColor: '#e2e8f0' }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        div[style*="background-color: #e2e8f0"] { animation: pulse 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
