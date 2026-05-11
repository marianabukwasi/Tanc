import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

// ── Load .env.local from project root ──────────────────────────────────────
const __filename = fileURLToPath(import.meta.url)
const projectRoot = resolve(dirname(__filename), '..', '..')

try {
  const content = readFileSync(resolve(projectRoot, '.env.local'), 'utf-8')
  for (const line of content.split('\n')) {
    const eq = line.indexOf('=')
    if (eq > 0 && !line.startsWith('#')) {
      const key = line.slice(0, eq).trim()
      const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (key && !process.env[key]) process.env[key] = val
    }
  }
} catch (_) {
  // .env.local not found — rely on environment already set
}

// ── Supabase client (service role) ─────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
})

// ── delay ──────────────────────────────────────────────────────────────────
export function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ── calculateCompleteness ──────────────────────────────────────────────────
const SCORED_FIELDS = [
  'title', 'organization_name', 'description', 'application_deadline',
  'apply_url', 'funding_type', 'country', 'opportunity_type',
  'min_education_level', 'tags',
]

export function calculateCompleteness(record) {
  const filled = SCORED_FIELDS.filter(f => {
    const v = record[f]
    if (v == null || v === '') return false
    if (Array.isArray(v) && v.length === 0) return false
    return true
  }).length
  return Math.round((filled / SCORED_FIELDS.length) * 100)
}

// ── saveOpportunity ────────────────────────────────────────────────────────
export async function saveOpportunity(data) {
  const title = (data.title || '').trim()
  if (!title) return

  // Dedup: skip if same title + org exists within 90 days
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  let query = supabase
    .from('opportunities')
    .select('id')
    .ilike('title', title)
    .gte('created_at', cutoff.toISOString())

  if (data.organization_name) {
    query = query.ilike('organization_name', data.organization_name.trim())
  }

  const { data: existing, error: checkErr } = await query.limit(1)
  if (checkErr) {
    console.error('Dedup check error:', checkErr.message)
  }
  if (existing && existing.length > 0) {
    console.log('  Skip (exists):', title)
    return
  }

  const { error } = await supabase.from('opportunities').insert({
    ...data,
    title,
    organization_name: data.organization_name?.trim() || null,
  })

  if (error) {
    console.error('  Insert error:', error.message, '|', title)
  } else {
    console.log('  Saved:', title)
  }
}
