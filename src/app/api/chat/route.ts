import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'i', 'me', 'my', 'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
  'am', 'have', 'has', 'had', 'do', 'does', 'did', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'this', 'that', 'these',
  'those', 'which', 'who', 'what', 'where', 'when', 'how', 'all', 'can', 'will',
  'just', 'should', 'would', 'could', 'looking', 'find', 'want', 'need', 'get',
  'apply', 'like', 'any', 'some', 'more', 'up', 'no', 'not', 'also', 'so',
  'than', 'there', 'it', 'its', 'they', 'their', 'we', 'our', 'you', 'your',
  'he', 'she', 'his', 'her', 'about', 'and', 'or', 'but', 'if', 'then',
  'hello', 'hi', 'hey', 'please', 'help', 'know', 'think', 'good', 'great',
])

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w))
    .slice(0, 6)
}

function escapeLike(s: string): string {
  return s.replace(/%/g, '\\%').replace(/_/g, '\\_')
}

function fmtDate(s: unknown): string {
  if (!s || typeof s !== 'string') return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ageFromDob(dob: unknown): number | null {
  if (!dob || typeof dob !== 'string') return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
}

function langList(langs: unknown): string {
  if (!langs || !Array.isArray(langs)) return 'Not specified'
  return (langs as unknown[]).map(l => {
    if (typeof l === 'string') return l
    if (l && typeof l === 'object') {
      const lo = l as { name?: string; level?: string }
      return lo.name ? (lo.level ? `${lo.name} (${lo.level})` : lo.name) : ''
    }
    return ''
  }).filter(Boolean).join(', ') || 'Not specified'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function profileSummary(p: Record<string, any>): string {
  const age = ageFromDob(p.date_of_birth)
  const nats = Array.isArray(p.nationalities) ? p.nationalities.join(', ') : '—'
  const lines = [
    `Name: ${[p.first_name, p.last_name].filter(Boolean).join(' ') || 'Not set'}`,
    `Nationality: ${nats}`,
    age ? `Age: ${age}` : '',
    `Education: ${p.education_level ?? '—'}${p.field_of_study ? ` in ${p.field_of_study}` : ''}`,
    p.institution_name ? `Institution: ${p.institution_name}` : '',
    `Languages: ${langList(p.languages)}`,
    p.gpa_value ? `GPA: ${p.gpa_value}/${p.gpa_scale ?? 4}` : '',
    p.years_work_experience ? `Work experience: ${p.years_work_experience} year(s)` : '',
    p.has_passport ? 'Has valid passport' : '',
    p.is_refugee ? 'Refugee status: yes' : '',
    p.is_first_generation ? 'First-generation student' : '',
    p.professional_sector ? `Sector: ${p.professional_sector}` : '',
    Array.isArray(p.target_countries) && p.target_countries.length
      ? `Target countries: ${p.target_countries.join(', ')}` : '',
  ].filter(Boolean)
  return lines.join('\n')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatOpp(o: Record<string, any>): string {
  const parts = [
    `Title: ${o.title ?? '—'}`,
    `Organisation: ${o.organization_name ?? o.organization ?? '—'}`,
    `Type: ${o.opportunity_type ?? o.type ?? '—'}`,
    `Country: ${o.country ?? '—'}`,
    `Funding: ${o.funding_type ?? '—'}`,
    `Deadline: ${fmtDate(o.application_deadline ?? o.deadline_date)}`,
    o.min_education_level ? `Min education: ${o.min_education_level}` : '',
    Array.isArray(o.required_nationalities) && o.required_nationalities.length
      ? `Open to: ${o.required_nationalities.join(', ')}` : '',
    o.min_age || o.max_age ? `Age: ${o.min_age ?? '—'}–${o.max_age ?? '—'}` : '',
    `URL: /opportunities/${o.id}`,
  ].filter(Boolean)
  return parts.join(' | ')
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const body = await request.json() as {
    messages: { role: 'user' | 'assistant'; content: string }[]
    userId?: string | null
    opportunityId?: string | null
  }

  const { messages, userId, opportunityId } = body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 })
  }

  const supabase = getServiceClient()
  const OPP_COLS = 'id, title, organization_name, opportunity_type, funding_type, country, application_deadline, min_education_level, required_nationalities, min_age, max_age, description'

  // 1. Fetch user profile
  let profileBlock = 'User is not logged in.'
  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (profile) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profileBlock = profileSummary(profile as Record<string, any>)
    }
  }

  // 2. Fetch the specific opportunity if user is on its page
  let currentOppBlock = ''
  if (opportunityId) {
    const { data: opp } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunityId)
      .single()
    if (opp) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const o = opp as Record<string, any>
      currentOppBlock = `\n\nThe user is currently viewing this opportunity — answer questions about it specifically:\n${formatOpp(o)}\n${o.description ? `Description: ${String(o.description).slice(0, 800)}` : ''}`
    }
  }

  // 3. Keyword-search relevant opportunities from latest user message
  const latestUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
  const keywords = extractKeywords(latestUserMsg)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let searchedOpps: Record<string, any>[] = []

  if (keywords.length > 0) {
    const conditions = keywords
      .flatMap(k => {
        const safe = escapeLike(k)
        return [`title.ilike.%${safe}%`, `description.ilike.%${safe}%`]
      })
      .join(',')

    const { data } = await supabase
      .from('opportunities')
      .select(OPP_COLS)
      .eq('is_published', true)
      .eq('is_archived', false)
      .or(conditions)
      .limit(8)

    searchedOpps = (data ?? []) as typeof searchedOpps
  }

  // Fallback: recent opportunities
  if (searchedOpps.length === 0) {
    const { data } = await supabase
      .from('opportunities')
      .select(OPP_COLS)
      .eq('is_published', true)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(8)

    searchedOpps = (data ?? []) as typeof searchedOpps
  }

  const oppsBlock = searchedOpps.length > 0
    ? searchedOpps.map(formatOpp).join('\n')
    : 'No opportunities found matching the query.'

  // 4. Build system prompt
  const systemPrompt = `You are the TANC opportunity assistant. TANC is a global platform for scholarships, fellowships, internships, exchange programmes, and competitions — for adults 18+.

User profile:
${profileBlock}

Relevant opportunities from the TANC database:
${oppsBlock}
${currentOppBlock}

Your role:
- Find specific matching opportunities from the database above and cite them by name
- When recommending an opportunity, always include its URL path: /opportunities/[id]
- Explain eligibility clearly — if there are gaps, describe them in plain, encouraging language and suggest how to close them
- Review essays and CVs paragraph by paragraph when asked — give concrete, specific feedback
- Help users understand deadlines, required documents, and application strategy
- Be warm, specific, and actionable. Never give generic advice.
- If the user asks about something outside your database, be honest and suggest they browse /opportunities

Formatting:
- Use short paragraphs
- Use bullet lists for eligibility requirements or steps
- Bold key terms with **bold** syntax
- Always end with a clear next action for the user`

  // 5. Stream response
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const encoder = new TextEncoder()

  // Anthropic requires messages start with 'user' — drop any leading assistant messages
  let trim = 0
  while (trim < messages.length && messages[trim].role === 'assistant') trim++
  const anthropicMessages = messages.slice(trim)

  if (anthropicMessages.length === 0) {
    return NextResponse.json({ error: 'No user messages' }, { status: 400 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          system: systemPrompt,
          messages: anthropicMessages,
          stream: true,
        })

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            )
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
