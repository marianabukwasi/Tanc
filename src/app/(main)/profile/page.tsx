'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Plus, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calculateCompletionPct, type ProfileData } from '@/lib/profile'
import { COUNTRIES, OPPORTUNITY_TYPES, EDUCATION_LEVELS, CEFR_LEVELS, GPA_SCALES, GENDERS, SECTORS, FORMATS } from '@/lib/constants'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Language {
  name: string
  level: string
  certificate: string
  score: string
  test_date: string
}

interface Certification {
  name: string
  issuer: string
  date: string
  expiry: string
}

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  date_of_birth: string | null
  gender: string | null
  nationalities: string[] | null
  country_of_residence: string | null
  is_refugee: boolean
  is_first_generation: boolean
  education_level: string | null
  field_of_study: string | null
  institution_name: string | null
  year_of_study: string | null
  gpa_value: number | null
  gpa_scale: number
  years_work_experience: number
  professional_sector: string | null
  skills: string[] | null
  portfolio_url: string | null
  has_passport: boolean
  passport_expiry: string | null
  has_transcripts: boolean
  recommendation_letters_count: number
  volunteer_hours: number
  certifications: Certification[]
  languages: Language[]
  opportunity_types_interest: string[] | null
  target_countries: string[] | null
  excluded_countries: string[] | null
  max_self_fund_usd: number | null
  preferred_format: string | null
  notification_instant: boolean
  notification_digest: boolean
  notification_reminders: boolean
  profile_complete_pct: number
  role: string
  referral_code: string | null
}

// ─── Style constants ────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', height: '42px', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '0 12px', fontSize: '14px', color: '#0a1628', outline: 'none',
  boxSizing: 'border-box', backgroundColor: '#ffffff', fontFamily: 'inherit',
}

const lbl: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block',
  marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em',
}

const sectionCard: React.CSSProperties = {
  backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
  padding: '24px', marginBottom: '16px',
}

const sectionHeader: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px',
}

const grid2: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
}

// ─── Helper components ──────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: value ? '#0a1628' : '#94a3b8' }}>{value || 'Not set'}</div>
    </div>
  )
}

function EditBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, color: '#d4a017', cursor: 'pointer', fontFamily: 'inherit' }}>
      Edit
    </button>
  )
}

function SaveCancelRow({ onCancel, saving, label = 'Save' }: { onCancel: () => void; saving: boolean; label?: string }) {
  return (
    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
      <button type="button" onClick={onCancel} style={{ padding: '0 20px', height: '40px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        Cancel
      </button>
      <button type="submit" disabled={saving} style={{ padding: '0 24px', height: '40px', backgroundColor: saving ? '#e2c76a' : '#d4a017', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
        {saving ? 'Saving…' : label}
      </button>
    </div>
  )
}

function CountrySelect({ value, onChange, placeholder = 'Search country…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [search, setSearch] = useState(value)
  const [open, setOpen] = useState(false)
  const filtered = COUNTRIES.filter(c => c.toLowerCase().includes(search.toLowerCase())).slice(0, 10)

  function select(c: string) { onChange(c); setSearch(c); setOpen(false) }

  return (
    <div style={{ position: 'relative' }}>
      <input value={search} onFocus={() => { setSearch(''); setOpen(true) }} onChange={e => { setSearch(e.target.value); setOpen(true) }} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder={placeholder} style={inp} autoComplete="off" />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
          {filtered.map(c => (
            <div key={c} onMouseDown={() => select(c)} style={{ padding: '9px 12px', cursor: 'pointer', fontSize: '13px', color: c === value ? '#d4a017' : '#0a1628', backgroundColor: c === value ? '#fef9e7' : undefined }} onMouseOver={e => { if (c !== value) e.currentTarget.style.backgroundColor = '#f8fafc' }} onMouseOut={e => { if (c !== value) e.currentTarget.style.backgroundColor = '' }}>
              {c}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CountryMultiSelect({ values, onChange, placeholder = 'Add country…' }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const filtered = COUNTRIES.filter(c => c.toLowerCase().includes(search.toLowerCase()) && !values.includes(c)).slice(0, 8)

  function add(c: string) { onChange([...values, c]); setSearch('') }
  function remove(c: string) { onChange(values.filter(x => x !== c)) }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: values.length ? '8px' : 0 }}>
        {values.map(c => (
          <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#f1f5f9', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#0a1628', fontWeight: 500 }}>
            {c}
            <button type="button" onClick={() => remove(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex', alignItems: 'center' }}><X size={12} /></button>
          </span>
        ))}
      </div>
      <div style={{ position: 'relative' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder={placeholder} style={inp} autoComplete="off" />
        {open && filtered.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: '180px', overflowY: 'auto', marginTop: '4px' }}>
            {filtered.map(c => (
              <div key={c} onMouseDown={() => add(c)} style={{ padding: '9px 12px', cursor: 'pointer', fontSize: '13px', color: '#0a1628' }} onMouseOver={e => (e.currentTarget.style.backgroundColor = '#f8fafc')} onMouseOut={e => (e.currentTarget.style.backgroundColor = '')}>
                {c}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TagInput({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')

  function addTag(tag: string) {
    const t = tag.trim().replace(/,$/, '')
    if (t && !values.includes(t)) onChange([...values, t])
    setInput('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input) }
    else if (e.key === 'Backspace' && !input && values.length) onChange(values.slice(0, -1))
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: values.length ? '8px' : 0 }}>
        {values.map((t, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fef9e7', border: '1px solid #d4a017', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', color: '#0a1628', fontWeight: 500 }}>
            {t}
            <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex', alignItems: 'center' }}><X size={11} /></button>
          </span>
        ))}
      </div>
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown} onBlur={() => { if (input.trim()) addTag(input) }} placeholder="Type and press Enter to add…" style={inp} />
      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Press Enter or comma to add each skill</div>
    </div>
  )
}

// ─── Section components ─────────────────────────────────────────────────────

interface SectionProps {
  profile: Profile
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (updates: Partial<Profile>) => Promise<void>
  saving: boolean
}

function BasicInfoSection({ profile, editing, onEdit, onCancel, onSave, saving }: SectionProps) {
  const [firstName, setFirstName] = useState(profile.first_name ?? '')
  const [lastName, setLastName] = useState(profile.last_name ?? '')
  const [dob, setDob] = useState(profile.date_of_birth ?? '')
  const [gender, setGender] = useState(profile.gender ?? '')
  const [nationalities, setNationalities] = useState<string[]>(profile.nationalities ?? [])
  const [residence, setResidence] = useState(profile.country_of_residence ?? '')
  const [isRefugee, setIsRefugee] = useState(profile.is_refugee)
  const [isFirstGen, setIsFirstGen] = useState(profile.is_first_generation)

  useEffect(() => {
    if (editing) {
      setFirstName(profile.first_name ?? '')
      setLastName(profile.last_name ?? '')
      setDob(profile.date_of_birth ?? '')
      setGender(profile.gender ?? '')
      setNationalities(profile.nationalities ?? [])
      setResidence(profile.country_of_residence ?? '')
      setIsRefugee(profile.is_refugee)
      setIsFirstGen(profile.is_first_generation)
    }
  }, [editing, profile])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await onSave({ first_name: firstName || null, last_name: lastName || null, date_of_birth: dob || null, gender: gender || null, nationalities: nationalities.length ? nationalities : null, country_of_residence: residence || null, is_refugee: isRefugee, is_first_generation: isFirstGen })
  }

  return (
    <div style={sectionCard}>
      <div style={sectionHeader}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0a1628' }}>Basic Info</h2>
        {!editing && <EditBtn onClick={onEdit} />}
      </div>
      {editing ? (
        <form onSubmit={handleSave}>
          <div style={grid2}>
            <div><label style={lbl}>First Name</label><input style={inp} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" /></div>
            <div><label style={lbl}>Last Name</label><input style={inp} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" /></div>
          </div>
          <div style={{ ...grid2, marginTop: '16px' }}>
            <div>
              <label style={lbl}>Date of Birth</label>
              <input style={inp} type="date" value={dob} onChange={e => setDob(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Gender</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={gender} onChange={e => setGender(e.target.value)}>
                <option value="">Select…</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <label style={lbl}>Nationalities</label>
            <CountryMultiSelect values={nationalities} onChange={setNationalities} placeholder="Add nationality…" />
          </div>
          <div style={{ marginTop: '16px' }}>
            <label style={lbl}>Country of Residence</label>
            <CountrySelect value={residence} onChange={setResidence} placeholder="Current country of residence…" />
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#0a1628' }}>
              <input type="checkbox" checked={isRefugee} onChange={e => setIsRefugee(e.target.checked)} />
              I am a refugee / asylum seeker
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#0a1628' }}>
              <input type="checkbox" checked={isFirstGen} onChange={e => setIsFirstGen(e.target.checked)} />
              First-generation student
            </label>
          </div>
          <SaveCancelRow onCancel={onCancel} saving={saving} />
        </form>
      ) : (
        <div>
          <FieldRow label="Name" value={[profile.first_name, profile.last_name].filter(Boolean).join(' ') || null} />
          <FieldRow label="Date of Birth" value={profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
          <FieldRow label="Gender" value={profile.gender} />
          <FieldRow label="Nationalities" value={profile.nationalities?.join(', ')} />
          <FieldRow label="Country of Residence" value={profile.country_of_residence} />
          {(profile.is_refugee || profile.is_first_generation) && (
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {profile.is_refugee && <span style={{ fontSize: '12px', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: '50px', fontWeight: 600 }}>Refugee / Asylum Seeker</span>}
              {profile.is_first_generation && <span style={{ fontSize: '12px', backgroundColor: '#f0fdf4', color: '#15803d', padding: '3px 10px', borderRadius: '50px', fontWeight: 600 }}>First-Generation Student</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EducationSection({ profile, editing, onEdit, onCancel, onSave, saving }: SectionProps) {
  const [level, setLevel] = useState(profile.education_level ?? '')
  const [field, setField] = useState(profile.field_of_study ?? '')
  const [institution, setInstitution] = useState(profile.institution_name ?? '')
  const [year, setYear] = useState(profile.year_of_study ?? '')
  const [gpaValue, setGpaValue] = useState(profile.gpa_value?.toString() ?? '')
  const [gpaScale, setGpaScale] = useState(profile.gpa_scale ?? 4)

  useEffect(() => {
    if (editing) {
      setLevel(profile.education_level ?? '')
      setField(profile.field_of_study ?? '')
      setInstitution(profile.institution_name ?? '')
      setYear(profile.year_of_study ?? '')
      setGpaValue(profile.gpa_value?.toString() ?? '')
      setGpaScale(profile.gpa_scale ?? 4)
    }
  }, [editing, profile])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await onSave({ education_level: level || null, field_of_study: field || null, institution_name: institution || null, year_of_study: year || null, gpa_value: gpaValue ? parseFloat(gpaValue) : null, gpa_scale: gpaScale })
  }

  return (
    <div style={sectionCard}>
      <div style={sectionHeader}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0a1628' }}>Education</h2>
        {!editing && <EditBtn onClick={onEdit} />}
      </div>
      {editing ? (
        <form onSubmit={handleSave}>
          <div>
            <label style={lbl}>Education Level</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={level} onChange={e => setLevel(e.target.value)}>
              <option value="">Select…</option>
              {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div style={{ marginTop: '16px' }}>
            <label style={lbl}>Field of Study</label>
            <input style={inp} value={field} onChange={e => setField(e.target.value)} placeholder="e.g. Computer Science" />
          </div>
          <div style={{ marginTop: '16px' }}>
            <label style={lbl}>Institution Name</label>
            <input style={inp} value={institution} onChange={e => setInstitution(e.target.value)} placeholder="e.g. University of Lagos" />
          </div>
          <div style={{ ...grid2, marginTop: '16px' }}>
            <div>
              <label style={lbl}>Year of Study</label>
              <input style={inp} value={year} onChange={e => setYear(e.target.value)} placeholder="e.g. 2nd Year, Graduated" />
            </div>
            <div>
              <label style={lbl}>GPA</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input style={{ ...inp, flex: 1 }} type="number" step="0.01" value={gpaValue} onChange={e => setGpaValue(e.target.value)} placeholder="3.8" />
                <select style={{ ...inp, width: '90px', cursor: 'pointer' }} value={gpaScale} onChange={e => setGpaScale(Number(e.target.value))}>
                  {GPA_SCALES.map(s => <option key={s} value={s}>/ {s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <SaveCancelRow onCancel={onCancel} saving={saving} />
        </form>
      ) : (
        <div>
          <FieldRow label="Education Level" value={profile.education_level} />
          <FieldRow label="Field of Study" value={profile.field_of_study} />
          <FieldRow label="Institution" value={profile.institution_name} />
          <FieldRow label="Year of Study" value={profile.year_of_study} />
          <FieldRow label="GPA" value={profile.gpa_value ? `${profile.gpa_value} / ${profile.gpa_scale}` : null} />
        </div>
      )}
    </div>
  )
}

function LanguagesSection({ profile, editing, onEdit, onCancel, onSave, saving }: SectionProps) {
  const [langs, setLangs] = useState<Language[]>(profile.languages ?? [])

  useEffect(() => {
    if (editing) setLangs(profile.languages ?? [])
  }, [editing, profile])

  function addLang() {
    setLangs(prev => [...prev, { name: '', level: '', certificate: '', score: '', test_date: '' }])
  }

  function updateLang(i: number, field: keyof Language, value: string) {
    setLangs(prev => prev.map((l, j) => j === i ? { ...l, [field]: value } : l))
  }

  function removeLang(i: number) {
    setLangs(prev => prev.filter((_, j) => j !== i))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await onSave({ languages: langs.filter(l => l.name) as unknown as Language[] })
  }

  return (
    <div style={sectionCard}>
      <div style={sectionHeader}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0a1628' }}>Languages</h2>
        {!editing && <EditBtn onClick={onEdit} />}
      </div>
      {editing ? (
        <form onSubmit={handleSave}>
          {langs.map((lang, i) => (
            <div key={i} style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Language {i + 1}</span>
                <button type="button" onClick={() => removeLang(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={16} /></button>
              </div>
              <div style={grid2}>
                <div>
                  <label style={lbl}>Language Name</label>
                  <input style={inp} value={lang.name} onChange={e => updateLang(i, 'name', e.target.value)} placeholder="e.g. English" />
                </div>
                <div>
                  <label style={lbl}>CEFR Level</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={lang.level} onChange={e => updateLang(i, 'level', e.target.value)}>
                    <option value="">Select…</option>
                    {CEFR_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Certificate (optional)</label>
                  <input style={inp} value={lang.certificate} onChange={e => updateLang(i, 'certificate', e.target.value)} placeholder="e.g. IELTS" />
                </div>
                <div>
                  <label style={lbl}>Score (optional)</label>
                  <input style={inp} value={lang.score} onChange={e => updateLang(i, 'score', e.target.value)} placeholder="e.g. 8.5" />
                </div>
                <div>
                  <label style={lbl}>Test Date (optional)</label>
                  <input style={inp} type="date" value={lang.test_date} onChange={e => updateLang(i, 'test_date', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addLang} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#475569', fontFamily: 'inherit', width: '100%', justifyContent: 'center' }}>
            <Plus size={14} /> Add Language
          </button>
          <SaveCancelRow onCancel={onCancel} saving={saving} />
        </form>
      ) : (
        <div>
          {profile.languages && profile.languages.length > 0 ? (
            profile.languages.map((lang, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0a1628' }}>{lang.name}</span>
                  {lang.level && <span style={{ fontSize: '12px', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '50px', fontWeight: 600 }}>{lang.level}</span>}
                </div>
                {lang.certificate && <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>{lang.certificate}{lang.score ? ` — ${lang.score}` : ''}{lang.test_date ? ` (${lang.test_date})` : ''}</div>}
              </div>
            ))
          ) : (
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>No languages added yet.</p>
          )}
        </div>
      )}
    </div>
  )
}

function ProfessionalSection({ profile, editing, onEdit, onCancel, onSave, saving }: SectionProps) {
  const [experience, setExperience] = useState(profile.years_work_experience?.toString() ?? '0')
  const [sector, setSector] = useState(profile.professional_sector ?? '')
  const [skills, setSkills] = useState<string[]>(profile.skills ?? [])
  const [portfolioUrl, setPortfolioUrl] = useState(profile.portfolio_url ?? '')
  const [certs, setCerts] = useState<Certification[]>(profile.certifications ?? [])

  useEffect(() => {
    if (editing) {
      setExperience(profile.years_work_experience?.toString() ?? '0')
      setSector(profile.professional_sector ?? '')
      setSkills(profile.skills ?? [])
      setPortfolioUrl(profile.portfolio_url ?? '')
      setCerts(profile.certifications ?? [])
    }
  }, [editing, profile])

  function addCert() {
    setCerts(prev => [...prev, { name: '', issuer: '', date: '', expiry: '' }])
  }

  function updateCert(i: number, field: keyof Certification, value: string) {
    setCerts(prev => prev.map((c, j) => j === i ? { ...c, [field]: value } : c))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await onSave({ years_work_experience: parseInt(experience) || 0, professional_sector: sector || null, skills: skills.length ? skills : null, portfolio_url: portfolioUrl || null, certifications: certs.filter(c => c.name) as unknown as Certification[] })
  }

  return (
    <div style={sectionCard}>
      <div style={sectionHeader}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0a1628' }}>Professional</h2>
        {!editing && <EditBtn onClick={onEdit} />}
      </div>
      {editing ? (
        <form onSubmit={handleSave}>
          <div style={grid2}>
            <div>
              <label style={lbl}>Years of Work Experience</label>
              <input style={inp} type="number" min="0" value={experience} onChange={e => setExperience(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Professional Sector</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={sector} onChange={e => setSector(e.target.value)}>
                <option value="">Select…</option>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <label style={lbl}>Skills</label>
            <TagInput values={skills} onChange={setSkills} />
          </div>
          <div style={{ marginTop: '16px' }}>
            <label style={lbl}>Portfolio URL</label>
            <input style={inp} type="url" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="https://your-portfolio.com" />
          </div>
          <div style={{ marginTop: '20px' }}>
            <label style={{ ...lbl, marginBottom: '10px' }}>Certifications</label>
            {certs.map((cert, i) => (
              <div key={i} style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Certification {i + 1}</span>
                  <button type="button" onClick={() => setCerts(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={16} /></button>
                </div>
                <div style={grid2}>
                  <div><label style={lbl}>Name</label><input style={inp} value={cert.name} onChange={e => updateCert(i, 'name', e.target.value)} placeholder="e.g. AWS Solutions Architect" /></div>
                  <div><label style={lbl}>Issuer</label><input style={inp} value={cert.issuer} onChange={e => updateCert(i, 'issuer', e.target.value)} placeholder="e.g. Amazon" /></div>
                  <div><label style={lbl}>Date</label><input style={inp} type="date" value={cert.date} onChange={e => updateCert(i, 'date', e.target.value)} /></div>
                  <div><label style={lbl}>Expiry</label><input style={inp} type="date" value={cert.expiry} onChange={e => updateCert(i, 'expiry', e.target.value)} /></div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addCert} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#475569', fontFamily: 'inherit', width: '100%', justifyContent: 'center' }}>
              <Plus size={14} /> Add Certification
            </button>
          </div>
          <SaveCancelRow onCancel={onCancel} saving={saving} />
        </form>
      ) : (
        <div>
          <FieldRow label="Years of Experience" value={`${profile.years_work_experience ?? 0} year${(profile.years_work_experience ?? 0) !== 1 ? 's' : ''}`} />
          <FieldRow label="Sector" value={profile.professional_sector} />
          <FieldRow label="Portfolio" value={profile.portfolio_url ? <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" style={{ color: '#d4a017', textDecoration: 'none' }}>{profile.portfolio_url}</a> : null} />
          <div style={{ padding: '10px 0' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Skills</div>
            {profile.skills && profile.skills.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {profile.skills.map((s, i) => <span key={i} style={{ backgroundColor: '#fef9e7', border: '1px solid #d4a017', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 500 }}>{s}</span>)}
              </div>
            ) : <span style={{ color: '#94a3b8', fontSize: '14px' }}>Not set</span>}
          </div>
          {profile.certifications && profile.certifications.length > 0 && (
            <div style={{ padding: '10px 0' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Certifications</div>
              {profile.certifications.map((c, i) => <div key={i} style={{ fontSize: '13px', color: '#0a1628', marginBottom: '2px' }}>{c.name}{c.issuer ? ` — ${c.issuer}` : ''}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DocumentsSection({ profile, editing, onEdit, onCancel, onSave, saving }: SectionProps) {
  const [hasPassport, setHasPassport] = useState(profile.has_passport)
  const [passportExpiry, setPassportExpiry] = useState(profile.passport_expiry ?? '')
  const [hasTranscripts, setHasTranscripts] = useState(profile.has_transcripts)
  const [recLetters, setRecLetters] = useState(profile.recommendation_letters_count?.toString() ?? '0')
  const [volunteerHours, setVolunteerHours] = useState(profile.volunteer_hours?.toString() ?? '0')

  useEffect(() => {
    if (editing) {
      setHasPassport(profile.has_passport)
      setPassportExpiry(profile.passport_expiry ?? '')
      setHasTranscripts(profile.has_transcripts)
      setRecLetters(profile.recommendation_letters_count?.toString() ?? '0')
      setVolunteerHours(profile.volunteer_hours?.toString() ?? '0')
    }
  }, [editing, profile])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await onSave({ has_passport: hasPassport, passport_expiry: hasPassport && passportExpiry ? passportExpiry : null, has_transcripts: hasTranscripts, recommendation_letters_count: parseInt(recLetters) || 0, volunteer_hours: parseInt(volunteerHours) || 0 })
  }

  const checkboxLabel: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#0a1628', marginBottom: '12px' }

  return (
    <div style={sectionCard}>
      <div style={sectionHeader}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0a1628' }}>Documents & Achievements</h2>
        {!editing && <EditBtn onClick={onEdit} />}
      </div>
      {editing ? (
        <form onSubmit={handleSave}>
          <label style={checkboxLabel}>
            <input type="checkbox" checked={hasPassport} onChange={e => setHasPassport(e.target.checked)} />
            I have a valid passport
          </label>
          {hasPassport && (
            <div style={{ marginBottom: '16px', marginLeft: '24px' }}>
              <label style={lbl}>Passport Expiry Date</label>
              <input style={{ ...inp, maxWidth: '220px' }} type="date" value={passportExpiry} onChange={e => setPassportExpiry(e.target.value)} />
            </div>
          )}
          <label style={checkboxLabel}>
            <input type="checkbox" checked={hasTranscripts} onChange={e => setHasTranscripts(e.target.checked)} />
            I have official transcripts
          </label>
          <div style={grid2}>
            <div>
              <label style={lbl}>Recommendation Letters</label>
              <input style={inp} type="number" min="0" value={recLetters} onChange={e => setRecLetters(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Volunteer Hours</label>
              <input style={inp} type="number" min="0" value={volunteerHours} onChange={e => setVolunteerHours(e.target.value)} />
            </div>
          </div>
          <SaveCancelRow onCancel={onCancel} saving={saving} />
        </form>
      ) : (
        <div>
          <FieldRow label="Passport" value={profile.has_passport ? `Valid${profile.passport_expiry ? ` (expires ${profile.passport_expiry})` : ''}` : 'No'} />
          <FieldRow label="Transcripts" value={profile.has_transcripts ? 'Available' : 'No'} />
          <FieldRow label="Recommendation Letters" value={`${profile.recommendation_letters_count ?? 0}`} />
          <FieldRow label="Volunteer Hours" value={`${profile.volunteer_hours ?? 0} hours`} />
        </div>
      )}
    </div>
  )
}

function PreferencesSection({ profile, editing, onEdit, onCancel, onSave, saving }: SectionProps) {
  const [oppTypes, setOppTypes] = useState<string[]>(profile.opportunity_types_interest ?? [])
  const [targetCountries, setTargetCountries] = useState<string[]>(profile.target_countries ?? [])
  const [excludedCountries, setExcludedCountries] = useState<string[]>(profile.excluded_countries ?? [])
  const [maxFund, setMaxFund] = useState(profile.max_self_fund_usd?.toString() ?? '')
  const [format, setFormat] = useState(profile.preferred_format ?? '')
  const [notifInstant, setNotifInstant] = useState(profile.notification_instant)
  const [notifDigest, setNotifDigest] = useState(profile.notification_digest)
  const [notifReminders, setNotifReminders] = useState(profile.notification_reminders)

  useEffect(() => {
    if (editing) {
      setOppTypes(profile.opportunity_types_interest ?? [])
      setTargetCountries(profile.target_countries ?? [])
      setExcludedCountries(profile.excluded_countries ?? [])
      setMaxFund(profile.max_self_fund_usd?.toString() ?? '')
      setFormat(profile.preferred_format ?? '')
      setNotifInstant(profile.notification_instant)
      setNotifDigest(profile.notification_digest)
      setNotifReminders(profile.notification_reminders)
    }
  }, [editing, profile])

  function toggleType(type: string) {
    setOppTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await onSave({ opportunity_types_interest: oppTypes.length ? oppTypes : null, target_countries: targetCountries.length ? targetCountries : null, excluded_countries: excludedCountries.length ? excludedCountries : null, max_self_fund_usd: maxFund ? parseInt(maxFund) : null, preferred_format: format || null, notification_instant: notifInstant, notification_digest: notifDigest, notification_reminders: notifReminders })
  }

  const toggleStyle = (on: boolean): React.CSSProperties => ({
    width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background-color 0.2s', backgroundColor: on ? '#d4a017' : '#e2e8f0',
  })

  return (
    <div style={sectionCard}>
      <div style={sectionHeader}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0a1628' }}>Preferences</h2>
        {!editing && <EditBtn onClick={onEdit} />}
      </div>
      {editing ? (
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '20px' }}>
            <label style={lbl}>Opportunity Types I&apos;m Interested In</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px' }}>
              {OPPORTUNITY_TYPES.map(type => {
                const selected = oppTypes.includes(type)
                return (
                  <button key={type} type="button" onClick={() => toggleType(type)} style={{ padding: '8px 12px', borderRadius: '8px', border: `2px solid ${selected ? '#d4a017' : '#e2e8f0'}`, backgroundColor: selected ? '#fef9e7' : '#ffffff', color: '#0a1628', fontSize: '12px', fontWeight: selected ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left' }}>
                    <span style={{ width: '14px', height: '14px', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? '#d4a017' : '#e2e8f0' }}>
                      {selected && <Check size={9} color="#fff" />}
                    </span>
                    {type}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={lbl}>Target Countries</label>
            <CountryMultiSelect values={targetCountries} onChange={setTargetCountries} placeholder="Add target country…" />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={lbl}>Excluded Countries</label>
            <CountryMultiSelect values={excludedCountries} onChange={setExcludedCountries} placeholder="Add excluded country…" />
          </div>
          <div style={{ ...grid2, marginBottom: '16px' }}>
            <div>
              <label style={lbl}>Max Self-Fund (USD)</label>
              <input style={inp} type="number" min="0" value={maxFund} onChange={e => setMaxFund(e.target.value)} placeholder="e.g. 1000" />
            </div>
            <div>
              <label style={lbl}>Preferred Format</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={format} onChange={e => setFormat(e.target.value)}>
                <option value="">Any format</option>
                {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <label style={{ ...lbl, marginBottom: '10px' }}>Notifications</label>
            {([['notification_instant', 'Instant alerts', notifInstant, setNotifInstant] as const, ['notification_digest', 'Weekly digest', notifDigest, setNotifDigest] as const, ['notification_reminders', 'Deadline reminders', notifReminders, setNotifReminders] as const]).map(([, label, val, setter]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '14px', color: '#0a1628' }}>{label}</span>
                <button type="button" onClick={() => setter(!val)} style={toggleStyle(val)}>
                  <span style={{ position: 'absolute', top: '3px', left: val ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#ffffff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                </button>
              </div>
            ))}
          </div>
          <SaveCancelRow onCancel={onCancel} saving={saving} />
        </form>
      ) : (
        <div>
          <div style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Opportunity Types</div>
            {profile.opportunity_types_interest && profile.opportunity_types_interest.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {profile.opportunity_types_interest.map((t, i) => <span key={i} style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: '50px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>{t}</span>)}
              </div>
            ) : <span style={{ color: '#94a3b8', fontSize: '14px' }}>Not set</span>}
          </div>
          <FieldRow label="Target Countries" value={profile.target_countries?.join(', ')} />
          <FieldRow label="Excluded Countries" value={profile.excluded_countries?.join(', ')} />
          <FieldRow label="Max Self-Fund" value={profile.max_self_fund_usd ? `$${profile.max_self_fund_usd.toLocaleString()}` : null} />
          <FieldRow label="Preferred Format" value={profile.preferred_format} />
        </div>
      )}
    </div>
  )
}

// ─── Notifications Section ──────────────────────────────────────────────────

interface NotifSectionProps {
  profile: Profile
  onUpdate: (patch: Partial<Profile>) => void
}

function NotificationsSection({ profile, onUpdate }: NotifSectionProps) {
  const [instant, setInstant] = useState(profile.notification_instant)
  const [digest, setDigest] = useState(profile.notification_digest)
  const [reminders, setReminders] = useState(profile.notification_reminders)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    setInstant(profile.notification_instant)
    setDigest(profile.notification_digest)
    setReminders(profile.notification_reminders)
  }, [profile])

  async function toggle(
    field: 'notification_instant' | 'notification_digest' | 'notification_reminders',
    next: boolean,
  ) {
    setSaving(field)
    const sb = createClient()
    await sb.from('profiles').update({ [field]: next }).eq('id', profile.id)
    onUpdate({ [field]: next })
    setSaving(null)
  }

  const toggleStyle = (on: boolean, busy: boolean): React.CSSProperties => ({
    width: '44px', height: '24px', borderRadius: '12px', border: 'none',
    cursor: busy ? 'wait' : 'pointer', position: 'relative', flexShrink: 0,
    transition: 'background-color 0.2s', backgroundColor: on ? '#d4a017' : '#e2e8f0',
    opacity: busy ? 0.7 : 1,
  })

  const knobStyle = (on: boolean): React.CSSProperties => ({
    position: 'absolute', top: '3px', left: on ? '23px' : '3px',
    width: '18px', height: '18px', borderRadius: '50%',
    backgroundColor: '#ffffff', transition: 'left 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
  })

  const items: {
    field: 'notification_instant' | 'notification_digest' | 'notification_reminders'
    label: string
    description: string
    value: boolean
    setter: (v: boolean) => void
  }[] = [
    {
      field: 'notification_instant',
      label: 'Instant match alerts',
      description: 'Get notified immediately when a new opportunity matches your profile at 85% or higher.',
      value: instant,
      setter: setInstant,
    },
    {
      field: 'notification_digest',
      label: 'Weekly digest',
      description: 'Receive a curated digest of new opportunities every Tuesday.',
      value: digest,
      setter: setDigest,
    },
    {
      field: 'notification_reminders',
      label: 'Deadline reminders',
      description: 'Get reminded 30, 14, 7, and 2 days before tracked opportunity deadlines.',
      value: reminders,
      setter: setReminders,
    },
  ]

  return (
    <div style={sectionCard}>
      <div style={{ ...sectionHeader, marginBottom: '4px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0a1628' }}>Notification Preferences</h2>
      </div>
      {items.map(({ field, label, description, value, setter }) => {
        const busy = saving === field
        return (
          <div
            key={field}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid #f1f5f9', gap: '16px' }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0a1628' }}>{label}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: 1.5 }}>{description}</div>
            </div>
            <button
              type="button"
              disabled={!!saving}
              onClick={() => {
                const next = !value
                setter(next)
                toggle(field, next)
              }}
              style={toggleStyle(value, busy)}
            >
              <span style={knobStyle(value)} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [referredCount, setReferredCount] = useState(0)
  const [referralCopied, setReferralCopied] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      if (p) {
        const normalized = {
          ...p,
          languages: (Array.isArray(p.languages) ? p.languages : []) as Language[],
          certifications: (Array.isArray(p.certifications) ? p.certifications : []) as Certification[],
        }
        setProfile(normalized as Profile)

        // Fetch referral count
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('referred_by', data.user.id)
        setReferredCount(count ?? 0)
      }
      setLoading(false)
    })
  }, [router])

  async function saveSection(updates: Partial<Profile>) {
    if (!profile) return
    setSaving(true)
    setSaveError('')
    const supabase = createClient()
    const merged = { ...profile, ...updates }
    const pct = calculateCompletionPct(merged as unknown as ProfileData)
    const { error } = await supabase.from('profiles').update({ ...updates, profile_complete_pct: pct }).eq('id', profile.id)
    if (error) { setSaveError(error.message); setSaving(false); return }
    setProfile({ ...merged, profile_complete_pct: pct })
    setEditingSection(null)
    setSaving(false)
  }

  function openEdit(section: string) {
    setSaveError('')
    setEditingSection(section)
  }

  function cancelEdit() {
    setSaveError('')
    setEditingSection(null)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#475569' }}>Loading…</div>
  if (!profile) return null

  const completion = profile.profile_complete_pct ?? 0
  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ')

  function handleNotificationUpdate(patch: Partial<Profile>) {
    setProfile(prev => prev ? { ...prev, ...patch } : prev)
  }

  const sectionProps = (id: string) => ({
    profile,
    editing: editingSection === id,
    onEdit: () => openEdit(id),
    onCancel: cancelEdit,
    onSave: saveSection,
    saving,
  })

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0a1628', margin: '0 0 4px' }}>My Profile</h1>
          <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>Complete your profile to unlock the best opportunity matches.</p>
        </div>

        {/* Completion bar */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div>
              {displayName && <div style={{ fontWeight: 700, fontSize: '16px', color: '#0a1628' }}>{displayName}</div>}
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#0a1628' }}>Profile completion</span>
            </div>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#d4a017' }}>{completion}%</span>
          </div>
          <div style={{ width: '100%', height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{ width: `${completion}%`, height: '100%', backgroundColor: completion >= 80 ? '#15803d' : completion >= 50 ? '#d4a017' : '#f59e0b', borderRadius: '5px', transition: 'width 0.5s ease' }} />
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 0' }}>
            {completion === 100 ? '🎉 Your profile is complete!' : completion >= 50 ? 'Almost there — fill in the remaining sections.' : 'Add more information to get better opportunity matches.'}
          </p>
        </div>

        {saveError && (
          <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', fontSize: '13px', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>
            {saveError}
          </div>
        )}

        <BasicInfoSection {...sectionProps('basic')} />
        <EducationSection {...sectionProps('education')} />
        <LanguagesSection {...sectionProps('languages')} />
        <ProfessionalSection {...sectionProps('professional')} />
        <DocumentsSection {...sectionProps('documents')} />
        <PreferencesSection {...sectionProps('preferences')} />
        <NotificationsSection profile={profile} onUpdate={handleNotificationUpdate} />

        {/* Share & Earn */}
        {profile.referral_code && (() => {
          const referralLink = `https://tancglobal.com/r/${profile.referral_code}`
          function copyLink() {
            navigator.clipboard.writeText(referralLink).then(() => {
              setReferralCopied(true)
              setTimeout(() => setReferralCopied(false), 2000)
            })
          }
          return (
            <div style={sectionCard}>
              <div style={{ ...sectionHeader, marginBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: '#0a1628' }}>Share & Earn</h2>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Invite friends to join TANC and track how many you've brought on board.</p>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                <div style={{ flex: 1, padding: '14px 16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#d4a017' }}>{referredCount}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Friends signed up</div>
                </div>
                <div style={{ flex: 1, padding: '14px 16px', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#15803d' }}>∞</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>No limits</div>
                </div>
              </div>

              {/* Referral link */}
              <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your referral link</div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ flex: 1, padding: '10px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                  {referralLink}
                </div>
                <button
                  onClick={copyLink}
                  style={{
                    flexShrink: 0, padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                    border: '1px solid #e2e8f0', cursor: 'pointer', fontFamily: 'inherit',
                    backgroundColor: referralCopied ? '#f0fdf4' : '#fff',
                    color: referralCopied ? '#15803d' : '#d4a017',
                    transition: 'all 0.15s',
                  }}
                >
                  {referralCopied ? '✓ Copied!' : 'Copy link'}
                </button>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px', lineHeight: 1.5 }}>
                Share this link with friends. When they sign up, you both benefit from growing the TANC community.
              </p>
            </div>
          )
        })()}

      </div>
    </div>
  )
}
