import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function BarChart({ items, color = '#d4a017' }: { items: { label: string; value: number }[]; color?: string }) {
  if (items.length === 0) return <div style={{ color: '#94a3b8', fontSize: '13px' }}>No data</div>
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: '#475569', width: '140px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
          <div style={{ flex: 1, height: '20px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.round((value / max) * 100)}%`, height: '100%', backgroundColor: color, borderRadius: '4px', minWidth: value > 0 ? '4px' : 0, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0a1628', width: '32px', textAlign: 'right', flexShrink: 0 }}>{value}</div>
        </div>
      ))}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 22px' }}>
      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0a1628', marginBottom: '16px' }}>{title}</div>
      {children}
    </div>
  )
}

export default async function AnalyticsPage() {
  const supabase = sb()

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const [oppsByType, topSaved, recentProfiles, allNats] = await Promise.all([
    supabase
      .from('opportunities')
      .select('opportunity_type')
      .eq('is_archived', false),
    supabase
      .from('opportunities')
      .select('title, saves')
      .eq('is_published', true)
      .eq('is_archived', false)
      .order('saves', { ascending: false })
      .limit(10),
    supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', sixMonthsAgo.toISOString())
      .order('created_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('nationalities'),
  ])

  // Opps by type
  const typeCounts: Record<string, number> = {}
  for (const { opportunity_type } of (oppsByType.data ?? [])) {
    if (opportunity_type) typeCounts[opportunity_type] = (typeCounts[opportunity_type] ?? 0) + 1
  }
  const typeChart = Object.entries(typeCounts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  // Top saved
  const savedChart = (topSaved.data ?? [])
    .filter(o => (o.saves ?? 0) > 0)
    .map(o => ({ label: o.title ?? '—', value: o.saves ?? 0 }))

  // Monthly signups (last 6 months)
  const monthBuckets: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    monthBuckets[key] = 0
  }
  for (const { created_at } of (recentProfiles.data ?? [])) {
    const d = new Date(created_at)
    const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    if (key in monthBuckets) monthBuckets[key]++
  }
  const signupChart = Object.entries(monthBuckets).map(([label, value]) => ({ label, value }))

  // Top nationalities
  const natCounts: Record<string, number> = {}
  for (const { nationalities } of (allNats.data ?? [])) {
    if (Array.isArray(nationalities)) {
      for (const nat of nationalities) {
        if (nat) natCounts[nat] = (natCounts[nat] ?? 0) + 1
      }
    }
  }
  const natChart = Object.entries(natCounts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0a1628', margin: 0 }}>Analytics</h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Platform statistics snapshot</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
        <Card title="User signups — last 6 months">
          <BarChart items={signupChart} color="#0a1628" />
        </Card>

        <Card title="Opportunities by type">
          <BarChart items={typeChart} color="#d4a017" />
        </Card>

        <Card title="Top saved opportunities">
          {savedChart.length === 0
            ? <div style={{ fontSize: '13px', color: '#94a3b8' }}>No saves yet</div>
            : <BarChart items={savedChart} color="#7c3aed" />
          }
        </Card>

        <Card title="Top user nationalities">
          {natChart.length === 0
            ? <div style={{ fontSize: '13px', color: '#94a3b8' }}>No nationality data</div>
            : <BarChart items={natChart} color="#0369a1" />
          }
        </Card>
      </div>
    </div>
  )
}
