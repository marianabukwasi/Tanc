import { Check } from 'lucide-react'

const PILLS = ['Free forever', 'Personalised matches', 'Step by step guidance']

export default function AuthRightPanel() {
  return (
    <>
      <div
        className="auth-panel"
        style={{
          width: '45%',
          backgroundColor: '#1B2A6B',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '60px',
        }}
      >
        <h2 style={{
          fontSize: 'clamp(28px, 3vw, 40px)',
          fontWeight: 800,
          color: '#ffffff',
          lineHeight: 1.15,
          margin: '0 0 40px',
          maxWidth: '340px',
        }}>
          Your next opportunity starts here.
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {PILLS.map((pill) => (
            <div key={pill} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(255,255,255,0.18)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: '50px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
            }}>
              <Check size={15} />
              {pill}
            </div>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 768px) { .auth-panel { display: none !important; } }`}</style>
    </>
  )
}
