'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Bookmark, Search, ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { calculateMatch, type MatchProfile } from '@/lib/matching'
import { COUNTRIES } from '@/lib/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  ticket_affiliate_url: string | null
  min_education_level: string | null
  required_nationalities: string[] | null
  min_age: number | null
  max_age: number | null
  no_ielts_required: boolean
  open_to_africans: boolean
  open_to_developing: boolean
  refugee_friendly: boolean
  disability_inclusive: boolean
  first_gen_preferred: boolean
  created_at: string
  views: number
}

interface ActiveFilters {
  types: string[]
  continents: string[]
  countries: string[]
  excludedCountries: string[]
  formats: string[]
  funding: string[]
  deadline: string
  education: string[]
  costRange: string
  noIelts: boolean
  openAfricans: boolean
  openDeveloping: boolean
  refugeeFriendly: boolean
  disabilityInclusive: boolean
  firstGen: boolean
}

// ─── Filter constants ─────────────────────────────────────────────────────────

const CATEGORY_TYPES = [
  'Scholarships','Fellowships','Internships','Conferences','Competitions',
  'Grants','Writing Retreats','Wellness Retreats','Sports Events','Sports Camps',
  'Cultural Events','Exchange Programs','Leadership Programs','Volunteer Programs',
  'Workshops & Training','Online Opportunities','Camps','Residencies',
]

const CONTINENTS = [
  'Africa','Europe','North America','South America','Asia','Oceania','Middle East','Global',
]

const FORMATS = ['In-person','Remote/Online','Hybrid']

const FUNDING_OPTIONS = ['Fully Funded','Partially Funded','Stipend','Self-Funded','Free']

const DEADLINE_OPTIONS = ['This Week','This Month','Next 3 Months','Rolling','Open Year-Round']

const EDUCATION_OPTIONS = ['High School','Undergraduate','Postgraduate','PhD','Any']

const COST_OPTIONS = ['Free','Under $500','$500–$2000','$2000–$5000','Over $5000']

const SPECIAL_TAGS: { label: string; key: keyof ActiveFilters }[] = [
  { label: 'No IELTS Required',           key: 'noIelts' },
  { label: 'Open to Africans',            key: 'openAfricans' },
  { label: 'Open to Developing Countries',key: 'openDeveloping' },
  { label: 'Refugee Friendly',            key: 'refugeeFriendly' },
  { label: 'Disability Inclusive',        key: 'disabilityInclusive' },
  { label: 'First Generation',            key: 'firstGen' },
]

const DEFAULT_FILTERS: ActiveFilters = {
  types: [], continents: [], countries: [], excludedCountries: [],
  formats: [], funding: [], deadline: '', education: [], costRange: '',
  noIelts: false, openAfricans: false, openDeveloping: false,
  refugeeFriendly: false, disabilityInclusive: false, firstGen: false,
}

const PAGE_SIZE = 24

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
  'Leadership Programs': { bg: '#fef9e7', color: '#d4a017' },
  'Volunteer Programs':  { bg: '#ecfdf5', color: '#059669' },
  'Training Programs':   { bg: '#fffbeb', color: '#b45309' },
  'Hackathons':          { bg: '#f1f5f9', color: '#334155' },
  'Workshops':           { bg: '#faf5ff', color: '#9333ea' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(d: string | null): number | null {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

function fmtDeadline(d: string | null): string {
  if (!d) return 'Rolling / Open'
  const days = daysUntil(d)
  if (days === null) return 'Rolling / Open'
  if (days < 0) return 'Closed'
  if (days === 0) return 'Closes today'
  if (days <= 7) return `${days}d left`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toggleArr<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
}

// ─── Supabase query ───────────────────────────────────────────────────────────

async function fetchOpps(
  filters: ActiveFilters,
  search: string,
  sort: string
): Promise<Opp[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from('opportunities')
    .select('*')
    .eq('is_published', true)
    .eq('is_archived', false)
    .limit(500)

  if (filters.types.length)            q = q.in('opportunity_type', filters.types)
  if (filters.continents.length)       q = q.in('continent', filters.continents)
  if (filters.countries.length)        q = q.in('country', filters.countries)
  for (const c of filters.excludedCountries) q = q.neq('country', c)
  if (filters.formats.length)          q = q.in('format', filters.formats)
  if (filters.funding.length)          q = q.in('funding_type', filters.funding)
  if (filters.education.length)        q = q.in('min_education_level', filters.education)

  const today = new Date().toISOString().split('T')[0]
  if (filters.deadline === 'This Week') {
    const end = new Date(); end.setDate(end.getDate() + 7)
    q = q.gte('application_deadline', today).lte('application_deadline', end.toISOString().split('T')[0])
  } else if (filters.deadline === 'This Month') {
    const end = new Date(); end.setDate(end.getDate() + 30)
    q = q.gte('application_deadline', today).lte('application_deadline', end.toISOString().split('T')[0])
  } else if (filters.deadline === 'Next 3 Months') {
    const end = new Date(); end.setDate(end.getDate() + 90)
    q = q.gte('application_deadline', today).lte('application_deadline', end.toISOString().split('T')[0])
  } else if (filters.deadline === 'Rolling') {
    q = q.eq('is_rolling', true)
  } else if (filters.deadline === 'Open Year-Round') {
    q = q.is('application_deadline', null)
  }

  if (filters.costRange === 'Free') {
    q = q.or('self_fund_cost_usd.eq.0,funding_type.eq.Free')
  } else if (filters.costRange === 'Under $500') {
    q = q.gt('self_fund_cost_usd', 0).lt('self_fund_cost_usd', 500)
  } else if (filters.costRange === '$500–$2000') {
    q = q.gte('self_fund_cost_usd', 500).lte('self_fund_cost_usd', 2000)
  } else if (filters.costRange === '$2000–$5000') {
    q = q.gt('self_fund_cost_usd', 2000).lte('self_fund_cost_usd', 5000)
  } else if (filters.costRange === 'Over $5000') {
    q = q.gt('self_fund_cost_usd', 5000)
  }

  if (filters.noIelts)           q = q.eq('no_ielts_required', true)
  if (filters.openAfricans)      q = q.eq('open_to_africans', true)
  if (filters.openDeveloping)    q = q.eq('open_to_developing', true)
  if (filters.refugeeFriendly)   q = q.eq('refugee_friendly', true)
  if (filters.disabilityInclusive) q = q.eq('disability_inclusive', true)
  if (filters.firstGen)          q = q.eq('first_gen_preferred', true)

  if (search.trim()) {
    const s = search.trim()
    q = q.or(`title.ilike.%${s}%,organization_name.ilike.%${s}%,description.ilike.%${s}%`)
  }

  if (sort === 'Deadline Soonest') {
    q = q.order('application_deadline', { ascending: true, nullsFirst: false })
  } else {
    q = q.order('created_at', { ascending: false })
  }

  const { data } = await q
  return (data ?? []) as Opp[]
}

// ─── Filter section ───────────────────────────────────────────────────────────

function FilterSection({
  title, open, onToggle, children,
}: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div style={{ borderBottom: '1px solid #f1f5f9' }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          width: '100%', padding: '14px 0', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '13px', color: '#0a1628', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          {title}
        </span>
        {open ? <ChevronUp size={14} color="#64748b" /> : <ChevronDown size={14} color="#64748b" />}
      </button>
      {open && <div style={{ paddingBottom: '14px' }}>{children}</div>}
    </div>
  )
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '3px 0' }}>
      <span
        onClick={onChange}
        style={{
          width: '15px', height: '15px', borderRadius: '3px',
          border: `2px solid ${checked ? '#d4a017' : '#cbd5e1'}`,
          backgroundColor: checked ? '#d4a017' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.15s', cursor: 'pointer',
        }}
      >
        {checked && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span onClick={onChange} style={{ fontSize: '13px', color: checked ? '#0a1628' : '#475569', fontWeight: checked ? 500 : 400, lineHeight: 1.4 }}>
        {label}
      </span>
    </label>
  )
}

function Radio({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '3px 0' }}>
      <span
        onClick={onChange}
        style={{
          width: '15px', height: '15px', borderRadius: '50%',
          border: `2px solid ${checked ? '#d4a017' : '#cbd5e1'}`,
          backgroundColor: checked ? '#d4a017' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.15s', cursor: 'pointer',
        }}
      >
        {checked && <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#fff', display: 'block' }} />}
      </span>
      <span onClick={onChange} style={{ fontSize: '13px', color: checked ? '#0a1628' : '#475569', fontWeight: checked ? 500 : 400 }}>
        {label}
      </span>
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
      <span style={{ fontSize: '13px', color: '#475569', flex: 1, lineHeight: 1.4 }}>{label}</span>
      <button
        onClick={onChange}
        style={{
          width: '36px', height: '20px', borderRadius: '10px',
          backgroundColor: checked ? '#d4a017' : '#e2e8f0',
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'background-color 0.2s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: '2px',
          left: checked ? '18px' : '2px',
          width: '16px', height: '16px', borderRadius: '50%',
          backgroundColor: '#fff', transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ filters, onChange, onReset }: {
  filters: ActiveFilters
  onChange: (patch: Partial<ActiveFilters>) => void
  onReset: () => void
}) {
  const [open, setOpen] = useState({
    category: true, location: true, funding: false,
    deadline: false, education: false, cost: false, tags: false,
  })
  const [countrySearch, setCountrySearch] = useState('')
  const [excludeInput, setExcludeInput] = useState('')

  const filteredCountries = COUNTRIES.filter(c =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  ).slice(0, 12)

  const tog = (k: keyof typeof open) => setOpen(p => ({ ...p, [k]: !p[k] }))

  const hasFilters = filters.types.length || filters.continents.length || filters.countries.length ||
    filters.excludedCountries.length || filters.formats.length || filters.funding.length ||
    filters.deadline || filters.education.length || filters.costRange ||
    filters.noIelts || filters.openAfricans || filters.openDeveloping ||
    filters.refugeeFriendly || filters.disabilityInclusive || filters.firstGen

  return (
    <aside style={{
      width: '264px', flexShrink: 0, backgroundColor: '#ffffff',
      borderRight: '1px solid #e2e8f0', overflowY: 'auto',
      maxHeight: 'calc(100vh - 64px)', position: 'sticky', top: '64px',
      padding: '16px 20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontWeight: 700, fontSize: '15px', color: '#0a1628' }}>Filters</span>
        {hasFilters ? (
          <button onClick={onReset} style={{ background: 'none', border: 'none', color: '#d4a017', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
            Clear all
          </button>
        ) : null}
      </div>

      {/* Category */}
      <FilterSection title="Category" open={open.category} onToggle={() => tog('category')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {CATEGORY_TYPES.map(t => (
            <Checkbox key={t} label={t} checked={filters.types.includes(t)}
              onChange={() => onChange({ types: toggleArr(filters.types, t) })} />
          ))}
        </div>
      </FilterSection>

      {/* Location */}
      <FilterSection title="Location" open={open.location} onToggle={() => tog('location')}>
        {/* Continent */}
        <div style={{ fontWeight: 600, fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Continent</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '14px' }}>
          {CONTINENTS.map(c => (
            <Checkbox key={c} label={c} checked={filters.continents.includes(c)}
              onChange={() => onChange({ continents: toggleArr(filters.continents, c) })} />
          ))}
        </div>

        {/* Country include */}
        <div style={{ fontWeight: 600, fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Country</div>
        {filters.countries.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
            {filters.countries.map(c => (
              <span key={c} style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                backgroundColor: '#fef9e7', border: '1px solid #d4a017', color: '#92600a',
                borderRadius: '50px', fontSize: '11px', padding: '2px 8px', fontWeight: 500,
              }}>
                {c}
                <X size={10} style={{ cursor: 'pointer' }}
                  onClick={() => onChange({ countries: filters.countries.filter(x => x !== c) })} />
              </span>
            ))}
          </div>
        )}
        <input
          value={countrySearch}
          onChange={e => setCountrySearch(e.target.value)}
          placeholder="Search countries…"
          style={{
            width: '100%', height: '32px', border: '1px solid #e2e8f0', borderRadius: '6px',
            padding: '0 10px', fontSize: '13px', color: '#0a1628', outline: 'none',
            boxSizing: 'border-box', marginBottom: '6px',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {filteredCountries.map(c => (
            <Checkbox key={c} label={c} checked={filters.countries.includes(c)}
              onChange={() => onChange({ countries: toggleArr(filters.countries, c) })} />
          ))}
        </div>

        {/* Exclude country */}
        <div style={{ fontWeight: 600, fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '14px 0 6px' }}>Exclude Country</div>
        {filters.excludedCountries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '6px' }}>
            {filters.excludedCountries.map(c => (
              <div key={c} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#dc2626' }}>
                <span>{c}</span>
                <X size={12} style={{ cursor: 'pointer' }}
                  onClick={() => onChange({ excludedCountries: filters.excludedCountries.filter(x => x !== c) })} />
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            value={excludeInput}
            onChange={e => setExcludeInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && excludeInput.trim()) {
                onChange({ excludedCountries: [...filters.excludedCountries, excludeInput.trim()] })
                setExcludeInput('')
              }
            }}
            placeholder="Country name…"
            style={{
              flex: 1, height: '32px', border: '1px solid #e2e8f0', borderRadius: '6px',
              padding: '0 8px', fontSize: '12px', color: '#0a1628', outline: 'none',
            }}
          />
          <button
            onClick={() => {
              if (excludeInput.trim()) {
                onChange({ excludedCountries: [...filters.excludedCountries, excludeInput.trim()] })
                setExcludeInput('')
              }
            }}
            style={{
              height: '32px', padding: '0 10px', backgroundColor: '#0a1628', color: '#d4a017',
              border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >Add</button>
        </div>

        {/* Format */}
        <div style={{ fontWeight: 600, fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '14px 0 6px' }}>Format</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {FORMATS.map(f => (
            <Checkbox key={f} label={f} checked={filters.formats.includes(f)}
              onChange={() => onChange({ formats: toggleArr(filters.formats, f) })} />
          ))}
        </div>
      </FilterSection>

      {/* Funding */}
      <FilterSection title="Funding" open={open.funding} onToggle={() => tog('funding')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {FUNDING_OPTIONS.map(f => (
            <Checkbox key={f} label={f} checked={filters.funding.includes(f)}
              onChange={() => onChange({ funding: toggleArr(filters.funding, f) })} />
          ))}
        </div>
      </FilterSection>

      {/* Deadline */}
      <FilterSection title="Deadline" open={open.deadline} onToggle={() => tog('deadline')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {DEADLINE_OPTIONS.map(d => (
            <Radio key={d} label={d} checked={filters.deadline === d}
              onChange={() => onChange({ deadline: filters.deadline === d ? '' : d })} />
          ))}
        </div>
      </FilterSection>

      {/* Education */}
      <FilterSection title="Education Level" open={open.education} onToggle={() => tog('education')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {EDUCATION_OPTIONS.map(e => (
            <Checkbox key={e} label={e} checked={filters.education.includes(e)}
              onChange={() => onChange({ education: toggleArr(filters.education, e) })} />
          ))}
        </div>
      </FilterSection>

      {/* Cost */}
      <FilterSection title="Cost" open={open.cost} onToggle={() => tog('cost')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {COST_OPTIONS.map(c => (
            <Radio key={c} label={c} checked={filters.costRange === c}
              onChange={() => onChange({ costRange: filters.costRange === c ? '' : c })} />
          ))}
        </div>
      </FilterSection>

      {/* Special tags */}
      <FilterSection title="Special Tags" open={open.tags} onToggle={() => tog('tags')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {SPECIAL_TAGS.map(({ label, key }) => (
            <Toggle key={key} label={label}
              checked={filters[key] as boolean}
              onChange={() => onChange({ [key]: !filters[key] } as Partial<ActiveFilters>)} />
          ))}
        </div>
      </FilterSection>
    </aside>
  )
}

// ─── Match badge ──────────────────────────────────────────────────────────────

function MatchBadge({ authUser, profile, opp }: {
  authUser: User | null | undefined
  profile: MatchProfile | null
  opp: Opp
}) {
  if (authUser === undefined) return <div style={{ width: '44px', height: '44px' }} />

  if (!authUser) {
    return (
      <div style={{ position: 'relative', width: '44px', height: '44px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          backgroundColor: '#0a1628', filter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#0a1628', fontSize: '11px', fontWeight: 700 }}>??%</span>
        </div>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'default',
        }}>
          <span style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', lineHeight: 1.2 }}>?</span>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{
        width: '44px', height: '44px', borderRadius: '50%', border: '2px solid #fcd34d',
        backgroundColor: '#fef9e7', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{ fontSize: '10px', color: '#d4a017', fontWeight: 700 }}>?%</span>
      </div>
    )
  }

  const result = calculateMatch(profile, {
    eligibility_countries: opp.required_nationalities,
    education_level: opp.min_education_level,
    field: null,
    language_requirements: null,
    min_age: opp.min_age,
    max_age: opp.max_age,
  })

  if (!result) {
    return (
      <div style={{
        width: '44px', height: '44px', borderRadius: '50%', border: '2px solid #e2e8f0',
        backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'center', lineHeight: 1.2 }}>Fill profile</span>
      </div>
    )
  }

  const { score } = result
  const color  = score >= 70 ? '#15803d' : score >= 50 ? '#d4a017' : '#64748b'
  const bg     = score >= 70 ? '#f0fdf4' : score >= 50 ? '#fef9e7' : '#f8fafc'
  const border = score >= 70 ? '#86efac' : score >= 50 ? '#fcd34d' : '#e2e8f0'

  return (
    <div style={{
      width: '44px', height: '44px', borderRadius: '50%',
      border: `2px solid ${border}`, backgroundColor: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: '11px', fontWeight: 700, color }}>{score}%</span>
    </div>
  )
}

// ─── Opportunity card ─────────────────────────────────────────────────────────

function OppCard({ opp, authUser, profile, saved, onSave }: {
  opp: Opp
  authUser: User | null | undefined
  profile: MatchProfile | null
  saved: boolean
  onSave: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const router = useRouter()
  const badge = TYPE_BADGE[opp.opportunity_type] ?? { bg: '#f1f5f9', color: '#475569' }
  const days = daysUntil(opp.application_deadline)
  const urgent = days !== null && days >= 0 && days <= 7

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: '#ffffff',
        border: `1px solid ${hovered ? '#d4a017' : '#e2e8f0'}`,
        borderRadius: '12px', padding: '18px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s',
        boxShadow: hovered ? '0 4px 20px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-1px)' : 'none',
      }}
      onClick={() => router.push(`/opportunities/${opp.id}`)}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <MatchBadge authUser={authUser} profile={profile} opp={opp} />
        <button
          onClick={e => { e.stopPropagation(); onSave(opp.id) }}
          aria-label="Save"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: saved ? '#d4a017' : '#cbd5e1', padding: '2px', display: 'flex', flexShrink: 0,
          }}
        >
          <Bookmark size={16} fill={saved ? '#d4a017' : 'none'} />
        </button>
      </div>

      {/* Category badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-block', backgroundColor: badge.bg, color: badge.color,
          fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '50px',
          textTransform: 'uppercase', letterSpacing: '0.4px',
        }}>{opp.opportunity_type}</span>
        {opp.format === 'Online' || opp.format === 'Remote/Online' ? (
          <span style={{ fontSize: '10px', color: '#64748b', backgroundColor: '#f8fafc', padding: '3px 8px', borderRadius: '50px', border: '1px solid #e2e8f0' }}>
            Remote
          </span>
        ) : null}
      </div>

      {/* Title */}
      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0a1628', lineHeight: 1.35 }}>
        {opp.title}
      </div>

      {/* Org */}
      {opp.organization_name && (
        <div style={{ fontSize: '12px', color: '#64748b' }}>{opp.organization_name}</div>
      )}

      {/* Country */}
      {opp.country && (
        <div style={{ fontSize: '12px', color: '#64748b' }}>{opp.country}</div>
      )}

      {/* Deadline */}
      <div style={{ fontSize: '12px', color: urgent ? '#dc2626' : '#64748b', fontWeight: urgent ? 600 : 400 }}>
        {urgent ? `⏰ ${fmtDeadline(opp.application_deadline)}` : `Deadline: ${fmtDeadline(opp.application_deadline)}`}
      </div>

      {/* Funding + ticket */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
        {opp.funding_type && (
          <span style={{
            display: 'inline-block', backgroundColor: '#fef9e7', color: '#d4a017',
            border: '1px solid #d4a017', fontSize: '10px', fontWeight: 600,
            padding: '3px 9px', borderRadius: '50px',
          }}>{opp.funding_type}</span>
        )}
        {opp.ticket_affiliate_url && (
          <a
            href={opp.ticket_affiliate_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              color: '#7c3aed', fontSize: '11px', fontWeight: 600, textDecoration: 'none',
            }}
          >
            Tickets <ExternalLink size={11} />
          </a>
        )}
      </div>

      {/* Anonymous sign-up hint */}
      {authUser === null && (
        <div style={{
          fontSize: '11px', color: '#94a3b8', textAlign: 'center',
          padding: '6px', backgroundColor: '#f8fafc', borderRadius: '6px',
          border: '1px dashed #e2e8f0',
        }}>
          Sign up to see your match score
        </div>
      )}
    </div>
  )
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[44, 80, 65, 50, 40, 36].map((w, i) => (
          <div key={i} style={{
            height: i === 0 ? '44px' : '12px', width: i === 0 ? '44px' : `${w}%`,
            borderRadius: i === 0 ? '50%' : '6px',
            background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
            backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
          }} />
        ))}
      </div>
    </>
  )
}

// ─── Main content ─────────────────────────────────────────────────────────────

function OpportunitiesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [filters, setFilters] = useState<ActiveFilters>(() => {
    const typeParam = searchParams.get('type')
    return typeParam
      ? { ...DEFAULT_FILTERS, types: [typeParam] }
      : DEFAULT_FILTERS
  })
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('Newest')
  const [allResults, setAllResults] = useState<Opp[]>([])
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [authUser, setAuthUser] = useState<User | null | undefined>(undefined)
  const [matchProfile, setMatchProfile] = useState<MatchProfile | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auth + profile
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user ?? null
      setAuthUser(user)
      if (!user) return

      const [{ data: prof }, { data: savedRows }] = await Promise.all([
        supabase.from('profiles').select(
          'nationalities,education_level,field_of_study,languages,date_of_birth,profile_complete_pct'
        ).eq('id', user.id).single(),
        supabase.from('saved_opportunities').select('opportunity_id').eq('user_id', user.id),
      ])

      if (prof) {
        const dob = prof.date_of_birth
          ? Math.floor((Date.now() - new Date(prof.date_of_birth).getTime()) / 31557600000)
          : null
        const langs = Array.isArray(prof.languages)
          ? (prof.languages as Array<{ name?: string }>).map(l => l.name ?? '').filter(Boolean)
          : []
        setMatchProfile({
          nationality: Array.isArray(prof.nationalities) ? (prof.nationalities[0] ?? '') : '',
          education_level: prof.education_level ?? '',
          field_of_study: prof.field_of_study ?? '',
          languages: langs,
          age: dob,
          profile_complete: prof.profile_complete_pct ?? 0,
        })
      }

      if (savedRows) {
        setSavedIds(new Set(savedRows.map(r => r.opportunity_id as string)))
      }

      if (user) setSort('Best Match')
    })
  }, [])

  // Fetch results on filter/search/sort change (debounced for search)
  const runQuery = useCallback(async () => {
    setLoading(true)
    setDisplayCount(PAGE_SIZE)
    const data = await fetchOpps(filters, search, sort)

    // Client-side Best Match sort
    if (sort === 'Best Match' && matchProfile) {
      data.sort((a, b) => {
        const scoreOf = (o: Opp) => calculateMatch(matchProfile, {
          eligibility_countries: o.required_nationalities,
          education_level: o.min_education_level,
          field: null, language_requirements: null,
          min_age: o.min_age, max_age: o.max_age,
        })?.score ?? -1
        return scoreOf(b) - scoreOf(a)
      })
    }

    setAllResults(data)
    setLoading(false)
  }, [filters, search, sort, matchProfile])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(runQuery, search ? 300 : 0)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [runQuery, search])

  function patchFilters(patch: Partial<ActiveFilters>) {
    setFilters(prev => ({ ...prev, ...patch }))
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
    setSearch('')
  }

  async function handleSave(id: string) {
    if (!authUser) { router.push('/signup'); return }
    const isSaved = savedIds.has(id)
    if (isSaved) {
      await supabase.from('saved_opportunities').delete()
        .eq('user_id', authUser.id).eq('opportunity_id', id)
      setSavedIds(prev => { const next = new Set(prev); next.delete(id); return next })
    } else {
      await supabase.from('saved_opportunities').insert({ user_id: authUser.id, opportunity_id: id })
      setSavedIds(prev => new Set([...prev, id]))
    }
  }

  const displayed = allResults.slice(0, displayCount)
  const hasMore = displayCount < allResults.length

  // Count active filters for the badge
  const activeFilterCount =
    filters.types.length + filters.continents.length + filters.countries.length +
    filters.excludedCountries.length + filters.formats.length + filters.funding.length +
    (filters.deadline ? 1 : 0) + filters.education.length + (filters.costRange ? 1 : 0) +
    [filters.noIelts, filters.openAfricans, filters.openDeveloping, filters.refugeeFriendly,
     filters.disabilityInclusive, filters.firstGen].filter(Boolean).length

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)', backgroundColor: '#ffffff' }}>

      {/* Sidebar */}
      <Sidebar filters={filters} onChange={patchFilters} onReset={resetFilters} />

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, padding: '24px 28px', maxWidth: '100%' }}>

        {/* Mobile filter toggle */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search opportunities, organizations…"
              style={{
                width: '100%', height: '44px', border: '1px solid #e2e8f0', borderRadius: '8px',
                padding: '0 14px 0 36px', fontSize: '14px', color: '#0a1628', outline: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.2s',
              }}
            />
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{
              height: '44px', border: '1px solid #e2e8f0', borderRadius: '8px',
              padding: '0 14px', fontSize: '14px', color: '#0a1628',
              backgroundColor: '#ffffff', cursor: 'pointer', outline: 'none', flexShrink: 0,
            }}
          >
            {authUser && <option value="Best Match">Best Match</option>}
            <option value="Deadline Soonest">Deadline Soonest</option>
            <option value="Newest">Newest</option>
          </select>
        </div>

        {/* Results count */}
        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
          {loading
            ? 'Searching…'
            : `Showing ${displayed.length.toLocaleString()} of ${allResults.length.toLocaleString()} opportunit${allResults.length === 1 ? 'y' : 'ies'}`}
          {activeFilterCount > 0 && (
            <button onClick={resetFilters} style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#d4a017', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
              Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : allResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: '#94a3b8' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>No opportunities found</div>
            <div style={{ fontSize: '14px' }}>Try adjusting your filters or search terms.</div>
            <button onClick={resetFilters} style={{
              marginTop: '20px', backgroundColor: '#0a1628', color: '#d4a017',
              border: 'none', borderRadius: '8px', padding: '10px 20px',
              fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            }}>Clear all filters</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {displayed.map(opp => (
                <OppCard
                  key={opp.id} opp={opp}
                  authUser={authUser}
                  profile={matchProfile}
                  saved={savedIds.has(opp.id)}
                  onSave={handleSave}
                />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
                <button
                  onClick={() => setDisplayCount(c => c + PAGE_SIZE)}
                  style={{
                    backgroundColor: '#0a1628', color: '#d4a017',
                    border: 'none', borderRadius: '8px', padding: '12px 32px',
                    fontWeight: 700, fontSize: '15px', cursor: 'pointer',
                  }}
                >
                  Load more ({allResults.length - displayCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  return (
    <div style={{ paddingTop: '64px' }}>
      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#94a3b8' }}>
          Loading…
        </div>
      }>
        <OpportunitiesContent />
      </Suspense>
    </div>
  )
}
