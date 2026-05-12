import { Star } from 'lucide-react'

const FOOTER_LINKS = [
  { label: 'About',          href: '/about'       },
  { label: 'Blog',           href: '/blog'        },
  { label: 'Privacy Policy', href: '/privacy'     },
  { label: 'Terms',          href: '/terms'       },
  { label: 'Contact',        href: 'mailto:hello@tancglobal.com' },
]

export default function Footer() {
  return (
    <footer style={{
      backgroundColor: '#1B2A6B',
      padding: '40px 48px',
    }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '24px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Star size={14} fill="#ffffff" color="#ffffff" />
            <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '18px' }}>TANC</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: 0 }}>
            Every opportunity. One place.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '14px' }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: '32px',
        paddingTop: '24px',
        borderTop: '1px solid rgba(255,255,255,0.15)',
        color: 'rgba(255,255,255,0.5)',
        fontSize: '13px',
      }}>
        &copy; 2026 TANC — tancglobal.com. All rights reserved.
      </div>
    </footer>
  )
}
