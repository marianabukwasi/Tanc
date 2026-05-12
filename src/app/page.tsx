'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  GraduationCap, Award, Briefcase, Users, DollarSign, Leaf,
  Trophy, Zap, BookOpen, Globe, Target, Heart, Compass,
  Star, Code, PenTool, MoreHorizontal, ArrowRight,
  CheckCircle, Bell,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { OPPORTUNITY_TYPES } from '@/lib/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeaturedOpp {
  id: string
  title: string
  organization_name: string | null
  country: string | null
  opportunity_type: string
  application_deadline: string | null
  funding_type: string | null
}

interface Stats {
  totalOpps: number
  countries: number
  users: number
}

interface HomeStory {
  id: string
  user_name: string | null
  story: string | null
  opportunity: { title: string; organization_name: string | null } | null
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Scholarships':        GraduationCap,
  'Fellowships':         Award,
  'Internships':         Briefcase,
  'Conferences':         Users,
  'Grants':              DollarSign,
  'Retreats':            Leaf,
  'Sports Events':       Trophy,
  'Competitions':        Zap,
  'Research Programs':   BookOpen,
  'Exchange Programs':   Globe,
  'Leadership Programs': Target,
  'Mentorship Programs': Heart,
  'Volunteer Programs':  Compass,
  'Training Programs':   Star,
  'Awards':              Award,
  'Hackathons':          Code,
  'Workshops':           PenTool,
  'Other':               MoreHorizontal,
}

const CATEGORY_COLORS: Record<string, { bg: string; color: string; iconBg: string }> = {
  'Scholarships':        { bg: '#eff6ff', color: '#1d4ed8', iconBg: '#dbeafe' },
  'Fellowships':         { bg: '#f5f3ff', color: '#7c3aed', iconBg: '#ede9fe' },
  'Internships':         { bg: '#f0fdf4', color: '#15803d', iconBg: '#dcfce7' },
  'Conferences':         { bg: '#fdf4ff', color: '#a21caf', iconBg: '#fae8ff' },
  'Grants':              { bg: '#fff7ed', color: '#c2410c', iconBg: '#ffedd5' },
  'Retreats':            { bg: '#f0fdf4', color: '#166534', iconBg: '#bbf7d0' },
  'Sports Events':       { bg: '#fef2f2', color: '#dc2626', iconBg: '#fee2e2' },
  'Competitions':        { bg: '#fff1f2', color: '#be123c', iconBg: '#ffe4e6' },
  'Research Programs':   { bg: '#f0f9ff', color: '#0369a1', iconBg: '#e0f2fe' },
  'Exchange Programs':   { bg: '#fefce8', color: '#a16207', iconBg: '#fef9c3' },
  'Leadership Programs': { bg: '#eef0fa', color: '#1B2A6B', iconBg: '#fde68a' },
  'Mentorship Programs': { bg: '#fff0f3', color: '#e11d48', iconBg: '#ffe4eb' },
  'Volunteer Programs':  { bg: '#ecfdf5', color: '#059669', iconBg: '#d1fae5' },
  'Training Programs':   { bg: '#fffbeb', color: '#b45309', iconBg: '#fef3c7' },
  'Awards':              { bg: '#fff7ed', color: '#c2410c', iconBg: '#fed7aa' },
  'Hackathons':          { bg: '#f1f5f9', color: '#334155', iconBg: '#e2e8f0' },
  'Workshops':           { bg: '#faf5ff', color: '#9333ea', iconBg: '#f3e8ff' },
  'Other':               { bg: '#f8fafc', color: '#475569', iconBg: '#e2e8f0' },
}

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  'Scholarships':        { bg: '#eff6ff', color: '#1d4ed8' },
  'Fellowships':         { bg: '#f5f3ff', color: '#7c3aed' },
  'Internships':         { bg: '#f0fdf4', color: '#15803d' },
  'Conferences':         { bg: '#fdf4ff', color: '#a21caf' },
  'Grants':              { bg: '#fff7ed', color: '#c2410c' },
  'Retreats':            { bg: '#f0fdf4', color: '#166534' },
  'Sports Events':       { bg: '#fef2f2', color: '#dc2626' },
  'Competitions':        { bg: '#fff1f2', color: '#be123c' },
  'Research Programs':   { bg: '#f0f9ff', color: '#0369a1' },
  'Exchange Programs':   { bg: '#fefce8', color: '#a16207' },
  'Leadership Programs': { bg: '#eef0fa', color: '#1B2A6B' },
  'Mentorship Programs': { bg: '#fff0f3', color: '#e11d48' },
  'Volunteer Programs':  { bg: '#ecfdf5', color: '#059669' },
  'Training Programs':   { bg: '#fffbeb', color: '#b45309' },
  'Awards':              { bg: '#fff7ed', color: '#c2410c' },
  'Hackathons':          { bg: '#f1f5f9', color: '#334155' },
  'Workshops':           { bg: '#faf5ff', color: '#9333ea' },
  'Other':               { bg: '#f8fafc', color: '#475569' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function formatDeadline(dateStr: string | null): string {
  if (!dateStr) return 'Rolling / Open'
  const days = daysUntil(dateStr)
  if (days === null || days < 0) return 'Closed'
  if (days === 0) return 'Closes today'
  if (days <= 30) return `${days} days left`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtNum(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 1000)}K+`
  return n.toLocaleString()
}

// ─── Scroll reveal ────────────────────────────────────────────────────────────

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      style={{
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
      }}
    >
      {children}
    </div>
  )
}

// ─── Count-up ─────────────────────────────────────────────────────────────────

function CountUp({ target }: { target: number }) {
  const { ref, visible } = useReveal()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!visible || target === 0) return
    const duration = 1400
    const steps = 60
    const increment = target / steps
    let current = 0
    let step = 0
    const id = setInterval(() => {
      step++
      current = Math.min(Math.round(increment * step), target)
      setValue(current)
      if (step >= steps) clearInterval(id)
    }, duration / steps)
    return () => clearInterval(id)
  }, [visible, target])

  return <div ref={ref}>{fmtNum(value)}</div>
}

// ─── Category tile ────────────────────────────────────────────────────────────

function CategoryTile({ type, count }: { type: string; count: number }) {
  const [hovered, setHovered] = useState(false)
  const router = useRouter()
  const Icon = CATEGORY_ICONS[type] ?? MoreHorizontal
  const colors = CATEGORY_COLORS[type] ?? { bg: '#f8fafc', color: '#475569', iconBg: '#e2e8f0' }

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(`/opportunities?type=${encodeURIComponent(type)}`)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        padding: '20px 12px',
        backgroundColor: hovered ? colors.bg : '#ffffff',
        border: `1px solid ${hovered ? colors.color : '#e2e8f0'}`,
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        textAlign: 'center',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
        width: '100%',
        fontFamily: 'inherit',
      }}
    >
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '10px',
        backgroundColor: colors.iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={20} color={colors.color} />
      </div>
      <div style={{ fontWeight: 600, fontSize: '13px', color: '#0a1628', lineHeight: 1.3 }}>
        {type}
      </div>
      <div style={{ fontSize: '12px', color: '#64748b' }}>
        {count > 0 ? `${count.toLocaleString()} listed` : 'Coming soon'}
      </div>
    </button>
  )
}

// ─── Featured card ────────────────────────────────────────────────────────────

function FeaturedCard({ opp }: { opp: FeaturedOpp }) {
  const [hovered, setHovered] = useState(false)
  const router = useRouter()
  const badge = TYPE_BADGE[opp.opportunity_type] ?? { bg: '#f1f5f9', color: '#475569' }
  const days = daysUntil(opp.application_deadline)
  const deadline = formatDeadline(opp.application_deadline)
  const urgent = days !== null && days >= 0 && days <= 30

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(`/opportunity/${opp.id}`)}
      style={{
        backgroundColor: '#ffffff',
        border: `1px solid ${hovered ? '#1B2A6B' : '#e2e8f0'}`,
        borderRadius: '14px',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
        boxShadow: hovered ? '0 6px 24px rgba(0,0,0,0.09)' : '0 1px 4px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      {/* Badge row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{
          display: 'inline-block',
          backgroundColor: badge.bg,
          color: badge.color,
          fontSize: '11px',
          fontWeight: 600,
          padding: '3px 10px',
          borderRadius: '50px',
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          flexShrink: 0,
        }}>
          {opp.opportunity_type}
        </span>

        {/* Blurred match score */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <span style={{
            display: 'inline-block',
            backgroundColor: '#0a1628',
            color: '#0a1628',
            fontSize: '12px',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '50px',
            filter: 'blur(4px)',
            userSelect: 'none',
          }}>??%</span>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Star size={11} color="#1B2A6B" fill="#1B2A6B" />
          </div>
        </div>
      </div>

      {/* Title */}
      <div style={{ fontWeight: 700, fontSize: '15px', color: '#0a1628', lineHeight: 1.35 }}>
        {opp.title}
      </div>

      {/* Org + country */}
      {opp.organization_name && (
        <div style={{ fontSize: '13px', color: '#64748b' }}>{opp.organization_name}</div>
      )}
      {opp.country && (
        <div style={{ fontSize: '13px', color: '#64748b' }}>{opp.country}</div>
      )}

      {/* Deadline */}
      <div style={{ fontSize: '13px', color: urgent ? '#dc2626' : '#64748b', fontWeight: urgent ? 600 : 400 }}>
        {urgent ? `⏰ ${deadline}` : `Deadline: ${deadline}`}
      </div>

      {/* Funding */}
      {opp.funding_type && (
        <span style={{
          display: 'inline-block',
          backgroundColor: '#eef0fa',
          color: '#1B2A6B',
          border: '1px solid #1B2A6B',
          fontSize: '11px',
          fontWeight: 600,
          padding: '3px 10px',
          borderRadius: '50px',
          width: 'fit-content',
        }}>
          {opp.funding_type}
        </span>
      )}

      {/* Sign up CTA overlay hint */}
      <div style={{
        marginTop: '4px',
        padding: '8px 12px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#64748b',
        textAlign: 'center',
        border: '1px dashed #e2e8f0',
      }}>
        Sign up to see your match score
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ totalOpps: 0, countries: 0, users: 0 })
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({})
  const [featured, setFeatured] = useState<FeaturedOpp[]>([])
  const [homeStories, setHomeStories] = useState<HomeStory[]>([])
  const [loaded, setLoaded] = useState(false)

  // Redirect logged-in users to the feed
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/opportunities')
    })
  }, [router])

  // Load all data in parallel
  const loadData = useCallback(async () => {
    const [
      { count: totalOpps },
      { data: typeRows },
      { data: featuredRows },
      { data: countryRows },
      { count: userCount },
      { data: storyRows },
    ] = await Promise.all([
      supabase
        .from('opportunities')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true)
        .eq('is_archived', false),
      supabase
        .from('opportunities')
        .select('opportunity_type')
        .eq('is_published', true)
        .eq('is_archived', false),
      supabase
        .from('opportunities')
        .select('id, title, organization_name, country, opportunity_type, application_deadline, funding_type')
        .eq('is_published', true)
        .eq('is_archived', false)
        .limit(6),
      supabase
        .from('opportunities')
        .select('country')
        .eq('is_published', true)
        .eq('is_archived', false),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('success_stories')
        .select('id, user_name, story, opportunity:opportunities(title, organization_name)')
        .eq('status', 'approved')
        .eq('outcome', 'got_it')
        .order('created_at', { ascending: false })
        .limit(3),
    ])

    const countrySet = new Set(
      (countryRows ?? []).map((r) => r.country).filter(Boolean)
    )

    const counts: Record<string, number> = {}
    for (const row of typeRows ?? []) {
      if (row.opportunity_type) {
        counts[row.opportunity_type] = (counts[row.opportunity_type] ?? 0) + 1
      }
    }

    setStats({
      totalOpps: totalOpps ?? 0,
      countries: countrySet.size,
      users: userCount ?? 0,
    })
    setTypeCounts(counts)
    setFeatured((featuredRows ?? []) as FeaturedOpp[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setHomeStories((storyRows ?? []).map((s: any) => ({
      ...s,
      opportunity: Array.isArray(s.opportunity) ? s.opportunity[0] ?? null : s.opportunity,
    })) as HomeStory[])
    setLoaded(true)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div style={{ backgroundColor: '#ffffff', paddingTop: '64px' }}>

      {/* ── SECTION 1: HERO ──────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 24px 72px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
      }}>
        {/* Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#eef0fa',
          border: '1px solid #1B2A6B',
          color: '#1B2A6B',
          borderRadius: '50px',
          fontSize: '13px',
          fontWeight: 600,
          padding: '6px 18px',
          marginBottom: '32px',
        }}>
          <Star size={12} fill="#1B2A6B" color="#1B2A6B" />
          Now with AI-powered matching
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(36px, 7vw, 68px)',
          fontWeight: 900,
          lineHeight: 1.05,
          color: '#0a1628',
          maxWidth: '760px',
          margin: '0 0 24px',
          letterSpacing: '-1px',
        }}>
          Every Opportunity.<br />
          <span style={{ color: '#1B2A6B' }}>Built Around You.</span>
        </h1>

        {/* Subheadline */}
        <p style={{
          color: '#475569',
          fontSize: 'clamp(16px, 2.5vw, 19px)',
          maxWidth: '540px',
          lineHeight: 1.7,
          margin: '0 0 40px',
        }}>
          Scholarships, fellowships, retreats, conferences, sports events and more —
          matched to your profile from around the world.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '48px' }}>
          <a
            href="/signup"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#0a1628',
              color: '#1B2A6B',
              padding: '14px 28px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '16px',
              textDecoration: 'none',
              transition: 'opacity 0.2s',
            }}
          >
            Find My Opportunities <ArrowRight size={16} />
          </a>
          <a
            href="/opportunities"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              color: '#0a1628',
              padding: '14px 28px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '16px',
              textDecoration: 'none',
              border: '2px solid #0a1628',
              transition: 'background-color 0.2s, color 0.2s',
            }}
          >
            Browse All
          </a>
        </div>

        {/* Live counter */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '50px',
          padding: '10px 20px',
          fontSize: '14px',
          color: '#166534',
          fontWeight: 600,
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            display: 'inline-block',
            animation: 'pulse 2s infinite',
          }} />
          {loaded
            ? `${stats.totalOpps.toLocaleString()} opportunities across ${stats.countries} countries`
            : 'Loading live data…'}
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.3); }
          }
        `}</style>
      </section>

      {/* ── SECTION 2: CATEGORY TILES ────────────────────────────────────── */}
      <section style={{ padding: '72px 48px', backgroundColor: '#f8fafc' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#0a1628', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
              What are you looking for?
            </h2>
            <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>
              Browse by category and find what fits you
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '14px',
            maxWidth: '1100px',
            margin: '0 auto',
          }}>
            {OPPORTUNITY_TYPES.map((type) => (
              <CategoryTile
                key={type}
                type={type}
                count={typeCounts[type] ?? 0}
              />
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── SECTION 3: SOCIAL PROOF ──────────────────────────────────────── */}
      <section style={{ padding: '72px 48px', backgroundColor: '#0a1628' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, color: '#ffffff', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
              The world's opportunities, in one place
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '16px', margin: 0 }}>
              Real data. Updated daily.
            </p>
          </div>
        </Reveal>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '0',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          {[
            { label: 'Live Opportunities', value: stats.totalOpps, suffix: '+' },
            { label: 'Countries Represented', value: stats.countries },
            { label: 'Registered Users', value: stats.users },
          ].map((item, i, arr) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', padding: '0 52px' }}>
                <div style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 900, color: '#1B2A6B', lineHeight: 1, marginBottom: '10px' }}>
                  <CountUp target={item.value} />
                </div>
                <div style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 500 }}>
                  {item.label}
                </div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ width: '1px', height: '60px', backgroundColor: '#1e3a5f', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 4: FEATURED OPPORTUNITIES ────────────────────────────── */}
      <section style={{ padding: '80px 48px', backgroundColor: '#ffffff' }}>
        <Reveal>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '40px', maxWidth: '1100px', margin: '0 auto 40px' }}>
            <div>
              <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, color: '#0a1628', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                Featured Opportunities
              </h2>
              <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>
                Live listings, updated by our scrapers daily
              </p>
            </div>
            <a
              href="/opportunities"
              style={{ color: '#1B2A6B', fontWeight: 700, fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
            >
              View all <ArrowRight size={14} />
            </a>
          </div>
        </Reveal>

        {featured.length > 0 ? (
          <Reveal delay={80}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px',
              maxWidth: '1100px',
              margin: '0 auto',
            }}>
              {featured.map((opp) => (
                <FeaturedCard key={opp.id} opp={opp} />
              ))}
            </div>
          </Reveal>
        ) : loaded ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: '15px' }}>
            No opportunities yet — check back after the scrapers run.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
            maxWidth: '1100px',
            margin: '0 auto',
          }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                height: '260px',
                borderRadius: '14px',
                background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s infinite',
              }} />
            ))}
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          </div>
        )}
      </section>

      {/* ── SECTION 5: HOW IT WORKS ──────────────────────────────────────── */}
      <section style={{ padding: '80px 48px', backgroundColor: '#f8fafc', textAlign: 'center' }}>
        <Reveal>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, color: '#0a1628', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
            How it works
          </h2>
          <p style={{ color: '#64748b', fontSize: '16px', margin: '0 0 60px' }}>
            From sign-up to opportunity in three steps
          </p>
        </Reveal>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '32px',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          {[
            {
              Icon: CheckCircle,
              step: '01',
              title: 'Build your profile in 3 minutes',
              desc: 'Tell us your background, goals, and preferences. The more you share, the better your matches.',
            },
            {
              Icon: Star,
              step: '02',
              title: 'See your personal match score',
              desc: 'Every opportunity gets a score based on how well it fits your unique profile. No more guessing.',
            },
            {
              Icon: Bell,
              step: '03',
              title: 'Get notified instantly',
              desc: "The moment a new opportunity appears that matches you, we'll send you an alert. Never miss a deadline.",
            },
          ].map(({ Icon, step, title, desc }, i) => (
            <Reveal key={step} delay={i * 100}>
              <div style={{
                flex: '1 1 240px',
                maxWidth: '280px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '16px',
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  backgroundColor: '#0a1628',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={26} color="#1B2A6B" />
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1B2A6B', letterSpacing: '2px' }}>
                  STEP {step}
                </div>
                <div style={{ fontWeight: 700, fontSize: '17px', color: '#0a1628', lineHeight: 1.3 }}>
                  {title}
                </div>
                <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.7, margin: 0 }}>
                  {desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── SECTION 6: SUCCESS STORIES ───────────────────────────────────── */}
      {homeStories.length > 0 && (
        <section style={{ padding: '80px 48px', backgroundColor: '#ffffff', textAlign: 'center' }}>
          <Reveal>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: '#0a1628', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              Real success stories 🏆
            </h2>
            <p style={{ color: '#64748b', fontSize: '15px', margin: '0 0 48px' }}>
              From our community — people who found their opportunity through TANC.
            </p>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', maxWidth: '960px', margin: '0 auto' }}>
            {homeStories.map((s, i) => (
              <Reveal key={s.id} delay={i * 80}>
                <div style={{ backgroundColor: '#fefce8', border: '1px solid #fde68a', borderRadius: '14px', padding: '22px', textAlign: 'left', height: '100%', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1B2A6B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '15px' }}>
                        {(s.user_name ?? '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0a1628' }}>{s.user_name ?? 'Anonymous'}</div>
                      {s.opportunity?.title && (
                        <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 600 }}>{s.opportunity.title}</div>
                      )}
                    </div>
                  </div>
                  {s.story && (
                    <p style={{ fontSize: '13px', color: '#44403c', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>
                      &ldquo;{s.story}&rdquo;
                    </p>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 7: FINAL CTA ─────────────────────────────────────────── */}
      <section style={{
        padding: '80px 48px',
        backgroundColor: '#0a1628',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <Reveal>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(212,160,23,0.15)',
            border: '1px solid rgba(212,160,23,0.4)',
            color: '#1B2A6B',
            borderRadius: '50px',
            fontSize: '13px',
            fontWeight: 600,
            padding: '6px 18px',
            marginBottom: '28px',
          }}>
            Free, forever. No credit card required.
          </div>

          <h2 style={{ fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: 900, color: '#ffffff', margin: '0 0 16px', letterSpacing: '-1px', lineHeight: 1.1 }}>
            Your opportunity is waiting.
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '17px', margin: '0 0 40px', maxWidth: '460px', lineHeight: 1.7 }}>
            Join thousands of people who found their next scholarship, fellowship, or adventure through TANC.
          </p>

          <a
            href="/signup"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#1B2A6B',
              color: '#ffffff',
              padding: '16px 36px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '17px',
              textDecoration: 'none',
              transition: 'opacity 0.2s',
            }}
          >
            Sign Up — It's Free <ArrowRight size={18} />
          </a>
        </Reveal>
      </section>

    </div>
  )
}
