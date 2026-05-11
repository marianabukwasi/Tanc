'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PlusCircle, List, Clock, Users, BarChart2 } from 'lucide-react'

const NAV = [
  { href: '/admin',           label: 'Dashboard',       Icon: LayoutDashboard },
  { href: '/admin/add',       label: 'Add Opportunity', Icon: PlusCircle },
  { href: '/admin/manage',    label: 'Manage',          Icon: List },
  { href: '/admin/queue',     label: 'Queue',           Icon: Clock },
  { href: '/admin/users',     label: 'Users',           Icon: Users },
  { href: '/admin/analytics', label: 'Analytics',       Icon: BarChart2 },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav style={{ padding: '8px 0' }}>
      {NAV.map(({ href, label, Icon }) => {
        const active = href === '/admin'
          ? pathname === '/admin'
          : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            style={{
              display:         'flex',
              alignItems:      'center',
              gap:             '10px',
              padding:         '10px 20px',
              color:           active ? '#d4a017' : '#94a3b8',
              textDecoration:  'none',
              fontSize:        '14px',
              fontWeight:      active ? 700 : 500,
              backgroundColor: active ? 'rgba(212,160,23,0.08)' : 'transparent',
              borderLeft:      `3px solid ${active ? '#d4a017' : 'transparent'}`,
            }}
          >
            <Icon size={16} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
