import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  nationalities: string[] | null
  education_level: string | null
  field_of_study: string | null
  profile_complete_pct: number | null
  role: string | null
  created_at: string
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function UsersPage() {
  const supabase = sb()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, nationalities, education_level, field_of_study, profile_complete_pct, role, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  const rows = (profiles ?? []) as Profile[]

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0a1628', margin: 0 }}>Users</h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>{rows.length} registered profiles</p>
      </div>

      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Name', 'Nationality', 'Education', 'Field', 'Profile %', 'Role', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No users yet.</td></tr>
              ) : rows.map((p, i) => {
                const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || '—'
                const initials = name !== '—' ? name.charAt(0).toUpperCase() : '?'
                const pct = p.profile_complete_pct ?? 0
                const pctColor = pct >= 80 ? '#15803d' : pct >= 50 ? '#d97706' : '#94a3b8'
                return (
                  <tr key={p.id} style={{ borderBottom: i < rows.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          backgroundColor: '#1B2A6B', color: '#ffffff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 700, flexShrink: 0,
                        }}>
                          {initials}
                        </div>
                        <span style={{ fontWeight: 600, color: '#0a1628' }}>{name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#475569' }}>
                      {Array.isArray(p.nationalities) && p.nationalities.length > 0
                        ? p.nationalities.slice(0, 2).join(', ') + (p.nationalities.length > 2 ? '…' : '')
                        : '—'}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#475569' }}>{p.education_level ?? '—'}</td>
                    <td style={{ padding: '11px 14px', color: '#475569', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.field_of_study ?? '—'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '5px', backgroundColor: '#f1f5f9', borderRadius: '3px', minWidth: '50px' }}>
                          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pctColor, borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: pctColor }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {p.role === 'admin' && (
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', backgroundColor: '#fef3c7', color: '#92400e' }}>admin</span>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtDate(p.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
