/**
 * Scraper: VolunteerWorld.com
 * Target: /en/volunteer-abroad listings
 * Sets opportunity_type = 'Volunteer', min_age = 18
 */

import fetch from 'node-fetch'
import { load } from 'cheerio'
import { delay, saveOpportunity, calculateCompleteness } from './lib/scraper-utils.js'

const BASE_URL = 'https://www.volunteerworld.com'
const LISTING_URL = `${BASE_URL}/en/volunteer-abroad`

// ── Expiry guard ─────────────────────────────────────────────────────────────

function isExpired(deadline) {
  if (!deadline) return false
  return new Date(deadline) < new Date(new Date().toISOString().split('T')[0])
}

// ── Date parsing ────────────────────────────────────────────────────────────

const DATE_PATTERNS = [
  /(?:deadline|apply by|application closes?|due)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
  /(?:deadline|apply by|application closes?|due)[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  /(?:deadline|apply by|due)[:\s]+(\d{4}-\d{2}-\d{2})/i,
  /(?:starts?|beginning|from)[:\s]+([A-Za-z]+ \d{4})/i,
]

function parseDeadline(text) {
  for (const pattern of DATE_PATTERNS) {
    const m = text.match(pattern)
    if (m) {
      const raw = m[1].replace(/(\d+)(?:st|nd|rd|th)/, '$1')
      try {
        const d = new Date(raw)
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
      } catch (_) {}
    }
  }
  return null
}

// ── Scrape a single program page ────────────────────────────────────────────

async function scrapeProgram(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = load(html)

  const title = $('h1').first().text().trim()
  if (!title) return null

  // Organization — look for provider/host org name
  const org = (
    $('[class*="organization"], [class*="provider"], [class*="host"]').first().text().trim() ||
    $('meta[name="author"]').attr('content') ||
    null
  )

  // Description
  const body = $('main, [class*="description"], [class*="content"], article').first()
  const paragraphs = []
  body.find('p').each((_, el) => {
    const t = $(el).text().trim()
    if (t.length > 40 && paragraphs.length < 3) paragraphs.push(t)
  })
  const description = paragraphs.join('\n\n') || null

  // Country from breadcrumb or location meta
  let country = $('[class*="location"], [class*="country"]').first().text().trim() || null
  if (country && country.length > 60) country = null

  // Apply link
  let applyUrl = null
  $('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase()
    const href  = $(el).attr('href') || ''
    if (!applyUrl && href.startsWith('http') && (text.includes('apply') || text.includes('book') || text.includes('join'))) {
      applyUrl = href
    }
  })
  if (!applyUrl) applyUrl = url

  const fullText = $('body').text()
  const deadline = parseDeadline(fullText)

  const tags = []
  $('a[rel="tag"], [class*="tag"] a, [class*="category"] a').each((_, el) => {
    const t = $(el).text().trim()
    if (t && t.length < 40) tags.push(t)
  })

  return { title, org, description, applyUrl, deadline, country, tags }
}

// ── Collect program URLs from listing page ───────────────────────────────────

function collectProgramUrls($) {
  const seen = new Set()
  const urls = []

  $('a[href*="/en/volunteer-abroad/"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const full = href.startsWith('http') ? href : `${BASE_URL}${href}`
    // Only individual program pages (deeper path), not the listing itself
    const path = href.replace(/^https?:\/\/[^/]+/, '')
    const segments = path.split('/').filter(Boolean)
    if (segments.length >= 3 && !seen.has(full)) {
      seen.add(full)
      urls.push(full)
    }
  })

  return urls
}

function hasNextPage($) {
  return $('a.next, a[rel="next"], [class*="pagination"] a[aria-label*="next" i], [class*="next-page"]').length > 0
}

function getNextUrl($, currentUrl) {
  const nextEl = $('a.next, a[rel="next"], [class*="pagination"] a[aria-label*="next" i]').first()
  const href = nextEl.attr('href')
  if (!href) return null
  return href.startsWith('http') ? href : `${BASE_URL}${href}`
}

// ── Scrape all listing pages ─────────────────────────────────────────────────

async function scrapeListings() {
  let url = LISTING_URL
  let page = 1

  while (url) {
    console.log(`\n[VolunteerWorld] page ${page}: ${url}`)

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' },
      })
      if (!res.ok) { console.log(`  HTTP ${res.status} — stopping`); break }

      const html = await res.text()
      const $ = load(html)
      const programUrls = collectProgramUrls($)

      if (programUrls.length === 0) { console.log('  No programs found — stopping pagination'); break }
      console.log(`  Found ${programUrls.length} programs`)

      for (const programUrl of programUrls) {
        await delay(2000)
        try {
          const program = await scrapeProgram(programUrl)
          if (!program || !program.title) continue

          if (isExpired(program.deadline)) { console.log('  Skip (expired):', program.title); continue }

          const record = {
            title:                program.title,
            organization_name:    program.org || null,
            opportunity_type:     'Volunteer',
            description:          program.description,
            apply_url:            program.applyUrl,
            source_url:           programUrl,
            application_deadline: program.deadline,
            country:              program.country || null,
            format:               'In-Person',
            tags:                 program.tags.length ? program.tags : null,
            is_published:         true,
            min_age:              18,
          }
          record.completeness_score = calculateCompleteness(record)
          await saveOpportunity(record)
        } catch (err) {
          console.error(`  Error scraping program ${programUrl}:`, err.message)
        }
      }

      const nextUrl = getNextUrl($, url)
      url = hasNextPage($) && nextUrl ? nextUrl : null
      page++
      if (url) await delay(2000)
    } catch (err) {
      console.error(`  Error fetching page ${url}:`, err.message)
      break
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== VolunteerWorld Scraper ===')
  await scrapeListings()
  console.log('\n=== VolunteerWorld scraper complete ===')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
