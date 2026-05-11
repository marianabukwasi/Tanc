'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Edit2, Trash2, Star, Archive, ArchiveRestore, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Opp {
  id: string
  title: string
  organization_name: string | null
  opportunity_type: string | null
  country: string | null
  application_deadline: string | null
  is_published: boolean
  is_featured: boolean
  is_archived: boolean
  views: number
  saves: number
}

type Filter = 'all' | 'live' | 'pending' | 'archived'

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const FILTER_LABELS: { key: Filter; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'live',    label: 'Live' },
  { key: 'pending', label: 'Pending' },
  { key: 'archived',label: 'Archived' },
]

export default function ManagePage() {
  const router = useRouter()
  const [opps, setOpps]       = useState<Opp[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<Filter>('all')
  const [busy, setBusy]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('opportunities')
      .select('id, title, organization_name, opportunity_type, country, application_deadline, is_published, is_featured, is_archived, views, saves')
      .order('created_at', { ascending: false })
    setOpps((data ?? []) as Opp[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = opps.filter(o => {
    if (filter === 'live'    && (!o.is_published || o.is_archived)) return false
    if (filter === 'pending' && (o.is_published  || o.is_archived)) return false
    if (filter === 'archived'&& !o.is_archived) return false
    if (search) {
      const q = search.toLowerCase()
      return (o.title ?? '').toLowerCase().includes(q) ||
             (o.organization_name ?? '').toLowerCase().includes(q) ||
             (o.country ?? '').toLowerCase().includes(q)
    }
    return true
  })

  async function toggleFeature(opp: Opp) {
    setBusy(opp.id + '-feature')
    const next = !opp.is_featured
    await supabase.from('opportunities').update({ is_featured: next }).eq('id', opp.id)
    setOpps(prev => prev.map(o => o.id === opp.id ? { ...o, is_featured: next } : o))
    setBusy(null)
  }

  async function toggleArchive(opp: Opp) {
    setBusy(opp.id + '-archive')
    const next = !opp.is_archived
    await supabase.from('opportunities').update({ is_archived: next }).eq('id', opp.id)
    setOpps(prev => prev.map(o => o.id === opp.id ? { ...o, is_archived: next } : o))
    setBusy(null)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this opportunity? This cannot be undone.')) return
    setBusy(id + '-delete')
    await supabase.from('opportunities').delete().eq('id', id)
    setOpps(prev => prev.filter(o => o.id !== id))
    setBusy(null)
  }

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0a1628', margin: 0 }}>Manage Opportunities</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>{opps.length} total</p>
        </div>
        <button
          onClick={() => router.push('/admin/add')}
          style={{ padding: '10px 20px', backgroundColor: '#d4a017', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
        >
          + Add Opportunity
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '320px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title, org, country…"
            style={{
              width: '100%', height: '38px', border: '1px solid #e2e8f0', borderRadius: '8px',
              padding: '0 12px 0 34px', fontSize: '13px', color: '#0a1628', outline: 'none',
              backgroundColor: '#ffffff', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
          {FILTER_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '5px 14px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                backgroundColor: filter === key ? '#ffffff' : 'transparent',
                color: filter === key ? '#0a1628' : '#64748b',
                boxShadow: filter === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Title', 'Type', 'Country', 'Deadline', 'Status', 'Views', 'Saves', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 13px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No opportunities found.</td></tr>
              ) : filtered.map((opp, i) => {
                const statusLabel = opp.is_archived ? 'Archived' : opp.is_published ? 'Live' : 'Pending'
                const statusColor = opp.is_archived ? '#94a3b8' : opp.is_published ? '#15803d' : '#d97706'
                const statusBg   = opp.is_archived ? '#f1f5f9' : opp.is_published ? '#f0fdf4' : '#fff7ed'
                return (
                  <tr key={opp.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '11px 13px', maxWidth: '260px' }}>
                      <div style={{ fontWeight: 600, color: '#0a1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opp.title}</div>
                      {opp.organization_name && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{opp.organization_name}</div>}
                    </td>
                    <td style={{ padding: '11px 13px', color: '#475569', whiteSpace: 'nowrap' }}>{opp.opportunity_type ?? '—'}</td>
                    <td style={{ padding: '11px 13px', color: '#475569', whiteSpace: 'nowrap' }}>{opp.country ?? '—'}</td>
                    <td style={{ padding: '11px 13px', color: '#475569', whiteSpace: 'nowrap' }}>{fmtDate(opp.application_deadline)}</td>
                    <td style={{ padding: '11px 13px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '20px', backgroundColor: statusBg, color: statusColor }}>
                        {statusLabel}
                      </span>
                      {opp.is_featured && <span style={{ marginLeft: '5px', fontSize: '11px' }}>⭐</span>}
                    </td>
                    <td style={{ padding: '11px 13px', color: '#475569', textAlign: 'right' }}>{opp.views}</td>
                    <td style={{ padding: '11px 13px', color: '#475569', textAlign: 'right' }}>{opp.saves}</td>
                    <td style={{ padding: '11px 13px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => router.push(`/admin/add?id=${opp.id}`)}
                          title="Edit"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#ffffff', color: '#475569', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <Edit2 size={11} /> Edit
                        </button>
                        <button
                          onClick={() => toggleFeature(opp)}
                          disabled={busy === opp.id + '-feature'}
                          title={opp.is_featured ? 'Unfeature' : 'Feature'}
                          style={{ display: 'flex', alignItems: 'center', padding: '5px 7px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#ffffff', cursor: 'pointer' }}
                        >
                          <Star size={12} fill={opp.is_featured ? '#d4a017' : 'none'} color={opp.is_featured ? '#d4a017' : '#cbd5e1'} />
                        </button>
                        <button
                          onClick={() => toggleArchive(opp)}
                          disabled={busy === opp.id + '-archive'}
                          title={opp.is_archived ? 'Unarchive' : 'Archive'}
                          style={{ display: 'flex', alignItems: 'center', padding: '5px 7px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#ffffff', cursor: 'pointer', color: '#94a3b8' }}
                        >
                          {opp.is_archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                        </button>
                        <button
                          onClick={() => handleDelete(opp.id)}
                          disabled={busy === opp.id + '-delete'}
                          title="Delete"
                          style={{ display: 'flex', alignItems: 'center', padding: '5px 7px', border: '1px solid #fecaca', borderRadius: '6px', backgroundColor: '#fff1f2', color: '#dc2626', cursor: 'pointer' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
