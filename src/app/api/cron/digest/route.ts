import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateMatchResult } from '@/lib/matchEngine'
import type { EngineProfile, EngineOpportunity } from '@/lib/matchEngine'
import { sendWeeklyDigest } from '@/lib/email'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(request: Request) {
  const auth = request.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()

  // Opportunities published in the last 7 days
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

  const { data: newOpps } = await supabase
    .from('opportunities')
    .select('id, title, organization_name, opportunity_type, application_deadline, required_nationalities, excluded_nationalities, min_education_level, required_fields_of_study, min_gpa, gpa_scale, required_languages, min_age, max_age, min_work_experience_years, requires_passport, requires_transcripts, requires_recommendations, min_recommendations')
    .eq('is_published', true)
    .gte('created_at', since)

  if (!newOpps || newOpps.length === 0) {
    console.log('[cron/digest] No new opportunities this week')
    return NextResponse.json({ sent: 0, newOpps: 0 })
  }

  // All subscribers with weekly digest enabled
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, first_name, nationalities, date_of_birth, education_level, field_of_study, languages, gpa_value, gpa_scale, years_work_experience, has_passport, has_transcripts, recommendation_letters_count')
    .eq('notification_digest', true)
    .not('email', 'is', null)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0, newOpps: newOpps.length })
  }

  let sent = 0

  for (const profile of profiles) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = profile as Record<string, any>

    const engineProfile: EngineProfile = {
      nationalities:                p.nationalities                ?? null,
      date_of_birth:                p.date_of_birth                ?? null,
      education_level:              p.education_level              ?? null,
      field_of_study:               p.field_of_study               ?? null,
      languages:                    p.languages                    ?? null,
      gpa_value:                    p.gpa_value                    ?? null,
      gpa_scale:                    p.gpa_scale                    ?? null,
      years_work_experience:        p.years_work_experience        ?? null,
      has_passport:                 p.has_passport                 ?? null,
      has_transcripts:              p.has_transcripts              ?? null,
      recommendation_letters_count: p.recommendation_letters_count ?? null,
    }

    const matched: {
      id: string
      title: string
      organization_name: string | null
      opportunity_type: string
      matchScore: number
      application_deadline: string | null
    }[] = []

    for (const opp of newOpps) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const o = opp as Record<string, any>
      const engineOpp: EngineOpportunity = {
        required_nationalities:    o.required_nationalities    ?? null,
        excluded_nationalities:    o.excluded_nationalities    ?? null,
        min_education_level:       o.min_education_level       ?? null,
        required_fields_of_study:  o.required_fields_of_study  ?? null,
        min_gpa:                   o.min_gpa                   ?? null,
        gpa_scale:                 o.gpa_scale                 ?? null,
        required_languages:        o.required_languages        ?? null,
        min_age:                   o.min_age                   ?? null,
        max_age:                   o.max_age                   ?? null,
        min_work_experience_years: o.min_work_experience_years ?? null,
        requires_passport:         o.requires_passport         ?? null,
        requires_transcripts:      o.requires_transcripts      ?? null,
        requires_recommendations:  o.requires_recommendations  ?? null,
        min_recommendations:       o.min_recommendations       ?? null,
      }

      const result = calculateMatchResult(engineProfile, engineOpp)
      if (result.score >= 60) {
        matched.push({
          id:                   o.id as string,
          title:                o.title as string,
          organization_name:    o.organization_name as string | null,
          opportunity_type:     (o.opportunity_type ?? 'Opportunity') as string,
          matchScore:           result.score,
          application_deadline: o.application_deadline as string | null,
        })
      }
    }

    if (matched.length === 0) continue

    matched.sort((a, b) => b.matchScore - a.matchScore)
    const name = (p.first_name as string | null) || 'there'

    await sendWeeklyDigest(p.email as string, name, matched)
    sent++
  }

  console.log(`[cron/digest] Sent weekly digest to ${sent} users (${newOpps.length} new opps)`)
  return NextResponse.json({ sent, newOpps: newOpps.length, timestamp: new Date() })
}
