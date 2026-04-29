'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import AuthRightPanel from '@/components/AuthRightPanel'

const inputStyle: React.CSSProperties = {
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
}

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (authError) throw authError
      if (!data.user) throw new Error('Signup failed — please try again.')

      // Create profile row (ignore duplicate errors)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, email, full_name: fullName, profile_complete: 0 })
      if (profileError && profileError.code !== '23505') {
        console.warn('Profile insert error:', profileError.message)
      }

      router.push('/profile/setup')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Left ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px 48px', backgroundColor: '#ffffff', overflowY: 'auto' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginBottom: '48px' }}>
          <Star size={14} fill="#d4a017" color="#d4a017" />
          <span style={{ fontWeight: 700, color: '#0a1628', fontSize: '18px' }}>TANC</span>
        </a>

        <div style={{ maxWidth: '400px', width: '100%' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0a1628', margin: '0 0 8px' }}>
            Join TANC for free
          </h1>
          <p style={{ color: '#475569', fontSize: '15px', margin: '0 0 32px' }}>
            Discover opportunities matched to your profile
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0a1628', display: 'block', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Your full name"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0a1628', display: 'block', marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0a1628', display: 'block', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Min. 8 characters"
                minLength={8}
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', fontSize: '13px', padding: '10px 14px', borderRadius: '8px' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '48px',
                backgroundColor: loading ? '#e2c76a' : '#d4a017',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '8px',
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Creating account…' : 'Sign Up'}
            </button>
          </form>

          <p style={{ color: '#475569', fontSize: '14px', marginTop: '24px', textAlign: 'center' }}>
            Already have an account?{' '}
            <a href="/signin" style={{ color: '#d4a017', fontWeight: 600, textDecoration: 'none' }}>Sign in</a>
          </p>
        </div>
      </div>

      {/* ── Right ─────────────────────────────────────────────────────────── */}
      <AuthRightPanel />
    </div>
  )
}
