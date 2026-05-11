'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Check, ExternalLink, Send, Star } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Opportunity {
  id: string
  title: string
  organization: string
  country: string
  type: string
  website: string | null
  documents: string[] | null
  field: string | null
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface Reference {
  name: string
  email: string
}

interface AppState {
  currentStep: number
  documentsChecked: string[]
  personalStatement: string
  refs: Reference[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = [
  'Gather your documents',
  'Write your personal statement',
  'Get references',
  'Review your application',
  'Submit',
]

const DEFAULT_DOCS = [
  'Academic transcripts',
  'Passport or national ID copy',
  'Updated CV / Résumé',
  'Personal statement or motivation letter',
  'Letters of recommendation',
  'Language test scores (if required)',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderText(content: string) {
  // Render **bold** markdown inline
  return content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ApplyPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [opp, setOpp] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [savedBadge, setSavedBadge] = useState(false)

  const [appState, setAppState] = useState<AppState>({
    currentStep: 1,
    documentsChecked: [],
    personalStatement: '',
    refs: [{ name: '', email: '' }, { name: '', email: '' }],
  })

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputVal, setInputVal] = useState('')
  const [streaming, setStreaming] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthUser(data.user ?? null))
  }, [])

  // Load opportunity
  useEffect(() => {
    if (!id) return
    supabase
      .from('opportunities')
      .select('id, title, organization, country, type, website, documents, field')
      .eq('id', id)
      .eq('is_published', true)
      .eq('is_archived', false)
      .single()
      .then(({ data }) => {
        if (!data) { router.push('/browse'); return }
        setOpp(data as Opportunity)
        setLoading(false)
      })
  }, [id, router])

  // Load saved application
  useEffect(() => {
    if (!authUser || !id) return
    supabase
      .from('applications')
      .select('current_step, documents_checked, personal_statement, refs')
      .eq('user_id', authUser.id)
      .eq('opportunity_id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setSavedBadge(true)
        const row = data as {
          current_step: number | null
          documents_checked: string[] | null
          personal_statement: string | null
          refs: Reference[] | null
        }
        setAppState({
          currentStep: row.current_step ?? 1,
          documentsChecked: row.documents_checked ?? [],
          personalStatement: row.personal_statement ?? '',
          refs: row.refs ?? [{ name: '', email: '' }, { name: '', email: '' }],
        })
      })
  }, [authUser, id])

  // Set opening AI message once opportunity loads
  useEffect(() => {
    if (!opp) return
    setMessages([{
      role: 'assistant',
      content: `I will help you apply for **${opp.title}** by ${opp.organization}. Let us start with your documents. Do you have your academic transcripts ready?`,
    }])
  }, [opp])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Save progress
  async function saveProgress(state: AppState) {
    if (!authUser || !id) return
    try {
      await supabase.from('applications').upsert(
        {
          user_id: authUser.id,
          opportunity_id: id,
          current_step: state.currentStep,
          documents_checked: state.documentsChecked,
          personal_statement: state.personalStatement,
          refs: state.refs,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,opportunity_id' }
      )
      setSavedBadge(true)
    } catch {
      // applications table may not exist yet
    }
  }

  function updateState(updates: Partial<AppState>) {
    setAppState(prev => {
      const next = { ...prev, ...updates }
      saveProgress(next)
      return next
    })
  }

  function toggleDoc(doc: string) {
    const next = appState.documentsChecked.includes(doc)
      ? appState.documentsChecked.filter(d => d !== doc)
      : [...appState.documentsChecked, doc]
    updateState({ documentsChecked: next })
  }

  function updateRef(i: number, field: keyof Reference, value: string) {
    const next = appState.refs.map((r, idx) => idx === i ? { ...r, [field]: value } : r)
    updateState({ refs: next })
  }

  function goToStep(step: number) {
    updateState({ currentStep: step })
  }

  // Send chat message (SSE)
  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? inputVal).trim()
    if (!text || streaming || !opp) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages([...nextMessages, { role: 'assistant', content: '' }])
    setInputVal('')
    setStreaming(true)

    const oppCtx = `User is applying for: "${opp.title}" by ${opp.organization} (${opp.type}, ${opp.country}). Currently on Step ${appState.currentStep} of 5: "${STEP_LABELS[appState.currentStep - 1]}". Give specific, actionable advice for this exact opportunity.`

    try {
      const res = await fetch('/api/tanc-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, opportunityContext: oppCtx }),
      })

      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') break
          try {
            const parsed = JSON.parse(payload) as { text?: string }
            if (parsed.text) {
              assistantText += parsed.text
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = { role: 'assistant', content: assistantText }
                return copy
              })
            }
          } catch { /* skip malformed line */ }
        }
      }
    } catch {
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'assistant', content: 'Something went wrong. Please try again.' }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }

  // ─── Step content ─────────────────────────────────────────────────────────

  const docs = opp?.documents?.length ? opp.documents : DEFAULT_DOCS
  const checkedCount = appState.documentsChecked.length

  function renderStepContent() {
    switch (appState.currentStep) {
      case 1:
        return (
          <div>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px', lineHeight: 1.6 }}>
              Tick each document as you collect it. Ask the AI on the right if you are unsure what each should contain.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {docs.map(doc => {
                const on = appState.documentsChecked.includes(doc)
                return (
                  <button
                    key={doc}
                    onClick={() => toggleDoc(doc)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '11px 14px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                      backgroundColor: on ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${on ? '#86efac' : '#e2e8f0'}`,
                      transition: 'all 0.15s', width: '100%',
                    }}
                  >
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0,
                      backgroundColor: on ? '#16a34a' : '#ffffff',
                      border: `2px solid ${on ? '#16a34a' : '#cbd5e1'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {on && <Check size={12} color="#ffffff" />}
                    </div>
                    <span style={{ fontSize: '14px', color: on ? '#15803d' : '#334155', fontWeight: on ? 600 : 400 }}>
                      {doc}
                    </span>
                  </button>
                )
              })}
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '12px' }}>
              {checkedCount} of {docs.length} collected
            </p>
          </div>
        )

      case 2:
        return (
          <div>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px', lineHeight: 1.6 }}>
              Write your personal statement below. Use the AI for feedback, structure advice, and tailored suggestions for {opp?.title}.
            </p>
            <textarea
              value={appState.personalStatement}
              onChange={e => updateState({ personalStatement: e.target.value })}
              placeholder="Start writing your personal statement here..."
              style={{
                width: '100%', minHeight: '200px', padding: '12px', fontSize: '14px',
                lineHeight: 1.7, color: '#334155', border: '1px solid #e2e8f0',
                borderRadius: '8px', resize: 'vertical', fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box', backgroundColor: '#fafafa',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#d4a017' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0' }}
            />
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>{appState.personalStatement.length} characters</span>
              <button
                onClick={() => {
                  const prompt = appState.personalStatement.length > 50
                    ? `Please review my personal statement draft and give me specific feedback for applying to ${opp?.title}:\n\n${appState.personalStatement.slice(0, 500)}`
                    : `What should I write in my personal statement for ${opp?.title} by ${opp?.organization}? What are the key things to include?`
                  sendMessage(prompt)
                }}
                style={{
                  fontSize: '12px', fontWeight: 600, color: '#d4a017',
                  background: 'none', border: '1px solid #d4a017', borderRadius: '6px',
                  padding: '5px 12px', cursor: 'pointer',
                }}
              >
                Ask AI for feedback
              </button>
            </div>
          </div>
        )

      case 3:
        return (
          <div>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px', lineHeight: 1.6 }}>
              Add your referees below. Ask the AI for advice on who to approach and how to brief them.
            </p>
            {appState.refs.map((ref, i) => (
              <div key={i} style={{ marginBottom: '14px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Reference {i + 1}
                </p>
                <input
                  type="text"
                  placeholder="Full name"
                  value={ref.name}
                  onChange={e => updateRef(i, 'name', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '8px', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', backgroundColor: '#ffffff' }}
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={ref.email}
                  onChange={e => updateRef(i, 'email', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', backgroundColor: '#ffffff' }}
                />
              </div>
            ))}
            <button
              onClick={() => updateState({ refs: [...appState.refs, { name: '', email: '' }] })}
              style={{
                width: '100%', fontSize: '13px', color: '#64748b',
                background: 'none', border: '1px dashed #cbd5e1', borderRadius: '8px',
                padding: '10px', cursor: 'pointer',
              }}
            >
              + Add another reference
            </button>
          </div>
        )

      case 4:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {([
              {
                label: 'Documents',
                value: `${checkedCount} of ${docs.length} collected`,
                progress: docs.length ? checkedCount / docs.length : 0,
                color: '#16a34a',
              },
              {
                label: 'Personal Statement',
                value: appState.personalStatement
                  ? appState.personalStatement.slice(0, 100) + (appState.personalStatement.length > 100 ? '…' : '')
                  : 'Not written yet',
                progress: appState.personalStatement.length > 50 ? 1 : 0,
                color: '#d4a017',
              },
              {
                label: 'References',
                value: appState.refs.filter(r => r.name).map(r => r.name).join(', ') || 'None added yet',
                progress: Math.min(appState.refs.filter(r => r.name && r.email).length / 2, 1),
                color: '#7c3aed',
              },
            ] as const).map(item => (
              <div key={item.label} style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{item.label}</p>
                <p style={{ fontSize: '13px', color: '#334155', marginBottom: '10px', lineHeight: 1.5 }}>{item.value}</p>
                <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px' }}>
                  <div style={{ height: '4px', width: `${item.progress * 100}%`, backgroundColor: item.color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            ))}
            <div style={{ padding: '12px 14px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <p style={{ fontSize: '13px', color: '#92400e', lineHeight: 1.6 }}>
                Ask the AI to do a final review of your application before you submit.
              </p>
            </div>
          </div>
        )

      case 5:
        return (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#dcfce7',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <Check size={32} color="#16a34a" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0a1628', marginBottom: '10px' }}>
              You are ready to apply!
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.7, marginBottom: '28px' }}>
              Click below to go to the official {opp?.organization} application portal.
            </p>
            {opp?.website ? (
              <a
                href={opp.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '14px 32px', backgroundColor: '#d4a017', color: '#ffffff',
                  borderRadius: '10px', fontSize: '16px', fontWeight: 700, textDecoration: 'none',
                }}
              >
                Apply Now <ExternalLink size={16} />
              </a>
            ) : (
              <p style={{ fontSize: '14px', color: '#94a3b8' }}>
                No direct link available — search for &ldquo;{opp?.title}&rdquo; online.
              </p>
            )}
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '20px' }}>Good luck with your application!</p>
          </div>
        )

      default:
        return null
    }
  }

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading || !opp) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>Loading…</p>
      </div>
    )
  }

  const pct = Math.round(((appState.currentStep - 1) / (STEP_LABELS.length - 1)) * 100)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#f8fafc' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header style={{
        height: '60px', backgroundColor: '#0a1628', display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: '14px', flexShrink: 0,
      }}>
        <button
          onClick={() => router.push(`/opportunity/${opp.id}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: 0 }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <Star size={13} fill="#d4a017" color="#d4a017" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#d4a017', whiteSpace: 'nowrap' }}>Application Guide</span>
          <span style={{ color: '#475569', fontSize: '13px' }}>—</span>
          <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {opp.title}
          </span>
        </div>
        {savedBadge && (
          <span style={{ fontSize: '11px', backgroundColor: '#16a34a', color: '#ffffff', padding: '3px 10px', borderRadius: '20px', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Progress saved
          </span>
        )}
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left panel ────────────────────────────────────────────────── */}
        <div style={{
          width: '400px', flexShrink: 0, backgroundColor: '#ffffff',
          borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Progress + step list */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0a1628' }}>
                Step {appState.currentStep} of {STEP_LABELS.length}
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{pct}% complete</span>
            </div>
            <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`, backgroundColor: '#d4a017',
                borderRadius: '3px', transition: 'width 0.4s ease',
              }} />
            </div>

            {/* Step list */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {STEP_LABELS.map((label, idx) => {
                const stepNum = idx + 1
                const done = stepNum < appState.currentStep
                const active = stepNum === appState.currentStep
                return (
                  <button
                    key={stepNum}
                    onClick={() => goToStep(stepNum)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '7px 10px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                      backgroundColor: active ? '#fef9ee' : 'transparent',
                      border: active ? '1px solid #fde68a' : '1px solid transparent',
                    }}
                  >
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700,
                      backgroundColor: done ? '#16a34a' : active ? '#d4a017' : '#f1f5f9',
                      color: done || active ? '#ffffff' : '#94a3b8',
                    }}>
                      {done ? <Check size={12} /> : stepNum}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: active ? 600 : 400, color: active ? '#0a1628' : done ? '#64748b' : '#94a3b8' }}>
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Step content — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0a1628', marginBottom: '14px' }}>
              {STEP_LABELS[appState.currentStep - 1]}
            </h2>
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px', flexShrink: 0 }}>
            <button
              onClick={() => goToStep(Math.max(1, appState.currentStep - 1))}
              disabled={appState.currentStep === 1}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#475569',
                cursor: appState.currentStep === 1 ? 'not-allowed' : 'pointer',
                opacity: appState.currentStep === 1 ? 0.4 : 1,
              }}
            >
              Back
            </button>
            {appState.currentStep < STEP_LABELS.length && (
              <button
                onClick={() => goToStep(appState.currentStep + 1)}
                style={{
                  flex: 2, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                  border: 'none', backgroundColor: '#d4a017', color: '#ffffff', cursor: 'pointer',
                }}
              >
                Next Step
              </button>
            )}
          </div>
        </div>

        {/* ── Right panel: AI chat ───────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Chat header */}
          <div style={{ padding: '14px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff', flexShrink: 0 }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#0a1628' }}>AI Application Assistant</p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>Ask anything about your application — guided advice for {opp.title}</p>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#f8fafc' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  backgroundColor: msg.role === 'user' ? '#0a1628' : '#ffffff',
                  color: msg.role === 'user' ? '#ffffff' : '#334155',
                  fontSize: '14px', lineHeight: 1.65,
                  border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                  boxShadow: msg.role === 'assistant' ? '0 1px 4px rgba(0,0,0,0.05)' : 'none',
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content === '' && streaming && i === messages.length - 1
                    ? <span style={{ color: '#94a3b8' }}>…</span>
                    : renderText(msg.content)
                  }
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Suggested prompts (shown only when not streaming and few messages) */}
          {messages.length <= 2 && !streaming && (
            <div style={{ padding: '0 24px 12px', display: 'flex', gap: '8px', flexWrap: 'wrap', backgroundColor: '#f8fafc', flexShrink: 0 }}>
              {[
                'What documents do I need?',
                'How do I write a strong personal statement?',
                'What makes a good referee?',
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  style={{
                    fontSize: '12px', padding: '6px 12px', borderRadius: '20px',
                    border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Ask me anything about your application…"
                disabled={streaming}
                style={{
                  flex: 1, padding: '11px 14px', fontSize: '14px', border: '1px solid #e2e8f0',
                  borderRadius: '10px', outline: 'none', fontFamily: 'inherit',
                  backgroundColor: streaming ? '#f8fafc' : '#ffffff', color: '#334155',
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={streaming || !inputVal.trim()}
                style={{
                  width: '42px', height: '42px', borderRadius: '10px', border: 'none',
                  backgroundColor: streaming || !inputVal.trim() ? '#e2e8f0' : '#d4a017',
                  color: '#ffffff', cursor: streaming || !inputVal.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  transition: 'background-color 0.15s',
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
