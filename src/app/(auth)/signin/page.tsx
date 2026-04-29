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

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      router.push('/browse')
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
            Welcome back
          </h1>
          <p style={{ color: '#475569', fontSize: '15px', margin: '0 0 32px' }}>
            Sign in to your TANC account
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#0a1628' }}>Password</label>
                <a href="#" style={{ fontSize: '13px', color: '#d4a017', textDecoration: 'none' }}>Forgot password?</a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Your password"
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
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p style={{ color: '#475569', fontSize: '14px', marginTop: '24px', textAlign: 'center' }}>
            No account?{' '}
            <a href="/signup" style={{ color: '#d4a017', fontWeight: 600, textDecoration: 'none' }}>Sign up free</a>
          </p>
        </div>
      </div>

      {/* ── Right ─────────────────────────────────────────────────────────── */}
      <AuthRightPanel />
    </div>
  )
}
