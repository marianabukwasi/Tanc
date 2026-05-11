import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateMatchResult } from '@/lib/matchEngine'
import type { EngineProfile, EngineOpportunity } from '@/lib/matchEngine'
import { sendInstantMatchAlert } from '@/lib/email'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: Request) {
  const callerEmail = request.headers.get('x-admin-email')
  if (!callerEmail || callerEmail !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as { opportunityId?: string }
  const { opportunityId } = body
  if (!opportunityId) {
    return NextResponse.json({ error: 'opportunityId required' }, { status: 400 })
  }

  const supabase = getServiceClient()

  // 1. Fetch the new opportunity
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', opportunityId)
    .single()

  if (oppErr || !opp) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
  }

  // Build EngineOpportunity from whatever columns are present
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawOpp = opp as Record<string, any>
  const engineOpp: EngineOpportunity = {
    required_nationalities:      rawOpp.required_nationalities      ?? null,
    excluded_nationalities:      rawOpp.excluded_nationalities      ?? null,
    min_education_level:         rawOpp.min_education_level         ?? null,
    required_fields_of_study:    rawOpp.required_fields_of_study    ?? null,
    min_gpa:                     rawOpp.min_gpa                     ?? null,
    gpa_scale:                   rawOpp.gpa_scale                   ?? null,
    required_languages:          rawOpp.required_languages           ?? null,
    min_age:                     rawOpp.min_age                     ?? null,
    max_age:                     rawOpp.max_age                     ?? null,
    min_work_experience_years:   rawOpp.min_work_experience_years   ?? null,
    requires_passport:           rawOpp.requires_passport           ?? null,
    requires_transcripts:        rawOpp.requires_transcripts        ?? null,
    requires_recommendations:    rawOpp.requires_recommendations    ?? null,
    min_recommendations:         rawOpp.min_recommendations         ?? null,
  }

  // 2. Get all users with instant alerts enabled
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, nationalities, date_of_birth, education_level, field_of_study, languages, gpa_value, gpa_scale, years_work_experience, has_passport, has_transcripts, recommendation_letters_count')
    .eq('notification_instant', true)
    .not('email', 'is', null)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // 3. Score each profile; collect those at 85%+
  interface SendItem { email: string; name: string; score: number }
  const sendList: SendItem[] = []

  for (const p of profiles) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = p as Record<string, any>
    const engineProfile: EngineProfile = {
      nationalities:                 raw.nationalities                 ?? null,
      date_of_birth:                 raw.date_of_birth                 ?? null,
      education_level:               raw.education_level               ?? null,
      field_of_study:                raw.field_of_study                ?? null,
      languages:                     raw.languages                     ?? null,
      gpa_value:                     raw.gpa_value                     ?? null,
      gpa_scale:                     raw.gpa_scale                     ?? null,
      years_work_experience:         raw.years_work_experience         ?? null,
      has_passport:                  raw.has_passport                  ?? null,
      has_transcripts:               raw.has_transcripts               ?? null,
      recommendation_letters_count:  raw.recommendation_letters_count  ?? null,
    }
    const result = calculateMatchResult(engineProfile, engineOpp)
    if (result.score >= 85) {
      const name = [raw.first_name, raw.last_name].filter(Boolean).join(' ') || 'there'
      sendList.push({ email: raw.email as string, name, score: result.score })
    }
  }

  if (sendList.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // Shared opportunity data for emails
  const oppData = {
    id:                   rawOpp.id as string,
    title:                rawOpp.title as string,
    organization_name:    (rawOpp.organization_name ?? rawOpp.organization ?? null) as string | null,
    opportunity_type:     (rawOpp.opportunity_type  ?? rawOpp.type         ?? 'Opportunity') as string,
    application_deadline: (rawOpp.application_deadline ?? rawOpp.deadline_date ?? null) as string | null,
  }

  // 4. Send in batches of 50
  const BATCH = 50
  for (let i = 0; i < sendList.length; i += BATCH) {
    const batch = sendList.slice(i, i + BATCH)
    await Promise.all(
      batch.map(u =>
        sendInstantMatchAlert(u.email, u.name, [{ ...oppData, matchScore: u.score }])
      )
    )
  }

  console.log(`[notifications/trigger] Sent instant alerts to ${sendList.length} users for opportunity ${opportunityId}`)
  return NextResponse.json({ sent: sendList.length })
}
