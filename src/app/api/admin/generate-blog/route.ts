import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

export async function POST(request: Request) {
  const callerEmail = request.headers.get('x-admin-email')
  if (!callerEmail || callerEmail !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as { topic?: string; tags?: string[] }
  const { topic, tags = [] } = body
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 })

  const client = new Anthropic()
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Write a helpful blog post about: "${topic}"

Return a JSON object with these exact keys:
- title: string (compelling, SEO-friendly title)
- description: string (2-sentence summary, under 160 chars total)
- content: string (700-1000 word article with clear paragraphs, written for international students and opportunity seekers)

Return ONLY valid JSON. No markdown code fences.`,
    }],
  })

  let parsed: { title: string; description: string; content: string }
  try {
    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    parsed = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  const slug = slugify(parsed.title) + '-' + Date.now().toString(36)
  const supabase = getServiceClient()

  const { data: post, error } = await supabase
    .from('blog_posts')
    .insert({
      slug,
      title: parsed.title,
      description: parsed.description,
      content: parsed.content,
      tags,
      status: 'draft',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post })
}
