'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Bookmark, Star, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { calculateMatch, type MatchProfile, type MatchInfo } from '@/lib/matching'
import AdBanner from '@/components/AdBanner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Opportunity {
  id: string
  title: string
  organization: string
  country: string
  continent: string
  flag: string
  deadline_date: string | null
  funding_type: string
  type: string
  education_level: string
  created_at: string
  views: number
  eligibility_countries?: string | string[] | null
  field?: string | null
  language_requirements?: string | string[] | null
  min_age?: number | null
  max_age?: number | null
}

interface Filters {
  type: string
  funding: string
  continent: string
  deadline: string
  educationLevel: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12

const DEFAULT_FILTERS: Filters = {
  type: 'All',
  funding: 'All',
  continent: 'All',
  deadline: 'All',
  educationLevel: 'All',
}

const FILTER_SECTIONS: { key: keyof Filters; label: string; options: string[] }[] = [
  { key: 'type', label: 'Type', options: ['All', 'Scholarship', 'Fellowship', 'Internship', 'Exchange Program', 'Conference', 'Competition'] },
  { key: 'funding', label: 'Funding', options: ['All', 'Fully Funded', 'Partial Funding', 'Stipend', 'Self-funded'] },
  { key: 'continent', label: 'Continent', options: ['All', 'Africa', 'Europe', 'North America', 'Asia', 'Oceania', 'Global'] },
  { key: 'deadline', label: 'Deadline', options: ['All', 'This month', 'Next 3 months', 'Next 6 months', 'Open ended'] },
  { key: 'educationLevel', label: 'Education Level', options: ['All', 'Undergraduate', 'Masters', 'PhD', 'Any'] },
]

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  Scholarship:        { bg: '#eff6ff', color: '#1d4ed8' },
  Fellowship:         { bg: '#f5f3ff', color: '#7c3aed' },
  Internship:         { bg: '#f0fdf4', color: '#15803d' },
  'Exchange Program': { bg: '#fff7ed', color: '#c2410c' },
  Conference:         { bg: '#fdf4ff', color: '#a21caf' },
  Competition:        { bg: '#fff1f2', color: '#be123c' },
}

const SORT_OPTIONS = ['Most Recent', 'Deadline Soon', 'Most Viewed', 'Fully Funded First', 'Sort by Match']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function formatDeadline(dateStr: string | null): string {
  if (!dateStr) return 'Rolling / Open'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDeadlineRange(filter: string): { from: string; to: string } | null {
  const now = new Date()
  if (filter === 'This month') {
    return { from: now.toISOString(), to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString() }
  }
  if (filter === 'Next 3 months') {
    const end = new Date(now); end.setMonth(end.getMonth() + 3)
    return { from: now.toISOString(), to: end.toISOString() }
  }
  if (filter === 'Next 6 months') {
    const end = new Date(now); end.setMonth(end.getMonth() + 6)
    return { from: now.toISOString(), to: end.toISOString() }
  }
  return null
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  const pages: (number | '...')[] = []
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - current) <= 1) {
      const last = pages[pages.length - 1]
      if (typeof last === 'number' && p - last > 1) pages.push('...')
      pages.push(p)
    }
  }
  return pages
}

function sortRows(rows: Opportunity[], sort: string, profile?: MatchProfile | null): Opportunity[] {
  const copy = [...rows]
  if (sort === 'Sort by Match' && profile) {
    return copy.sort((a, b) => {
      const aScore = calculateMatch(profile, a)?.score ?? -1
      const bScore = calculateMatch(profile, b)?.score ?? -1
      return bScore - aScore
    })
  }
  if (sort === 'Deadline Soon') {
    return copy.sort((a, b) => new Date(a.deadline_date ?? '9999').getTime() - new Date(b.deadline_date ?? '9999').getTime())
  }
  if (sort === 'Most Viewed') {
    return copy.sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
  }
  if (sort === 'Fully Funded First') {
    return copy.sort((a, b) => (a.funding_type === 'Fully Funded' ? 0 : 1) - (b.funding_type === 'Fully Funded' ? 0 : 1))
  }
  return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

function resolveMatchInfo(
  authUser: User | null | undefined,
  profile: MatchProfile | null,
  opp: Opportunity
): MatchInfo {
  if (authUser === undefined) return { state: 'loading' }
  if (!authUser) return { state: 'anonymous' }
  if (!profile) return { state: 'incomplete' }
  const result = calculateMatch(profile, opp)
  if (!result) return { state: 'incomplete' }
  return { state: 'score', value: result.score, isEstimate: result.isEstimate }
}

// ─── Match badge ──────────────────────────────────────────────────────────────

function MatchBadge({ info }: { info: MatchInfo }) {
  if (info.state === 'loading') {
    return <div style={{ height: '38px' }} />
  }

  if (info.state === 'anonymous') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <span style={{
          display: 'inline-block',
          backgroundColor: '#0a1628',
          color: '#0a1628',
          fontSize: '12px',
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: '50px',
          filter: 'blur(3px)',
          userSelect: 'none',
          letterSpacing: '0.5px',
        }}>??%</span>
        <span style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.2, maxWidth: '72px' }}>
          Sign up to see your match
        </span>
      </div>
    )
  }

  if (info.state === 'incomplete') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fef9e7',
          color: '#d4a017',
          border: '1px solid #d4a017',
          fontSize: '14px',
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: '50px',
          minWidth: '36px',
        }}>?</span>
        <span style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.2, maxWidth: '72px' }}>
          Complete profile
        </span>
      </div>
    )
  }

  // state === 'score'
  const { value, isEstimate } = info
  const color  = value >= 70 ? '#15803d' : value >= 50 ? '#d4a017' : '#64748b'
  const bg     = value >= 70 ? '#f0fdf4' : value >= 50 ? '#fef9e7' : '#f8fafc'
  const border = value >= 70 ? '#86efac' : value >= 50 ? '#fcd34d' : '#e2e8f0'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <span style={{
        display: 'inline-block',
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        fontSize: '12px',
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: '50px',
      }}>
        {value}%{isEstimate ? '~' : ''}
      </span>
      <span style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.2 }}>
        {isEstimate ? 'Est. match' : 'Match score'}
      </span>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {([40, 90, 70, 55, 40, 36] as const).map((w, i) => (
          <div key={i} style={{
            height: i === 5 ? '36px' : '13px',
            width: `${w}%`,
            borderRadius: '6px',
            background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }} />
        ))}
      </div>
    </>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function OpportunityCard({ opp, matchInfo }: { opp: Opportunity; matchInfo: MatchInfo }) {
  const [saved, setSaved] = useState(false)
  const [hovered, setHovered] = useState(false)
  const router = useRouter()
  const badge = TYPE_BADGE[opp.type] ?? { bg: '#f1f5f9', color: '#475569' }
  const days = daysUntil(opp.deadline_date)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(`/opportunity/${opp.id}`)}
      style={{
        backgroundColor: '#ffffff',
        border: `1px solid ${hovered ? '#d4a017' : '#e2e8f0'}`,
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: hovered ? '0 4px 20px rgba(0,0,0,0.08)' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
      }}
    >
      {/* Top row: match badge + save button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <MatchBadge info={matchInfo} />
        <button
          onClick={(e) => { e.stopPropagation(); setSaved(!saved) }}
          aria-label="Save opportunity"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: saved ? '#d4a017' : '#cbd5e1', padding: '2px', display: 'flex', flexShrink: 0 }}
        >
          <Bookmark size={16} fill={saved ? '#d4a017' : 'none'} />
        </button>
      </div>

      {/* Type badge */}
      <span style={{ display: 'inline-block', backgroundColor: badge.bg, color: badge.color, fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '50px', width: 'fit-content', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {opp.type}
      </span>

      <div style={{ fontWeight: 700, fontSize: '15px', color: '#0a1628', lineHeight: 1.3 }}>{opp.title}</div>
      <div style={{ fontSize: '13px', color: '#475569' }}>{opp.organization}</div>
      <div style={{ fontSize: '13px', color: '#475569' }}>{opp.flag} {opp.country}</div>

      {days !== null && (
        <div style={{ fontSize: '13px', color: days <= 30 ? '#dc2626' : '#475569', fontWeight: days <= 30 ? 600 : 400 }}>
          Deadline: {formatDeadline(opp.deadline_date)}{days !== null && days <= 30 ? ` · ${days}d left` : ''}
        </div>
      )}

      <span style={{ display: 'inline-block', backgroundColor: '#fef9e7', color: '#d4a017', border: '1px solid #d4a017', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '50px', width: 'fit-content' }}>
        {opp.funding_type}
      </span>

      <button
        onClick={(e) => { e.stopPropagation(); router.push(`/opportunity/${opp.id}`) }}
        style={{ marginTop: '4px', backgroundColor: '#d4a017', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 0', fontWeight: 600, fontSize: '14px', cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}
      >
        View Details
      </button>
    </div>
  )
}

// ─── Filter section ───────────────────────────────────────────────────────────

function FilterSection({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontWeight: 600, fontSize: '12px', color: '#0a1628', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {options.map((opt) => {
          const checked = value === opt
          return (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer', fontSize: '14px', color: checked ? '#0a1628' : '#475569', fontWeight: checked ? 500 : 400 }}>
              <span
                onClick={() => onChange(opt)}
                style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${checked ? '#d4a017' : '#e2e8f0'}`, backgroundColor: checked ? '#d4a017' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
              >
                {checked && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span onClick={() => onChange(opt)}>{opt}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrowsePage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#94a3b8' }}>Loading…</div>}>
      <BrowsePageContent />
    </Suspense>
  )
}

function BrowsePageContent() {
  const searchParams = useSearchParams()
  const [allRows, setAllRows] = useState<Opportunity[]>([])
  const [results, setResults] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('Most Recent')
  const [filters, setFilters] = useState<Filters>(() => {
    const typeParam = searchParams.get('type')
    return typeParam
      ? { ...DEFAULT_FILTERS, type: typeParam }
      : DEFAULT_FILTERS
  })
  const [page, setPage] = useState(1)

  // Auth + profile state (undefined = still loading)
  const [authUser, setAuthUser] = useState<User | null | undefined>(undefined)
  const [userProfile, setUserProfile] = useState<MatchProfile | null>(null)

  // Fetch auth user + profile once on mount
  useEffect(() => {
    async function fetchAuth() {
      const { data } = await supabase.auth.getUser()
      setAuthUser(data.user ?? null)
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
        setUserProfile(profile as MatchProfile | null)
      }
    }
    fetchAuth()
  }, [])

  const setFilter = useCallback((key: keyof Filters, val: string) => {
    setFilters((prev) => ({ ...prev, [key]: val }))
    setPage(1)
  }, [])

  const clearAll = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setSearch('')
    setPage(1)
  }, [])

  // Fetch from Supabase on filter/search change
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query: any = supabase.from('opportunities').select('*').eq('is_published', true).eq('is_archived', false).limit(10000)
        if (search.trim()) {
          query = query.or(`title.ilike.%${search.trim()}%,organization.ilike.%${search.trim()}%,country.ilike.%${search.trim()}%`)
        }
        if (filters.type !== 'All')           query = query.eq('type', filters.type)
        if (filters.funding !== 'All')        query = query.eq('funding_type', filters.funding)
        if (filters.continent !== 'All')      query = query.eq('continent', filters.continent)
        if (filters.educationLevel !== 'All') query = query.eq('education_level', filters.educationLevel)
        const dr = getDeadlineRange(filters.deadline)
        if (dr) query = query.gte('deadline_date', dr.from).lte('deadline_date', dr.to)
        const { data, error } = await query
        if (error) throw error
        setAllRows((data ?? []) as Opportunity[])
      } catch {
        setAllRows([])
      } finally {
        setLoading(false)
      }
    }, search ? 400 : 0)
    return () => clearTimeout(timer)
  }, [search, filters])

  // Sort + paginate when rows, sort, page, or profile changes
  useEffect(() => {
    const sorted = sortRows(allRows, sort, userProfile)
    setResults(sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE))
  }, [allRows, sort, page, userProfile])

  // Reset to page 1 when sort changes
  useEffect(() => { setPage(1) }, [sort])

  const total = allRows.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>

      {/* Breadcrumb */}
      <div style={{ padding: '14px 48px', borderBottom: '1px solid #e2e8f0', fontSize: '14px', color: '#475569' }}>
        <a href="/" style={{ color: '#475569', textDecoration: 'none' }}>Home</a>
        <span style={{ margin: '0 8px', color: '#cbd5e1' }}>›</span>
        <span style={{ color: '#0a1628', fontWeight: 500 }}>Browse</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Sidebar */}
        <aside style={{ width: '280px', flexShrink: 0, padding: '24px', borderRight: '1px solid #e2e8f0', minHeight: 'calc(100vh - 130px)', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ fontWeight: 700, fontSize: '16px', color: '#0a1628' }}>Filter Results</span>
            <button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#d4a017', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
              Clear All
            </button>
          </div>
          {FILTER_SECTIONS.map((s) => (
            <FilterSection key={s.key} label={s.label} options={s.options} value={filters[s.key]} onChange={(v) => setFilter(s.key, v)} />
          ))}
          <div style={{ marginTop: '8px' }}>
            <AdBanner slot="browse-sidebar" size="rectangle" />
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, minWidth: 0, padding: '24px 32px' }}>

          {/* Search + sort */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search opportunities..."
                style={{ width: '100%', height: '48px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 16px 0 42px', fontSize: '14px', color: '#0a1628', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{ height: '48px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 16px', fontSize: '14px', color: '#0a1628', backgroundColor: '#ffffff', cursor: 'pointer', outline: 'none' }}
            >
              {SORT_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Ad banner */}
          <div style={{ marginBottom: '20px' }}>
            <AdBanner slot="browse-top" size="banner" />
          </div>

          {/* Results count */}
          <div style={{ fontSize: '14px', color: '#475569', marginBottom: '20px' }}>
            {loading ? 'Loading…' : `Showing ${total} opportunit${total === 1 ? 'y' : 'ies'}`}
          </div>

          {/* Grid */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <Star size={40} color="#d4a017" fill="#fef9e7" />
              <p style={{ color: '#475569', fontSize: '16px', margin: 0, maxWidth: '360px' }}>
                No opportunities match your filters. Try adjusting your search.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {results.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opp={opp}
                  matchInfo={resolveMatchInfo(authUser, userProfile, opp)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '40px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: page === 1 ? '#cbd5e1' : '#0a1628', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 500 }}
              >
                <ChevronLeft size={15} /> Previous
              </button>

              {getPageNumbers(page, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`e${i}`} style={{ color: '#94a3b8', padding: '0 2px' }}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    style={{ width: '36px', height: '36px', borderRadius: '8px', border: `1px solid ${page === p ? '#d4a017' : '#e2e8f0'}`, backgroundColor: page === p ? '#d4a017' : '#ffffff', color: page === p ? '#ffffff' : '#0a1628', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: page === totalPages ? '#cbd5e1' : '#0a1628', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 500 }}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
