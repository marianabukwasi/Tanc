'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const TYPES = [
  '', 'Scholarships', 'Fellowships', 'Internships', 'Conferences',
  'Competitions', 'Grants', 'Writing Retreats', 'Sports Events',
]

interface OppPreview {
  id: string
  title: string
  organization: string | null
  country: string | null
  type: string
  deadline: string | null
  funding: string | null
  url: string
}

function fmtDeadline(d: string | null): string {
  if (!d) return 'Rolling / Open'
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'Closed'
  if (days === 0) return 'Closes today'
  if (days <= 7) return `${days}d left`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function PreviewCard({ o, isDark }: { o: OppPreview; isDark: boolean }) {
  const colors = {
    bg: isDark ? '#0a1628' : '#ffffff',
    border: isDark ? '#1e3a5f' : '#e2e8f0',
    text: isDark ? '#f1f5f9' : '#0a1628',
    sub: isDark ? '#94a3b8' : '#64748b',
    tag: isDark ? '#1e3a5f' : '#fef9ee',
  }
  const days = o.deadline ? Math.ceil((new Date(o.deadline).getTime() - Date.now()) / 86400000) : null
  const urgent = days !== null && days >= 0 && days <= 7

  return (
    <a
      href={o.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'block', textDecoration: 'none', padding: '14px', marginBottom: '8px', border: `1px solid ${colors.border}`, borderRadius: '10px', background: colors.bg }}
    >
      {o.type && (
        <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '50px', background: colors.tag, color: '#1B2A6B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>{o.type}</span>
      )}
      <div style={{ fontSize: '14px', fontWeight: 700, color: colors.text, lineHeight: 1.35, marginBottom: '4px' }}>{o.title}</div>
      {o.organization && <div style={{ fontSize: '12px', color: colors.sub, marginBottom: '4px' }}>{o.organization}</div>}
      {o.country && <div style={{ fontSize: '12px', color: colors.sub, marginBottom: '6px' }}>{o.country}</div>}
      <div style={{ fontSize: '12px', color: urgent ? '#dc2626' : colors.sub, fontWeight: urgent ? 600 : 400 }}>
        Deadline: {fmtDeadline(o.deadline)}
      </div>
      {o.funding && (
        <div style={{ marginTop: '6px' }}>
          <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '50px', background: colors.tag, color: '#1B2A6B', border: '1px solid #1B2A6B' }}>{o.funding}</span>
        </div>
      )}
    </a>
  )
}

export default function WidgetDemoPage() {
  const [type,    setType]    = useState('')
  const [country, setCountry] = useState('')
  const [limit,   setLimit]   = useState('5')
  const [theme,   setTheme]   = useState('light')
  const [copied,  setCopied]  = useState(false)
  const [preview, setPreview] = useState<OppPreview[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)

  const isDark = theme === 'dark'

  const fetchPreview = useCallback(() => {
    setPreviewLoading(true)
    const params = new URLSearchParams({ limit, theme })
    if (type)    params.set('type', type)
    if (country) params.set('country', country)
    fetch(`/api/widget?${params}`)
      .then(r => r.json())
      .then(d => { setPreview(d.opps ?? []); setPreviewLoading(false) })
      .catch(() => setPreviewLoading(false))
  }, [type, country, limit, theme])

  useEffect(() => { fetchPreview() }, [fetchPreview])

  const base = typeof window !== 'undefined' ? window.location.origin : 'https://tancglobal.com'
  const attrs = [
    `src="${base}/widget.js"`,
    type    ? `data-tanc-type="${type}"`       : '',
    country ? `data-tanc-country="${country}"` : '',
    `data-tanc-limit="${limit}"`,
    `data-tanc-theme="${theme}"`,
  ].filter(Boolean).join('\n  ')

  const embedCode = `<script\n  ${attrs}\n><\/script>`

  function copyCode() {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px 80px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0a1628', marginBottom: '6px' }}>Embed Widget</h1>
      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '36px' }}>
        Add a live TANC opportunity feed to any website with one line of code.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '32px', alignItems: 'start' }}>

        {/* Config */}
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0a1628', marginBottom: '20px' }}>Configure</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Opportunity Type</span>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                style={{ height: '40px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', fontSize: '14px', color: '#0a1628', outline: 'none' }}
              >
                {TYPES.map(t => <option key={t} value={t}>{t || 'All types'}</option>)}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Country (optional)</span>
              <input
                type="text"
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="e.g. United States"
                style={{ height: '40px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', fontSize: '14px', color: '#0a1628', outline: 'none' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Number of Results (1–10)</span>
              <input
                type="number"
                min={1}
                max={10}
                value={limit}
                onChange={e => setLimit(e.target.value)}
                style={{ height: '40px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', fontSize: '14px', color: '#0a1628', outline: 'none' }}
              />
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Theme</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['light', 'dark'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '8px', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: '13px', fontWeight: 600,
                      border: `1px solid ${theme === t ? '#1B2A6B' : '#e2e8f0'}`,
                      backgroundColor: theme === t ? '#fef9ee' : '#fff',
                      color: theme === t ? '#1B2A6B' : '#64748b',
                    }}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Embed code */}
          <div style={{ marginTop: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0a1628' }}>Embed Code</span>
              <button
                onClick={copyCode}
                style={{
                  padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                  border: '1px solid #e2e8f0', backgroundColor: copied ? '#f0fdf4' : '#fff',
                  color: copied ? '#15803d' : '#475569', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <pre style={{ backgroundColor: '#0a1628', color: '#94a3b8', borderRadius: '10px', padding: '16px', fontSize: '11px', overflowX: 'auto', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              <code>{embedCode}</code>
            </pre>
          </div>

          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '12px' }}>
            Paste this tag anywhere in your HTML. No API key required.{' '}
            <Link href="/api/widget" style={{ color: '#1B2A6B', textDecoration: 'none' }}>View raw API →</Link>
          </p>
        </div>

        {/* Preview */}
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0a1628', marginBottom: '20px' }}>Live Preview</h2>
          <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: isDark ? '#0a1628' : '#f8fafc' }}>
            {previewLoading ? (
              <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '32px 0' }}>Loading preview…</div>
            ) : preview.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '32px 0' }}>No opportunities found.</div>
            ) : (
              <>
                {preview.map(o => <PreviewCard key={o.id} o={o} isDark={isDark} />)}
                <div style={{ textAlign: 'center', paddingTop: '8px', borderTop: `1px solid ${isDark ? '#1e3a5f' : '#e2e8f0'}` }}>
                  <Link
                    href="/opportunities"
                    style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b', textDecoration: 'none' }}
                  >
                    Powered by <strong style={{ color: '#1B2A6B' }}>TANC</strong> — Global Opportunity Platform
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
