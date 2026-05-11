'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import TrackerCard from '@/components/TrackerCard'
import type { TrackerEntry } from '@/components/TrackerCard'

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['All', 'In Progress', 'Deadline This Week', 'Submitted', 'Won', 'Archived', 'Calendar'] as const

const IN_PROGRESS = ['Researching', 'Gathering Documents', 'Writing Application']
const SUBMITTED   = ['Submitted', 'Awaiting Decision']

// ─── Filter ───────────────────────────────────────────────────────────────────

function filterEntries(entries: TrackerEntry[], tab: string): TrackerEntry[] {
  const now  = Date.now()
  const week = 7 * 24 * 3600 * 1000
  switch (tab) {
    case 'In Progress':         return entries.filter(e => IN_PROGRESS.includes(e.status ?? ''))
    case 'Deadline This Week': {
      return entries.filter(e => {
        const dl = e.opportunities.application_deadline
        if (!dl) return false
        const diff = new Date(dl).getTime() - now
        return diff >= 0 && diff <= week
      })
    }
    case 'Submitted':   return entries.filter(e => SUBMITTED.includes(e.status ?? ''))
    case 'Won':         return entries.filter(e => e.status === 'Accepted')
    case 'Archived':    return entries.filter(e => ['Rejected', 'Withdrawn'].includes(e.status ?? ''))
    default:            return entries
  }
}

// ─── Calendar view ────────────────────────────────────────────────────────────

function CalendarView({ entries }: { entries: TrackerEntry[] }) {
  const [calDate, setCalDate]     = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const year  = calDate.getFullYear()
  const month = calDate.getMonth()
  const firstDow     = new Date(year, month, 1).getDay()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const monthLabel   = calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const deadlineMap = useMemo(() => {
    const map = new Map<number, TrackerEntry[]>()
    for (const e of entries) {
      const dl = e.opportunities.application_deadline
      if (!dl) continue
      const d = new Date(dl)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        if (!map.has(day)) map.set(day, [])
        map.get(day)!.push(e)
      }
    }
    return map
  }, [entries, year, month])

  const today = new Date()
  function isToday(d: number) {
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === d
  }

  // Build grid: leading blanks + day numbers + trailing blanks
  const cells: (number | null)[] = [...Array(firstDow).fill(null)]
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  function prevMonth() { setCalDate(new Date(year, month - 1, 1)); setSelectedDay(null) }
  function nextMonth() { setCalDate(new Date(year, month + 1, 1)); setSelectedDay(null) }

  const selectedEntries = selectedDay ? (deadlineMap.get(selectedDay) ?? []) : []

  return (
    <div style={{ maxWidth: '640px' }}>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button onClick={prevMonth} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '14px' }}>‹</button>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#0a1628' }}>{monthLabel}</span>
        <button onClick={nextMonth} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '14px' }}>›</button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#94a3b8', paddingBottom: '4px' }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {cells.map((day, i) => {
          const hasDL = day !== null && deadlineMap.has(day)
          const count = day !== null ? (deadlineMap.get(day)?.length ?? 0) : 0
          const selected = selectedDay === day && day !== null
          return (
            <div
              key={i}
              onClick={() => { if (day && hasDL) setSelectedDay(selected ? null : day) }}
              style={{
                minHeight: '50px', padding: '6px', borderRadius: '8px', position: 'relative',
                border: selected ? '2px solid #d4a017' : '1px solid #f1f5f9',
                backgroundColor: day === null ? 'transparent' : isToday(day) ? '#fef9ee' : '#fff',
                cursor: hasDL ? 'pointer' : 'default',
              }}
            >
              {day !== null && (
                <>
                  <span style={{ fontSize: '13px', fontWeight: isToday(day) ? 700 : 400, color: isToday(day) ? '#d4a017' : '#334155' }}>
                    {day}
                  </span>
                  {hasDL && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '5px' }}>
                      {Array.from({ length: Math.min(count, 3) }).map((_, j) => (
                        <div key={j} style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
                      ))}
                      {count > 3 && <span style={{ fontSize: '9px', color: '#dc2626', lineHeight: 1 }}>+{count - 3}</span>}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected-day detail */}
      {selectedDay && selectedEntries.length > 0 && (
        <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0a1628', marginBottom: '12px' }}>
            Deadlines on {monthLabel.split(' ')[0]} {selectedDay}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedEntries.map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/opportunities/${e.opportunity_id}`} style={{ fontSize: '14px', fontWeight: 600, color: '#0a1628', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.opportunities.title}
                  </Link>
                  {e.opportunities.organization_name && (
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{e.opportunities.organization_name}</div>
                  )}
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#dc2626', flexShrink: 0 }}>
                  Deadline
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.filter(e => e.opportunities.application_deadline).length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '14px' }}>
          No deadline dates to display. Save opportunities to see their deadlines here.
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TrackerPage() {
  const router = useRouter()
  const [entries, setEntries]   = useState<TrackerEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<string>('All')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/signin'); return }

      const { data } = await supabase
        .from('user_opportunities')
        .select(`
          *,
          opportunities (
            id, title, organization_name, opportunity_type,
            application_deadline, is_archived, is_rolling,
            requires_motivation_letter, requires_cv,
            requires_transcripts, requires_recommendations,
            min_recommendations, requires_passport, country
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Filter out rows where the opportunity was deleted
      const valid = (data ?? []).filter((r: Record<string, unknown>) => r.opportunities !== null) as TrackerEntry[]
      setEntries(valid)
      setLoading(false)
    }
    load()
  }, [router])

  function handleRemove(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  function handleUpdate(id: string, patch: Partial<Pick<TrackerEntry, 'status' | 'notes' | 'tasks'>>) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
  }

  const stats = useMemo(() => ({
    total:      entries.length,
    inProgress: entries.filter(e => IN_PROGRESS.includes(e.status ?? '')).length,
    submitted:  entries.filter(e => SUBMITTED.includes(e.status ?? '')).length,
    accepted:   entries.filter(e => e.status === 'Accepted').length,
  }), [entries])

  const displayed = useMemo(
    () => activeTab === 'Calendar' ? entries : filterEntries(entries, activeTab),
    [entries, activeTab]
  )

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: '#94a3b8' }}>Loading tracker…</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0a1628', marginBottom: '6px' }}>My Application Tracker</h1>
        <p style={{ fontSize: '14px', color: '#64748b' }}>Track progress, deadlines, and tasks for every opportunity.</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '32px' }}>
        {[
          { label: 'Total tracked', value: stats.total,      color: '#0a1628', bg: '#f8fafc' },
          { label: 'In Progress',   value: stats.inProgress, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Submitted',     value: stats.submitted,  color: '#d97706', bg: '#fef9c3' },
          { label: 'Accepted',      value: stats.accepted,   color: '#15803d', bg: '#dcfce7' },
        ].map(s => (
          <div key={s.label} style={{ padding: '18px', backgroundColor: s.bg, border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '28px', overflowX: 'auto', gap: 0 }}>
        {TABS.map(tab => {
          const count = tab === 'Calendar' ? null : tab === 'All' ? entries.length : filterEntries(entries, tab).length
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px',
                fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', fontFamily: 'inherit',
                color: activeTab === tab ? '#d4a017' : '#64748b',
                borderBottom: `2px solid ${activeTab === tab ? '#d4a017' : 'transparent'}`,
                marginBottom: '-2px', transition: 'color 0.15s',
              }}
            >
              {tab}
              {count !== null && (
                <span style={{
                  marginLeft: '5px', fontSize: '10px', fontWeight: 700,
                  padding: '1px 5px', borderRadius: '10px',
                  backgroundColor: activeTab === tab ? '#fef9ee' : '#f1f5f9',
                  color: activeTab === tab ? '#d4a017' : '#94a3b8',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Calendar view */}
      {activeTab === 'Calendar' && <CalendarView entries={entries} />}

      {/* List view */}
      {activeTab !== 'Calendar' && (
        displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 20px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
            <div style={{ fontSize: '44px', marginBottom: '14px' }}>📋</div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#0a1628', marginBottom: '8px' }}>
              {activeTab === 'All' ? 'Nothing tracked yet' : `No ${activeTab.toLowerCase()} opportunities`}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', maxWidth: '340px', margin: '0 auto 24px' }}>
              {activeTab === 'All'
                ? 'Click "Save to tracker" on any opportunity detail page to start tracking.'
                : `Opportunities with ${activeTab === 'Won' ? 'Accepted' : activeTab.toLowerCase()} status appear here.`}
            </div>
            {activeTab === 'All' && (
              <Link
                href="/opportunities"
                style={{ display: 'inline-block', padding: '11px 28px', backgroundColor: '#0a1628', color: '#fff', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}
              >
                Browse Opportunities
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
            {displayed.map(entry => (
              <TrackerCard
                key={entry.id}
                entry={entry}
                onRemove={handleRemove}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )
      )}
    </div>
  )
}
