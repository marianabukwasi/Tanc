'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bookmark, Share2, ExternalLink, ChevronRight, Check, X, BookOpen, FileText, Users, Globe, Clock, Award } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { calculateMatch, type MatchProfile, type MatchInfo } from '@/lib/matching'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Opportunity {
  id: string
  title: string
  organization: string
  country: string
  continent: string
  flag: string
  deadline: string
  deadline_date: string
  funding_type: string
  type: string
  education_level: string
  created_at: string
  views: number
  description?: string | null
  highlights?: string[] | null
  website?: string | null
  requirements?: string[] | null
  apply_steps?: string[] | null
  documents?: string[] | null
  tips?: string[] | null
  featured?: boolean | null
  eligibility_countries?: string | string[] | null
  field?: string | null
  language_requirements?: string | string[] | null
  min_age?: number | null
  max_age?: number | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  Scholarship:        { bg: '#eff6ff', color: '#1d4ed8' },
  Fellowship:         { bg: '#f5f3ff', color: '#7c3aed' },
  Internship:         { bg: '#f0fdf4', color: '#15803d' },
  'Exchange Program': { bg: '#fff7ed', color: '#c2410c' },
  Conference:         { bg: '#fdf4ff', color: '#a21caf' },
  Competition:        { bg: '#fff1f2', color: '#be123c' },
  Events:             { bg: '#f0f9ff', color: '#0369a1' },
}

const TABS = ['Overview', 'Eligibility', 'How to Apply', 'Similar']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function deadlineColor(days: number | null) {
  if (days === null) return '#64748b'
  if (days < 0) return '#94a3b8'
  if (days <= 30) return '#dc2626'
  if (days <= 60) return '#d97706'
  return '#15803d'
}

function toArr(val: string | string[] | null | undefined): string[] {
  if (!val) return []
  return Array.isArray(val) ? val : [val]
}

// ─── Match score SVG circle ───────────────────────────────────────────────────

function ScoreCircle({ value, isEstimate }: { value: number; isEstimate: boolean }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ
  const color = value >= 70 ? '#15803d' : value >= 45 ? '#d97706' : '#dc2626'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="700" fill={color}>{value}%</text>
        <text x="50" y="62" textAnchor="middle" fontSize="10" fill="#64748b">match</text>
      </svg>
      {isEstimate && <span style={{ fontSize: '11px', color: '#94a3b8' }}>Estimated</span>}
    </div>
  )
}

// ─── Eligibility breakdown ────────────────────────────────────────────────────

function EligibilityRow({ label, met, detail }: { label: string; met: boolean; detail: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
        backgroundColor: met ? '#dcfce7' : '#fee2e2',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px',
      }}>
        {met
          ? <Check size={12} color="#15803d" />
          : <X size={12} color="#dc2626" />
        }
      </div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0a1628' }}>{label}</div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{detail}</div>
      </div>
    </div>
  )
}

// ─── Similar opportunity card ─────────────────────────────────────────────────

function SimilarCard({ opp }: { opp: Opportunity }) {
  const router = useRouter()
  const badge = TYPE_BADGE[opp.type] ?? { bg: '#f1f5f9', color: '#475569' }
  const days = daysUntil(opp.deadline_date)
  return (
    <div
      onClick={() => router.push(`/opportunity/${opp.id}`)}
      style={{
        border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px',
        cursor: 'pointer', backgroundColor: '#ffffff',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '20px', backgroundColor: badge.bg, color: badge.color }}>{opp.type}</span>
        <span style={{ fontSize: '12px' }}>{opp.flag}</span>
      </div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0a1628', marginBottom: '4px', lineHeight: 1.4 }}>{opp.title}</div>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>{opp.organization} · {opp.country}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', backgroundColor: opp.funding_type === 'Fully Funded' ? '#dcfce7' : '#f1f5f9', color: opp.funding_type === 'Fully Funded' ? '#15803d' : '#475569' }}>{opp.funding_type}</span>
        {days !== null && days >= 0 && (
          <span style={{ fontSize: '11px', color: deadlineColor(days), fontWeight: 600 }}>{days}d left</span>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [similar, setSimilar] = useState<Opportunity[]>([])
  const [authUser, setAuthUser] = useState<User | null | undefined>(undefined)
  const [userProfile, setUserProfile] = useState<MatchProfile | null>(null)
  const [matchInfo, setMatchInfo] = useState<MatchInfo>({ state: 'loading' })
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('Overview')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Load auth + profile
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setAuthUser(null)
        setMatchInfo({ state: 'anonymous' })
        return
      }
      setAuthUser(data.user)
      const { data: profile } = await supabase
        .from('profiles')
        .select('nationality,education_level,field_of_study,languages,age,profile_complete')
        .eq('id', data.user.id)
        .single()
      if (profile) {
        setUserProfile(profile as MatchProfile)
      } else {
        setMatchInfo({ state: 'incomplete' })
      }
    })
  }, [])

  // Load opportunity
  useEffect(() => {
    if (!id) return
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', id)
        .single()

      if (!data) { router.push('/browse'); return }
      setOpportunity(data as Opportunity)

      // Increment views
      await supabase
        .from('opportunities')
        .update({ views: (data.views ?? 0) + 1 })
        .eq('id', id)

      // Load similar
      const { data: sim } = await supabase
        .from('opportunities')
        .select('*')
        .neq('id', id)
        .or(`type.eq.${data.type},country.eq.${data.country}`)
        .limit(3)
      if (sim) setSimilar(sim as Opportunity[])

      setLoading(false)
    }
    load()
  }, [id, router])

  // Check saved
  useEffect(() => {
    if (!authUser || !id) return
    supabase
      .from('saved_opportunities')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('opportunity_id', id)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data))
  }, [authUser, id])

  // Compute match
  useEffect(() => {
    if (!opportunity) return
    if (authUser === undefined) { setMatchInfo({ state: 'loading' }); return }
    if (authUser === null) { setMatchInfo({ state: 'anonymous' }); return }
    if (!userProfile) { setMatchInfo({ state: 'incomplete' }); return }
    const result = calculateMatch(userProfile, opportunity)
    if (!result) { setMatchInfo({ state: 'incomplete' }); return }
    setMatchInfo({ state: 'score', value: result.score, isEstimate: result.isEstimate })
  }, [opportunity, authUser, userProfile])

  async function toggleSave() {
    if (!authUser) { router.push('/signin'); return }
    if (saved) {
      await supabase.from('saved_opportunities').delete().eq('user_id', authUser.id).eq('opportunity_id', id)
      setSaved(false)
    } else {
      await supabase.from('saved_opportunities').insert({ user_id: authUser.id, opportunity_id: id })
      setSaved(true)
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Loading state ────────────────────────────────────────────────────────────

  if (loading || !opportunity) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: '#94a3b8' }}>Loading opportunity…</div>
      </div>
    )
  }

  const days = daysUntil(opportunity.deadline_date)
  const badge = TYPE_BADGE[opportunity.type] ?? { bg: '#f1f5f9', color: '#475569' }

  const highlights: string[] = opportunity.highlights ?? [
    `${opportunity.funding_type} opportunity`,
    `Open to ${opportunity.education_level || 'all education levels'}`,
    `Hosted in ${opportunity.country}`,
  ]
  const requirements: string[] = opportunity.requirements ?? [
    opportunity.education_level ? `Education level: ${opportunity.education_level}` : 'See official website for requirements',
    ...toArr(opportunity.eligibility_countries).length > 0
      ? [`Open to: ${toArr(opportunity.eligibility_countries).join(', ')}`]
      : ['Open to all nationalities'],
    ...toArr(opportunity.language_requirements).length > 0
      ? [`Language: ${toArr(opportunity.language_requirements).join(', ')}`]
      : [],
  ]
  const applySteps: string[] = opportunity.apply_steps ?? [
    'Visit the official website and read all requirements carefully',
    'Prepare your CV, transcript, and personal statement',
    'Complete the online application form before the deadline',
    'Submit all required documents and await confirmation',
  ]
  const documents: string[] = opportunity.documents ?? [
    'Updated CV / Résumé',
    'Academic transcripts',
    'Passport or national ID copy',
    'Personal statement or motivation letter',
    'Two letters of recommendation',
  ]
  const tips: string[] = opportunity.tips ?? [
    'Apply at least 2 weeks before the deadline',
    'Tailor your personal statement to this specific opportunity',
    'Follow up if you have not received a confirmation email',
  ]

  // Eligibility breakdown (only for logged-in users with profile)
  const eligBreakdown =
    userProfile && matchInfo.state === 'score'
      ? [
          {
            label: 'Nationality / Eligibility',
            met: (() => {
              const eligible = toArr(opportunity.eligibility_countries)
              return (
                eligible.length === 0 ||
                eligible.some(c => ['global', 'all', 'worldwide'].includes(c.toLowerCase())) ||
                eligible.some(c => c.toLowerCase() === userProfile.nationality?.toLowerCase())
              )
            })(),
            detail: toArr(opportunity.eligibility_countries).length === 0
              ? 'Open to all nationalities'
              : `Open to: ${toArr(opportunity.eligibility_countries).join(', ')}`,
          },
          {
            label: 'Education Level',
            met: !opportunity.education_level || opportunity.education_level.toLowerCase() === 'any' ||
              opportunity.education_level.toLowerCase() === userProfile.education_level?.toLowerCase(),
            detail: opportunity.education_level || 'Any education level',
          },
          {
            label: 'Field of Study',
            met: !opportunity.field || (userProfile.field_of_study
              ? opportunity.field.toLowerCase().includes(userProfile.field_of_study.toLowerCase()) ||
                userProfile.field_of_study.toLowerCase().includes(opportunity.field.toLowerCase())
              : false),
            detail: opportunity.field || 'All fields',
          },
          {
            label: 'Language Requirements',
            met: (() => {
              const langs = toArr(opportunity.language_requirements)
              if (langs.length === 0) return true
              if (!userProfile.languages?.length) return false
              const ul = userProfile.languages.map(l => l.toLowerCase())
              return langs.every(l => ul.includes(l.toLowerCase()))
            })(),
            detail: toArr(opportunity.language_requirements).join(', ') || 'No language requirement',
          },
          {
            label: 'Age Range',
            met: (() => {
              if (!opportunity.min_age && !opportunity.max_age) return true
              if (!userProfile.age) return false
              return (!opportunity.min_age || userProfile.age >= opportunity.min_age) &&
                (!opportunity.max_age || userProfile.age <= opportunity.max_age)
            })(),
            detail: opportunity.min_age || opportunity.max_age
              ? `${opportunity.min_age ?? '—'} – ${opportunity.max_age ?? '—'} years`
              : 'No age restriction',
          },
        ]
      : null

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 64px' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', marginBottom: '24px', flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
        <ChevronRight size={14} />
        <Link href="/browse" style={{ color: '#64748b', textDecoration: 'none' }}>Browse</Link>
        <ChevronRight size={14} />
        <span style={{ color: '#0a1628', fontWeight: 500 }}>{opportunity.title}</span>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Badges + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', backgroundColor: badge.bg, color: badge.color }}>{opportunity.type}</span>
            {opportunity.featured && (
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', backgroundColor: '#fefce8', color: '#92400e' }}>★ Featured</span>
            )}
            {opportunity.funding_type === 'Fully Funded' && (
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', backgroundColor: '#dcfce7', color: '#15803d' }}>Fully Funded</span>
            )}
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0a1628', lineHeight: 1.25, marginBottom: '10px' }}>{opportunity.title}</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#64748b', marginBottom: '20px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Users size={14} />
              {opportunity.organization}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Globe size={14} />
              {opportunity.flag} {opportunity.country}
            </span>
            {days !== null && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: deadlineColor(days), fontWeight: 600 }}>
                <Clock size={14} />
                {days < 0 ? 'Deadline passed' : days === 0 ? 'Deadline today!' : `${days} days left`}
              </span>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e2e8f0', marginBottom: '28px' }}>
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '10px 16px', fontSize: '14px', fontWeight: 600,
                  color: activeTab === tab ? '#d4a017' : '#64748b',
                  borderBottom: activeTab === tab ? '2px solid #d4a017' : '2px solid transparent',
                  marginBottom: '-2px', transition: 'color 0.15s',
                }}
              >
                {tab === 'Similar' ? 'Similar' : tab}
              </button>
            ))}
          </div>

          {/* ── Overview tab ───────────────────────────────────────────────── */}
          {activeTab === 'Overview' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0a1628', marginBottom: '12px' }}>About this opportunity</h2>
              <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#334155', marginBottom: '28px' }}>
                {opportunity.description ??
                  `${opportunity.title} is a ${opportunity.funding_type.toLowerCase()} ${opportunity.type.toLowerCase()} offered by ${opportunity.organization} in ${opportunity.country}. This program is open to ${opportunity.education_level || 'eligible'} students and professionals looking to advance their careers and broaden their horizons. Visit the official website to learn more about eligibility and application requirements.`}
              </p>

              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0a1628', marginBottom: '12px' }}>Highlights</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {highlights.map((h, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: '#334155' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#d4a017', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                      <Check size={12} color="#ffffff" />
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Eligibility tab ─────────────────────────────────────────────── */}
          {activeTab === 'Eligibility' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0a1628', marginBottom: '12px' }}>Requirements</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
                {requirements.map((r, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: '#334155', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <BookOpen size={15} style={{ flexShrink: 0, marginTop: '1px', color: '#d4a017' }} />
                    {r}
                  </li>
                ))}
              </ul>

              {eligBreakdown ? (
                <>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0a1628', marginBottom: '4px' }}>Your eligibility breakdown</h3>
                  <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Based on your profile</p>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '4px 16px' }}>
                    {eligBreakdown.map((row, i) => (
                      <EligibilityRow key={i} label={row.label} met={row.met} detail={row.detail} />
                    ))}
                  </div>
                </>
              ) : authUser === null ? (
                <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px' }}>Sign in to see your personalised eligibility breakdown</p>
                  <Link href="/signin" style={{ display: 'inline-block', padding: '8px 20px', backgroundColor: '#d4a017', color: '#ffffff', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
                </div>
              ) : (
                <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px' }}>Complete your profile to see your eligibility breakdown</p>
                  <Link href="/profile/setup" style={{ display: 'inline-block', padding: '8px 20px', backgroundColor: '#d4a017', color: '#ffffff', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>Complete profile</Link>
                </div>
              )}
            </div>
          )}

          {/* ── How to Apply tab ────────────────────────────────────────────── */}
          {activeTab === 'How to Apply' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0a1628', marginBottom: '20px' }}>Application steps</h2>
              <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {applySteps.map((step, i) => (
                  <li key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#d4a017', color: '#ffffff', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, paddingTop: '4px' }}>{step}</span>
                  </li>
                ))}
              </ol>

              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0a1628', marginBottom: '12px' }}>Required documents</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {documents.map((doc, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155', padding: '9px 14px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <FileText size={14} color="#d4a017" style={{ flexShrink: 0 }} />
                    {doc}
                  </li>
                ))}
              </ul>

              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0a1628', marginBottom: '12px' }}>Tips for a strong application</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tips.map((tip, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: '#334155', lineHeight: 1.55 }}>
                    <span style={{ color: '#d4a017', fontSize: '16px', flexShrink: 0, lineHeight: 1.4 }}>✦</span>
                    {tip}
                  </li>
                ))}
              </ul>

              {opportunity.website && (
                <a
                  href={opportunity.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#d4a017', color: '#ffffff', borderRadius: '10px', fontSize: '15px', fontWeight: 700, textDecoration: 'none' }}
                >
                  Apply on {opportunity.organization} website
                  <ExternalLink size={15} />
                </a>
              )}
            </div>
          )}

          {/* ── Similar tab ─────────────────────────────────────────────────── */}
          {activeTab === 'Similar' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0a1628', marginBottom: '16px' }}>Similar opportunities</h2>
              {similar.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#94a3b8' }}>No similar opportunities found right now.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                  {similar.map(opp => <SimilarCard key={opp.id} opp={opp} />)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <div style={{ width: '300px', flexShrink: 0, position: 'sticky', top: '88px' }}>

          {/* Match score */}
          {matchInfo.state === 'score' && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '16px', backgroundColor: '#ffffff', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0a1628', marginBottom: '12px' }}>Your match score</div>
              <ScoreCircle value={matchInfo.value} isEstimate={matchInfo.isEstimate} />
            </div>
          )}

          {/* Key details */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '16px', backgroundColor: '#ffffff' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0a1628', marginBottom: '14px' }}>Key details</h3>
            {[
              { icon: <Award size={14} />, label: 'Funding', value: opportunity.funding_type },
              { icon: <BookOpen size={14} />, label: 'Education', value: opportunity.education_level || 'Any' },
              { icon: <Globe size={14} />, label: 'Location', value: `${opportunity.flag} ${opportunity.country}` },
              { icon: <Clock size={14} />, label: 'Deadline', value: opportunity.deadline || '—' },
              { icon: <Users size={14} />, label: 'Type', value: opportunity.type },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f1f5f9', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', flexShrink: 0 }}>{icon}{label}</div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0a1628', textAlign: 'right' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Apply button */}
          {opportunity.website ? (
            <a
              href={opportunity.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '13px', backgroundColor: '#d4a017', color: '#ffffff', borderRadius: '10px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', marginBottom: '10px', boxSizing: 'border-box' }}
            >
              Apply Now <ExternalLink size={15} />
            </a>
          ) : (
            <button
              disabled
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '13px', backgroundColor: '#e2c76a', color: '#ffffff', borderRadius: '10px', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'not-allowed', marginBottom: '10px' }}
            >
              No website available
            </button>
          )}

          {/* Save + Share */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={toggleSave}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                border: `1px solid ${saved ? '#d4a017' : '#e2e8f0'}`,
                backgroundColor: saved ? '#fef9ee' : '#ffffff',
                color: saved ? '#d4a017' : '#475569',
                cursor: 'pointer',
              }}
            >
              <Bookmark size={14} fill={saved ? '#d4a017' : 'none'} />
              {saved ? 'Saved' : 'Save'}
            </button>
            <button
              onClick={handleShare}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#475569',
                cursor: 'pointer',
              }}
            >
              <Share2 size={14} />
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>

          {/* Match CTA for non-logged-in */}
          {matchInfo.state === 'anonymous' && (
            <div style={{ marginTop: '16px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', lineHeight: 1.5 }}>Sign in to see how well this opportunity matches your profile</p>
              <Link href="/signin" style={{ display: 'inline-block', padding: '8px 16px', backgroundColor: '#0a1628', color: '#ffffff', borderRadius: '8px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>Sign in free</Link>
            </div>
          )}
          {matchInfo.state === 'incomplete' && (
            <div style={{ marginTop: '16px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', lineHeight: 1.5 }}>Complete your profile to see your match score</p>
              <Link href="/profile/setup" style={{ display: 'inline-block', padding: '8px 16px', backgroundColor: '#0a1628', color: '#ffffff', borderRadius: '8px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>Complete profile</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
