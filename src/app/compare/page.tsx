'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Opp {
  id: string
  title: string
  organization_name: string | null
  country: string | null
  continent: string | null
  opportunity_type: string
  application_deadline: string | null
  funding_type: string | null
  format: string | null
  self_fund_cost_usd: number | null
  min_education_level: string | null
  required_fields_of_study: string[] | null
  min_gpa: number | null
  min_age: number | null
  max_age: number | null
  min_work_experience_years: number | null
  required_nationalities: string[] | null
  excluded_nationalities: string[] | null
  required_languages: string[] | null
  requires_passport: boolean | null
  requires_transcripts: boolean | null
  requires_recommendations: boolean | null
  min_recommendations: number | null
  no_ielts_required: boolean
  open_to_africans: boolean
  open_to_developing: boolean
  refugee_friendly: boolean
  disability_inclusive: boolean
  first_gen_preferred: boolean
  requires_motivation_letter: boolean | null
  requires_cv: boolean | null
  description: string | null
  application_url: string | null
}

function fmt(v: string | null | undefined): string {
  return v ?? '—'
}

function fmtBool(v: boolean | null | undefined): string {
  if (v === true) return '✓ Yes'
  if (v === false) return '✗ No'
  return '—'
}

function fmtArr(v: string[] | null | undefined): string {
  if (!v || v.length === 0) return '—'
  return v.join(', ')
}

function fmtDeadline(d: string | null): string {
  if (!d) return 'Rolling / Open'
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'Closed'
  if (days === 0) return 'Closes today'
  if (days <= 7) return `${days}d left`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const ROWS: { label: string; render: (o: Opp) => string }[] = [
  { label: 'Type',            render: o => fmt(o.opportunity_type) },
  { label: 'Organization',   render: o => fmt(o.organization_name) },
  { label: 'Country',        render: o => fmt(o.country) },
  { label: 'Continent',      render: o => fmt(o.continent) },
  { label: 'Format',         render: o => fmt(o.format) },
  { label: 'Funding',        render: o => fmt(o.funding_type) },
  { label: 'Cost (USD)',     render: o => o.self_fund_cost_usd != null ? `$${o.self_fund_cost_usd}` : '—' },
  { label: 'Deadline',       render: o => fmtDeadline(o.application_deadline) },
  { label: 'Min Education',  render: o => fmt(o.min_education_level) },
  { label: 'Fields of Study',render: o => fmtArr(o.required_fields_of_study) },
  { label: 'Min GPA',        render: o => o.min_gpa != null ? String(o.min_gpa) : '—' },
  { label: 'Age Range',      render: o => {
    if (o.min_age == null && o.max_age == null) return '—'
    if (o.min_age != null && o.max_age != null) return `${o.min_age}–${o.max_age}`
    if (o.min_age != null) return `${o.min_age}+`
    return `Up to ${o.max_age}`
  }},
  { label: 'Work Experience', render: o => o.min_work_experience_years != null ? `${o.min_work_experience_years}+ yrs` : '—' },
  { label: 'Nationalities',  render: o => fmtArr(o.required_nationalities) },
  { label: 'Excluded',       render: o => fmtArr(o.excluded_nationalities) },
  { label: 'Languages',      render: o => fmtArr(o.required_languages) },
  { label: 'Passport Req.',  render: o => fmtBool(o.requires_passport) },
  { label: 'Transcripts',    render: o => fmtBool(o.requires_transcripts) },
  { label: 'Motivation Letter', render: o => fmtBool(o.requires_motivation_letter) },
  { label: 'CV Required',    render: o => fmtBool(o.requires_cv) },
  { label: 'Recommendations',render: o => o.requires_recommendations ? (o.min_recommendations ? `${o.min_recommendations} req'd` : 'Yes') : '—' },
  { label: 'No IELTS',       render: o => fmtBool(o.no_ielts_required) },
  { label: 'Open to Africans', render: o => fmtBool(o.open_to_africans) },
  { label: 'Developing Countries', render: o => fmtBool(o.open_to_developing) },
  { label: 'Refugee Friendly', render: o => fmtBool(o.refugee_friendly) },
  { label: 'Disability Inclusive', render: o => fmtBool(o.disability_inclusive) },
  { label: 'First Gen',      render: o => fmtBool(o.first_gen_preferred) },
]

function CompareContent() {
  const searchParams = useSearchParams()
  const [opps, setOpps] = useState<Opp[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    const ids = (searchParams.get('ids') ?? '').split(',').filter(Boolean).slice(0, 3)
    if (ids.length === 0) { setLoading(false); return }

    supabase
      .from('opportunities')
      .select('*')
      .in('id', ids)
      .limit(3)
      .then(({ data }) => {
        if (data) {
          const ordered = ids.map(id => data.find(o => o.id === id)).filter(Boolean) as Opp[]
          setOpps(ordered)
        }
        setLoading(false)
      })
  }, [searchParams])

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
        Loading comparison…
      </div>
    )
  }

  if (opps.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📊</div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#0a1628', marginBottom: '8px' }}>No opportunities to compare</div>
        <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>Select up to 3 opportunities from the browse page.</div>
        <Link href="/opportunities" style={{ display: 'inline-block', padding: '11px 24px', backgroundColor: '#0a1628', color: '#1B2A6B', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
          Browse Opportunities
        </Link>
      </div>
    )
  }

  const colWidth = opps.length === 1 ? '100%' : opps.length === 2 ? '50%' : '33.33%'

  return (
    <>
      {/* Mobile tab switcher */}
      <style>{`@media(min-width:640px){.mobile-tabs{display:none!important}}`}</style>
      <div className="mobile-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto' }}>
        {opps.map((o, i) => (
          <button
            key={o.id}
            onClick={() => setActiveIdx(i)}
            style={{
              padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit',
              border: `1px solid ${activeIdx === i ? '#1B2A6B' : '#e2e8f0'}`,
              backgroundColor: activeIdx === i ? '#fef9ee' : '#fff',
              color: activeIdx === i ? '#1B2A6B' : '#64748b',
            }}
          >
            {o.title.slice(0, 30)}{o.title.length > 30 ? '…' : ''}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
          <thead>
            <tr>
              <th style={{ width: '160px', padding: '12px 16px', textAlign: 'left', backgroundColor: '#f8fafc', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', border: '1px solid #e2e8f0' }}>
                Field
              </th>
              {opps.map((o, i) => (
                <th
                  key={o.id}
                  style={{
                    width: colWidth, padding: '12px 16px', textAlign: 'left',
                    backgroundColor: '#0a1628', border: '1px solid #e2e8f0',
                  }}
                  className={i !== activeIdx ? 'desktop-only' : ''}
                >
                  <Link
                    href={`/opportunities/${o.id}`}
                    style={{ fontSize: '13px', fontWeight: 700, color: '#1B2A6B', textDecoration: 'none', display: 'block', lineHeight: 1.3 }}
                  >
                    {o.title}
                  </Link>
                  {o.organization_name && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{o.organization_name}</div>
                  )}
                  {o.application_url && (
                    <a
                      href={o.application_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-block', marginTop: '8px', fontSize: '11px', fontWeight: 600, color: '#1B2A6B', textDecoration: 'none', border: '1px solid #1B2A6B', borderRadius: '4px', padding: '3px 8px' }}
                    >
                      Apply →
                    </a>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, ri) => (
              <tr key={row.label} style={{ backgroundColor: ri % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                  {row.label}
                </td>
                {opps.map((o, i) => {
                  const val = row.render(o)
                  const isPositive = val.startsWith('✓')
                  const isNegative = val.startsWith('✗')
                  return (
                    <td
                      key={o.id}
                      style={{
                        padding: '10px 16px', fontSize: '13px',
                        color: isPositive ? '#15803d' : isNegative ? '#dc2626' : '#334155',
                        fontWeight: isPositive || isNegative ? 600 : 400,
                        border: '1px solid #e2e8f0',
                      }}
                      className={i !== activeIdx ? 'desktop-only' : ''}
                    >
                      {val}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`.desktop-only{display:none}@media(min-width:640px){.desktop-only{display:table-cell!important}.mobile-tabs{display:none!important}}`}</style>
    </>
  )
}

export default function ComparePage() {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 80px' }}>
      <div style={{ marginBottom: '28px' }}>
        <Link href="/opportunities" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none', marginBottom: '16px', display: 'inline-block' }}>
          ← Back to Opportunities
        </Link>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0a1628', marginBottom: '6px' }}>Compare Opportunities</h1>
        <p style={{ fontSize: '14px', color: '#64748b' }}>Side-by-side comparison of up to 3 opportunities.</p>
      </div>

      <Suspense fallback={<div style={{ color: '#94a3b8', fontSize: '14px' }}>Loading…</div>}>
        <CompareContent />
      </Suspense>
    </div>
  )
}
