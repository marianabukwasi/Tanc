'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Bookmark, Share2, ExternalLink, ChevronRight, Check, X,
  MapPin, Calendar, Clock, Ticket, Flag, AlertTriangle,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { calculateMatchResult } from '@/lib/matchEngine'
import type { MatchInfo } from '@/lib/matching'
import AdBanner from '@/components/AdBanner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Opp {
  id: string
  title: string
  organization_name: string | null
  organization_website: string | null
  opportunity_type: string
  description: string | null
  country: string | null
  city: string | null
  continent: string | null
  start_date: string | null
  end_date: string | null
  application_deadline: string | null
  is_rolling: boolean | null
  format: string | null
  program_language: string | null
  apply_url: string | null
  funding_type: string | null
  self_fund_cost_usd: number | null
  covers_tuition: boolean | null
  covers_accommodation: boolean | null
  covers_flights: boolean | null
  covers_meals: boolean | null
  stipend_amount: number | null
  stipend_currency: string | null
  ticket_affiliate_url: string | null
  min_education_level: string | null
  required_fields_of_study: string[] | null
  min_gpa: number | null
  gpa_scale: number | null
  required_nationalities: string[] | null
  excluded_nationalities: string[] | null
  required_residence_countries: string[] | null
  min_age: number | null
  max_age: number | null
  gender_restriction: string | null
  required_languages: { language: string; level?: string }[] | string[] | null
  min_work_experience_years: number | null
  required_skills: string[] | null
  requires_passport: boolean | null
  passport_validity_months: number | null
  requires_transcripts: boolean | null
  requires_recommendations: boolean | null
  min_recommendations: number | null
  requires_cv: boolean | null
  requires_motivation_letter: boolean | null
  min_volunteer_hours: number | null
  requires_leadership: boolean | null
  first_gen_preferred: boolean | null
  refugee_friendly: boolean | null
  disability_inclusive: boolean | null
  no_ielts_required: boolean | null
  open_to_africans: boolean | null
  open_to_developing: boolean | null
  is_featured: boolean | null
  tags: string[] | null
  views: number | null
}

interface Profile {
  id: string
  nationalities: string[] | null
  date_of_birth: string | null
  education_level: string | null
  field_of_study: string | null
  languages: { name: string; level?: string }[] | string[] | null
  gpa_value: number | null
  gpa_scale: number | null
  years_work_experience: number | null
  has_passport: boolean | null
  passport_expiry: string | null
  has_transcripts: boolean | null
  recommendation_letters_count: number | null
  is_refugee: boolean | null
  is_first_generation: boolean | null
  profile_complete_pct: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000))
}

function langNames(langs: { name?: string; language?: string }[] | string[] | null): string[] {
  if (!langs || !langs.length) return []
  return (langs as (string | { name?: string; language?: string })[]).map(l =>
    typeof l === 'string' ? l : (l.name ?? l.language ?? '')
  ).filter(Boolean)
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  Scholarships:         { bg: '#eff6ff', color: '#1d4ed8' },
  Fellowships:          { bg: '#f5f3ff', color: '#7c3aed' },
  Internships:          { bg: '#f0fdf4', color: '#15803d' },
  Conferences:          { bg: '#fdf4ff', color: '#a21caf' },
  Competitions:         { bg: '#fff1f2', color: '#be123c' },
  Grants:               { bg: '#fff7ed', color: '#c2410c' },
  'Exchange Programs':  { bg: '#f0f9ff', color: '#0369a1' },
  'Writing Retreats':   { bg: '#fef9c3', color: '#854d0e' },
  'Wellness Retreats':  { bg: '#f0fdf4', color: '#166534' },
  'Sports Events':      { bg: '#fff1f2', color: '#9f1239' },
  'Sports Camps':       { bg: '#fdf2f8', color: '#86198f' },
  'Cultural Events':    { bg: '#ecfdf5', color: '#065f46' },
  'Leadership Programs':{ bg: '#fefce8', color: '#92400e' },
  'Volunteer Programs': { bg: '#f0fdf4', color: '#15803d' },
  'Workshops & Training':{ bg: '#f8fafc', color: '#334155' },
  'Online Opportunities':{ bg: '#eff6ff', color: '#1d4ed8' },
  Camps:                { bg: '#fdf4ff', color: '#a21caf' },
  Residencies:          { bg: '#fff7ed', color: '#c2410c' },
}

const FUNDING_BADGE: Record<string, { bg: string; color: string }> = {
  'Fully Funded':     { bg: '#dcfce7', color: '#15803d' },
  'Partially Funded': { bg: '#fef9c3', color: '#92400e' },
  Stipend:            { bg: '#dbeafe', color: '#1d4ed8' },
  'Self-Funded':      { bg: '#f1f5f9', color: '#475569' },
  Free:               { bg: '#dcfce7', color: '#15803d' },
}

// ─── Score circle ─────────────────────────────────────────────────────────────

function ScoreCircle({ value }: { value: number }) {
  const r = 42
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ
  const color = value >= 90 ? '#15803d' : value >= 60 ? '#d97706' : '#94a3b8'
  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" />
      <circle
        cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="55" y="50" textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>{value}%</text>
      <text x="55" y="67" textAnchor="middle" fontSize="11" fill="#64748b">match</text>
    </svg>
  )
}

// ─── Eligibility row ──────────────────────────────────────────────────────────

function EligRow({ met, label, detail }: { met: boolean; label: string; detail: string }) {
  return (
    <div style={{ display: 'flex', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
        backgroundColor: met ? '#dcfce7' : '#fee2e2',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px',
      }}>
        {met ? <Check size={11} color="#15803d" /> : <X size={11} color="#dc2626" />}
      </div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0a1628' }}>{label}</div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>{detail}</div>
      </div>
    </div>
  )
}

// ─── Report modal ─────────────────────────────────────────────────────────────

function ReportModal({ oppId, userId, onClose }: { oppId: string; userId: string; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [sent, setSent] = useState(false)

  async function submit() {
    if (!reason) return
    await supabase.from('reports').insert({
      opportunity_id: oppId,
      reported_by: userId,
      reason,
      details,
    })
    setSent(true)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
    }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '400px', maxWidth: '90vw' }}
        onClick={e => e.stopPropagation()}
      >
        {sent ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <Check size={40} color="#15803d" style={{ marginBottom: '12px' }} />
            <p style={{ fontSize: '15px', color: '#0a1628', fontWeight: 600 }}>Thank you for reporting</p>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>Our team will review this listing.</p>
            <button onClick={onClose} style={{ marginTop: '20px', padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#0a1628', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Close</button>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0a1628', marginBottom: '16px' }}>Report this listing</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Reason *</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit' }}
              >
                <option value="">Select a reason</option>
                <option>Incorrect information</option>
                <option>Deadline passed</option>
                <option>Broken link</option>
                <option>Scam or fraudulent</option>
                <option>Duplicate listing</option>
                <option>Other</option>
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Details (optional)</label>
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                placeholder="Add more context…"
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={onClose} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Cancel</button>
              <button
                onClick={submit}
                disabled={!reason}
                style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', backgroundColor: reason ? '#dc2626' : '#e2e8f0', color: reason ? '#fff' : '#94a3b8', cursor: reason ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 600 }}
              >
                Submit report
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OpportunityDetail({ id }: { id: string }) {
  const router = useRouter()

  const [opp, setOpp] = useState<Opp | null>(null)
  const [similar, setSimilar] = useState<Opp[]>([])
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [matchInfo, setMatchInfo] = useState<MatchInfo>({ state: 'loading' })
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reporting, setReporting] = useState(false)

  // Auth + profile
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setUser(null); setMatchInfo({ state: 'anonymous' }); return }
      setUser(data.user)
      const { data: p } = await supabase
        .from('profiles')
        .select('id,nationalities,date_of_birth,education_level,field_of_study,languages,gpa_value,gpa_scale,years_work_experience,has_passport,passport_expiry,has_transcripts,recommendation_letters_count,is_refugee,is_first_generation,profile_complete_pct')
        .eq('id', data.user.id)
        .single()
      if (p) setProfile(p as Profile)
      else setMatchInfo({ state: 'incomplete' })
    })
  }, [])

  // Load opportunity
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .eq('is_archived', false)
        .single()

      if (!data) { router.push('/opportunities'); return }
      setOpp(data as Opp)

      // Increment views
      await supabase.from('opportunities').update({ views: (data.views ?? 0) + 1 }).eq('id', id)

      // Similar
      const { data: sim } = await supabase
        .from('opportunities')
        .select('*')
        .eq('is_published', true)
        .eq('is_archived', false)
        .eq('opportunity_type', data.opportunity_type)
        .neq('id', id)
        .order('application_deadline', { ascending: true, nullsFirst: false })
        .limit(4)
      if (sim) setSimilar(sim as Opp[])

      setLoading(false)
    }
    load()
  }, [id, router])

  // Saved state
  useEffect(() => {
    if (!user || !id) return
    supabase.from('user_opportunities').select('id').eq('user_id', user.id).eq('opportunity_id', id).maybeSingle()
      .then(({ data }) => setSaved(!!data))
  }, [user, id])

  // Match score
  useEffect(() => {
    if (!opp) return
    if (user === undefined) { setMatchInfo({ state: 'loading' }); return }
    if (user === null) { setMatchInfo({ state: 'anonymous' }); return }
    if (!profile) { setMatchInfo({ state: 'incomplete' }); return }

    const result = calculateMatchResult(
      {
        nationalities: profile.nationalities,
        date_of_birth: profile.date_of_birth,
        education_level: profile.education_level,
        field_of_study: profile.field_of_study,
        languages: profile.languages,
        gpa_value: profile.gpa_value,
        gpa_scale: profile.gpa_scale,
        years_work_experience: profile.years_work_experience,
        has_passport: profile.has_passport,
        has_transcripts: profile.has_transcripts,
        recommendation_letters_count: profile.recommendation_letters_count,
      },
      {
        required_nationalities: opp.required_nationalities,
        excluded_nationalities: opp.excluded_nationalities ?? null,
        min_education_level: opp.min_education_level,
        required_fields_of_study: opp.required_fields_of_study,
        min_gpa: opp.min_gpa,
        gpa_scale: opp.gpa_scale,
        required_languages: opp.required_languages,
        min_age: opp.min_age,
        max_age: opp.max_age,
        min_work_experience_years: opp.min_work_experience_years,
        requires_passport: opp.requires_passport,
        requires_transcripts: opp.requires_transcripts,
        requires_recommendations: opp.requires_recommendations,
        min_recommendations: opp.min_recommendations,
      }
    )

    setMatchInfo({ state: 'score', value: result.score, isEstimate: result.gaps.length > 0 && result.score > 60 })

    // Cache score on detail view
    if (user) {
      supabase.from('user_opportunities').upsert(
        { user_id: user.id, opportunity_id: opp.id, match_score: result.score },
        { onConflict: 'user_id,opportunity_id' }
      ).then(() => {})
    }
  }, [opp, user, profile])

  async function toggleSave() {
    if (!user) { router.push('/signin'); return }
    if (saved) {
      await supabase.from('user_opportunities').delete().eq('user_id', user.id).eq('opportunity_id', id)
      setSaved(false)
    } else {
      const score = matchInfo.state === 'score' ? matchInfo.value : null
      await supabase.from('user_opportunities').upsert(
        { user_id: user.id, opportunity_id: id, status: 'Saved', match_score: score },
        { onConflict: 'user_id,opportunity_id' }
      )
      setSaved(true)
    }
  }

  function share() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading || !opp) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: '#94a3b8' }}>Loading opportunity…</div>
      </div>
    )
  }

  const typeBadge = TYPE_COLORS[opp.opportunity_type] ?? { bg: '#f1f5f9', color: '#475569' }
  const fundBadge = FUNDING_BADGE[opp.funding_type ?? ''] ?? { bg: '#f1f5f9', color: '#475569' }
  const days = daysUntil(opp.application_deadline)
  const deadlineColor = days === null ? '#64748b' : days < 0 ? '#94a3b8' : days <= 7 ? '#dc2626' : days <= 30 ? '#d97706' : '#15803d'

  // What's covered
  const covered: string[] = []
  if (opp.covers_tuition) covered.push('Tuition')
  if (opp.covers_accommodation) covered.push('Accommodation')
  if (opp.covers_flights) covered.push('Flights')
  if (opp.covers_meals) covered.push('Meals')
  if (opp.stipend_amount) covered.push(`Stipend (${opp.stipend_currency ?? 'USD'} ${opp.stipend_amount.toLocaleString()})`)

  // Required documents
  const docs: string[] = []
  if (opp.requires_cv) docs.push('CV / Résumé')
  if (opp.requires_motivation_letter) docs.push('Motivation letter / Personal statement')
  if (opp.requires_transcripts) docs.push('Academic transcripts')
  if (opp.requires_recommendations) docs.push(`${opp.min_recommendations ? opp.min_recommendations + ' ' : ''}Letter(s) of recommendation`)
  if (opp.requires_passport) docs.push(`Valid passport${opp.passport_validity_months ? ` (valid for ${opp.passport_validity_months}+ months)` : ''}`)
  if (!docs.length) docs.push('See official website for required documents')

  // Eligibility checklist
  const eligChecklist = profile && matchInfo.state === 'score'
    ? (() => {
        const age = ageFromDob(profile.date_of_birth)
        const nat = profile.nationalities?.[0] ?? ''
        const langs = langNames(profile.languages)
        const requiredLangs = langNames(opp.required_languages)
        const items: { label: string; met: boolean; detail: string }[] = []

        // Nationality
        const reqNats = opp.required_nationalities ?? []
        items.push({
          label: 'Nationality',
          met: reqNats.length === 0 || reqNats.some(n => ['global','all','worldwide'].includes(n.toLowerCase())) || reqNats.some(n => n.toLowerCase() === nat.toLowerCase()),
          detail: reqNats.length === 0 ? 'Open to all nationalities' : `Required: ${reqNats.join(', ')}${nat ? ` — your nationality: ${nat}` : ''}`,
        })

        // Education
        items.push({
          label: 'Education level',
          met: !opp.min_education_level || opp.min_education_level.toLowerCase() === 'any' || opp.min_education_level.toLowerCase() === (profile.education_level ?? '').toLowerCase(),
          detail: opp.min_education_level ? `Required: ${opp.min_education_level}${profile.education_level ? ` — yours: ${profile.education_level}` : ''}` : 'Any education level',
        })

        // Field of study
        const reqFields = opp.required_fields_of_study ?? []
        const pf = (profile.field_of_study ?? '').toLowerCase()
        items.push({
          label: 'Field of study',
          met: reqFields.length === 0 || reqFields.some(f => f.toLowerCase().includes(pf) || pf.includes(f.toLowerCase())),
          detail: reqFields.length === 0 ? 'All fields accepted' : `Required: ${reqFields.join(', ')}${profile.field_of_study ? ` — yours: ${profile.field_of_study}` : ''}`,
        })

        // Languages
        if (requiredLangs.length > 0) {
          const ul = langs.map(l => l.toLowerCase())
          items.push({
            label: 'Language requirements',
            met: requiredLangs.every(l => ul.includes(l.toLowerCase())),
            detail: `Required: ${requiredLangs.join(', ')}${langs.length ? ` — yours: ${langs.join(', ')}` : ' — not in your profile'}`,
          })
        }

        // Age
        if (opp.min_age || opp.max_age) {
          const withinAge = age !== null &&
            (!opp.min_age || age >= opp.min_age) &&
            (!opp.max_age || age <= opp.max_age)
          items.push({
            label: 'Age',
            met: withinAge,
            detail: `${opp.min_age ?? '—'}–${opp.max_age ?? '—'} years${age !== null ? ` — you are ${age}` : ' — date of birth not set'}`,
          })
        }

        // GPA
        if (opp.min_gpa) {
          const scale = opp.gpa_scale ?? 4
          const userGpa = profile.gpa_value
          const metGpa = userGpa !== null && userGpa >= opp.min_gpa
          items.push({
            label: 'GPA',
            met: metGpa,
            detail: `Min GPA: ${opp.min_gpa}/${scale}${userGpa !== null ? ` — yours: ${userGpa}/${profile.gpa_scale ?? 4}` : ' — not in your profile'}`,
          })
        }

        // Work experience
        if (opp.min_work_experience_years && opp.min_work_experience_years > 0) {
          const exp = profile.years_work_experience ?? 0
          items.push({
            label: 'Work experience',
            met: exp >= opp.min_work_experience_years,
            detail: `Min ${opp.min_work_experience_years} year(s) — you have ${exp}`,
          })
        }

        // Passport
        if (opp.requires_passport) {
          items.push({
            label: 'Valid passport',
            met: !!profile.has_passport,
            detail: profile.has_passport ? `In your profile${profile.passport_expiry ? ` (expires ${fmtDate(profile.passport_expiry)})` : ''}` : 'Not in your profile',
          })
        }

        return items
      })()
    : null

  // Visa indicator
  const showVisa =
    user && profile?.nationalities?.length &&
    opp.country && opp.format?.toLowerCase() !== 'remote/online' &&
    opp.format?.toLowerCase() !== 'online'

  const isRemote = opp.format?.toLowerCase().includes('remote') || opp.format?.toLowerCase().includes('online')

  return (
    <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '32px 24px 80px' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', marginBottom: '28px', flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
        <ChevronRight size={13} />
        <Link href="/opportunities" style={{ color: '#64748b', textDecoration: 'none' }}>Opportunities</Link>
        <ChevronRight size={13} />
        <span style={{ color: '#0a1628', fontWeight: 500 }}>{opp.title}</span>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '40px', alignItems: 'flex-start' }}>

        {/* ── LEFT COLUMN ─────────────────────────────────────────────────────── */}
        <div style={{ minWidth: 0 }}>

          {/* 1. Category badge + title */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', backgroundColor: typeBadge.bg, color: typeBadge.color }}>
              {opp.opportunity_type}
            </span>
            {opp.is_featured && (
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', backgroundColor: '#fefce8', color: '#92400e' }}>★ Featured</span>
            )}
            {opp.funding_type && (
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', backgroundColor: fundBadge.bg, color: fundBadge.color }}>
                {opp.funding_type}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#0a1628', lineHeight: 1.2, marginBottom: '10px' }}>{opp.title}</h1>

          {/* 2. Organization + website */}
          <div style={{ fontSize: '15px', color: '#475569', marginBottom: '20px' }}>
            {opp.organization_website ? (
              <a href={opp.organization_website} target="_blank" rel="noopener noreferrer" style={{ color: '#d4a017', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {opp.organization_name ?? 'View organizer'}
                <ExternalLink size={13} />
              </a>
            ) : (
              <span style={{ fontWeight: 600 }}>{opp.organization_name ?? '—'}</span>
            )}
          </div>

          {/* 3. Quick stats row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '16px 20px', backgroundColor: '#f8fafc', borderRadius: '12px', marginBottom: '28px', fontSize: '13px', color: '#475569' }}>
            {(opp.city || opp.country) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} color="#d4a017" />
                <span>{[opp.city, opp.country].filter(Boolean).join(', ')}</span>
              </div>
            )}
            {(opp.start_date || opp.end_date) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} color="#d4a017" />
                <span>{fmtDate(opp.start_date)}{opp.end_date ? ` – ${fmtDate(opp.end_date)}` : ''}</span>
              </div>
            )}
            {opp.format && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flag size={14} color="#d4a017" />
                <span style={{ textTransform: 'capitalize' }}>{opp.format}</span>
              </div>
            )}
            {opp.program_language && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Language: <strong style={{ color: '#0a1628' }}>{opp.program_language}</strong></span>
              </div>
            )}
          </div>

          {/* 4. What is covered */}
          {covered.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0a1628', marginBottom: '14px' }}>What is covered</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {covered.map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', backgroundColor: '#dcfce7', borderRadius: '24px', fontSize: '13px', fontWeight: 600, color: '#15803d' }}>
                    <Check size={13} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Description */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0a1628', marginBottom: '14px' }}>About this opportunity</h2>
            <div style={{ fontSize: '15px', lineHeight: 1.75, color: '#334155' }}>
              {opp.description
                ? opp.description.split('\n\n').map((para, i) => <p key={i} style={{ marginBottom: '12px' }}>{para}</p>)
                : <p>{`${opp.title} is a ${opp.funding_type?.toLowerCase() ?? ''} ${opp.opportunity_type.toLowerCase()} hosted by ${opp.organization_name ?? 'the organizer'} in ${opp.country ?? 'an international location'}. Visit the official website for full program details.`}</p>
              }
            </div>
          </div>

          {/* 6. Eligibility requirements */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0a1628', marginBottom: '14px' }}>Eligibility requirements</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                opp.min_education_level && `Education: ${opp.min_education_level}`,
                (opp.required_nationalities?.length ?? 0) > 0 && `Open to: ${opp.required_nationalities!.join(', ')}`,
                (opp.required_fields_of_study?.length ?? 0) > 0 && `Field of study: ${opp.required_fields_of_study!.join(', ')}`,
                (opp.min_age || opp.max_age) && `Age: ${opp.min_age ?? '—'} – ${opp.max_age ?? '—'} years`,
                opp.min_gpa && `Min GPA: ${opp.min_gpa} / ${opp.gpa_scale ?? 4}`,
                opp.gender_restriction && opp.gender_restriction !== 'all' && `Gender: ${opp.gender_restriction}`,
                (opp.min_work_experience_years ?? 0) > 0 && `Work experience: ${opp.min_work_experience_years} year(s)`,
                langNames(opp.required_languages).length > 0 && `Language: ${langNames(opp.required_languages).join(', ')}`,
                opp.no_ielts_required && 'No IELTS required',
                opp.open_to_africans && 'Open to Africans',
                opp.open_to_developing && 'Open to developing countries',
                opp.refugee_friendly && 'Refugee friendly',
                opp.disability_inclusive && 'Disability inclusive',
                opp.first_gen_preferred && 'First-generation students preferred',
              ].filter(Boolean).map((line, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '14px', color: '#334155' }}>
                  <Check size={14} color="#d4a017" style={{ flexShrink: 0 }} />
                  {line}
                </div>
              ))}
              {!opp.min_education_level && !opp.required_nationalities?.length && !opp.min_age && (
                <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '14px', color: '#64748b' }}>
                  Open to all — check the official website for specific requirements.
                </div>
              )}
            </div>
          </div>

          {/* 7. Required documents */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0a1628', marginBottom: '14px' }}>Required documents</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {docs.map((doc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '14px', color: '#334155' }}>
                  <Check size={14} color="#d4a017" style={{ flexShrink: 0 }} />
                  {doc}
                </div>
              ))}
            </div>
          </div>

          {/* 8. How to apply */}
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0a1628', marginBottom: '14px' }}>How to apply</h2>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                'Review the eligibility requirements and confirm you qualify.',
                'Prepare all required documents well in advance of the deadline.',
                opp.apply_url ? `Click "Apply Now" to go to the official application page.` : 'Visit the official website to find the application portal.',
                'Submit your application before the deadline and save your confirmation.',
              ].map((step, i) => (
                <li key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#d4a017', color: '#fff', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, paddingTop: '4px' }}>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* ── RIGHT COLUMN (sticky sidebar) ───────────────────────────────────── */}
        <div style={{ position: 'sticky', top: '88px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* 1. Match score */}
          {matchInfo.state === 'score' && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', backgroundColor: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>Your match score</div>
              <ScoreCircle value={matchInfo.value} />
              {matchInfo.isEstimate && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>Estimated — complete your profile for accuracy</div>}
            </div>
          )}
          {matchInfo.state === 'anonymous' && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', backgroundColor: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#e2e8f0', filter: 'blur(6px)', marginBottom: '6px' }}>87%</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>Sign up to see your match score</div>
              <Link href="/signup" style={{ display: 'inline-block', padding: '8px 20px', backgroundColor: '#0a1628', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>Sign up free</Link>
            </div>
          )}
          {matchInfo.state === 'incomplete' && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', backgroundColor: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>Complete your profile to see your match score</div>
              <Link href="/profile/setup" style={{ display: 'inline-block', padding: '8px 20px', backgroundColor: '#0a1628', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>Complete profile</Link>
            </div>
          )}

          {/* 2. Personal eligibility checklist */}
          {eligChecklist && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', backgroundColor: '#fff' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>Your eligibility</div>
              {eligChecklist.map((row, i) => <EligRow key={i} met={row.met} label={row.label} detail={row.detail} />)}
            </div>
          )}

          {/* 3. Deadline card */}
          <div style={{ border: `1px solid ${days !== null && days <= 7 && days >= 0 ? '#fecaca' : '#e2e8f0'}`, borderRadius: '14px', padding: '18px', backgroundColor: days !== null && days <= 7 && days >= 0 ? '#fff5f5' : '#fff' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
              <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />Deadline
            </div>
            {opp.is_rolling ? (
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#15803d' }}>Rolling / Open year-round</div>
            ) : opp.application_deadline ? (
              <>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0a1628' }}>{fmtDate(opp.application_deadline)}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: deadlineColor, marginTop: '4px' }}>
                  {days! < 0 ? 'Deadline passed' : days === 0 ? 'Due today!' : `${days} days left`}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '14px', color: '#64748b' }}>No deadline set</div>
            )}
          </div>

          {/* 4. Save to tracker */}
          <button
            onClick={toggleSave}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
              border: `1px solid ${saved ? '#d4a017' : '#e2e8f0'}`,
              backgroundColor: saved ? '#fef9ee' : '#fff',
              color: saved ? '#d4a017' : '#475569',
              cursor: 'pointer', boxSizing: 'border-box',
            }}
          >
            <Bookmark size={15} fill={saved ? '#d4a017' : 'none'} />
            {saved ? 'Saved to tracker' : 'Save to tracker'}
          </button>

          {/* 5. Apply Now */}
          {opp.apply_url ? (
            <a
              href={opp.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '13px', backgroundColor: '#0a1628', color: '#fff', borderRadius: '10px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', boxSizing: 'border-box' }}
            >
              Apply Now <ExternalLink size={15} />
            </a>
          ) : opp.organization_website ? (
            <a
              href={opp.organization_website}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '13px', backgroundColor: '#0a1628', color: '#fff', borderRadius: '10px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', boxSizing: 'border-box' }}
            >
              Apply on Website <ExternalLink size={15} />
            </a>
          ) : (
            <button disabled style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '13px', backgroundColor: '#e2e8f0', color: '#94a3b8', borderRadius: '10px', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'not-allowed', boxSizing: 'border-box' }}>
              No application link
            </button>
          )}

          {/* 6. Get Tickets */}
          {opp.ticket_affiliate_url && (
            <a
              href={opp.ticket_affiliate_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', backgroundColor: '#d4a017', color: '#fff', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none', boxSizing: 'border-box' }}
            >
              <Ticket size={15} />
              Get Tickets
            </a>
          )}

          {/* 7. Visa indicator */}
          {showVisa && !isRemote && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', backgroundColor: '#fff' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>Visa info</div>
              <div style={{ fontSize: '13px', color: '#334155', marginBottom: '8px' }}>
                {`Check visa requirements for ${profile!.nationalities![0]} citizens travelling to ${opp.country}.`}
              </div>
              <a
                href={`https://www.visaguide.world/`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '12px', color: '#d4a017', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                Check visa requirements <ExternalLink size={12} />
              </a>
            </div>
          )}

          {/* Share */}
          <button
            onClick={share}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#475569', cursor: 'pointer', fontSize: '13px', fontWeight: 600, boxSizing: 'border-box' }}
          >
            <Share2 size={14} />
            {copied ? 'Link copied!' : 'Share this opportunity'}
          </button>

          {/* 8. Report */}
          {user && (
            <button
              onClick={() => setReporting(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#94a3b8', padding: '4px 0' }}
            >
              <AlertTriangle size={13} />
              Report this listing
            </button>
          )}

          <AdBanner slot="opportunity-sidebar" size="rectangle" />
        </div>
      </div>

      {/* ── Similar opportunities ──────────────────────────────────────────────── */}
      {similar.length > 0 && (
        <div style={{ marginTop: '60px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0a1628', marginBottom: '20px' }}>
            Similar {opp.opportunity_type}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            {similar.map(s => {
              const sb = TYPE_COLORS[s.opportunity_type] ?? { bg: '#f1f5f9', color: '#475569' }
              const fb = FUNDING_BADGE[s.funding_type ?? ''] ?? { bg: '#f1f5f9', color: '#475569' }
              const sd = daysUntil(s.application_deadline)
              return (
                <Link
                  key={s.id}
                  href={`/opportunities/${s.id}`}
                  style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#fff', textDecoration: 'none', display: 'block', transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', backgroundColor: sb.bg, color: sb.color }}>{s.opportunity_type}</span>
                    {s.funding_type && <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '20px', backgroundColor: fb.bg, color: fb.color }}>{s.funding_type}</span>}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0a1628', marginBottom: '4px', lineHeight: 1.4 }}>{s.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>{s.organization_name}{s.country ? ` · ${s.country}` : ''}</div>
                  {sd !== null && sd >= 0 && (
                    <div style={{ fontSize: '12px', fontWeight: 600, color: sd <= 7 ? '#dc2626' : sd <= 30 ? '#d97706' : '#15803d' }}>
                      {sd === 0 ? 'Due today' : `${sd} days left`}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Report modal */}
      {reporting && user && (
        <ReportModal oppId={opp.id} userId={user.id} onClose={() => setReporting(false)} />
      )}
    </div>
  )
}
