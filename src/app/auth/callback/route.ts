import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Apply referral if cookie present
        const referralCode = cookieStore.get('referral_code')?.value
        if (referralCode) {
          const service = getServiceClient()
          const { data: referrer } = await service
            .from('profiles')
            .select('id')
            .eq('referral_code', referralCode)
            .single()
          if (referrer && referrer.id !== user.id) {
            await service
              .from('profiles')
              .update({ referred_by: referrer.id })
              .eq('id', user.id)
              .is('referred_by', null)
          }
          // Clear the referral cookie
          cookieStore.set('referral_code', '', { maxAge: 0, path: '/' })
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('country_of_residence')
          .eq('id', user.id)
          .single()
        if (!profile?.country_of_residence) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}
