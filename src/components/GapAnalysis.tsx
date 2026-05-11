'use client'

import { useState } from 'react'
import { X, ChevronDown, ChevronUp, ExternalLink, Clock, DollarSign } from 'lucide-react'
import type { Gap } from '@/lib/matchEngine'

// ─── Pathway card ─────────────────────────────────────────────────────────────

function PathwayCard({ pathway }: { pathway: import('@/lib/matchEngine').Pathway }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0',
      backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0a1628', flex: 1 }}>{pathway.label}</span>
        {pathway.affiliateUrl && (
          <a
            href={pathway.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '4px 10px', borderRadius: '6px',
              backgroundColor: '#0a1628', color: '#fff',
              fontSize: '11px', fontWeight: 600, textDecoration: 'none',
              flexShrink: 0, whiteSpace: 'nowrap',
            }}
          >
            View <ExternalLink size={10} />
          </a>
        )}
      </div>

      {pathway.description && (
        <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
          {pathway.description}
        </p>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '2px' }}>
        {pathway.estimatedTime && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b' }}>
            <Clock size={11} color="#94a3b8" />
            {pathway.estimatedTime}
          </div>
        )}
        {pathway.estimatedCost && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b' }}>
            <DollarSign size={11} color="#94a3b8" />
            {pathway.estimatedCost}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Gap row ──────────────────────────────────────────────────────────────────

function GapRow({ gap }: { gap: Gap }) {
  const [open, setOpen] = useState(false)
  const hasPathways = gap.pathways.length > 0

  return (
    <div style={{ borderBottom: '1px solid #f1f5f9' }}>

      {/* Gap header */}
      <div style={{ display: 'flex', gap: '10px', padding: '10px 0', alignItems: 'flex-start' }}>
        <div style={{
          width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
          backgroundColor: gap.isHardFail ? '#fee2e2' : '#fef3c7',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px',
        }}>
          <X size={11} color={gap.isHardFail ? '#dc2626' : '#d97706'} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0a1628' }}>{gap.field}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                Required: <strong>{gap.required}</strong> — you have: {gap.userHas}
              </div>
            </div>
            {hasPathways && (
              <button
                onClick={() => setOpen(!open)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px',
                  padding: '4px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                  color: '#475569', flexShrink: 0, fontFamily: 'inherit',
                }}
              >
                Fix it {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pathways panel */}
      {open && hasPathways && (
        <div style={{ paddingBottom: '12px', paddingLeft: '30px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
            How to close this gap
          </div>
          {gap.pathways.map((p, i) => (
            <PathwayCard key={i} pathway={p} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── GapAnalysis ─────────────────────────────────────────────────────────────

export default function GapAnalysis({ gaps }: { gaps: Gap[] }) {
  if (gaps.length === 0) return null

  const hardFails = gaps.filter(g => g.isHardFail)
  const softGaps  = gaps.filter(g => !g.isHardFail)

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 18px', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Gap Analysis
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
          backgroundColor: hardFails.length > 0 ? '#fee2e2' : '#fef3c7',
          color: hardFails.length > 0 ? '#dc2626' : '#d97706',
        }}>
          {gaps.length} gap{gaps.length !== 1 ? 's' : ''}
        </span>
      </div>

      {hardFails.length > 0 && (
        <p style={{ fontSize: '11px', color: '#dc2626', marginBottom: '8px', lineHeight: 1.5 }}>
          ⚠ {hardFails.length} eligibility requirement{hardFails.length !== 1 ? 's' : ''} cannot be met for this cycle.
        </p>
      )}

      <div>
        {[...hardFails, ...softGaps].map((gap, i) => (
          <GapRow key={i} gap={gap} />
        ))}
      </div>
    </div>
  )
}
