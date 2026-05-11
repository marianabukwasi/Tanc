'use client'

import { lookupVisa } from '@/lib/visaRequirements'
import { ExternalLink } from 'lucide-react'

interface Props {
  userNationality: string
  oppCountry: string
  oppFormat: string | null | undefined
}

export default function VisaIndicator({ userNationality, oppCountry, oppFormat }: Props) {
  const fmt = (oppFormat ?? '').toLowerCase()
  if (fmt.includes('remote') || fmt.includes('online')) return null
  if (userNationality.toLowerCase() === oppCountry.toLowerCase()) return null

  const visa = lookupVisa(userNationality, oppCountry)

  if (!visa) {
    return (
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', backgroundColor: '#fff' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
          Visa Info
        </div>
        <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px', lineHeight: 1.5 }}>
          {userNationality} → {oppCountry}
        </div>
        <a
          href={`https://www.ivisa.com/`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '12px', color: '#d4a017', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          Check visa requirements <ExternalLink size={11} />
        </a>
      </div>
    )
  }

  if (visa.status === 'visa_free') {
    return (
      <div style={{ border: '1px solid #bbf7d0', borderRadius: '14px', padding: '14px', backgroundColor: '#f0fdf4' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
          Visa Info
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#15803d', color: '#fff', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>✓</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#15803d' }}>Visa Free</span>
          {visa.duration && <span style={{ fontSize: '11px', color: '#166534', backgroundColor: '#dcfce7', padding: '2px 7px', borderRadius: '20px', fontWeight: 600 }}>{visa.duration}</span>}
        </div>
        {visa.notes && <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>{visa.notes}</div>}
      </div>
    )
  }

  if (visa.status === 'visa_on_arrival') {
    return (
      <div style={{ border: '1px solid #fde68a', borderRadius: '14px', padding: '14px', backgroundColor: '#fffbeb' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
          Visa Info
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#d97706', color: '#fff', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>~</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>Visa on Arrival</span>
          {visa.duration && <span style={{ fontSize: '11px', color: '#92400e', backgroundColor: '#fef3c7', padding: '2px 7px', borderRadius: '20px', fontWeight: 600 }}>{visa.duration}</span>}
        </div>
        {visa.notes && <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, marginBottom: visa.embassyUrl ? '8px' : 0 }}>{visa.notes}</div>}
        {visa.embassyUrl && (
          <a href={visa.embassyUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#d4a017', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            Apply online <ExternalLink size={11} />
          </a>
        )}
      </div>
    )
  }

  // visa_required
  return (
    <div style={{ border: '1px solid #fecaca', borderRadius: '14px', padding: '14px', backgroundColor: '#fff5f5' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
        Visa Info
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#dc2626', color: '#fff', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>!</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>Visa Required</span>
      </div>
      {visa.notes && <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, marginBottom: '8px' }}>{visa.notes}</div>}
      {visa.embassyUrl ? (
        <a
          href={visa.embassyUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '12px', color: '#fff', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#dc2626', padding: '5px 12px', borderRadius: '6px' }}
        >
          Embassy / Apply <ExternalLink size={11} />
        </a>
      ) : (
        <a
          href={`https://www.ivisa.com/`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          Check requirements <ExternalLink size={11} />
        </a>
      )}
    </div>
  )
}
