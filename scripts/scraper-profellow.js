/**
 * Scraper: ProFellow.com — Fellowship database
 * Target: https://www.profellow.com/fellowships/
 */

import fetch from 'node-fetch'
import { load } from 'cheerio'
import { delay, saveOpportunity, calculateCompleteness } from './lib/scraper-utils.js'

const BASE_URL = 'https://www.profellow.com/fellowships/'
const OPPORTUNITY_TYPE = 'Fellowship'
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' }

// ── Date parsing ────────────────────────────────────────────────────────────

const DATE_PATTERNS = [
  /(?:deadline|due|closing)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
  /(?:deadline|due|closing)[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  /(?:deadline|due|closing)[:\s]+(\d{4}-\d{2}-\d{2})/i,
  /deadline[:\s]*([\w]+ \d{1,2},?\s+\d{4})/i,
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

// ── Scrape single fellowship page ───────────────────────────────────────────

async function scrapeFellowshipPage(url) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = load(html)

  const title = $('h1.entry-title, h1.fellowship-title, h1.post-title, h1').first().text().trim()
  if (!title) return null

  // Organisation from structured fields or meta
  const org =
    $('.fellowship-organization, .org-name, [class*="organization"]').first().text().trim() ||
    $('meta[property="og:site_name"]').attr('content') ||
    null

  // Description: first 2 paragraphs
  const body = $('.entry-content, .fellowship-content, .post-content, article').first()
  const paragraphs = []
  body.find('p').each((_, el) => {
    const t = $(el).text().trim()
    if (t.length > 40 && paragraphs.length < 2) paragraphs.push(t)
  })
  const description = paragraphs.join('\n\n') || null

  // Apply URL
  let applyUrl = null
  body.find('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase()
    const href  = $(el).attr('href') || ''
    if (!applyUrl && href && (text.includes('apply') || text.includes('official'))) {
      applyUrl = href
    }
  })

  const fullText = $.text()
  const deadline = parseDeadline(fullText)

  // Funding type hints
  const lowerText = fullText.toLowerCase()
  let fundingType = null
  if (lowerText.includes('fully funded') || lowerText.includes('full funding')) fundingType = 'Fully Funded'
  else if (lowerText.includes('stipend')) fundingType = 'Stipend'
  else if (lowerText.includes('partial')) fundingType = 'Partially Funded'

  // Tags
  const tags = []
  $('a[rel="tag"], .tags a, .fellowship-tags a').each((_, el) => {
    const t = $(el).text().trim()
    if (t) tags.push(t)
  })

  return { title, org: org || null, description, applyUrl, deadline, fundingType, tags }
}

// ── Collect fellowship URLs from listing page ───────────────────────────────

function collectUrls($) {
  const seen = new Set()
  const urls = []
  $('h2 a, h3 a, .fellowship-title a, .entry-title a, article a[href*="profellow.com/fellowship"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (href && href.includes('profellow.com') && !href.includes('/category') && !href.includes('/page') && !seen.has(href)) {
      seen.add(href)
      urls.push(href)
    }
  })
  return urls
}

function hasNextPage($) {
  return $('a.next, a[rel="next"], .nav-links .next, .pagination .next, a[aria-label="Next Page"]').length > 0
}

// ── Main paginated scrape ───────────────────────────────────────────────────

async function scrapeAll() {
  let page = 1
  let proceed = true

  while (proceed) {
    const url = page === 1 ? BASE_URL : `${BASE_URL}page/${page}/`
    console.log(`\n[ProFellow] Page ${page}: ${url}`)

    try {
      const res = await fetch(url, { headers: HEADERS })
      if (!res.ok) { console.log(`  HTTP ${res.status} — stopping`); break }

      const html = await res.text()
      const $ = load(html)
      const fellowshipUrls = collectUrls($)

      if (fellowshipUrls.length === 0) { console.log('  No fellowships found — stopping'); break }
      console.log(`  Found ${fellowshipUrls.length} fellowships`)

      for (const fellowUrl of fellowshipUrls) {
        await delay(2000)
        try {
          const f = await scrapeFellowshipPage(fellowUrl)
          if (!f || !f.title) continue

          const record = {
            title:                f.title,
            organization_name:    f.org,
            opportunity_type:     OPPORTUNITY_TYPE,
            description:          f.description,
            apply_url:            f.applyUrl,
            source_url:           fellowUrl,
            application_deadline: f.deadline,
            funding_type:         f.fundingType,
            tags:                 f.tags.length ? f.tags : null,
            is_published:         true,
            min_age:              18,
          }
          record.completeness_score = calculateCompleteness(record)
          await saveOpportunity(record)
        } catch (err) {
          console.error(`  Error scraping ${fellowUrl}:`, err.message)
        }
      }

      proceed = hasNextPage($)
      page++
      await delay(2000)
    } catch (err) {
      console.error(`  Error on page ${page}:`, err.message)
      proceed = false
    }
  }
}

// ── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  console.log('=== ProFellow Scraper ===')
  await scrapeAll()
  console.log('\n=== ProFellow scraper complete ===')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
