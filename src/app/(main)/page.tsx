'use client'

import { useState, useEffect, useRef } from 'react'
import { Bookmark, Search, Bell } from 'lucide-react'

// ─── Data ────────────────────────────────────────────────────────────────────

interface Opportunity {
  id: number
  title: string
  organization: string
  country: string
  flag: string
  deadline: string
  deadlineDate: string
  funding: string
  type: 'Scholarship' | 'Fellowship' | 'Internship' | 'Exchange'
}

const opportunities: Opportunity[] = [
  { id: 1, title: 'Chevening Scholarship 2026', organization: 'UK Government', country: 'United Kingdom', flag: '🇬🇧', deadline: 'Nov 5, 2026', deadlineDate: '2026-11-05', funding: 'Fully Funded', type: 'Scholarship' },
  { id: 2, title: 'Erasmus Mundus Joint Masters', organization: 'European Commission', country: 'Europe', flag: '🇪🇺', deadline: 'Jan 15, 2027', deadlineDate: '2027-01-15', funding: 'Fully Funded', type: 'Fellowship' },
  { id: 3, title: 'DAAD Scholarship Germany', organization: 'DAAD', country: 'Germany', flag: '🇩🇪', deadline: 'Oct 31, 2026', deadlineDate: '2026-10-31', funding: 'Fully Funded', type: 'Scholarship' },
  { id: 4, title: 'UN Young Professionals Programme', organization: 'United Nations', country: 'Global', flag: '🌍', deadline: 'Aug 20, 2026', deadlineDate: '2026-08-20', funding: 'Paid', type: 'Internship' },
  { id: 5, title: 'YALI Regional Leadership', organization: 'US Government', country: 'Africa', flag: '🌍', deadline: 'Jun 30, 2026', deadlineDate: '2026-06-30', funding: 'Fully Funded', type: 'Exchange' },
  { id: 6, title: 'Commonwealth Fellowship', organization: 'Commonwealth', country: 'UK', flag: '🇬🇧', deadline: 'Dec 10, 2026', deadlineDate: '2026-12-10', funding: 'Fully Funded', type: 'Fellowship' },
]

const popularTags = ['Fully Funded', 'Europe', 'Masters', 'No IELTS', 'Open Now', 'Africa', 'USA', 'UK']

const typeBadge: Record<string, { bg: string; color: string }> = {
  Scholarship: { bg: '#eff6ff', color: '#1d4ed8' },
  Fellowship:  { bg: '#f5f3ff', color: '#7c3aed' },
  Internship:  { bg: '#f0fdf4', color: '#15803d' },
  Exchange:    { bg: '#fff7ed', color: '#c2410c' },
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

// ─── Scroll animation ────────────────────────────────────────────────────────

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

function Reveal({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      style={{
        transition: 'opacity 0.55s ease, transform 0.55s ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0px)' : 'translateY(20px)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── Opportunity card ────────────────────────────────────────────────────────

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const [saved, setSaved] = useState(false)
  const [hovered, setHovered] = useState(false)
  const days = daysUntil(opp.deadlineDate)
  const badge = typeBadge[opp.type]

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: '#ffffff',
        border: `1px solid ${hovered ? '#d4a017' : '#e2e8f0'}`,
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        boxShadow: hovered ? '0 4px 20px rgba(0,0,0,0.08)' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        cursor: 'default',
      }}
    >
      {/* Save button */}
      <button
        onClick={() => setSaved(!saved)}
        aria-label="Save opportunity"
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: saved ? '#d4a017' : '#cbd5e1',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Bookmark size={18} fill={saved ? '#d4a017' : 'none'} />
      </button>

      {/* Type badge */}
      <span style={{
        display: 'inline-block',
        backgroundColor: badge.bg,
        color: badge.color,
        fontSize: '11px',
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: '50px',
        width: 'fit-content',
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
      }}>
        {opp.type}
      </span>

      {/* Title */}
      <div style={{ fontWeight: 700, fontSize: '16px', color: '#0a1628', lineHeight: 1.3, paddingRight: '24px' }}>
        {opp.title}
      </div>

      {/* Organization */}
      <div style={{ fontSize: '13px', color: '#475569' }}>{opp.organization}</div>

      {/* Country */}
      <div style={{ fontSize: '13px', color: '#475569' }}>
        {opp.flag} {opp.country}
      </div>

      {/* Deadline */}
      <div style={{ fontSize: '13px', color: days <= 30 ? '#dc2626' : '#475569', fontWeight: days <= 30 ? 600 : 400 }}>
        Deadline: {opp.deadline}{days <= 30 ? ` · ${days}d left` : ''}
      </div>

      {/* Funding badge */}
      <span style={{
        display: 'inline-block',
        backgroundColor: '#fef9e7',
        color: '#d4a017',
        border: '1px solid #d4a017',
        fontSize: '11px',
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: '50px',
        width: 'fit-content',
      }}>
        {opp.funding}
      </span>

      {/* Apply button */}
      <button
        style={{
          marginTop: '4px',
          backgroundColor: '#d4a017',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          padding: '11px 0',
          fontWeight: 600,
          fontSize: '14px',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Apply Now
      </button>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

function AlertBar() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function subscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section style={{
      backgroundColor: '#0a1628',
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
        <Bell size={16} color="#d4a017" />
        <span style={{ fontSize: '14px', fontWeight: 600 }}>Never miss an opportunity.</span>
        <span style={{ fontSize: '14px', color: '#94a3b8' }}>Get weekly alerts.</span>
      </div>

      {status === 'success' ? (
        <span style={{ fontSize: '14px', color: '#4ade80', fontWeight: 600 }}>✓ You're subscribed!</span>
      ) : (
        <form onSubmit={subscribe} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            style={{
              height: '38px',
              border: '1px solid #2d3f5a',
              borderRadius: '8px',
              padding: '0 14px',
              fontSize: '14px',
              color: '#ffffff',
              backgroundColor: '#162033',
              outline: 'none',
              width: '220px',
            }}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              height: '38px',
              padding: '0 20px',
              backgroundColor: status === 'loading' ? '#b8891a' : '#d4a017',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
          </button>
          {status === 'error' && (
            <span style={{ fontSize: '13px', color: '#f87171', alignSelf: 'center' }}>Something went wrong. Try again.</span>
          )}
        </form>
      )}
    </section>
  )
}

export default function Home() {
  const [searchFocused, setSearchFocused] = useState(false)
  const [hoveredTag, setHoveredTag] = useState<string | null>(null)

  return (
    <div style={{ backgroundColor: '#ffffff' }}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{
        paddingTop: '80px',
        paddingBottom: '60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '80px 24px 60px',
      }}>

        {/* Pill badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          backgroundColor: '#fef9e7',
          border: '1px solid #d4a017',
          color: '#d4a017',
          borderRadius: '50px',
          fontSize: '13px',
          fontWeight: 500,
          padding: '6px 16px',
          marginBottom: '28px',
        }}>
          Scholarships · Fellowships · Internships · Conferences
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(40px, 8vw, 64px)',
          fontWeight: 800,
          lineHeight: 1.05,
          color: '#0a1628',
          maxWidth: '700px',
          margin: '0 0 20px',
        }}>
          Every opportunity.<br />One place.
        </h1>

        {/* Subheadline */}
        <p style={{
          color: '#475569',
          fontSize: '18px',
          maxWidth: '500px',
          lineHeight: 1.65,
          margin: '0 0 36px',
        }}>
          Find scholarships, fellowships, internships and exchange programs from around the world.
          Discover what you qualify for. Apply with confidence.
        </p>

        {/* Search bar */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '600px',
          marginBottom: '20px',
        }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '18px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search scholarships, countries, organizations..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              width: '100%',
              height: '56px',
              border: `2px solid ${searchFocused ? '#d4a017' : '#e2e8f0'}`,
              borderRadius: '12px',
              padding: '0 120px 0 48px',
              fontSize: '15px',
              color: '#0a1628',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
          />
          <button
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: '#d4a017',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              height: '40px',
            }}
          >
            Search
          </button>
        </div>

        {/* Popular tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '600px' }}>
          {popularTags.map((tag) => (
            <button
              key={tag}
              onMouseEnter={() => setHoveredTag(tag)}
              onMouseLeave={() => setHoveredTag(null)}
              style={{
                border: `1px solid ${hoveredTag === tag ? '#d4a017' : '#e2e8f0'}`,
                borderRadius: '50px',
                padding: '6px 14px',
                fontSize: '13px',
                color: hoveredTag === tag ? '#d4a017' : '#475569',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                transition: 'border-color 0.2s, color 0.2s',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {/* ── EMAIL ALERT BAR ──────────────────────────────────────────────── */}
      <AlertBar />

      {/* ── STATS BAR ────────────────────────────────────────────────────── */}
      <Reveal>
        <section style={{
          backgroundColor: '#f8fafc',
          padding: '24px 48px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0',
          flexWrap: 'wrap',
        }}>
          {[
            { number: '10,000+', label: 'Opportunities' },
            { number: '150+', label: 'Countries' },
            { number: '50,000+', label: 'Students Joined' },
          ].map((stat, i, arr) => (
            <div key={stat.label} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', padding: '0 48px' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#d4a017', lineHeight: 1.1 }}>
                  {stat.number}
                </div>
                <div style={{ fontSize: '14px', color: '#475569', marginTop: '4px' }}>
                  {stat.label}
                </div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ width: '1px', height: '40px', backgroundColor: '#e2e8f0' }} />
              )}
            </div>
          ))}
        </section>
      </Reveal>

      {/* ── FEATURED OPPORTUNITIES ────────────────────────────────────────── */}
      <Reveal>
        <section style={{ padding: '60px 48px' }}>
          <div style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 700, color: '#0a1628', margin: '0 0 8px' }}>
              Featured Opportunities
            </h2>
            <p style={{ color: '#475569', fontSize: '15px', margin: 0 }}>
              Hand-picked opportunities closing soon
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px',
          }}>
            {opportunities.map((opp) => (
              <OpportunityCard key={opp.id} opp={opp} />
            ))}
          </div>
        </section>
      </Reveal>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <Reveal>
        <section style={{
          backgroundColor: '#ffffff',
          padding: '60px 48px',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: '#0a1628', margin: '0 0 8px' }}>
            How TANC works
          </h2>
          <p style={{ color: '#475569', fontSize: '15px', margin: '0 0 56px' }}>
            Three simple steps to your next opportunity
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            gap: '0',
            flexWrap: 'wrap',
            position: 'relative',
            maxWidth: '860px',
            margin: '0 auto',
          }}>
            {[
              { n: '1', text: 'Search or browse thousands of verified opportunities' },
              { n: '2', text: 'Sign up to see your match score for each opportunity' },
              { n: '3', text: 'Apply with confidence using our step by step guide' },
            ].map((step, i, arr) => (
              <div key={step.n} style={{ display: 'flex', alignItems: 'flex-start', flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '0 16px' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: '#d4a017',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    flexShrink: 0,
                  }}>
                    {step.n}
                  </div>
                  <p style={{ color: '#475569', fontSize: '15px', lineHeight: 1.6, margin: 0, maxWidth: '220px' }}>
                    {step.text}
                  </p>
                </div>
                {i < arr.length - 1 && (
                  <div style={{
                    borderTop: '2px dotted #e2e8f0',
                    width: '60px',
                    marginTop: '26px',
                    flexShrink: 0,
                  }} />
                )}
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <Reveal>
        <section style={{
          backgroundColor: '#d4a017',
          padding: '60px 48px',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '40px', fontWeight: 800, color: '#ffffff', margin: '0 0 16px', lineHeight: 1.1 }}>
            Your opportunity is waiting.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: '17px', margin: '0 0 36px' }}>
            Join thousands of students who found their path through TANC.
          </p>
          <button style={{
            backgroundColor: '#ffffff',
            color: '#d4a017',
            border: 'none',
            borderRadius: '8px',
            padding: '14px 32px',
            fontWeight: 700,
            fontSize: '16px',
            cursor: 'pointer',
          }}>
            Start for Free
          </button>
        </section>
      </Reveal>

    </div>
  )
}
