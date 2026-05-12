/**
 * Scraper: UN Online Volunteering (onlinevolunteering.org)
 * Target: /en/opportunities listings
 * Sets opportunity_type = 'Volunteer', format = 'Online'
 */

import fetch from 'node-fetch'
import { load } from 'cheerio'
import { delay, saveOpportunity, calculateCompleteness } from './lib/scraper-utils.js'

const BASE_URL = 'https://www.onlinevolunteering.org'
const LISTING_URL = `${BASE_URL}/en/opportunities`

// ── Expiry guard ─────────────────────────────────────────────────────────────

function isExpired(deadline) {
  if (!deadline) return false
  return new Date(deadline) < new Date(new Date().toISOString().split('T')[0])
}

// ── Date parsing ────────────────────────────────────────────────────────────

const DATE_PATTERNS = [
  /(?:deadline|apply by|application closes?|closing date)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
  /(?:deadline|apply by|application closes?|closing date)[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  /(?:deadline|apply by|closing date)[:\s]+(\d{4}-\d{2}-\d{2})/i,
  /(?:deadline|due date)[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i,
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

// ── Scrape a single opportunity page ────────────────────────────────────────

async function scrapeOpportunity(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = load(html)

  const title = $('h1').first().text().trim()
  if (!title) return null

  // Organization — typically listed as "Requested by: XYZ"
  let org = null
  $('*').each((_, el) => {
    const text = $(el).text().trim()
    const m = text.match(/(?:requested by|organization|hosted by|offered by)[:\s]+([^\n]+)/i)
    if (!org && m && m[1].length < 100) org = m[1].trim()
  })

  // Description
  const body = $('main, [class*="description"], [class*="content"], article, .field-item').first()
  const paragraphs = []
  body.find('p').each((_, el) => {
    const t = $(el).text().trim()
    if (t.length > 40 && paragraphs.length < 3) paragraphs.push(t)
  })
  const description = paragraphs.join('\n\n') || null

  // Apply URL — UN OV uses internal application flow
  const applyUrl = url

  const fullText = $('body').text()
  const deadline = parseDeadline(fullText)

  // Tags / categories from page
  const tags = []
  $('[class*="category"] a, [class*="theme"] a, [class*="tag"] a, [class*="cause"] a').each((_, el) => {
    const t = $(el).text().trim()
    if (t && t.length < 50) tags.push(t)
  })

  return { title, org, description, applyUrl, deadline, tags }
}

// ── Collect opportunity URLs from listing ────────────────────────────────────

function collectOpportunityUrls($) {
  const seen = new Set()
  const urls = []

  $('a[href*="/en/opportunities/"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const full = href.startsWith('http') ? href : `${BASE_URL}${href}`
    // Individual opp pages have a numeric ID or slug after /opportunities/
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
  return $('a.next, a[rel="next"], [class*="pager"] a[aria-label*="next" i], li.pager__item--next a').length > 0
}

function getNextUrl($) {
  const nextEl = $(
    'a.next, a[rel="next"], [class*="pager"] a[aria-label*="next" i], li.pager__item--next a'
  ).first()
  const href = nextEl.attr('href')
  if (!href) return null
  return href.startsWith('http') ? href : `${BASE_URL}${href}`
}

// ── Scrape all listing pages ─────────────────────────────────────────────────

async function scrapeListings() {
  let url = LISTING_URL
  let page = 1

  while (url) {
    console.log(`\n[UNVolunteers] page ${page}: ${url}`)

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' },
      })
      if (!res.ok) { console.log(`  HTTP ${res.status} — stopping`); break }

      const html = await res.text()
      const $ = load(html)
      const oppUrls = collectOpportunityUrls($)

      if (oppUrls.length === 0) { console.log('  No opportunities found — stopping pagination'); break }
      console.log(`  Found ${oppUrls.length} opportunities`)

      for (const oppUrl of oppUrls) {
        await delay(2000)
        try {
          const opp = await scrapeOpportunity(oppUrl)
          if (!opp || !opp.title) continue

          if (isExpired(opp.deadline)) { console.log('  Skip (expired):', opp.title); continue }

          const record = {
            title:                opp.title,
            organization_name:    opp.org || null,
            opportunity_type:     'Volunteer',
            description:          opp.description,
            apply_url:            opp.applyUrl,
            source_url:           oppUrl,
            application_deadline: opp.deadline,
            format:               'Online',
            tags:                 opp.tags.length ? opp.tags : null,
            is_published:         true,
            min_age:              18,
          }
          record.completeness_score = calculateCompleteness(record)
          await saveOpportunity(record)
        } catch (err) {
          console.error(`  Error scraping opportunity ${oppUrl}:`, err.message)
        }
      }

      const nextUrl = getNextUrl($)
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
  console.log('=== UN Online Volunteers Scraper ===')
  await scrapeListings()
  console.log('\n=== UN Online Volunteers scraper complete ===')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
