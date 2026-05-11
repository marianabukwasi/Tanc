'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Star, X, Users, LayoutGrid } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Opp {
  id: string
  title: string
  type: string
  organization: string
  country: string
  continent: string
  flag: string
  deadline_date: string | null
  funding_type: string
  education_level: string
  field: string | null
  description: string | null
  website: string | null
  featured: boolean | null
  views: number
  eligibility_countries: string | string[] | null
  language_requirements: string | string[] | null
}

interface OppForm {
  title: string
  type: string
  organization: string
  country: string
  continent: string
  flag: string
  deadline_date: string
  funding_type: string
  education_level: string
  field: string
  description: string
  website: string
  featured: boolean
  eligibility_countries: string
  language_requirements: string
}

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  nationality: string | null
  education_level: string | null
  profile_complete: number | null
}

type Tab = 'opportunities' | 'users'

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL

const TYPES = ['Scholarship', 'Fellowship', 'Internship', 'Exchange Program', 'Conference', 'Competition', 'Events']
const CONTINENTS = ['Africa', 'Europe', 'North America', 'Asia', 'Oceania', 'Global']
const FUNDING = ['Fully Funded', 'Partial Funding', 'Stipend', 'Self-funded']
const ED_LEVELS = ['Undergraduate', 'Masters', 'PhD', 'Any']

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  Scholarship:        { bg: '#eff6ff', color: '#1d4ed8' },
  Fellowship:         { bg: '#f5f3ff', color: '#7c3aed' },
  Internship:         { bg: '#f0fdf4', color: '#15803d' },
  'Exchange Program': { bg: '#fff7ed', color: '#c2410c' },
  Conference:         { bg: '#fdf4ff', color: '#a21caf' },
  Competition:        { bg: '#fff1f2', color: '#be123c' },
  Events:             { bg: '#f0f9ff', color: '#0369a1' },
}

const EMPTY_FORM: OppForm = {
  title: '', type: 'Scholarship', organization: '', country: '',
  continent: 'Africa', flag: '', deadline_date: '', funding_type: 'Fully Funded',
  education_level: 'Any', field: '', description: '', website: '',
  featured: false, eligibility_countries: '', language_requirements: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toStr(val: string | string[] | null | undefined): string {
  if (!val) return ''
  return Array.isArray(val) ? val.join(', ') : val
}

function toArr(val: string): string[] {
  return val.split(',').map(s => s.trim()).filter(Boolean)
}

function oppToForm(opp: Opp): OppForm {
  return {
    title: opp.title,
    type: opp.type,
    organization: opp.organization,
    country: opp.country,
    continent: opp.continent,
    flag: opp.flag,
    deadline_date: opp.deadline_date ?? '',
    funding_type: opp.funding_type,
    education_level: opp.education_level ?? 'Any',
    field: opp.field ?? '',
    description: opp.description ?? '',
    website: opp.website ?? '',
    featured: opp.featured ?? false,
    eligibility_countries: toStr(opp.eligibility_countries),
    language_requirements: toStr(opp.language_requirements),
  }
}

function formToRow(form: OppForm) {
  return {
    title: form.title.trim(),
    type: form.type,
    organization: form.organization.trim(),
    country: form.country.trim(),
    continent: form.continent,
    flag: form.flag.trim(),
    deadline_date: form.deadline_date || null,
    funding_type: form.funding_type,
    education_level: form.education_level,
    field: form.field.trim() || null,
    description: form.description.trim() || null,
    website: form.website.trim() || null,
    featured: form.featured,
    eligibility_countries: toArr(form.eligibility_countries),
    language_requirements: toArr(form.language_requirements),
    views: 0,
  }
}

function formatDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: '100%', height: '40px', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '0 12px', fontSize: '14px', color: '#0a1628', outline: 'none',
  boxSizing: 'border-box', backgroundColor: '#ffffff', fontFamily: 'inherit',
}
const SELECT: React.CSSProperties = { ...INPUT, cursor: 'pointer' }
const TEXTAREA: React.CSSProperties = {
  width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '10px 12px', fontSize: '14px', color: '#0a1628', outline: 'none',
  boxSizing: 'border-box', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit',
}
const LABEL: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '5px',
  display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px',
}
const FIELD: React.CSSProperties = { display: 'flex', flexDirection: 'column' }

// ─── Opportunity Modal ────────────────────────────────────────────────────────

function OppModal({ form, onChange, onSave, onClose, saving, isEdit }: {
  form: OppForm
  onChange: (k: keyof OppForm, v: string | boolean) => void
  onSave: () => void
  onClose: () => void
  saving: boolean
  isEdit: boolean
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '720px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0a1628', margin: 0 }}>
            {isEdit ? 'Edit Opportunity' : 'Add New Opportunity'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={FIELD}>
            <label style={LABEL}>Title *</label>
            <input style={INPUT} value={form.title} onChange={e => onChange('title', e.target.value)} placeholder="e.g. Chevening Scholarship 2027" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={FIELD}>
              <label style={LABEL}>Type *</label>
              <select style={SELECT} value={form.type} onChange={e => onChange('type', e.target.value)}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Funding *</label>
              <select style={SELECT} value={form.funding_type} onChange={e => onChange('funding_type', e.target.value)}>
                {FUNDING.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div style={FIELD}>
            <label style={LABEL}>Organization *</label>
            <input style={INPUT} value={form.organization} onChange={e => onChange('organization', e.target.value)} placeholder="e.g. UK Foreign, Commonwealth & Development Office" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '16px' }}>
            <div style={FIELD}>
              <label style={LABEL}>Country *</label>
              <input style={INPUT} value={form.country} onChange={e => onChange('country', e.target.value)} placeholder="e.g. United Kingdom" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Continent *</label>
              <select style={SELECT} value={form.continent} onChange={e => onChange('continent', e.target.value)}>
                {CONTINENTS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Flag emoji</label>
              <input style={INPUT} value={form.flag} onChange={e => onChange('flag', e.target.value)} placeholder="🇬🇧" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={FIELD}>
              <label style={LABEL}>Deadline date</label>
              <input type="date" style={INPUT} value={form.deadline_date} onChange={e => onChange('deadline_date', e.target.value)} />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Education level</label>
              <select style={SELECT} value={form.education_level} onChange={e => onChange('education_level', e.target.value)}>
                {ED_LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={FIELD}>
              <label style={LABEL}>Field of study</label>
              <input style={INPUT} value={form.field} onChange={e => onChange('field', e.target.value)} placeholder="e.g. Any, Engineering, Law" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Eligible countries (comma-separated)</label>
              <input style={INPUT} value={form.eligibility_countries} onChange={e => onChange('eligibility_countries', e.target.value)} placeholder="e.g. Global, Kenya, Nigeria" />
            </div>
          </div>

          <div style={FIELD}>
            <label style={LABEL}>Language requirements (comma-separated)</label>
            <input style={INPUT} value={form.language_requirements} onChange={e => onChange('language_requirements', e.target.value)} placeholder="e.g. English, French" />
          </div>

          <div style={FIELD}>
            <label style={LABEL}>Apply URL</label>
            <input type="url" style={INPUT} value={form.website} onChange={e => onChange('website', e.target.value)} placeholder="https://..." />
          </div>

          <div style={FIELD}>
            <label style={LABEL}>Description</label>
            <textarea style={TEXTAREA} value={form.description} onChange={e => onChange('description', e.target.value)} placeholder="2–3 sentences describing the opportunity..." />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => onChange('featured', !form.featured)}
              style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', backgroundColor: form.featured ? '#d4a017' : '#e2e8f0', position: 'relative', flexShrink: 0, transition: 'background-color 0.2s' }}
            >
              <span style={{ position: 'absolute', top: '3px', left: form.featured ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#ffffff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
            </button>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0a1628' }}>Featured opportunity</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff', color: '#475569', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !form.title.trim() || !form.organization.trim() || !form.country.trim()}
            style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', backgroundColor: saving ? '#b8891a' : '#d4a017', color: '#ffffff', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add opportunity'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Admin Page ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('opportunities')

  // Opportunities state
  const [opps, setOpps] = useState<Opp[]>([])
  const [oppsLoading, setOppsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<OppForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Users state
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [usersLoading, setUsersLoading] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')

  // Auth guard
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user || data.user.email !== ADMIN_EMAIL) {
        router.replace('/')
      } else {
        setAdminEmail(data.user.email ?? '')
      }
    })
  }, [router])

  // Load opportunities
  const loadOpps = useCallback(async () => {
    setOppsLoading(true)
    const { data } = await supabase
      .from('opportunities')
      .select('*')
      .order('created_at', { ascending: false })
    setOpps((data ?? []) as Opp[])
    setOppsLoading(false)
  }, [])

  useEffect(() => { loadOpps() }, [loadOpps])

  // Load users when tab switches
  useEffect(() => {
    if (tab !== 'users' || !adminEmail) return
    setUsersLoading(true)
    fetch('/api/admin/users', { headers: { 'x-admin-email': adminEmail } })
      .then(r => r.json())
      .then(({ profiles: p, subscriberCount: sc }) => {
        setProfiles(p ?? [])
        setSubscriberCount(sc ?? 0)
        setUsersLoading(false)
      })
      .catch(() => setUsersLoading(false))
  }, [tab, adminEmail])

  // Form helpers
  function openAdd() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setModalOpen(true)
  }

  function openEdit(opp: Opp) {
    setForm(oppToForm(opp))
    setEditingId(opp.id)
    setModalOpen(true)
  }

  function handleFormChange(k: keyof OppForm, v: string | boolean) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    const row = formToRow(form)
    if (editingId) {
      await supabase.from('opportunities').update(row).eq('id', editingId)
    } else {
      const { data: inserted } = await supabase.from('opportunities').insert(row).select('id').single()
      if (inserted?.id) {
        fetch('/api/notifications/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-email': adminEmail },
          body: JSON.stringify({ opportunityId: inserted.id }),
        }).catch(() => {})
      }
    }
    setSaving(false)
    setModalOpen(false)
    loadOpps()
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this opportunity? This cannot be undone.')) return
    setDeleteId(id)
    await supabase.from('opportunities').delete().eq('id', id)
    setDeleteId(null)
    setOpps(prev => prev.filter(o => o.id !== id))
  }

  async function toggleFeatured(opp: Opp) {
    const next = !opp.featured
    await supabase.from('opportunities').update({ featured: next }).eq('id', opp.id)
    setOpps(prev => prev.map(o => o.id === opp.id ? { ...o, featured: next } : o))
  }

  const filtered = opps.filter(o =>
    !search || o.title.toLowerCase().includes(search.toLowerCase()) ||
    o.organization.toLowerCase().includes(search.toLowerCase()) ||
    o.country.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ backgroundColor: '#0a1628', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#d4a017', fontWeight: 800, fontSize: '18px' }}>TANC</span>
          <span style={{ color: '#475569', fontSize: '14px' }}>Admin Panel</span>
        </div>
        <a href="/" style={{ color: '#94a3b8', fontSize: '13px', textDecoration: 'none' }}>← Back to site</a>
      </div>

      {/* Tabs */}
      <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0 32px', display: 'flex', gap: '0' }}>
        {([
          ['opportunities', 'Opportunities', LayoutGrid],
          ['users', 'Users', Users],
        ] as [Tab, string, React.ElementType][]).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 20px',
              border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
              color: tab === key ? '#d4a017' : '#475569',
              borderBottom: `2px solid ${tab === key ? '#d4a017' : 'transparent'}`,
              marginBottom: '-1px',
            }}
          >
            <Icon size={15} />
            {label}
            {key === 'opportunities' && (
              <span style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px' }}>{opps.length}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '32px' }}>

        {/* ── OPPORTUNITIES TAB ───────────────────────────────────────────── */}
        {tab === 'opportunities' && (
          <div>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search opportunities…"
                style={{ height: '40px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 14px', fontSize: '14px', color: '#0a1628', outline: 'none', width: '280px', backgroundColor: '#ffffff' }}
              />
              <button
                onClick={openAdd}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#d4a017', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
              >
                <Plus size={16} />
                Add New Opportunity
              </button>
            </div>

            {/* Table */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {['Title', 'Type', 'Country', 'Deadline', 'Featured', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {oppsLoading ? (
                      <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading…</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No opportunities found.</td></tr>
                    ) : filtered.map((opp, i) => {
                      const badge = TYPE_COLORS[opp.type] ?? { bg: '#f1f5f9', color: '#475569' }
                      return (
                        <tr key={opp.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none', backgroundColor: deleteId === opp.id ? '#fff1f2' : '#ffffff', transition: 'background-color 0.2s' }}>
                          <td style={{ padding: '12px 16px', maxWidth: '280px' }}>
                            <div style={{ fontWeight: 600, color: '#0a1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opp.flag} {opp.title}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{opp.organization}</div>
                          </td>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '20px', backgroundColor: badge.bg, color: badge.color }}>{opp.type}</span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569', whiteSpace: 'nowrap' }}>{opp.country}</td>
                          <td style={{ padding: '12px 16px', color: '#475569', whiteSpace: 'nowrap' }}>{formatDate(opp.deadline_date)}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <button
                              onClick={() => toggleFeatured(opp)}
                              title={opp.featured ? 'Remove featured' : 'Mark featured'}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
                            >
                              <Star size={16} fill={opp.featured ? '#d4a017' : 'none'} color={opp.featured ? '#d4a017' : '#cbd5e1'} />
                            </button>
                          </td>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                onClick={() => openEdit(opp)}
                                title="Edit"
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#ffffff', color: '#475569', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                              >
                                <Edit2 size={12} /> Edit
                              </button>
                              <button
                                onClick={() => handleDelete(opp.id)}
                                disabled={deleteId === opp.id}
                                title="Delete"
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', border: '1px solid #fecaca', borderRadius: '6px', backgroundColor: '#fff1f2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                              >
                                <Trash2 size={12} /> Delete
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
        )}

        {/* ── USERS TAB ───────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div>
            {/* Stats */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {[
                { label: 'Total users', value: profiles.length, color: '#0a1628' },
                { label: 'Email subscribers', value: subscriberCount, color: '#d4a017' },
                { label: 'Profile complete (avg)', value: profiles.length ? `${Math.round(profiles.reduce((s, p) => s + (p.profile_complete ?? 0), 0) / profiles.length)}%` : '—', color: '#15803d' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', minWidth: '180px', flex: 1 }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {['Name', 'Email', 'Nationality', 'Education', 'Profile %'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading ? (
                      <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading…</td></tr>
                    ) : profiles.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No users found.</td></tr>
                    ) : profiles.map((p, i) => {
                      const pct = p.profile_complete ?? 0
                      const pctColor = pct >= 80 ? '#15803d' : pct >= 50 ? '#d97706' : '#94a3b8'
                      return (
                        <tr key={p.id} style={{ borderBottom: i < profiles.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0a1628' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#d4a017', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                                {(p.full_name ?? p.email ?? '?').charAt(0).toUpperCase()}
                              </div>
                              {p.full_name ?? '—'}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>{p.email ?? '—'}</td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>{p.nationality ?? '—'}</td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>{p.education_level ?? '—'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ flex: 1, height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', minWidth: '60px' }}>
                                <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pctColor, borderRadius: '3px', transition: 'width 0.4s' }} />
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: pctColor, minWidth: '32px' }}>{pct}%</span>
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
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <OppModal
          form={form}
          onChange={handleFormChange}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
          saving={saving}
          isEdit={editingId !== null}
        />
      )}
    </div>
  )
}
