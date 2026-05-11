import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendDeadlineReminder } from '@/lib/email'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// Returns YYYY-MM-DD for today + N days
function targetDate(daysAhead: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  const auth = request.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()

  // Reminder windows: 30, 14, 7, 2 days before deadline
  const REMINDER_DAYS = [30, 14, 7, 2]
  const targets = REMINDER_DAYS.map(targetDate)

  // Fetch user_opportunities with opportunity deadline and user email
  const { data: rawEntries } = await supabase
    .from('user_opportunities')
    .select(`
      user_id,
      tasks,
      opportunities (
        id, title, organization_name, apply_url, application_deadline
      ),
      profiles!user_id (
        email, first_name, notification_reminders
      )
    `)

  if (!rawEntries || rawEntries.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  let sent = 0

  for (const entry of rawEntries) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = entry as Record<string, any>
    const opp     = e.opportunities
    const profile = e.profiles

    if (!profile?.notification_reminders || !profile.email) continue
    if (!opp?.application_deadline) continue

    // Match deadline to one of the target windows
    const deadlineDay = (opp.application_deadline as string).slice(0, 10)
    const dayIdx = targets.indexOf(deadlineDay)
    if (dayIdx === -1) continue

    const daysRemaining = REMINDER_DAYS[dayIdx]
    const tasks = (e.tasks ?? []) as { done: boolean }[]
    const tasksRemaining = tasks.filter(t => !t.done).length
    const name = (profile.first_name as string | null) || 'there'

    await sendDeadlineReminder(
      profile.email as string,
      name,
      {
        id:                   opp.id as string,
        title:                opp.title as string,
        organization_name:    opp.organization_name as string | null,
        apply_url:            opp.apply_url as string | null,
        application_deadline: opp.application_deadline as string,
      },
      daysRemaining,
      tasksRemaining,
    )
    sent++
  }

  console.log(`[cron/reminders] Sent ${sent} deadline reminder email(s)`)
  return NextResponse.json({ sent, timestamp: new Date() })
}
