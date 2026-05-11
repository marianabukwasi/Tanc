import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiting: IP → { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 100
const WINDOW_MS = 60 * 60 * 1000 // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

function getAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 100 requests per hour.' }, {
      status: 429,
      headers: { 'Retry-After': '3600' },
    })
  }

  const { searchParams } = request.nextUrl
  const type    = searchParams.get('type')
  const country = searchParams.get('country')
  const limit   = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '5', 10), 1), 10)
  const theme   = searchParams.get('theme') === 'dark' ? 'dark' : 'light'

  const supabase = getAnonClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from('opportunities')
    .select('id, title, organization_name, country, opportunity_type, application_deadline, funding_type, format')
    .eq('is_published', true)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type)    q = q.eq('opportunity_type', type)
  if (country) q = q.eq('country', country)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tancglobal.com'

  const opps = (data ?? []).map((o: Record<string, unknown>) => ({
    id: o.id,
    title: o.title,
    organization: o.organization_name,
    country: o.country,
    type: o.opportunity_type,
    deadline: o.application_deadline,
    funding: o.funding_type,
    format: o.format,
    url: `${baseUrl}/opportunities/${o.id}`,
  }))

  return NextResponse.json({ theme, opps }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  })
}
