'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle, XCircle, AlertTriangle, Star } from 'lucide-react'

interface PendingOpp {
  id: string
  title: string
  organization_name: string | null
  opportunity_type: string | null
  country: string | null
  created_at: string
}

interface Report {
  id: string
  opportunity_id: string
  reason: string | null
  details: string | null
  status: string
  created_at: string
  opportunity: { id: string; title: string } | null
}

interface Story {
  id: string
  user_name: string | null
  story: string | null
  outcome: string | null
  status: string
  created_at: string
  opportunity: { title: string } | null
}

type Tab = 'pending' | 'reports' | 'stories'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function QueuePage() {
  const [tab, setTab]           = useState<Tab>('pending')
  const [pending, setPending]   = useState<PendingOpp[]>([])
  const [reports, setReports]   = useState<Report[]>([])
  const [stories, setStories]   = useState<Story[]>([])
  const [loading, setLoading]   = useState(true)
  const [busy, setBusy]         = useState<string | null>(null)

  const loadPending = useCallback(async () => {
    const { data } = await supabase
      .from('opportunities')
      .select('id, title, organization_name, opportunity_type, country, created_at')
      .eq('is_published', false)
      .eq('is_archived', false)
      .order('created_at', { ascending: true })
      .limit(200)
    setPending((data ?? []) as PendingOpp[])
  }, [])

  const loadReports = useCallback(async () => {
    const { data } = await supabase
      .from('reports')
      .select('id, opportunity_id, reason, details, status, created_at, opportunity:opportunities(id, title)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(200)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setReports((data ?? []).map((r: any) => ({
      ...r,
      opportunity: Array.isArray(r.opportunity) ? r.opportunity[0] ?? null : r.opportunity,
    })) as Report[])
  }, [])

  const loadStories = useCallback(async () => {
    const { data } = await supabase
      .from('success_stories')
      .select('id, user_name, story, outcome, status, created_at, opportunity:opportunities(title)')
      .eq('status', 'pending')
      .eq('outcome', 'got_it')
      .order('created_at', { ascending: true })
      .limit(100)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setStories((data ?? []).map((s: any) => ({
      ...s,
      opportunity: Array.isArray(s.opportunity) ? s.opportunity[0] ?? null : s.opportunity,
    })) as Story[])
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadPending(), loadReports(), loadStories()]).finally(() => setLoading(false))
  }, [loadPending, loadReports, loadStories])

  async function approve(id: string) {
    setBusy(id)
    await supabase.from('opportunities').update({ is_published: true }).eq('id', id)
    setPending(prev => prev.filter(o => o.id !== id))
    setBusy(null)
  }

  async function reject(id: string) {
    if (!window.confirm('Archive this opportunity?')) return
    setBusy(id)
    await supabase.from('opportunities').update({ is_archived: true }).eq('id', id)
    setPending(prev => prev.filter(o => o.id !== id))
    setBusy(null)
  }

  async function resolveReport(reportId: string) {
    setBusy(reportId)
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId)
    setReports(prev => prev.filter(r => r.id !== reportId))
    setBusy(null)
  }

  async function archiveReported(reportId: string, oppId: string) {
    if (!window.confirm('Archive the reported opportunity?')) return
    setBusy(reportId)
    await Promise.all([
      supabase.from('opportunities').update({ is_archived: true }).eq('id', oppId),
      supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId),
    ])
    setReports(prev => prev.filter(r => r.id !== reportId))
    setBusy(null)
  }

  async function approveStory(id: string) {
    setBusy(id)
    await supabase.from('success_stories').update({ status: 'approved' }).eq('id', id)
    setStories(prev => prev.filter(s => s.id !== id))
    setBusy(null)
  }

  async function rejectStory(id: string) {
    setBusy(id)
    await supabase.from('success_stories').update({ status: 'rejected' }).eq('id', id)
    setStories(prev => prev.filter(s => s.id !== id))
    setBusy(null)
  }

  const TABS: { key: Tab; label: string; count: number; accent?: string }[] = [
    { key: 'pending', label: 'Pending Approval', count: pending.length },
    { key: 'reports', label: 'Reports',          count: reports.length, accent: '#dc2626' },
    { key: 'stories', label: 'Stories',          count: stories.length, accent: '#d4a017' },
  ]

  const totalItems = pending.length + reports.length + stories.length

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0a1628', margin: 0 }}>Review Queue</h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
          {totalItems} item{totalItems !== 1 ? 's' : ''} need attention
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        {TABS.map(({ key, label, count, accent = '#92400e' }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
              color: tab === key ? '#d4a017' : '#64748b',
              borderBottom: `2px solid ${tab === key ? '#d4a017' : 'transparent'}`,
              marginBottom: '-1px',
            }}
          >
            {label}
            {count > 0 && (
              <span style={{ backgroundColor: '#fef3c7', color: accent, fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px' }}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
      ) : tab === 'pending' ? (
        <PendingTab items={pending} busy={busy} onApprove={approve} onReject={reject} />
      ) : tab === 'reports' ? (
        <ReportsTab items={reports} busy={busy} onResolve={resolveReport} onArchive={archiveReported} />
      ) : (
        <StoriesTab items={stories} busy={busy} onApprove={approveStory} onReject={rejectStory} />
      )}
    </div>
  )
}

function PendingTab({ items, busy, onApprove, onReject }: {
  items: PendingOpp[]
  busy: string | null
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
        <CheckCircle size={32} color="#15803d" style={{ marginBottom: '12px' }} />
        <div style={{ fontWeight: 600, color: '#0a1628', marginBottom: '4px' }}>All caught up!</div>
        <div style={{ fontSize: '13px', color: '#94a3b8' }}>No opportunities awaiting approval.</div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {items.map(opp => (
        <div key={opp.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: '#0a1628', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opp.title}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
              {[opp.organization_name, opp.opportunity_type, opp.country].filter(Boolean).join(' · ')} · Submitted {fmtDate(opp.created_at)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <a href={`/opportunities/${opp.id}`} target="_blank" rel="noreferrer" style={{ padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: '7px', backgroundColor: '#f8fafc', color: '#475569', fontSize: '12px', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>Preview</a>
            <button
              onClick={() => onReject(opp.id)}
              disabled={busy === opp.id}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', border: '1px solid #fecaca', borderRadius: '7px', backgroundColor: '#fff1f2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              <XCircle size={13} /> Reject
            </button>
            <button
              onClick={() => onApprove(opp.id)}
              disabled={busy === opp.id}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', border: 'none', borderRadius: '7px', backgroundColor: '#15803d', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: busy === opp.id ? 'not-allowed' : 'pointer', opacity: busy === opp.id ? 0.7 : 1 }}
            >
              <CheckCircle size={13} /> Approve
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ReportsTab({ items, busy, onResolve, onArchive }: {
  items: Report[]
  busy: string | null
  onResolve: (reportId: string) => void
  onArchive: (reportId: string, oppId: string) => void
}) {
  if (items.length === 0) {
    return (
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
        <CheckCircle size={32} color="#15803d" style={{ marginBottom: '12px' }} />
        <div style={{ fontWeight: 600, color: '#0a1628', marginBottom: '4px' }}>No pending reports!</div>
        <div style={{ fontSize: '13px', color: '#94a3b8' }}>All reports have been resolved.</div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {items.map(r => (
        <div key={r.id} style={{ backgroundColor: '#ffffff', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <AlertTriangle size={14} color="#dc2626" />
                <span style={{ fontWeight: 600, color: '#0a1628', fontSize: '14px' }}>
                  {r.opportunity?.title ?? 'Unknown opportunity'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                Reason: <strong>{r.reason ?? '—'}</strong> · {fmtDate(r.created_at)}
              </div>
              {r.details && (
                <div style={{ fontSize: '12px', color: '#475569', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid #e2e8f0' }}>
                  {r.details}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              {r.opportunity && (
                <button
                  onClick={() => onArchive(r.id, r.opportunity!.id)}
                  disabled={busy === r.id}
                  style={{ padding: '7px 14px', border: '1px solid #fecaca', borderRadius: '7px', backgroundColor: '#fff1f2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Archive Opp
                </button>
              )}
              <button
                onClick={() => onResolve(r.id)}
                disabled={busy === r.id}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', border: 'none', borderRadius: '7px', backgroundColor: '#0a1628', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: busy === r.id ? 'not-allowed' : 'pointer', opacity: busy === r.id ? 0.7 : 1 }}
              >
                <CheckCircle size={13} /> Resolve
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function StoriesTab({ items, busy, onApprove, onReject }: {
  items: Story[]
  busy: string | null
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
        <Star size={32} color="#d4a017" style={{ marginBottom: '12px' }} />
        <div style={{ fontWeight: 600, color: '#0a1628', marginBottom: '4px' }}>No pending stories!</div>
        <div style={{ fontSize: '13px', color: '#94a3b8' }}>All success stories have been reviewed.</div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {items.map(s => (
        <div key={s.id} style={{ backgroundColor: '#ffffff', border: '1px solid #fde68a', borderRadius: '10px', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#d4a017', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '12px' }}>
                    {(s.user_name ?? '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <span style={{ fontWeight: 600, color: '#0a1628', fontSize: '14px' }}>{s.user_name ?? 'Anonymous'}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>· {fmtDate(s.created_at)}</span>
              </div>
              {s.opportunity?.title && (
                <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '8px', paddingLeft: '38px' }}>
                  🏆 {s.opportunity.title}
                </div>
              )}
              {s.story && (
                <div style={{ fontSize: '13px', color: '#44403c', lineHeight: 1.6, paddingLeft: '38px', backgroundColor: '#fefce8', padding: '10px 12px', borderRadius: '8px', marginTop: '6px' }}>
                  {s.story}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button
                onClick={() => onReject(s.id)}
                disabled={busy === s.id}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', border: '1px solid #fecaca', borderRadius: '7px', backgroundColor: '#fff1f2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                <XCircle size={13} /> Reject
              </button>
              <button
                onClick={() => onApprove(s.id)}
                disabled={busy === s.id}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', border: 'none', borderRadius: '7px', backgroundColor: '#d4a017', color: '#ffffff', fontSize: '12px', fontWeight: 700, cursor: busy === s.id ? 'not-allowed' : 'pointer', opacity: busy === s.id ? 0.7 : 1 }}
              >
                <CheckCircle size={13} /> Approve
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
