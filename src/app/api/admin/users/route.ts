import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: Request) {
  const callerEmail = request.headers.get('x-admin-email')
  if (!callerEmail || callerEmail !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [{ data: profiles }, { count: subscriberCount }] = await Promise.all([
    adminSupabase
      .from('profiles')
      .select('id, full_name, email, nationality, education_level, profile_complete'),
    adminSupabase
      .from('email_subscribers')
      .select('*', { count: 'exact', head: true }),
  ])

  return Response.json({
    profiles: profiles ?? [],
    subscriberCount: subscriberCount ?? 0,
  })
}
