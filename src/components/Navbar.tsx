'use client'

import { useState, useEffect } from 'react'
import { Star, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const PUBLIC_LINKS = [
  { label: 'Opportunities', href: '/opportunities' },
  { label: 'Blog',          href: '/blog'          },
  { label: 'About',         href: '/about'         },
]

const AUTH_LINKS = [
  { label: 'Opportunities', href: '/opportunities' },
  { label: 'Tracker',       href: '/tracker'       },
  { label: 'Blog',          href: '/blog'          },
  { label: 'About',         href: '/about'         },
  { label: 'Profile',       href: '/profile'       },
]

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const links = user ? AUTH_LINKS : PUBLIC_LINKS

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
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', minWidth: '120px' }}>
          <Star size={14} fill="#1B2A6B" color="#1B2A6B" />
          <div>
            <div style={{ fontWeight: 700, color: '#0a1628', fontSize: '18px', lineHeight: 1 }}>TANC</div>
            <div style={{ fontSize: '10px', color: '#475569', lineHeight: 1.2 }}>tancglobal.com</div>
          </div>
        </a>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '32px' }} className="hidden-mobile">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{ color: '#475569', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
          {user ? (
            <a
              href="/auth/logout"
              style={{ color: '#475569', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
              className="hidden-mobile"
            >
              Logout
            </a>
          ) : (
            <>
              <a href="/login" style={{ color: '#475569', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }} className="hidden-mobile">
                Login
              </a>
              <a
                href="/signup"
                style={{
                  backgroundColor: '#1B2A6B',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  padding: '10px 20px',
                  borderRadius: '8px',
                  whiteSpace: 'nowrap',
                }}
              >
                Sign Up
              </a>
            </>
          )}
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
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{ color: '#0a1628', textDecoration: 'none', fontSize: '15px', fontWeight: 500 }}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          {user ? (
            <a
              href="/auth/logout"
              style={{ color: '#475569', textDecoration: 'none', fontSize: '15px', fontWeight: 500 }}
              onClick={() => setMobileOpen(false)}
            >
              Logout
            </a>
          ) : (
            <>
              <a
                href="/login"
                style={{ color: '#0a1628', textDecoration: 'none', fontSize: '15px', fontWeight: 500 }}
                onClick={() => setMobileOpen(false)}
              >
                Login
              </a>
              <a
                href="/signup"
                style={{ color: '#ffffff', backgroundColor: '#1B2A6B', textDecoration: 'none', fontSize: '15px', fontWeight: 600, padding: '10px 20px', borderRadius: '8px', textAlign: 'center' }}
                onClick={() => setMobileOpen(false)}
              >
                Sign Up
              </a>
            </>
          )}
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
