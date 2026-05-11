import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

  const { data: expired, error: fetchErr } = await supabase
    .from('opportunities')
    .select('id')
    .lt('application_deadline', new Date().toISOString())
    .eq('is_archived', false)

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  const ids = (expired ?? []).map((r) => r.id)

  if (ids.length > 0) {
    const { error: updateErr } = await supabase
      .from('opportunities')
      .update({ is_archived: true })
      .in('id', ids)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }
  }

  console.log(`[cron/archive] Archived ${ids.length} expired opportunities`)
  return NextResponse.json({ archived: ids.length, timestamp: new Date() })
}
