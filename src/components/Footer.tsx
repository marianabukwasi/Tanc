import { Star } from 'lucide-react'

const footerLinks = [
  { label: 'Browse', href: '#' },
  { label: 'Sign In', href: '#' },
  { label: 'Sign Up', href: '#' },
  { label: 'Privacy Policy', href: '#' },
]

export default function Footer() {
  return (
    <footer style={{
      backgroundColor: '#ffffff',
      borderTop: '1px solid #e2e8f0',
      padding: '40px 48px',
    }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '24px',
      }}>
        {/* Left: Logo + tagline */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Star size={14} fill="#d4a017" color="#d4a017" />
            <span style={{ fontWeight: 700, color: '#0a1628', fontSize: '18px' }}>TANC</span>
          </div>
          <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>
            Every opportunity. One place.
          </p>
        </div>

        {/* Right: Links */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          {footerLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{ color: '#475569', textDecoration: 'none', fontSize: '14px' }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: '32px',
        paddingTop: '24px',
        borderTop: '1px solid #e2e8f0',
        color: '#475569',
        fontSize: '13px',
      }}>
        &copy; 2026 TANC — tancglobal.com. All rights reserved.
      </div>
    </footer>
  )
}
