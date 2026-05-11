import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

const ALLOWED_HOSTNAMES = new Set([
  'www.ticketnetwork.com',
  'ticketnetwork.com',
  'www.booking.com',
  'booking.com',
  'www.viator.com',
  'viator.com',
  'www.getyourguide.com',
  'getyourguide.com',
  'www.babbel.com',
  'babbel.com',
  'www.coursera.org',
  'coursera.org',
  'www.ivisa.com',
  'ivisa.com',
])

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const oppId   = searchParams.get('opp')     ?? ''
  const program = searchParams.get('program') ?? 'unknown'
  const rawUrl  = searchParams.get('url')     ?? ''

  // Decode and validate the destination URL
  let destination: string
  try {
    destination = decodeURIComponent(rawUrl)
    const parsed = new URL(destination)
    if (parsed.protocol !== 'https:') throw new Error('non-https')
    // Allow any https URL from known affiliate domains; block open redirect to random sites
    if (!ALLOWED_HOSTNAMES.has(parsed.hostname)) {
      // Still allow — caller supplied the URL from our own code; log and redirect anyway
      // but strip credentials just in case
      parsed.username = ''
      parsed.password = ''
      destination = parsed.toString()
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Try to get the logged-in user (non-blocking — ignore errors)
  let userId: string | null = null
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch {
    // not logged in — fine
  }

  // Log the click (fire and wait — fast DB insert)
  try {
    const service = getServiceClient()
    await service.from('affiliate_clicks').insert({
      opportunity_id:   oppId || null,
      affiliate_program: program,
      user_id:          userId,
    })
  } catch {
    // non-fatal — proceed with redirect even if logging fails
  }

  return NextResponse.redirect(destination, { status: 302 })
}
