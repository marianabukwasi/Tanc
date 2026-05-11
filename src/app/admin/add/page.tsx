'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OppForm {
  title: string
  organization_name: string
  organization_website: string
  opportunity_type: string
  country: string
  city: string
  continent: string
  application_deadline: string
  start_date: string
  end_date: string
  is_rolling: boolean
  format: string
  program_language: string
  funding_type: string
  covers_tuition: boolean
  covers_accommodation: boolean
  covers_flights: boolean
  covers_meals: boolean
  stipend_amount: string
  stipend_currency: string
  self_fund_cost_usd: string
  min_education_level: string
  required_fields_of_study: string
  min_gpa: string
  gpa_scale: string
  required_nationalities: string
  excluded_nationalities: string
  required_residence_countries: string
  min_age: string
  max_age: string
  gender_restriction: string
  required_languages: string
  min_work_experience_years: string
  required_skills: string
  required_certifications: string
  requires_passport: boolean
  passport_validity_months: string
  requires_transcripts: boolean
  requires_cv: boolean
  requires_motivation_letter: boolean
  requires_recommendations: boolean
  min_recommendations: string
  min_volunteer_hours: string
  requires_leadership: boolean
  first_gen_preferred: boolean
  refugee_friendly: boolean
  disability_inclusive: boolean
  lgbtq_inclusive: boolean
  no_ielts_required: boolean
  open_to_africans: boolean
  open_to_developing: boolean
  description: string
  apply_url: string
  source_url: string
  tags: string
  is_featured: boolean
}

const EMPTY: OppForm = {
  title: '', organization_name: '', organization_website: '',
  opportunity_type: 'Scholarship', country: '', city: '', continent: 'Africa',
  application_deadline: '', start_date: '', end_date: '',
  is_rolling: false, format: '', program_language: '',
  funding_type: 'Fully Funded',
  covers_tuition: false, covers_accommodation: false, covers_flights: false, covers_meals: false,
  stipend_amount: '', stipend_currency: 'USD', self_fund_cost_usd: '',
  min_education_level: '', required_fields_of_study: '', min_gpa: '', gpa_scale: '4',
  required_nationalities: '', excluded_nationalities: '', required_residence_countries: '',
  min_age: '', max_age: '', gender_restriction: '',
  required_languages: '', min_work_experience_years: '',
  required_skills: '', required_certifications: '',
  requires_passport: false, passport_validity_months: '',
  requires_transcripts: false, requires_cv: false, requires_motivation_letter: false,
  requires_recommendations: false, min_recommendations: '', min_volunteer_hours: '',
  requires_leadership: false,
  first_gen_preferred: false, refugee_friendly: false, disability_inclusive: false,
  lgbtq_inclusive: false, no_ielts_required: false, open_to_africans: false, open_to_developing: false,
  description: '', apply_url: '', source_url: '', tags: '', is_featured: false,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseArr(s: string): string[] | null {
  const arr = s.split(',').map(x => x.trim()).filter(Boolean)
  return arr.length > 0 ? arr : null
}

function parseLanguages(s: string): { name: string; level?: string }[] | null {
  if (!s.trim()) return null
  return s.split(',').map(item => {
    const parts = item.trim().split(/\s+/)
    if (parts.length > 1) {
      const last = parts[parts.length - 1]
      const isLevel = /^[A-C][12]$|^(basic|intermediate|advanced|native|fluent)$/i.test(last)
      if (isLevel) return { name: parts.slice(0, -1).join(' '), level: last }
    }
    return { name: parts.join(' ') }
  }).filter(x => x.name)
}

function num(s: string): number | null {
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function int(s: string): number | null {
  const n = parseInt(s, 10)
  return isNaN(n) ? null : n
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToForm(o: Record<string, any>): OppForm {
  function strArr(v: unknown) {
    if (!v || !Array.isArray(v)) return ''
    return (v as string[]).join(', ')
  }
  function strLangs(v: unknown) {
    if (!v || !Array.isArray(v)) return ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (v as any[]).map((l: any) => l.level ? `${l.name} ${l.level}` : l.name).join(', ')
  }
  return {
    title: o.title ?? '',
    organization_name: o.organization_name ?? '',
    organization_website: o.organization_website ?? '',
    opportunity_type: o.opportunity_type ?? 'Scholarship',
    country: o.country ?? '',
    city: o.city ?? '',
    continent: o.continent ?? 'Africa',
    application_deadline: o.application_deadline ?? '',
    start_date: o.start_date ?? '',
    end_date: o.end_date ?? '',
    is_rolling: o.is_rolling ?? false,
    format: o.format ?? '',
    program_language: o.program_language ?? '',
    funding_type: o.funding_type ?? 'Fully Funded',
    covers_tuition: o.covers_tuition ?? false,
    covers_accommodation: o.covers_accommodation ?? false,
    covers_flights: o.covers_flights ?? false,
    covers_meals: o.covers_meals ?? false,
    stipend_amount: o.stipend_amount != null ? String(o.stipend_amount) : '',
    stipend_currency: o.stipend_currency ?? 'USD',
    self_fund_cost_usd: o.self_fund_cost_usd != null ? String(o.self_fund_cost_usd) : '',
    min_education_level: o.min_education_level ?? '',
    required_fields_of_study: strArr(o.required_fields_of_study),
    min_gpa: o.min_gpa != null ? String(o.min_gpa) : '',
    gpa_scale: o.gpa_scale != null ? String(o.gpa_scale) : '4',
    required_nationalities: strArr(o.required_nationalities),
    excluded_nationalities: strArr(o.excluded_nationalities),
    required_residence_countries: strArr(o.required_residence_countries),
    min_age: o.min_age != null ? String(o.min_age) : '',
    max_age: o.max_age != null ? String(o.max_age) : '',
    gender_restriction: o.gender_restriction ?? '',
    required_languages: strLangs(o.required_languages),
    min_work_experience_years: o.min_work_experience_years != null ? String(o.min_work_experience_years) : '',
    required_skills: strArr(o.required_skills),
    required_certifications: strArr(o.required_certifications),
    requires_passport: o.requires_passport ?? false,
    passport_validity_months: o.passport_validity_months != null ? String(o.passport_validity_months) : '',
    requires_transcripts: o.requires_transcripts ?? false,
    requires_cv: o.requires_cv ?? false,
    requires_motivation_letter: o.requires_motivation_letter ?? false,
    requires_recommendations: o.requires_recommendations ?? false,
    min_recommendations: o.min_recommendations != null ? String(o.min_recommendations) : '',
    min_volunteer_hours: o.min_volunteer_hours != null ? String(o.min_volunteer_hours) : '',
    requires_leadership: o.requires_leadership ?? false,
    first_gen_preferred: o.first_gen_preferred ?? false,
    refugee_friendly: o.refugee_friendly ?? false,
    disability_inclusive: o.disability_inclusive ?? false,
    lgbtq_inclusive: o.lgbtq_inclusive ?? false,
    no_ielts_required: o.no_ielts_required ?? false,
    open_to_africans: o.open_to_africans ?? false,
    open_to_developing: o.open_to_developing ?? false,
    description: o.description ?? '',
    apply_url: o.apply_url ?? '',
    source_url: o.source_url ?? '',
    tags: strArr(o.tags),
    is_featured: o.is_featured ?? false,
  }
}

function formToRow(form: OppForm, isPublished: boolean) {
  return {
    title: form.title.trim(),
    organization_name: form.organization_name.trim() || null,
    organization_website: form.organization_website.trim() || null,
    opportunity_type: form.opportunity_type || null,
    country: form.country.trim() || null,
    city: form.city.trim() || null,
    continent: form.continent || null,
    application_deadline: form.application_deadline || null,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    is_rolling: form.is_rolling,
    format: form.format || null,
    program_language: form.program_language.trim() || null,
    funding_type: form.funding_type || null,
    covers_tuition: form.covers_tuition,
    covers_accommodation: form.covers_accommodation,
    covers_flights: form.covers_flights,
    covers_meals: form.covers_meals,
    stipend_amount: int(form.stipend_amount),
    stipend_currency: form.stipend_currency.trim() || null,
    self_fund_cost_usd: int(form.self_fund_cost_usd),
    min_education_level: form.min_education_level || null,
    required_fields_of_study: parseArr(form.required_fields_of_study),
    min_gpa: num(form.min_gpa),
    gpa_scale: num(form.gpa_scale),
    required_nationalities: parseArr(form.required_nationalities),
    excluded_nationalities: parseArr(form.excluded_nationalities),
    required_residence_countries: parseArr(form.required_residence_countries),
    min_age: int(form.min_age),
    max_age: int(form.max_age),
    gender_restriction: form.gender_restriction || null,
    required_languages: parseLanguages(form.required_languages),
    min_work_experience_years: int(form.min_work_experience_years),
    required_skills: parseArr(form.required_skills),
    required_certifications: parseArr(form.required_certifications),
    requires_passport: form.requires_passport,
    passport_validity_months: int(form.passport_validity_months),
    requires_transcripts: form.requires_transcripts,
    requires_cv: form.requires_cv,
    requires_motivation_letter: form.requires_motivation_letter,
    requires_recommendations: form.requires_recommendations,
    min_recommendations: int(form.min_recommendations),
    min_volunteer_hours: int(form.min_volunteer_hours),
    requires_leadership: form.requires_leadership,
    first_gen_preferred: form.first_gen_preferred,
    refugee_friendly: form.refugee_friendly,
    disability_inclusive: form.disability_inclusive,
    lgbtq_inclusive: form.lgbtq_inclusive,
    no_ielts_required: form.no_ielts_required,
    open_to_africans: form.open_to_africans,
    open_to_developing: form.open_to_developing,
    description: form.description.trim() || null,
    apply_url: form.apply_url.trim() || null,
    source_url: form.source_url.trim() || null,
    tags: parseArr(form.tags),
    is_featured: form.is_featured,
    is_published: isPublished,
    is_archived: false,
  }
}

// ─── Shared style constants ───────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: '100%', height: '38px', border: '1px solid #e2e8f0', borderRadius: '7px',
  padding: '0 11px', fontSize: '13px', color: '#0a1628', outline: 'none',
  boxSizing: 'border-box', backgroundColor: '#ffffff', fontFamily: 'inherit',
}
const SELECT: React.CSSProperties = { ...INPUT, cursor: 'pointer' }
const TEXTAREA: React.CSSProperties = {
  width: '100%', border: '1px solid #e2e8f0', borderRadius: '7px',
  padding: '9px 11px', fontSize: '13px', color: '#0a1628', outline: 'none',
  boxSizing: 'border-box', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit',
}
const LABEL: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px',
  display: 'block', textTransform: 'uppercase', letterSpacing: '0.4px',
}
const FIELD: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px' }
const GRID2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
const GRID3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, open, onToggle, children }: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', border: 'none', background: open ? '#fafafa' : '#f8fafc',
          cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#0a1628',
        }}
      >
        {title}
        {open ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#94a3b8" />}
      </button>
      {open && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#ffffff' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => onChange(!checked)}>
      <div style={{ width: '40px', height: '22px', borderRadius: '11px', backgroundColor: checked ? '#d4a017' : '#e2e8f0', position: 'relative', flexShrink: 0, transition: 'background-color 0.2s' }}>
        <span style={{ position: 'absolute', top: '3px', left: checked ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#ffffff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
      </div>
      <span style={{ fontSize: '13px', color: '#0a1628' }}>{label}</span>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

function AddForm() {
  const params  = useSearchParams()
  const router  = useRouter()
  const editId  = params.get('id')

  const [form, setForm]         = useState<OppForm>(EMPTY)
  const [sections, setSections] = useState<Record<string, boolean>>({
    basic: true, dates: false, funding: false, eligibility: false,
    docs: false, flags: false, content: true,
  })
  const [url, setUrl]           = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractErr, setExtractErr] = useState('')
  const [saving, setSaving]     = useState<'draft' | 'publish' | null>(null)
  const [loadingEdit, setLoadingEdit] = useState(!!editId)
  const [adminEmail, setAdminEmail] = useState('')
  const [toast, setToast]       = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAdminEmail(data.user?.email ?? '')
    })
  }, [])

  useEffect(() => {
    if (!editId) return
    supabase
      .from('opportunities')
      .select('*')
      .eq('id', editId)
      .single()
      .then(({ data }) => {
        if (data) setForm(rowToForm(data as Record<string, unknown>))
        setLoadingEdit(false)
      })
  }, [editId])

  function set(k: keyof OppForm, v: string | boolean) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function toggle(section: string) {
    setSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  async function handleExtract() {
    if (!url.trim()) return
    setExtracting(true)
    setExtractErr('')
    try {
      const res = await fetch('/api/admin/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-email': adminEmail },
        body: JSON.stringify({ url: url.trim() }),
      })
      const { data, error } = await res.json() as { data?: Record<string, unknown>; error?: string }
      if (error || !data) { setExtractErr(error ?? 'Extraction failed'); return }

      setForm(prev => ({
        ...prev,
        title: String(data.title ?? prev.title),
        organization_name: String(data.organization_name ?? prev.organization_name),
        opportunity_type: String(data.opportunity_type ?? prev.opportunity_type),
        country: String(data.country ?? prev.country),
        continent: String(data.continent ?? prev.continent),
        application_deadline: String(data.application_deadline ?? prev.application_deadline),
        funding_type: String(data.funding_type ?? prev.funding_type),
        min_education_level: String(data.min_education_level ?? prev.min_education_level),
        description: String(data.description ?? prev.description),
        apply_url: String(data.apply_url ?? prev.apply_url),
        required_nationalities: Array.isArray(data.required_nationalities) ? (data.required_nationalities as string[]).join(', ') : prev.required_nationalities,
        min_age: data.min_age != null ? String(data.min_age) : prev.min_age,
        max_age: data.max_age != null ? String(data.max_age) : prev.max_age,
        covers_tuition: Boolean(data.covers_tuition ?? prev.covers_tuition),
        covers_flights: Boolean(data.covers_flights ?? prev.covers_flights),
        covers_accommodation: Boolean(data.covers_accommodation ?? prev.covers_accommodation),
        covers_meals: Boolean(data.covers_meals ?? prev.covers_meals),
        stipend_amount: data.stipend_amount != null ? String(data.stipend_amount) : prev.stipend_amount,
        stipend_currency: String(data.stipend_currency ?? prev.stipend_currency),
        requires_cv: Boolean(data.requires_cv ?? prev.requires_cv),
        requires_motivation_letter: Boolean(data.requires_motivation_letter ?? prev.requires_motivation_letter),
        requires_recommendations: Boolean(data.requires_recommendations ?? prev.requires_recommendations),
        refugee_friendly: Boolean(data.refugee_friendly ?? prev.refugee_friendly),
        first_gen_preferred: Boolean(data.first_gen_preferred ?? prev.first_gen_preferred),
        source_url: url.trim(),
      }))
      setSections(prev => ({ ...prev, basic: true, content: true, eligibility: true, funding: true }))
    } finally {
      setExtracting(false)
    }
  }

  async function handleSave(publish: boolean) {
    if (!form.title.trim()) return
    setSaving(publish ? 'publish' : 'draft')
    const row = formToRow(form, publish)
    try {
      if (editId) {
        await supabase.from('opportunities').update(row).eq('id', editId)
        setToast('Saved!')
      } else {
        const { data: inserted } = await supabase.from('opportunities').insert(row).select('id').single()
        if (publish && inserted?.id) {
          fetch('/api/notifications/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-email': adminEmail },
            body: JSON.stringify({ opportunityId: inserted.id }),
          }).catch(() => {})
        }
        setToast(publish ? 'Published!' : 'Saved as draft!')
        setTimeout(() => router.push('/admin/manage'), 800)
      }
    } finally {
      setSaving(null)
      setTimeout(() => setToast(''), 2500)
    }
  }

  if (loadingEdit) {
    return <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
  }

  return (
    <div style={{ maxWidth: '760px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0a1628', margin: 0 }}>
            {editId ? 'Edit Opportunity' : 'Add Opportunity'}
          </h1>
          {editId && <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '3px' }}>ID: {editId}</p>}
        </div>
        <button
          onClick={() => router.back()}
          style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '7px', background: '#ffffff', color: '#64748b', fontSize: '13px', cursor: 'pointer' }}
        >
          ← Back
        </button>
      </div>

      {/* URL Extractor */}
      {!editId && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', marginBottom: '10px' }}>
            ✨ Auto-fill with AI
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Paste opportunity URL to auto-fill the form…"
              style={{ flex: 1, height: '38px', border: '1px solid #fde68a', borderRadius: '7px', padding: '0 11px', fontSize: '13px', color: '#0a1628', outline: 'none', backgroundColor: '#ffffff' }}
            />
            <button
              onClick={handleExtract}
              disabled={extracting || !url.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 18px', height: '38px', border: 'none', borderRadius: '7px', backgroundColor: extracting ? '#b8891a' : '#d4a017', color: '#ffffff', fontSize: '13px', fontWeight: 700, cursor: extracting ? 'not-allowed' : 'pointer', flexShrink: 0 }}
            >
              {extracting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Extracting…</> : 'Extract'}
            </button>
          </div>
          {extractErr && <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px' }}>{extractErr}</div>}
        </div>
      )}

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

        <Section title="Basic info" open={sections.basic} onToggle={() => toggle('basic')}>
          <div style={FIELD}>
            <label style={LABEL}>Title *</label>
            <input style={INPUT} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Chevening Scholarship 2027" />
          </div>
          <div style={GRID2}>
            <div style={FIELD}>
              <label style={LABEL}>Type</label>
              <select style={SELECT} value={form.opportunity_type} onChange={e => set('opportunity_type', e.target.value)}>
                {['Scholarship','Fellowship','Internship','Exchange Program','Conference','Competition','Other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Funding</label>
              <select style={SELECT} value={form.funding_type} onChange={e => set('funding_type', e.target.value)}>
                {['Fully Funded','Partial Funding','Stipend','Self-funded'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div style={FIELD}>
            <label style={LABEL}>Organization name</label>
            <input style={INPUT} value={form.organization_name} onChange={e => set('organization_name', e.target.value)} placeholder="e.g. UK Foreign, Commonwealth & Development Office" />
          </div>
          <div style={FIELD}>
            <label style={LABEL}>Organization website</label>
            <input type="url" style={INPUT} value={form.organization_website} onChange={e => set('organization_website', e.target.value)} placeholder="https://…" />
          </div>
          <div style={GRID3}>
            <div style={FIELD}>
              <label style={LABEL}>Country</label>
              <input style={INPUT} value={form.country} onChange={e => set('country', e.target.value)} placeholder="United Kingdom" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>City</label>
              <input style={INPUT} value={form.city} onChange={e => set('city', e.target.value)} placeholder="London" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Continent</label>
              <select style={SELECT} value={form.continent} onChange={e => set('continent', e.target.value)}>
                {['Africa','Europe','North America','South America','Asia','Oceania','Global'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </Section>

        <Section title="Dates & format" open={sections.dates} onToggle={() => toggle('dates')}>
          <div style={GRID3}>
            <div style={FIELD}>
              <label style={LABEL}>Application deadline</label>
              <input type="date" style={INPUT} value={form.application_deadline} onChange={e => set('application_deadline', e.target.value)} />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Start date</label>
              <input type="date" style={INPUT} value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>End date</label>
              <input type="date" style={INPUT} value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>
          <Toggle checked={form.is_rolling} onChange={v => set('is_rolling', v)} label="Rolling admission (no fixed deadline)" />
          <div style={GRID2}>
            <div style={FIELD}>
              <label style={LABEL}>Format</label>
              <select style={SELECT} value={form.format} onChange={e => set('format', e.target.value)}>
                <option value="">— select —</option>
                {['In-person','Online','Hybrid'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Program language</label>
              <input style={INPUT} value={form.program_language} onChange={e => set('program_language', e.target.value)} placeholder="e.g. English" />
            </div>
          </div>
        </Section>

        <Section title="Funding details" open={sections.funding} onToggle={() => toggle('funding')}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {[
              { key: 'covers_tuition'      as const, label: 'Tuition' },
              { key: 'covers_accommodation'as const, label: 'Accommodation' },
              { key: 'covers_flights'      as const, label: 'Flights' },
              { key: 'covers_meals'        as const, label: 'Meals' },
            ].map(({ key, label }) => (
              <Toggle key={key} checked={form[key]} onChange={v => set(key, v)} label={`Covers ${label}`} />
            ))}
          </div>
          <div style={GRID3}>
            <div style={FIELD}>
              <label style={LABEL}>Stipend amount</label>
              <input type="number" style={INPUT} value={form.stipend_amount} onChange={e => set('stipend_amount', e.target.value)} placeholder="e.g. 1500" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Stipend currency</label>
              <input style={INPUT} value={form.stipend_currency} onChange={e => set('stipend_currency', e.target.value)} placeholder="USD" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Self-fund cost (USD)</label>
              <input type="number" style={INPUT} value={form.self_fund_cost_usd} onChange={e => set('self_fund_cost_usd', e.target.value)} placeholder="e.g. 2000" />
            </div>
          </div>
        </Section>

        <Section title="Eligibility" open={sections.eligibility} onToggle={() => toggle('eligibility')}>
          <div style={GRID2}>
            <div style={FIELD}>
              <label style={LABEL}>Min education level</label>
              <select style={SELECT} value={form.min_education_level} onChange={e => set('min_education_level', e.target.value)}>
                <option value="">Any</option>
                {['High School','Undergraduate','Masters','PhD'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Fields of study (comma-sep)</label>
              <input style={INPUT} value={form.required_fields_of_study} onChange={e => set('required_fields_of_study', e.target.value)} placeholder="Any, Engineering, Law" />
            </div>
          </div>
          <div style={GRID3}>
            <div style={FIELD}>
              <label style={LABEL}>Min GPA</label>
              <input type="number" step="0.01" style={INPUT} value={form.min_gpa} onChange={e => set('min_gpa', e.target.value)} placeholder="3.0" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>GPA scale</label>
              <input type="number" style={INPUT} value={form.gpa_scale} onChange={e => set('gpa_scale', e.target.value)} placeholder="4" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Min work exp (yrs)</label>
              <input type="number" style={INPUT} value={form.min_work_experience_years} onChange={e => set('min_work_experience_years', e.target.value)} placeholder="0" />
            </div>
          </div>
          <div style={FIELD}>
            <label style={LABEL}>Open to nationalities (comma-sep, empty = all)</label>
            <input style={INPUT} value={form.required_nationalities} onChange={e => set('required_nationalities', e.target.value)} placeholder="Kenya, Nigeria, Ghana" />
          </div>
          <div style={GRID2}>
            <div style={FIELD}>
              <label style={LABEL}>Excluded nationalities</label>
              <input style={INPUT} value={form.excluded_nationalities} onChange={e => set('excluded_nationalities', e.target.value)} placeholder="" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Required residence countries</label>
              <input style={INPUT} value={form.required_residence_countries} onChange={e => set('required_residence_countries', e.target.value)} placeholder="" />
            </div>
          </div>
          <div style={GRID3}>
            <div style={FIELD}>
              <label style={LABEL}>Min age</label>
              <input type="number" style={INPUT} value={form.min_age} onChange={e => set('min_age', e.target.value)} placeholder="18" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Max age</label>
              <input type="number" style={INPUT} value={form.max_age} onChange={e => set('max_age', e.target.value)} placeholder="" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Gender restriction</label>
              <select style={SELECT} value={form.gender_restriction} onChange={e => set('gender_restriction', e.target.value)}>
                <option value="">None</option>
                {['Male','Female','Non-binary'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div style={FIELD}>
            <label style={LABEL}>Required languages (e.g. English B2, French)</label>
            <input style={INPUT} value={form.required_languages} onChange={e => set('required_languages', e.target.value)} placeholder="English B2, French" />
          </div>
          <div style={GRID2}>
            <div style={FIELD}>
              <label style={LABEL}>Required skills (comma-sep)</label>
              <input style={INPUT} value={form.required_skills} onChange={e => set('required_skills', e.target.value)} placeholder="Python, Leadership" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Required certifications</label>
              <input style={INPUT} value={form.required_certifications} onChange={e => set('required_certifications', e.target.value)} placeholder="IELTS, PMP" />
            </div>
          </div>
          <div style={FIELD}>
            <label style={LABEL}>Min volunteer hours</label>
            <input type="number" style={{ ...INPUT, maxWidth: '180px' }} value={form.min_volunteer_hours} onChange={e => set('min_volunteer_hours', e.target.value)} placeholder="0" />
          </div>
          <Toggle checked={form.requires_leadership} onChange={v => set('requires_leadership', v)} label="Requires leadership experience" />
        </Section>

        <Section title="Documents" open={sections.docs} onToggle={() => toggle('docs')}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {[
              { key: 'requires_cv'                as const, label: 'CV / Resume' },
              { key: 'requires_motivation_letter' as const, label: 'Motivation letter' },
              { key: 'requires_transcripts'       as const, label: 'Transcripts' },
              { key: 'requires_passport'          as const, label: 'Passport' },
              { key: 'requires_recommendations'   as const, label: 'Recommendation letters' },
            ].map(({ key, label }) => (
              <Toggle key={key} checked={form[key]} onChange={v => set(key, v)} label={label} />
            ))}
          </div>
          <div style={GRID2}>
            <div style={FIELD}>
              <label style={LABEL}>Min recommendation letters</label>
              <input type="number" style={INPUT} value={form.min_recommendations} onChange={e => set('min_recommendations', e.target.value)} placeholder="2" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Passport validity required (months)</label>
              <input type="number" style={INPUT} value={form.passport_validity_months} onChange={e => set('passport_validity_months', e.target.value)} placeholder="6" />
            </div>
          </div>
        </Section>

        <Section title="Inclusive flags" open={sections.flags} onToggle={() => toggle('flags')}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {[
              { key: 'first_gen_preferred' as const, label: 'First-gen preferred' },
              { key: 'refugee_friendly'    as const, label: 'Refugee friendly' },
              { key: 'disability_inclusive'as const, label: 'Disability inclusive' },
              { key: 'lgbtq_inclusive'     as const, label: 'LGBTQ+ inclusive' },
              { key: 'no_ielts_required'   as const, label: 'No IELTS required' },
              { key: 'open_to_africans'    as const, label: 'Open to Africans' },
              { key: 'open_to_developing'  as const, label: 'Open to developing-country nationals' },
            ].map(({ key, label }) => (
              <Toggle key={key} checked={form[key]} onChange={v => set(key, v)} label={label} />
            ))}
          </div>
        </Section>

        <Section title="Content & links" open={sections.content} onToggle={() => toggle('content')}>
          <div style={FIELD}>
            <label style={LABEL}>Description</label>
            <textarea style={{ ...TEXTAREA, minHeight: '100px' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="2–4 sentences describing the opportunity…" />
          </div>
          <div style={GRID2}>
            <div style={FIELD}>
              <label style={LABEL}>Apply URL</label>
              <input type="url" style={INPUT} value={form.apply_url} onChange={e => set('apply_url', e.target.value)} placeholder="https://…" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Source URL</label>
              <input type="url" style={INPUT} value={form.source_url} onChange={e => set('source_url', e.target.value)} placeholder="https://…" />
            </div>
          </div>
          <div style={FIELD}>
            <label style={LABEL}>Tags (comma-sep)</label>
            <input style={INPUT} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="women, stem, africa, undergraduate" />
          </div>
          <Toggle checked={form.is_featured} onChange={v => set('is_featured', v)} label="Feature this opportunity on homepage" />
        </Section>
      </div>

      {/* Save buttons */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={() => handleSave(false)}
          disabled={saving !== null || !form.title.trim()}
          style={{ padding: '11px 22px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff', color: '#0a1628', fontSize: '14px', fontWeight: 600, cursor: saving !== null ? 'not-allowed' : 'pointer', opacity: saving !== null ? 0.6 : 1 }}
        >
          {saving === 'draft' ? 'Saving…' : 'Save as Draft'}
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving !== null || !form.title.trim()}
          style={{ padding: '11px 22px', border: 'none', borderRadius: '8px', backgroundColor: '#d4a017', color: '#ffffff', fontSize: '14px', fontWeight: 700, cursor: saving !== null ? 'not-allowed' : 'pointer', opacity: saving !== null ? 0.7 : 1 }}
        >
          {saving === 'publish' ? 'Publishing…' : editId ? 'Save & Publish' : 'Publish'}
        </button>
        {toast && (
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#15803d', padding: '8px 12px', backgroundColor: '#f0fdf4', borderRadius: '7px' }}>
            ✓ {toast}
          </span>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Export with Suspense (required for useSearchParams) ──────────────────────

export default function AddPage() {
  return (
    <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Loading…</div>}>
      <AddForm />
    </Suspense>
  )
}
