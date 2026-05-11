'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const OPENING: Message = {
  role: 'assistant',
  content:
    "Hi! I'm the TANC Assistant. Tell me what kind of opportunity you're looking for — I'll search our database and find the best matches based on your background and goals.",
}

export default function ChatAssistant() {
  const pathname = usePathname()
  const [isOpen, setIsOpen]       = useState(false)
  const [isMobile, setIsMobile]   = useState(false)
  const [messages, setMessages]   = useState<Message[]>([OPENING])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [userId, setUserId]       = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLInputElement>(null)

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  // Responsive: detect mobile
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 640) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Lock body scroll on mobile while open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isMobile, isOpen])

  // Extract opportunity ID if user is on a detail page
  const oppIdMatch   = pathname.match(/\/opportunities\/([^/?#]+)/)
  const opportunityId = oppIdMatch?.[1] ?? null

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 320)
  }, [isOpen])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message    = { role: 'user', content: text }
    const history: Message[]  = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)

    // Optimistic empty assistant bubble
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages:      history.map(m => ({ role: m.role, content: m.content })),
          userId,
          opportunityId,
        }),
      })

      if (!response.body) throw new Error('No response body')

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break
          try {
            const parsed = JSON.parse(payload) as { text?: string }
            if (parsed.text) {
              setMessages(prev => {
                const updated = [...prev]
                const last    = updated[updated.length - 1]
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: last.content + parsed.text }
                }
                return updated
              })
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        const last    = updated[updated.length - 1]
        if (last?.role === 'assistant' && last.content === '') {
          updated[updated.length - 1] = {
            ...last,
            content: 'Sorry, something went wrong. Please try again.',
          }
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Panel styles ─────────────────────────────────────────────────────────────

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position:        'fixed',
        inset:           0,
        width:           '100%',
        height:          '100%',
        borderRadius:    0,
        backgroundColor: '#ffffff',
        display:         'flex',
        flexDirection:   'column',
        overflow:        'hidden',
        zIndex:          1100,
        transform:       isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition:      'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
      }
    : {
        position:        'fixed',
        bottom:          '88px',
        right:           '20px',
        width:           '400px',
        height:          '560px',
        borderRadius:    '16px',
        border:          '1px solid #e2e8f0',
        boxShadow:       '0 8px 40px rgba(0,0,0,0.12)',
        backgroundColor: '#ffffff',
        display:         'flex',
        flexDirection:   'column',
        overflow:        'hidden',
        zIndex:          999,
        pointerEvents:   isOpen ? 'auto' : 'none',
        transform:       isOpen ? 'translateX(0)' : 'translateX(calc(100% + 30px))',
        opacity:         isOpen ? 1 : 0,
        transition:      'transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
      }

  return (
    <>
      {/* ── Chat panel ────────────────────────────────────────────────────── */}
      <div style={panelStyle}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid #e2e8f0', flexShrink: 0,
          backgroundColor: '#ffffff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: '#d4a017',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <MessageCircle size={16} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0a1628', lineHeight: 1.2 }}>
                TANC Assistant
              </div>
              <div style={{ fontSize: '11px', color: '#15803d' }}>&#9679; Online</div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94a3b8', padding: '4px', display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth:        '85%',
                padding:         '10px 13px',
                borderRadius:    msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                backgroundColor: msg.role === 'user' ? '#d4a017' : '#ffffff',
                color:           msg.role === 'user' ? '#ffffff' : '#0a1628',
                fontSize:        '13.5px',
                lineHeight:      1.55,
                border:          msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                borderLeft:      msg.role === 'assistant' ? '3px solid #d4a017' : 'none',
                whiteSpace:      'pre-wrap',
                wordBreak:       'break-word',
              }}>
                {msg.content
                  ? msg.content
                  : loading && i === messages.length - 1
                    ? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Thinking…</span>
                    : null
                }
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '10px 12px', borderTop: '1px solid #e2e8f0',
          display: 'flex', gap: '8px', flexShrink: 0, backgroundColor: '#ffffff',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask me anything…"
            style={{
              flex: 1, height: '44px', border: '1px solid #e2e8f0',
              borderRadius: '8px', padding: '0 12px', fontSize: '14px',
              color: '#0a1628', outline: 'none', fontFamily: 'inherit',
              backgroundColor: loading ? '#f8fafc' : '#ffffff',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            aria-label="Send message"
            style={{
              width: '44px', height: '44px', borderRadius: '8px',
              backgroundColor: loading || !input.trim() ? '#e2c76a' : '#d4a017',
              border: 'none',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Send size={16} color="#ffffff" />
          </button>
        </div>
      </div>

      {/* ── Floating button ───────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: '20px', right: '20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '8px', zIndex: 1000,
      }}>
        {!isOpen && (
          <div style={{
            backgroundColor: '#0a1628', color: '#ffffff',
            fontSize: '11px', fontWeight: 600,
            padding: '5px 12px', borderRadius: '50px',
            whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>
            Find my opportunity
          </div>
        )}
        <button
          onClick={() => setIsOpen(o => !o)}
          aria-label="Open TANC AI chat"
          style={{
            width: '56px', height: '56px', borderRadius: '50%',
            backgroundColor: '#d4a017', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(212,160,23,0.3)',
            transition: 'transform 0.15s',
          }}
        >
          {isOpen
            ? <X size={22} color="#ffffff" />
            : <MessageCircle size={22} color="#ffffff" />
          }
        </button>
      </div>
    </>
  )
}
