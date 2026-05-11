import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export default async function AdminDashboard() {
  const supabase = sb()
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

  const [
    { count: liveOpps },
    { count: newOppsWeek },
    { count: totalUsers },
    { count: newUsersWeek },
    { count: subscribers },
    { count: pending },
    { count: archived },
    { count: reports },
  ] = await Promise.all([
    supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('is_published', true).eq('is_archived', false),
    supabase.from('opportunities').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo).eq('is_published', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase.from('subscribers').select('*', { count: 'exact', head: true }),
    supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('is_published', false).eq('is_archived', false),
    supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('is_archived', true),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const stats: { label: string; value: number; color: string; href: string | null; sub: string }[] = [
    { label: 'Live opportunities', value: liveOpps ?? 0,    color: '#0a1628', href: '/admin/manage', sub: 'published & active' },
    { label: 'New this week',      value: newOppsWeek ?? 0, color: '#15803d', href: '/admin/manage', sub: 'published in last 7 days' },
    { label: 'Total users',        value: totalUsers ?? 0,  color: '#7c3aed', href: '/admin/users',  sub: 'registered profiles' },
    { label: 'New users',          value: newUsersWeek ?? 0,color: '#0369a1', href: '/admin/users',  sub: 'joined this week' },
    { label: 'Subscribers',        value: subscribers ?? 0, color: '#d4a017', href: null,            sub: 'email list' },
    { label: 'Pending review',     value: pending ?? 0,     color: '#dc2626', href: '/admin/queue',  sub: 'awaiting publish' },
    { label: 'Archived',           value: archived ?? 0,    color: '#94a3b8', href: '/admin/manage', sub: 'not active' },
    { label: 'Reports',            value: reports ?? 0,     color: '#f97316', href: '/admin/queue',  sub: 'needs attention' },
  ]

  const queueCount = (pending ?? 0) + (reports ?? 0)

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0a1628', margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>TANC platform overview</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '14px' }}>
        {stats.map(({ label, value, color, href, sub }) => {
          const inner = (
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '18px 20px',
              transition: href ? 'box-shadow 0.15s' : undefined,
            }}>
              <div style={{ fontSize: '34px', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0a1628', marginTop: '6px' }}>{label}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{sub}</div>
            </div>
          )
          return href
            ? <Link key={label} href={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>
            : <div key={label}>{inner}</div>
        })}
      </div>

      <div style={{ marginTop: '36px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link href="/admin/add" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '11px 22px', backgroundColor: '#d4a017', color: '#ffffff',
          borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 700,
        }}>
          + Add Opportunity
        </Link>
        <Link href="/admin/queue" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '11px 22px', backgroundColor: '#ffffff', color: '#0a1628',
          border: '1px solid #e2e8f0', borderRadius: '8px', textDecoration: 'none',
          fontSize: '14px', fontWeight: 600,
        }}>
          Review Queue{queueCount > 0 ? ` (${queueCount})` : ''}
        </Link>
        <Link href="/admin/analytics" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '11px 22px', backgroundColor: '#ffffff', color: '#0a1628',
          border: '1px solid #e2e8f0', borderRadius: '8px', textDecoration: 'none',
          fontSize: '14px', fontWeight: 600,
        }}>
          Analytics
        </Link>
      </div>
    </div>
  )
}
