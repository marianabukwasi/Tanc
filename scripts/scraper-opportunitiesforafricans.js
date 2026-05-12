/**
 * Scraper: OpportunitiesForAfricans.com
 * Target: https://www.opportunitiesforafricans.com/
 * Sets open_to_africans = true on all records
 */

import fetch from 'node-fetch'
import { load } from 'cheerio'
import { delay, saveOpportunity, calculateCompleteness } from './lib/scraper-utils.js'

const BASE_URL = 'https://www.opportunitiesforafricans.com'
const HEADERS  = { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' }

const CATEGORIES = [
  { url: `${BASE_URL}/category/scholarships/`,  type: 'Scholarship' },
  { url: `${BASE_URL}/category/fellowships/`,   type: 'Fellowship'  },
  { url: `${BASE_URL}/category/internships/`,   type: 'Internship'  },
  { url: `${BASE_URL}/category/grants/`,        type: 'Grant'       },
  { url: `${BASE_URL}/category/competitions/`,  type: 'Competition' },
  { url: `${BASE_URL}/category/conferences/`,   type: 'Conference'  },
  { url: `${BASE_URL}/category/jobs/`,          type: 'Job'         },
]

// ── Expiry guard ─────────────────────────────────────────────────────────────

function isExpired(deadline) {
  if (!deadline) return false
  return new Date(deadline) < new Date(new Date().toISOString().split('T')[0])
}

// ── Date parsing ────────────────────────────────────────────────────────────

const DATE_PATTERNS = [
  /(?:deadline|closing date|apply by|due|closes?)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
  /(?:deadline|closing date|apply by|due|closes?)[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  /(?:deadline|closing date|apply by|due)[:\s]+(\d{4}-\d{2}-\d{2})/i,
  /(?:deadline|closing date|apply by|due)[:\s]+(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+\d{4})/i,
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

// ── Type mapping ─────────────────────────────────────────────────────────────

const TYPE_MAP = {
  scholarship: 'Scholarship', fellowship: 'Fellowship', internship: 'Internship',
  grant: 'Grant', competition: 'Competition', conference: 'Conference', job: 'Job',
}

function inferType(url, categoryText) {
  const combined = `${url} ${categoryText}`.toLowerCase()
  for (const [key, val] of Object.entries(TYPE_MAP)) {
    if (combined.includes(key)) return val
  }
  return 'Other'
}

// ── Scrape a single post ─────────────────────────────────────────────────────

async function scrapePost(url) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = load(html)

  const title = $('h1.entry-title, h1.post-title, h1').first().text().trim()
  if (!title) return null

  const categories = []
  $('a[rel="category tag"], .cat-links a, .post-categories a').each((_, el) => {
    categories.push($(el).text().trim())
  })

  const orgPatterns = [
    /^(.+?)\s+(?:\d{4}\s+)?(?:Scholarship|Fellowship|Internship|Grant|Program|Award|Prize|Competition)/i,
    /^(.+?)\s+Offers\s+/i,
  ]
  let org = null
  for (const pat of orgPatterns) {
    const m = title.match(pat)
    if (m && m[1].length < 70) { org = m[1].trim(); break }
  }

  const body = $('.entry-content, .post-content, article .content').first()
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

  let country = null
  const countryM = fullText.match(/(?:hosted|held|offered|open to applicants?)\s+in\s+([A-Z][a-z]+(?: [A-Z][a-z]+)?)/)
  if (countryM) country = countryM[1]

  const tags = []
  $('a[rel="tag"], .tags a, .post-tags a').each((_, el) => {
    const t = $(el).text().trim()
    if (t) tags.push(t)
  })

  return { title, org, description, applyUrl, deadline, fundingType, country, tags }
}

// ── Collect post URLs ─────────────────────────────────────────────────────────

function collectPostUrls($) {
  const seen = new Set()
  const urls = []
  $('article h2 a, article h3 a, h2.entry-title a, h3.entry-title a, .post-title a').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (href && href.includes('opportunitiesforafricans.com') && !seen.has(href)) {
      seen.add(href)
      urls.push(href)
    }
  })
  return urls
}

function hasNextPage($) {
  return $('a.next, a[rel="next"], .nav-links .next, .pagination .next').length > 0
}

// ── Scrape one category ───────────────────────────────────────────────────────

async function scrapeCategory(baseUrl, type) {
  let page = 1
  let proceed = true

  while (proceed) {
    const url = page === 1 ? baseUrl : `${baseUrl}page/${page}/`
    console.log(`\n[OppForAfricans] ${type} — page ${page}: ${url}`)

    try {
      const res = await fetch(url, { headers: HEADERS })
      if (!res.ok) { console.log(`  HTTP ${res.status} — stopping`); break }

      const html = await res.text()
      const $ = load(html)
      const postUrls = collectPostUrls($)

      if (postUrls.length === 0) { console.log('  No posts found — stopping pagination'); break }
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
            opportunity_type:     type,
            description:          post.description,
            apply_url:            post.applyUrl,
            source_url:           postUrl,
            application_deadline: post.deadline,
            funding_type:         post.fundingType || null,
            country:              post.country || null,
            tags:                 post.tags.length ? post.tags : null,
            is_published:         true,
            open_to_africans:     true,
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
      console.error(`  Error fetching page ${url}:`, err.message)
      proceed = false
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== OpportunitiesForAfricans Scraper ===')
  for (const cat of CATEGORIES) {
    await scrapeCategory(cat.url, cat.type)
  }
  console.log('\n=== OpportunitiesForAfricans scraper complete ===')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
