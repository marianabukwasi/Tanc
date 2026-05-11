import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  const adminEmail = request.headers.get('x-admin-email')
  if (!adminEmail || adminEmail !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { url } = (await request.json()) as { url?: string }
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  let html: string
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANCBot/1.0)' },
      signal: AbortSignal.timeout(10_000),
    })
    html = await res.text()
  } catch (err) {
    return NextResponse.json({ error: `Failed to fetch URL: ${String(err)}` }, { status: 422 })
  }

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000)

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `Extract structured opportunity data from this webpage text. Return ONLY valid JSON — no prose, no markdown fences.

Schema (use null for missing fields, empty array [] for unknown arrays):
{
  "title": string,
  "organization_name": string,
  "opportunity_type": "Scholarship"|"Fellowship"|"Internship"|"Exchange Program"|"Conference"|"Competition"|"Other",
  "country": string,
  "continent": "Africa"|"Europe"|"North America"|"South America"|"Asia"|"Oceania"|"Global",
  "application_deadline": "YYYY-MM-DD"|null,
  "funding_type": "Fully Funded"|"Partial Funding"|"Stipend"|"Self-funded"|null,
  "min_education_level": "High School"|"Undergraduate"|"Masters"|"PhD"|null,
  "description": string,
  "apply_url": string|null,
  "required_nationalities": string[],
  "min_age": number|null,
  "max_age": number|null,
  "covers_tuition": boolean,
  "covers_flights": boolean,
  "covers_accommodation": boolean,
  "covers_meals": boolean,
  "stipend_amount": number|null,
  "stipend_currency": string|null,
  "requires_cv": boolean,
  "requires_motivation_letter": boolean,
  "requires_recommendations": boolean,
  "refugee_friendly": boolean,
  "first_gen_preferred": boolean
}

Webpage text:
${text}`,
    }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 })

  try {
    const data = JSON.parse(match[0])
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from AI' }, { status: 500 })
  }
}
