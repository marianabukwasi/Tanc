/**
 * Scraper: YouthOP.com
 * Target: https://youthop.com/opportunities
 * Only saves items with no min_age restriction or min_age <= 18
 */

import fetch from 'node-fetch'
import { load } from 'cheerio'
import { delay, saveOpportunity, calculateCompleteness } from './lib/scraper-utils.js'

const BASE_URL = 'https://youthop.com'
const LISTING_URL = `${BASE_URL}/opportunities`
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' }

// ── Expiry guard ─────────────────────────────────────────────────────────────

function isExpired(deadline) {
  if (!deadline) return false
  return new Date(deadline) < new Date(new Date().toISOString().split('T')[0])
}

// ── Date parsing ────────────────────────────────────────────────────────────

const DATE_PATTERNS = [
  /(?:deadline|apply by|due|closing date|closes?)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
  /(?:deadline|apply by|due|closing date|closes?)[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  /(?:deadline|apply by|due)[:\s]+(\d{4}-\d{2}-\d{2})/i,
  /(?:deadline|apply by|due)[:\s]+(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+\d{4})/i,
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

// ── Type inference ────────────────────────────────────────────────────────────

const TYPE_MAP = {
  scholarship: 'Scholarship', fellowship: 'Fellowship', internship: 'Internship',
  grant: 'Grant', competition: 'Competition', conference: 'Conference',
  volunteer: 'Volunteer Programs', training: 'Training Programs', exchange: 'Exchange Programs',
  award: 'Award',
}

function inferType(text) {
  const lower = text.toLowerCase()
  for (const [key, val] of Object.entries(TYPE_MAP)) {
    if (lower.includes(key)) return val
  }
  return 'Other'
}

// ── Scrape a single opportunity page ─────────────────────────────────────────

async function scrapePost(url) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = load(html)

  const title = $('h1.entry-title, h1.post-title, h1').first().text().trim()
  if (!title) return null

  const categories = []
  $('a[rel="category tag"], .cat-links a, .post-categories a, .category a').each((_, el) => {
    categories.push($(el).text().trim())
  })
  const opportunityType = inferType(`${url} ${categories.join(' ')} ${title}`)

  const orgPatterns = [
    /^(.+?)\s+(?:\d{4}\s+)?(?:Scholarship|Fellowship|Internship|Grant|Program|Award|Competition)/i,
  ]
  let org = null
  for (const pat of orgPatterns) {
    const m = title.match(pat)
    if (m && m[1].length < 70) { org = m[1].trim(); break }
  }

  const body = $('.entry-content, .post-content, .opportunity-content, article').first()
  const paragraphs = []
  body.find('p').each((_, el) => {
    const t = $(el).text().trim()
    if (t.length > 40 && paragraphs.length < 2) paragraphs.push(t)
  })
  const description = paragraphs.join('\n\n') || null

  let applyUrl = null
  body.find('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase()
    const href  = $(el).attr('href') || ''
    if (!applyUrl && href && (text.includes('apply') || text.includes('official') || text.includes('click here'))) {
      applyUrl = href
    }
  })

  const fullText = body.text()
  const deadline = parseDeadline(fullText)

  const lowerText = fullText.toLowerCase()
  let fundingType = null
  if (lowerText.includes('fully funded')) fundingType = 'Fully Funded'
  else if (lowerText.includes('stipend'))  fundingType = 'Stipend'
  else if (lowerText.includes('partial'))  fundingType = 'Partially Funded'
  else if (lowerText.includes('free'))     fundingType = 'Free'

  // Skip listings that explicitly restrict to over-25 only
  const ageMatch = fullText.match(/(?:age|aged?)\s*(?:limit|between|from|of)?\s*(\d{2})\s*(?:to|-)\s*(\d{2})/i)
  if (ageMatch && parseInt(ageMatch[1], 10) > 25) return null

  let country = null
  const countryM = fullText.match(/(?:hosted|held|open to)\s+in\s+([A-Z][a-z]+(?: [A-Z][a-z]+)?)/)
  if (countryM) country = countryM[1]

  const tags = []
  $('a[rel="tag"], .tags a, .post-tags a').each((_, el) => {
    const t = $(el).text().trim()
    if (t) tags.push(t)
  })

  return { title, org, opportunityType, description, applyUrl, deadline, fundingType, country, tags }
}

// ── Collect post URLs ─────────────────────────────────────────────────────────

function collectPostUrls($) {
  const seen = new Set()
  const urls = []
  $('article h2 a, article h3 a, h2.entry-title a, h3.entry-title a, .post-title a, .opportunity-title a').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (href && (href.includes('youthop.com') || href.startsWith('/')) && !seen.has(href)) {
      seen.add(href)
      urls.push(href.startsWith('/') ? `${BASE_URL}${href}` : href)
    }
  })
  return urls
}

function hasNextPage($) {
  return $('a.next, a[rel="next"], .nav-links .next, .pagination .next').length > 0
}

// ── Paginated scrape ──────────────────────────────────────────────────────────

async function scrapeAll() {
  let page = 1
  let proceed = true

  while (proceed) {
    const url = page === 1 ? LISTING_URL : `${LISTING_URL}/page/${page}`
    console.log(`\n[YouthOP] Page ${page}: ${url}`)

    try {
      const res = await fetch(url, { headers: HEADERS })
      if (!res.ok) { console.log(`  HTTP ${res.status} — stopping`); break }

      const html = await res.text()
      const $ = load(html)
      const postUrls = collectPostUrls($)

      if (postUrls.length === 0) { console.log('  No posts found — stopping'); break }
      console.log(`  Found ${postUrls.length} posts`)

      for (const postUrl of postUrls) {
        await delay(2000)
        try {
          const post = await scrapePost(postUrl)
          if (!post || !post.title) continue

          if (isExpired(post.deadline)) { console.log('  Skip (expired):', post.title); continue }

          const record = {
            title:                post.title,
            organization_name:    post.org || null,
            opportunity_type:     post.opportunityType,
            description:          post.description,
            apply_url:            post.applyUrl,
            source_url:           postUrl,
            application_deadline: post.deadline,
            funding_type:         post.fundingType || null,
            country:              post.country || null,
            tags:                 post.tags.length ? post.tags : null,
            is_published:         true,
            min_age:              18,
          }
          record.completeness_score = calculateCompleteness(record)
          await saveOpportunity(record)
        } catch (err) {
          console.error(`  Error scraping ${postUrl}:`, err.message)
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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== YouthOP Scraper ===')
  await scrapeAll()
  console.log('\n=== YouthOP scraper complete ===')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
