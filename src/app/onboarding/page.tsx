'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { calculateCompletionPct } from '@/lib/profile'
import { COUNTRIES, EDUCATION_LEVELS, OPPORTUNITY_TYPES } from '@/lib/constants'

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '48px',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '0 14px',
  fontSize: '15px',
  color: '#0a1628',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  fontFamily: 'inherit',
}

function CountryDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [search, setSearch] = useState(value)
  const [open, setOpen] = useState(false)
  const filtered = COUNTRIES.filter(c => c.toLowerCase().includes(search.toLowerCase())).slice(0, 10)

  function select(country: string) {
    onChange(country)
    setSearch(country)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={search}
        onFocus={() => { setSearch(''); setOpen(true) }}
        onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search for your country…"
        style={inputStyle}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: '220px', overflowY: 'auto', marginTop: '4px',
        }}>
          {filtered.map(c => (
            <div
              key={c}
              onMouseDown={() => select(c)}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: '14px',
                color: c === value ? '#d4a017' : '#0a1628',
                backgroundColor: c === value ? '#fef9e7' : undefined,
                fontWeight: c === value ? 600 : 400,
              }}
              onMouseOver={e => { if (c !== value) e.currentTarget.style.backgroundColor = '#f8fafc' }}
              onMouseOut={e => { if (c !== value) e.currentTarget.style.backgroundColor = '' }}
            >
              {c}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [country, setCountry] = useState('')
  const [educationLevel, setEducationLevel] = useState('')
  const [opportunityTypes, setOpportunityTypes] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserId(data.user.id)
    })
  }, [router])

  function toggleType(type: string) {
    setOpportunityTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  async function handleSubmit() {
    if (!userId) return
    setSubmitting(true)
    setError('')
    const supabase = createClient()
    const profileData = {
      country_of_residence: country,
      nationalities: [country],
      education_level: educationLevel,
      opportunity_types_interest: opportunityTypes,
    }
    const pct = calculateCompletionPct(profileData)
    const { error: err } = await supabase
      .from('profiles')
      .update({ ...profileData, profile_complete_pct: pct })
      .eq('id', userId)
    if (err) {
      setError(err.message)
      setSubmitting(false)
      return
    }
    router.push('/dashboard')
  }

  const canNext1 = country.length > 0
  const canNext2 = educationLevel.length > 0
  const canSubmit = opportunityTypes.length > 0

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '88px', paddingBottom: '48px', paddingLeft: '24px', paddingRight: '24px' }}>
      {/* Logo */}
      <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginBottom: '40px' }}>
        <Star size={16} fill="#d4a017" color="#d4a017" />
        <span style={{ fontWeight: 800, color: '#0a1628', fontSize: '20px' }}>TANC</span>
      </a>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: n < step ? '#d4a017' : n === step ? '#0a1628' : '#e2e8f0',
              color: n <= step ? '#ffffff' : '#94a3b8',
              fontWeight: 700, fontSize: '13px',
            }}>
              {n < step ? <Check size={14} /> : n}
            </div>
            {n < 3 && <div style={{ width: '40px', height: '2px', backgroundColor: n < step ? '#d4a017' : '#e2e8f0' }} />}
          </div>
        ))}
      </div>

      {/* Card */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '520px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>

        {/* Step 1 */}
        {step === 1 && (
          <>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0a1628', margin: '0 0 8px' }}>
              What country are you from?
            </h1>
            <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 28px' }}>
              We use this to find opportunities open to you.
            </p>
            <CountryDropdown value={country} onChange={setCountry} />
            {country && (
              <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: '#fef9e7', border: '1px solid #d4a017', borderRadius: '8px', fontSize: '14px', color: '#0a1628', fontWeight: 600 }}>
                {country}
              </div>
            )}
            <button
              onClick={() => setStep(2)}
              disabled={!canNext1}
              style={{ marginTop: '32px', width: '100%', height: '48px', backgroundColor: canNext1 ? '#d4a017' : '#e2e8f0', color: canNext1 ? '#ffffff' : '#94a3b8', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: canNext1 ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
            >
              Continue
            </button>
          </>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0a1628', margin: '0 0 8px' }}>
              What is your current education level?
            </h1>
            <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 28px' }}>
              We use this to filter eligible opportunities for you.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {EDUCATION_LEVELS.map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEducationLevel(level)}
                  style={{
                    width: '100%', padding: '14px 18px', borderRadius: '10px', textAlign: 'left',
                    border: `2px solid ${educationLevel === level ? '#d4a017' : '#e2e8f0'}`,
                    backgroundColor: educationLevel === level ? '#fef9e7' : '#ffffff',
                    color: '#0a1628', fontSize: '15px', fontWeight: educationLevel === level ? 600 : 400,
                    cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  {level}
                  {educationLevel === level && <Check size={16} color="#d4a017" />}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button onClick={() => setStep(1)} style={{ flex: '0 0 auto', height: '48px', padding: '0 20px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canNext2}
                style={{ flex: 1, height: '48px', backgroundColor: canNext2 ? '#d4a017' : '#e2e8f0', color: canNext2 ? '#ffffff' : '#94a3b8', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: canNext2 ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0a1628', margin: '0 0 8px' }}>
              What are you looking for?
            </h1>
            <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 28px' }}>
              Select all that apply. You can update this later.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {OPPORTUNITY_TYPES.map(type => {
                const selected = opportunityTypes.includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    style={{
                      padding: '10px 14px', borderRadius: '8px', textAlign: 'left',
                      border: `2px solid ${selected ? '#d4a017' : '#e2e8f0'}`,
                      backgroundColor: selected ? '#fef9e7' : '#ffffff',
                      color: '#0a1628', fontSize: '13px', fontWeight: selected ? 600 : 400,
                      cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
                    }}
                  >
                    <span style={{
                      width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: selected ? '#d4a017' : '#e2e8f0',
                    }}>
                      {selected && <Check size={10} color="#ffffff" />}
                    </span>
                    {type}
                  </button>
                )
              })}
            </div>
            {error && (
              <div style={{ marginTop: '16px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', fontSize: '13px', padding: '10px 14px', borderRadius: '8px' }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
              <button onClick={() => setStep(2)} style={{ flex: '0 0 auto', height: '48px', padding: '0 20px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                style={{ flex: 1, height: '48px', backgroundColor: canSubmit ? '#d4a017' : '#e2e8f0', color: canSubmit ? '#ffffff' : '#94a3b8', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
              >
                {submitting ? 'Setting up your profile…' : 'Get Started'}
              </button>
            </div>
          </>
        )}
      </div>

      <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '24px' }}>
        You can update all of this later in your profile.
      </p>
    </div>
  )
}
