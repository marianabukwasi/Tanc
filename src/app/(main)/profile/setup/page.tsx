'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

// ─── Data ─────────────────────────────────────────────────────────────────────

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Australia',
  'Austria','Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Bolivia',
  'Bosnia and Herzegovina','Brazil','Bulgaria','Cameroon','Canada','Chile',
  'China','Colombia','Congo (DRC)','Costa Rica','Croatia','Cuba',
  'Czech Republic','Denmark','Ecuador','Egypt','El Salvador','Ethiopia',
  'Finland','France','Georgia','Germany','Ghana','Greece','Guatemala',
  'Honduras','Hungary','India','Indonesia','Iran','Iraq','Ireland','Israel',
  'Italy','Ivory Coast','Jamaica','Japan','Jordan','Kazakhstan','Kenya',
  'Kuwait','Lebanon','Libya','Malaysia','Mexico','Morocco','Mozambique',
  'Myanmar','Nepal','Netherlands','New Zealand','Nigeria','Norway','Pakistan',
  'Palestine','Panama','Paraguay','Peru','Philippines','Poland','Portugal',
  'Qatar','Romania','Russia','Rwanda','Saudi Arabia','Senegal','Serbia',
  'Sierra Leone','Singapore','Somalia','South Africa','South Korea',
  'South Sudan','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria',
  'Tanzania','Thailand','Togo','Tunisia','Turkey','Uganda','Ukraine',
  'United Arab Emirates','United Kingdom','United States','Uruguay',
  'Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
].sort()

const EDUCATION_LEVELS = ['High School', 'Undergraduate', 'Masters', 'PhD', 'Professional']
const LANGUAGES = ['English', 'French', 'German', 'Spanish', 'Portuguese', 'Arabic', 'Swahili', 'Other']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcCompletion(fields: {
  nationality: string
  country_of_residence: string
  education_level: string
  field_of_study: string
  languages: string[]
  age: string
}): number {
  let filled = 0
  if (fields.nationality) filled++
  if (fields.country_of_residence) filled++
  if (fields.education_level) filled++
  if (fields.field_of_study.trim()) filled++
  if (fields.languages.length > 0) filled++
  if (fields.age && parseInt(fields.age) > 0) filled++
  return Math.round((filled / 6) * 100)
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  height: '48px',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '0 16px',
  fontSize: '15px',
  color: '#0a1628',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  fontFamily: 'inherit',
  cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  ...selectStyle,
  cursor: 'text',
}

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#0a1628',
  display: 'block',
  marginBottom: '6px',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfileSetupPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [nationality, setNationality] = useState('')
  const [countryOfResidence, setCountryOfResidence] = useState('')
  const [educationLevel, setEducationLevel] = useState('')
  const [fieldOfStudy, setFieldOfStudy] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [age, setAge] = useState('')

  const completion = calcCompletion({ nationality, country_of_residence: countryOfResidence, education_level: educationLevel, field_of_study: fieldOfStudy, languages, age })

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { router.push('/signin'); return }
      setUser(data.user)

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', data.user.id).single()
      if (profile) {
        setNationality(profile.nationality ?? '')
        setCountryOfResidence(profile.country_of_residence ?? '')
        setEducationLevel(profile.education_level ?? '')
        setFieldOfStudy(profile.field_of_study ?? '')
        setLanguages(Array.isArray(profile.languages) ? profile.languages : [])
        setAge(profile.age != null ? String(profile.age) : '')
      }
      setLoading(false)
    }
    init()
  }, [router])

  function toggleLanguage(lang: string) {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError('')
    const profileComplete = calcCompletion({ nationality, country_of_residence: countryOfResidence, education_level: educationLevel, field_of_study: fieldOfStudy, languages, age })

    try {
      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        nationality,
        country_of_residence: countryOfResidence,
        education_level: educationLevel,
        field_of_study: fieldOfStudy,
        languages,
        age: age ? parseInt(age) : null,
        profile_complete: profileComplete,
      })
      if (upsertError) throw upsertError
      setSuccess(true)
      setTimeout(() => router.push('/browse'), 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ color: '#475569' }}>Loading…</div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        {/* Header */}
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0a1628', margin: '0 0 8px' }}>
          Complete your profile
        </h1>
        <p style={{ color: '#475569', fontSize: '15px', margin: '0 0 28px' }}>
          Help us match you to the right opportunities.
        </p>

        {/* Progress bar */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0a1628' }}>Profile completion</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#d4a017' }}>{completion}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${completion}%`, height: '100%', backgroundColor: '#d4a017', borderRadius: '4px', transition: 'width 0.4s ease' }} />
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Nationality */}
          <div>
            <label style={labelStyle}>Nationality</label>
            <select value={nationality} onChange={(e) => setNationality(e.target.value)} style={selectStyle}>
              <option value="">Select your nationality</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Country of residence */}
          <div>
            <label style={labelStyle}>Country of Residence</label>
            <select value={countryOfResidence} onChange={(e) => setCountryOfResidence(e.target.value)} style={selectStyle}>
              <option value="">Select country of residence</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Education level */}
          <div>
            <label style={labelStyle}>Education Level</label>
            <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} style={selectStyle}>
              <option value="">Select education level</option>
              {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Field of study */}
          <div>
            <label style={labelStyle}>Field of Study</label>
            <input
              type="text"
              value={fieldOfStudy}
              onChange={(e) => setFieldOfStudy(e.target.value)}
              placeholder="e.g. Computer Science, Public Health…"
              style={inputStyle}
            />
          </div>

          {/* Age */}
          <div>
            <label style={labelStyle}>Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Your age"
              min={14}
              max={99}
              style={inputStyle}
            />
          </div>

          {/* Languages */}
          <div>
            <label style={labelStyle}>Languages Spoken</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
              {LANGUAGES.map((lang) => {
                const selected = languages.includes(lang)
                return (
                  <button
                    type="button"
                    key={lang}
                    onClick={() => toggleLanguage(lang)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '50px',
                      border: `1.5px solid ${selected ? '#d4a017' : '#e2e8f0'}`,
                      backgroundColor: selected ? '#fef9e7' : '#ffffff',
                      color: selected ? '#d4a017' : '#475569',
                      fontSize: '13px',
                      fontWeight: selected ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: 'inherit',
                    }}
                  >
                    {lang}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', fontSize: '13px', padding: '10px 14px', borderRadius: '8px' }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '13px', padding: '10px 14px', borderRadius: '8px' }}>
              Profile saved! Redirecting…
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              height: '52px',
              backgroundColor: saving ? '#e2c76a' : '#d4a017',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              fontFamily: 'inherit',
            }}
          >
            {saving ? 'Saving…' : 'Complete My Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
