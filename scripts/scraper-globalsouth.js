/**
 * Scraper: GlobalSouthOpportunities.com
 * Target: https://www.globalsouthopportunities.com/
 */

import fetch from 'node-fetch'
import { load } from 'cheerio'
import { delay, saveOpportunity, calculateCompleteness } from './lib/scraper-utils.js'

const BASE_URL = 'https://www.globalsouthopportunities.com/'
const HEADERS  = { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' }

// ── Type mapping from post categories ──────────────────────────────────────

const TYPE_MAP = {
  scholarship:  'Scholarship',
  fellowship:   'Fellowship',
  internship:   'Internship',
  grant:        'Grant',
  conference:   'Conference',
  competition:  'Competition',
  training:     'Training Programs',
  exchange:     'Exchange Programs',
  workshop:     'Workshop',
  award:        'Award',
  call:         'Grant',
  research:     'Research Programs',
  volunteer:    'Volunteer Programs',
}

function inferType(url, categoryText) {
  const combined = `${url} ${categoryText}`.toLowerCase()
  for (const [key, val] of Object.entries(TYPE_MAP)) {
    if (combined.includes(key)) return val
  }
  return 'Other'
}

// ── Date parsing ────────────────────────────────────────────────────────────

const DATE_PATTERNS = [
  /(?:deadline|closing date|apply by|due)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
  /(?:deadline|closing date|apply by|due)[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  /(?:deadline|closing date|apply by|due)[:\s]+(\d{4}-\d{2}-\d{2})/i,
  /(\d{1,2}\s+[A-Za-z]+\s+\d{4})\s+(?:is the deadline|deadline)/i,
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

// ── Scrape a single post page ───────────────────────────────────────────────

async function scrapePost(url) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = load(html)

  const title = $('h1.entry-title, h1.post-title, h1').first().text().trim()
  if (!title) return null

  // Categories for type inference
  const categories = []
  $('a[rel="category tag"], .cat-links a, .post-categories a').each((_, el) => {
    categories.push($(el).text().trim())
  })
  const opportunityType = inferType(url, categories.join(' '))

  // Organisation
  let org = null
  const orgPatterns = [
    /^(.+?)\s+(?:\d{4}\s+)?(?:Scholarship|Fellowship|Internship|Grant|Program|Award|Prize|Competition)/i,
    /^(.+?)\s+Offers\s+/i,
  ]
  for (const pat of orgPatterns) {
    const m = title.match(pat)
    if (m && m[1].length < 70) { org = m[1].trim(); break }
  }

  // Description
  const body = $('.entry-content, .post-content, .article-body, article .content').first()
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
    if (!applyUrl && href && (text.includes('apply') || text.includes('official link') || text.includes('click here'))) {
      applyUrl = href
    }
  })

  const fullText = body.text()
  const deadline = parseDeadline(fullText)

  // Funding type
  const lowerText = fullText.toLowerCase()
  let fundingType = null
  if (lowerText.includes('fully funded')) fundingType = 'Fully Funded'
  else if (lowerText.includes('stipend'))  fundingType = 'Stipend'
  else if (lowerText.includes('partial'))  fundingType = 'Partially Funded'
  else if (lowerText.includes('free'))     fundingType = 'Free'

  // Country hints
  let country = null
  const countryPatterns = [
    /(?:hosted|located|held|offered)\s+in\s+([A-Z][a-z]+(?: [A-Z][a-z]+)?)/,
    /(?:open to|based in)\s+([A-Z][a-z]+(?: [A-Z][a-z]+)?)/,
  ]
  for (const pat of countryPatterns) {
    const m = fullText.match(pat)
    if (m) { country = m[1]; break }
  }

  // Tags
  const tags = []
  $('a[rel="tag"], .tags a, .post-tags a').each((_, el) => {
    const t = $(el).text().trim()
    if (t) tags.push(t)
  })

  return { title, org, opportunityType, description, applyUrl, deadline, fundingType, country, tags }
}

// ── Collect post URLs from listing page ─────────────────────────────────────

function collectPostUrls($, baseHost) {
  const seen = new Set()
  const urls = []
  $('article h2 a, article h3 a, h2.entry-title a, h3.entry-title a, .post-title a').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (href && (href.includes(baseHost) || href.startsWith('/')) && !seen.has(href)) {
      seen.add(href)
      urls.push(href.startsWith('/') ? `${BASE_URL.replace(/\/$/, '')}${href}` : href)
    }
  })
  return urls
}

function hasNextPage($) {
  return $('a.next, a[rel="next"], .nav-links .next, .pagination .next').length > 0
}

// ── Paginated scrape ────────────────────────────────────────────────────────

async function scrapeAll() {
  let page = 1
  let proceed = true
  const baseHost = new URL(BASE_URL).host

  while (proceed) {
    const url = page === 1 ? BASE_URL : `${BASE_URL}page/${page}/`
    console.log(`\n[GlobalSouth] Page ${page}: ${url}`)

    try {
      const res = await fetch(url, { headers: HEADERS })
      if (!res.ok) { console.log(`  HTTP ${res.status} — stopping`); break }

      const html = await res.text()
      const $ = load(html)
      const postUrls = collectPostUrls($, baseHost)

      if (postUrls.length === 0) { console.log('  No posts found — stopping'); break }
      console.log(`  Found ${postUrls.length} posts`)

      for (const postUrl of postUrls) {
        await delay(2000)
        try {
          const post = await scrapePost(postUrl)
          if (!post || !post.title) continue

          const record = {
            title:                post.title,
            organization_name:    post.org,
            opportunity_type:     post.opportunityType,
            description:          post.description,
            apply_url:            post.applyUrl,
            source_url:           postUrl,
            application_deadline: post.deadline,
            funding_type:         post.fundingType,
            country:              post.country,
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

// ── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  console.log('=== GlobalSouth Scraper ===')
  await scrapeAll()
  console.log('\n=== GlobalSouth scraper complete ===')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
