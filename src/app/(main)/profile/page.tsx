'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark, FileText, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string
  full_name: string
  email: string
  profile_complete: number
  nationality: string
  country_of_residence: string
  education_level: string
}

interface SavedOpp {
  id: string
  opportunity_id: string
  opportunities: {
    id: string
    title: string
    organization: string
    type: string
    deadline: string
    funding_type: string
  } | null
}

interface Application {
  id: string
  opportunity_title: string
  status: string
  applied_at: string
}

type Tab = 'saved' | 'applications'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [saved, setSaved] = useState<SavedOpp[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('saved')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/signin'); return }
      setUser(data.user)

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
      setProfile(profileData ?? null)

      // Fetch saved opportunities (table may not exist yet)
      const { data: savedData } = await supabase
        .from('saved_opportunities')
        .select('*, opportunities(*)')
        .eq('user_id', data.user.id)
      setSaved((savedData ?? []) as SavedOpp[])

      // Fetch applications (table may not exist yet)
      const { data: appData } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', data.user.id)
        .order('applied_at', { ascending: false })
      setApplications((appData ?? []) as Application[])

      setLoading(false)
    })
  }, [router])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ color: '#475569' }}>Loading…</div>
      </div>
    )
  }

  const completion = profile?.profile_complete ?? 0
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User'

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', padding: '40px 48px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* ── User header ───────────────────────────────────────────────── */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '28px 32px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#d4a017',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '18px',
                flexShrink: 0,
              }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '20px', color: '#0a1628' }}>{displayName}</div>
                <div style={{ fontSize: '14px', color: '#475569' }}>{user?.email}</div>
              </div>
            </div>
          </div>

          <a
            href="/profile/setup"
            style={{
              backgroundColor: '#d4a017',
              color: '#ffffff',
              textDecoration: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Edit Profile
          </a>
        </div>

        {/* ── Completion bar ────────────────────────────────────────────── */}
        <div style={{
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '32px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0a1628' }}>Profile completion</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#d4a017' }}>{completion}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${completion}%`, height: '100%', backgroundColor: '#d4a017', borderRadius: '4px', transition: 'width 0.4s ease' }} />
          </div>
          {completion < 100 && (
            <p style={{ fontSize: '13px', color: '#475569', margin: '10px 0 0' }}>
              Complete your profile to unlock personalised opportunity matches.{' '}
              <a href="/profile/setup" style={{ color: '#d4a017', textDecoration: 'none', fontWeight: 600 }}>
                Finish setup →
              </a>
            </p>
          )}
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '28px' }}>
          {([['saved', 'Saved Opportunities', Bookmark], ['applications', 'Applications', FileText]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                border: 'none',
                borderBottom: `2px solid ${tab === key ? '#d4a017' : 'transparent'}`,
                backgroundColor: 'transparent',
                color: tab === key ? '#d4a017' : '#475569',
                fontWeight: tab === key ? 600 : 400,
                fontSize: '15px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                marginBottom: '-1px',
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Saved opportunities ───────────────────────────────────────── */}
        {tab === 'saved' && (
          saved.length === 0 ? (
            <EmptyState
              icon={<Bookmark size={36} color="#d4a017" />}
              title="No saved opportunities yet"
              body="Browse opportunities and click the bookmark icon to save them here."
              cta={{ label: 'Browse Opportunities', href: '/browse' }}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {saved.map((s) => {
                const opp = s.opportunities
                if (!opp) return null
                return (
                  <div key={s.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#1d4ed8', backgroundColor: '#eff6ff', padding: '3px 10px', borderRadius: '50px', width: 'fit-content', textTransform: 'uppercase' }}>
                      {opp.type}
                    </span>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#0a1628' }}>{opp.title}</div>
                    <div style={{ fontSize: '13px', color: '#475569' }}>{opp.organization}</div>
                    <div style={{ fontSize: '13px', color: '#475569' }}>Deadline: {opp.deadline}</div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#d4a017', backgroundColor: '#fef9e7', border: '1px solid #d4a017', padding: '3px 10px', borderRadius: '50px', width: 'fit-content' }}>
                      {opp.funding_type}
                    </span>
                    <button style={{ marginTop: '4px', backgroundColor: '#d4a017', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 0', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Apply Now
                    </button>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── Applications ──────────────────────────────────────────────── */}
        {tab === 'applications' && (
          applications.length === 0 ? (
            <EmptyState
              icon={<FileText size={36} color="#d4a017" />}
              title="No applications yet"
              body="When you apply to opportunities, your applications will appear here."
              cta={{ label: 'Find Opportunities', href: '/browse' }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {applications.map((app) => (
                <div key={app.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0a1628', fontSize: '15px' }}>{app.opportunity_title}</div>
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                      Applied {new Date(app.applied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              ))}
            </div>
          )
        )}

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ icon, title, body, cta }: {
  icon: React.ReactNode
  title: string
  body: string
  cta: { label: string; href: string }
}) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      {icon}
      <div style={{ fontWeight: 700, fontSize: '17px', color: '#0a1628' }}>{title}</div>
      <p style={{ color: '#475569', fontSize: '14px', maxWidth: '360px', margin: 0 }}>{body}</p>
      <a href={cta.href} style={{
        backgroundColor: '#d4a017',
        color: '#ffffff',
        textDecoration: 'none',
        padding: '10px 24px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 600,
        marginTop: '4px',
      }}>
        {cta.label}
      </a>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    submitted:  { bg: '#eff6ff', color: '#1d4ed8' },
    reviewing:  { bg: '#fef9c3', color: '#a16207' },
    accepted:   { bg: '#f0fdf4', color: '#15803d' },
    rejected:   { bg: '#fff1f2', color: '#be123c' },
  }
  const style = map[status.toLowerCase()] ?? { bg: '#f1f5f9', color: '#475569' }
  return (
    <span style={{
      backgroundColor: style.bg,
      color: style.color,
      fontSize: '12px',
      fontWeight: 600,
      padding: '4px 12px',
      borderRadius: '50px',
      textTransform: 'capitalize',
    }}>
      {status}
    </span>
  )
}
