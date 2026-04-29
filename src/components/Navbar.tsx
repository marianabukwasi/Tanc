'use client'

import { useState } from 'react'
import { Star, Menu, X } from 'lucide-react'

const navLinks: { label: string; href: string }[] = [
  { label: 'Browse',          href: '/browse' },
  { label: 'Scholarships',    href: '/browse?type=Scholarship' },
  { label: 'Fellowships',     href: '/browse?type=Fellowship' },
  { label: 'Internships',     href: '/browse?type=Internship' },
  { label: 'Conferences',     href: '/browse?type=Conference' },
  { label: 'Events',          href: '/browse?type=Events' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 48px',
      }}>
        {/* Left: Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
          <Star size={14} fill="#d4a017" color="#d4a017" />
          <div>
            <div style={{ fontWeight: 700, color: '#0a1628', fontSize: '18px', lineHeight: 1 }}>TANC</div>
            <div style={{ fontSize: '10px', color: '#475569', lineHeight: 1.2 }}>tancglobal.com</div>
          </div>
        </div>

        {/* Center: Nav links (hidden on mobile) */}
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
        }} className="hidden-mobile">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{
                color: '#475569',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right: Sign In + Get Started */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
          <a href="/signin" style={{ color: '#475569', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
            className="hidden-mobile">
            Sign In
          </a>
          <a
            href="/signup"
            style={{
              backgroundColor: '#d4a017',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
              padding: '10px 20px',
              borderRadius: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            Get Started Free
          </a>
          {/* Hamburger (mobile only) */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0a1628', padding: '4px' }}
            className="show-mobile"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{
          position: 'fixed',
          top: '64px',
          left: 0,
          right: 0,
          zIndex: 40,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{ color: '#0a1628', textDecoration: 'none', fontSize: '15px', fontWeight: 500 }}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/signin"
            style={{ color: '#475569', textDecoration: 'none', fontSize: '15px', fontWeight: 500 }}
            onClick={() => setMobileOpen(false)}
          >
            Sign In
          </a>
          <a
            href="/signup"
            style={{ color: '#ffffff', backgroundColor: '#d4a017', textDecoration: 'none', fontSize: '15px', fontWeight: 600, padding: '10px 20px', borderRadius: '8px', textAlign: 'center' }}
            onClick={() => setMobileOpen(false)}
          >
            Get Started Free
          </a>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
        }
        @media (min-width: 769px) {
          .show-mobile { display: none !important; }
        }
      `}</style>
    </>
  )
}
