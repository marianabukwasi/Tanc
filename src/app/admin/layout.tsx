import { AdminNav } from '@/components/AdminNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px',
        flexShrink: 0,
        backgroundColor: '#0a1628',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1B2A6B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            TANC Admin
          </div>
        </div>
        <AdminNav />
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, padding: '32px' }}>
        {children}
      </main>
    </div>
  )
}
