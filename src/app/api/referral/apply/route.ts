import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { userId?: string }
  const { userId } = body
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  // Read httpOnly referral_code cookie from the request
  const referralCode = request.cookies.get('referral_code')?.value
  if (!referralCode) {
    return NextResponse.json({ ok: true, skipped: 'no referral cookie' })
  }

  const supabase = getServiceClient()

  // Find the referrer by their referral_code
  const { data: referrer } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', referralCode)
    .single()

  if (!referrer) {
    return NextResponse.json({ ok: true, skipped: 'code not found' })
  }

  if (referrer.id === userId) {
    return NextResponse.json({ ok: true, skipped: 'self-referral' })
  }

  // Set referred_by only if not already set (prevents overwriting)
  await supabase
    .from('profiles')
    .update({ referred_by: referrer.id })
    .eq('id', userId)
    .is('referred_by', null)

  return NextResponse.json({ ok: true })
}
