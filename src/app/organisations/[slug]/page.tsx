'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ExternalLink, Bell, BellOff, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Opp {
  id: string
  title: string
  opportunity_type: string | null
  country: string | null
  application_deadline: string | null
  funding_type: string | null
  is_archived: boolean
}

interface Story {
  id: string
  user_name: string | null
  story: string | null
  created_at: string
  opportunity: { title: string } | null
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function OppCard({ opp }: { opp: Opp }) {
  const days = opp.application_deadline
    ? Math.ceil((new Date(opp.application_deadline).getTime() - Date.now()) / 86400000)
    : null
  const urgent = days !== null && days >= 0 && days <= 14
  return (
    <Link href={`/opportunities/${opp.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
        padding: '16px 18px', transition: 'box-shadow 0.15s',
        cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {opp.opportunity_type && (
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
              {opp.opportunity_type}
            </span>
          )}
          {opp.funding_type && (
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', backgroundColor: '#f0fdf4', color: '#15803d' }}>
              {opp.funding_type}
            </span>
          )}
        </div>
        <div style={{ fontWeight: 700, fontSize: '14px', color: '#0a1628', marginBottom: '4px', lineHeight: 1.3 }}>{opp.title}</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
          {opp.country && <span style={{ fontSize: '12px', color: '#64748b' }}>📍 {opp.country}</span>}
          {days !== null && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: urgent ? '#dc2626' : '#64748b' }}>
              {days < 0 ? 'Closed' : days === 0 ? 'Due today' : `${days}d left`}
            </span>
          )}
          {days === null && opp.application_deadline && (
            <span style={{ fontSize: '12px', color: '#64748b' }}>Deadline: {fmtDate(opp.application_deadline)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function OrganisationPage() {
  const params = useParams()
  const rawSlug = Array.isArray(params.slug) ? params.slug[0] : (params.slug ?? '')
  const orgName = decodeURIComponent(rawSlug)

  const [activeOpps, setActiveOpps]   = useState<Opp[]>([])
  const [archivedOpps, setArchivedOpps] = useState<Opp[]>([])
  const [stories, setStories]         = useState<Story[]>([])
  const [following, setFollowing]     = useState(false)
  const [userId, setUserId]           = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)
  const [followBusy, setFollowBusy]   = useState(false)
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [orgWebsite, setOrgWebsite]   = useState<string | null>(null)
  const [totalCount, setTotalCount]   = useState(0)

  const load = useCallback(async () => {
    setLoading(true)

    // Auth
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)

    // Active opps
    const { data: active } = await supabase
      .from('opportunities')
      .select('id, title, opportunity_type, country, application_deadline, funding_type, is_archived, organization_website')
      .eq('organization_name', orgName)
      .eq('is_published', true)
      .eq('is_archived', false)
      .order('application_deadline', { ascending: true, nullsFirst: false })
      .limit(50)

    if (active && active.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setOrgWebsite((active[0] as any).organization_website ?? null)
    }
    setActiveOpps((active ?? []) as Opp[])

    // Archived opps
    const { data: archived } = await supabase
      .from('opportunities')
      .select('id, title, opportunity_type, country, application_deadline, funding_type, is_archived')
      .eq('organization_name', orgName)
      .eq('is_published', true)
      .eq('is_archived', true)
      .order('application_deadline', { ascending: false, nullsFirst: false })
      .limit(20)
    setArchivedOpps((archived ?? []) as Opp[])

    setTotalCount((active?.length ?? 0) + (archived?.length ?? 0))

    // Approved success stories for this org's opportunities
    const allOppIds = [...(active ?? []), ...(archived ?? [])].map(o => o.id)
    if (allOppIds.length > 0) {
      const { data: storyData } = await supabase
        .from('success_stories')
        .select('id, user_name, story, created_at, opportunity:opportunities(title)')
        .eq('status', 'approved')
        .eq('outcome', 'got_it')
        .in('opportunity_id', allOppIds)
        .order('created_at', { ascending: false })
        .limit(10)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setStories((storyData ?? []).map((s: any) => ({
        ...s,
        opportunity: Array.isArray(s.opportunity) ? s.opportunity[0] ?? null : s.opportunity,
      })) as Story[])
    }

    // Follow status
    if (user) {
      const { data: follow } = await supabase
        .from('user_organisation_follows')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('organisation_name', orgName)
        .maybeSingle()
      setFollowing(!!follow)
    }

    setLoading(false)
  }, [orgName])

  useEffect(() => { load() }, [load])

  async function toggleFollow() {
    if (!userId) return
    setFollowBusy(true)
    if (following) {
      await supabase
        .from('user_organisation_follows')
        .delete()
        .eq('user_id', userId)
        .eq('organisation_name', orgName)
      setFollowing(false)
    } else {
      await supabase
        .from('user_organisation_follows')
        .insert({ user_id: userId, organisation_name: orgName })
      setFollowing(true)
    }
    setFollowBusy(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px 80px', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Link href="/opportunities" style={{ fontSize: '13px', color: '#94a3b8', textDecoration: 'none', display: 'inline-block', marginBottom: '16px' }}>
          ← All opportunities
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#1B2A6B', fontWeight: 800, fontSize: '20px' }}>{orgName.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0a1628', margin: 0, lineHeight: 1.2 }}>{orgName}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>{totalCount} opportunit{totalCount === 1 ? 'y' : 'ies'}</span>
                  {orgWebsite && (
                    <>
                      <span style={{ color: '#e2e8f0' }}>·</span>
                      <a href={orgWebsite} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#1B2A6B', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Website <ExternalLink size={11} />
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Follow button */}
          {userId && (
            <button
              onClick={toggleFollow}
              disabled={followBusy}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', border: following ? '1px solid #1B2A6B' : '1px solid #e2e8f0',
                borderRadius: '10px', backgroundColor: following ? '#fef9ee' : '#ffffff',
                color: following ? '#1B2A6B' : '#475569', fontSize: '14px', fontWeight: 600,
                cursor: followBusy ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
              }}
            >
              {following ? <BellOff size={15} /> : <Bell size={15} />}
              {following ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
      </div>

      {/* Active opportunities */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0a1628', marginBottom: '14px' }}>
          Active opportunities
          {activeOpps.length > 0 && <span style={{ marginLeft: '8px', fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>({activeOpps.length})</span>}
        </h2>
        {activeOpps.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0', color: '#94a3b8', fontSize: '14px' }}>
            No active opportunities from this organisation right now.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {activeOpps.map(o => <OppCard key={o.id} opp={o} />)}
          </div>
        )}
      </div>

      {/* Archived section */}
      {archivedOpps.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={() => setArchivedOpen(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 14px', fontFamily: 'inherit' }}
          >
            <span style={{ fontSize: '17px', fontWeight: 700, color: '#64748b' }}>
              Past opportunities ({archivedOpps.length})
            </span>
            {archivedOpen ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
          </button>
          {archivedOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {archivedOpps.map(o => <OppCard key={o.id} opp={o} />)}
            </div>
          )}
        </div>
      )}

      {/* Success stories */}
      {stories.length > 0 && (
        <div>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0a1628', marginBottom: '14px' }}>
            Success stories 🎉
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stories.map(s => (
              <div key={s.id} style={{ backgroundColor: '#fefce8', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#1B2A6B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '14px' }}>
                      {(s.user_name ?? '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0a1628' }}>{s.user_name ?? 'Anonymous'}</div>
                    {s.opportunity?.title && (
                      <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '6px' }}>{s.opportunity.title}</div>
                    )}
                    {s.story && (
                      <p style={{ fontSize: '13px', color: '#44403c', lineHeight: 1.6, margin: 0 }}>{s.story}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
