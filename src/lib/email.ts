import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'TANC <notifications@tancglobal.com>'
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tancglobal.com'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function deadlineBadge(s: string | null | undefined): string {
  if (!s) return ''
  const days = Math.ceil((new Date(s).getTime() - Date.now()) / 86400000)
  if (days < 0) return '<span style="color:#94a3b8">Deadline passed</span>'
  if (days === 0) return '<span style="color:#dc2626;font-weight:700">Due today!</span>'
  if (days <= 7) return `<span style="color:#dc2626;font-weight:700">${days} day${days !== 1 ? 's' : ''} left</span>`
  if (days <= 30) return `<span style="color:#d97706;font-weight:700">${days} days left</span>`
  return `<span style="color:#15803d">${days} days left</span>`
}

function emailShell(body: string, footerExtra = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">

<tr>
  <td style="background:#0a1628;padding:20px 32px">
    <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">TANC</span>
    <span style="font-size:11px;color:#64748b;margin-left:8px">Opportunities for Tomorrow</span>
  </td>
</tr>

<tr>
  <td style="padding:32px 32px 24px">
    ${body}
  </td>
</tr>

<tr>
  <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px">
    <p style="font-size:12px;color:#94a3b8;margin:0 0 8px">You are receiving this because you enabled notifications on TANC.</p>
    <a href="${BASE}/profile" style="font-size:12px;color:#d4a017;text-decoration:none">Manage notification preferences</a>${footerExtra ? ` &middot; ${footerExtra}` : ''}
  </td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

// ─── Opportunity card (email) ─────────────────────────────────────────────────

interface EmailOpp {
  id: string
  title: string
  organization_name: string | null
  opportunity_type?: string
  matchScore?: number
  application_deadline?: string | null
}

function oppCard(opp: EmailOpp): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px">
<tr>
  <td style="padding:16px">
    <div style="font-size:15px;font-weight:700;color:#0a1628;margin-bottom:4px">${opp.title}</div>
    <div style="font-size:13px;color:#64748b;margin-bottom:10px">${[opp.organization_name, opp.opportunity_type].filter(Boolean).join(' &middot; ')}</div>
    <table cellpadding="0" cellspacing="0"><tr>
      ${opp.matchScore !== undefined ? `<td style="padding-right:14px"><span style="font-size:12px;font-weight:700;color:#ffffff;background:#d4a017;border-radius:20px;padding:3px 10px">${opp.matchScore}% match</span></td>` : ''}
      ${opp.application_deadline ? `<td style="font-size:12px;color:#64748b">Deadline: ${fmtDate(opp.application_deadline)} &mdash; ${deadlineBadge(opp.application_deadline)}</td>` : ''}
    </tr></table>
    <div style="margin-top:12px">
      <a href="${BASE}/opportunities/${opp.id}" style="display:inline-block;background:#0a1628;color:#ffffff;text-decoration:none;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:600">View opportunity &rarr;</a>
    </div>
  </td>
</tr>
</table>`
}

// ─── sendInstantMatchAlert ────────────────────────────────────────────────────

export async function sendInstantMatchAlert(
  userEmail: string,
  userName: string,
  opportunities: EmailOpp[],
): Promise<void> {
  if (!opportunities.length) return

  const body = `
<h2 style="font-size:22px;font-weight:800;color:#0a1628;margin:0 0 8px">New matches found for you</h2>
<p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px">
  Hi ${userName}, we found ${opportunities.length} new opportunit${opportunities.length === 1 ? 'y' : 'ies'} that match your profile at 85% or higher.
</p>
${opportunities.map(oppCard).join('')}`

  await resend.emails.send({
    from: FROM,
    to: userEmail,
    subject: 'New opportunities matched to your profile on TANC',
    html: emailShell(body),
  })
}

// ─── sendDeadlineReminder ─────────────────────────────────────────────────────

export async function sendDeadlineReminder(
  userEmail: string,
  userName: string,
  opportunity: {
    id: string
    title: string
    organization_name: string | null
    apply_url: string | null
    application_deadline: string | null
  },
  daysRemaining: number,
  tasksRemaining = 0,
): Promise<void> {
  const urgencyIcon = daysRemaining <= 2 ? '&#x1F6A8;' : daysRemaining <= 7 ? '&#x26A0;&#xFE0F;' : '&#x1F4C5;'

  const body = `
<h2 style="font-size:22px;font-weight:800;color:#0a1628;margin:0 0 8px">${urgencyIcon} ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left to apply</h2>
<p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px">
  Hi ${userName}, the deadline for <strong>${opportunity.title}</strong> is approaching.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px">
<tr>
  <td style="padding:20px">
    <div style="font-size:17px;font-weight:700;color:#0a1628;margin-bottom:4px">${opportunity.title}</div>
    <div style="font-size:13px;color:#64748b;margin-bottom:12px">${opportunity.organization_name ?? ''}</div>
    <div style="font-size:13px;color:#475569;margin-bottom:4px">
      Deadline: <strong>${fmtDate(opportunity.application_deadline)}</strong> &mdash; ${deadlineBadge(opportunity.application_deadline)}
    </div>
    <div style="font-size:13px;margin-top:10px;${tasksRemaining > 0 ? 'color:#d97706' : 'color:#15803d'}">
      ${tasksRemaining > 0
        ? `${tasksRemaining} task${tasksRemaining !== 1 ? 's' : ''} still to complete before submitting.`
        : 'All tasks complete &mdash; you are ready to apply!'}
    </div>
  </td>
</tr>
</table>

<a href="${opportunity.apply_url ?? `${BASE}/opportunities/${opportunity.id}`}"
   style="display:inline-block;background:#0a1628;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:700">
  Apply Now &rarr;
</a>
<div style="margin-top:14px">
  <a href="${BASE}/tracker" style="font-size:13px;color:#64748b;text-decoration:none">View in your tracker &rarr;</a>
</div>`

  await resend.emails.send({
    from: FROM,
    to: userEmail,
    subject: `Reminder: ${opportunity.title} closes in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
    html: emailShell(body),
  })
}

// ─── sendWeeklyDigest ─────────────────────────────────────────────────────────

export async function sendWeeklyDigest(
  userEmail: string,
  userName: string,
  opportunities: EmailOpp[],
): Promise<void> {
  if (!opportunities.length) return

  const top = opportunities.slice(0, 10)

  const body = `
<h2 style="font-size:22px;font-weight:800;color:#0a1628;margin:0 0 8px">Your TANC weekly digest</h2>
<p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px">
  Hi ${userName}, here are the ${top.length} new opportunit${top.length === 1 ? 'y' : 'ies'} added this week that match your profile.
</p>
${top.map(oppCard).join('')}
<div style="margin-top:24px;text-align:center">
  <a href="${BASE}/opportunities"
     style="display:inline-block;background:#0a1628;color:#ffffff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:14px;font-weight:600">
    View all matches &rarr;
  </a>
</div>`

  const unsubLink = `<a href="${BASE}/profile" style="font-size:12px;color:#94a3b8;text-decoration:none">Unsubscribe</a>`

  await resend.emails.send({
    from: FROM,
    to: userEmail,
    subject: `Your TANC weekly digest — ${opportunities.length} new match${opportunities.length !== 1 ? 'es' : ''}`,
    html: emailShell(body, unsubLink),
  })
}

// ─── sendWelcomeEmail ─────────────────────────────────────────────────────────

export async function sendWelcomeEmail(
  userEmail: string,
  userName: string,
  topMatches: { id: string; title: string; organization_name: string | null }[] = [],
): Promise<void> {
  const matchCards = topMatches.length > 0
    ? `<p style="font-size:15px;font-weight:700;color:#0a1628;margin:28px 0 12px">A few opportunities to start with:</p>
       ${topMatches.slice(0, 3).map(m => oppCard(m)).join('')}`
    : ''

  const body = `
<h2 style="font-size:22px;font-weight:800;color:#0a1628;margin:0 0 8px">Welcome to TANC, ${userName}!</h2>
<p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 20px">
  TANC is the all-in-one platform for scholarships, fellowships, internships, and global opportunities.
  Complete your profile to unlock personalised match scores and instant alerts when new opportunities land.
</p>
<a href="${BASE}/profile/setup"
   style="display:inline-block;background:#d4a017;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:700">
  Complete your profile &rarr;
</a>
${matchCards}
<div style="margin-top:24px">
  <a href="${BASE}/opportunities" style="font-size:14px;color:#0a1628;font-weight:600;text-decoration:none">Browse all opportunities &rarr;</a>
</div>`

  await resend.emails.send({
    from: FROM,
    to: userEmail,
    subject: 'Welcome to TANC — your opportunities are waiting',
    html: emailShell(body),
  })
}
