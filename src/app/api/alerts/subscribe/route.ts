import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { logError } from '@/lib/errors'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  try {
    const { email, userId, preferences } = await request.json() as {
      email: string
      userId?: string | null
      preferences?: Record<string, boolean>
    }

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Valid email required' }, { status: 400 })
    }

    const prefs = preferences ?? {
      weekly_digest: true,
      deadline_reminders: true,
      new_in_field: true,
    }

    // Upsert subscriber
    const { error: dbError } = await supabase
      .from('email_subscribers')
      .upsert(
        { email, user_id: userId ?? null, preferences: prefs },
        { onConflict: 'email' }
      )

    if (dbError) {
      logError(dbError, 'alerts/subscribe: DB')
      return Response.json({ error: 'Could not save subscription' }, { status: 500 })
    }

    // Send welcome email (skip if API key is placeholder)
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your_resend_key') {
      await resend.emails.send({
        from: 'TANC <hello@tancglobal.com>',
        to: email,
        subject: 'Welcome to TANC — Your opportunities await',
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#0a1628">
            <div style="margin-bottom:24px">
              <span style="font-size:22px;font-weight:800;color:#0a1628">TANC</span>
            </div>
            <h1 style="font-size:24px;font-weight:700;margin:0 0 16px">You're in. 🎉</h1>
            <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 16px">
              Welcome to TANC — the place where every opportunity lives.
              You will now receive a <strong>weekly digest</strong> of scholarships, fellowships,
              internships and exchange programs that match your profile.
            </p>
            <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 28px">
              While you wait, browse opportunities that are open right now:
            </p>
            <a href="https://tancglobal.com/browse"
               style="display:inline-block;background:#1B2A6B;color:#ffffff;text-decoration:none;
                      padding:12px 28px;border-radius:8px;font-weight:700;font-size:15px">
              Browse Opportunities →
            </a>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0"/>
            <p style="font-size:12px;color:#94a3b8;margin:0">
              You're receiving this because you subscribed at tancglobal.com.
              <a href="https://tancglobal.com/unsubscribe" style="color:#94a3b8">Unsubscribe</a>
            </p>
          </div>
        `,
      })
    }

    return Response.json({ success: true })
  } catch (err) {
    logError(err, 'alerts/subscribe')
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
