/**
 * Scraper: AfterSchoolAfrica.com
 * Categories: Scholarships, Fellowships, Internships, Jobs, Conferences
 * Sets open_to_africans = true on all records
 */

import fetch from 'node-fetch'
import { load } from 'cheerio'
import { delay, saveOpportunity, calculateCompleteness } from './lib/scraper-utils.js'

const BASE_URL = 'https://www.afterschoolafrica.com'

const CATEGORIES = [
  { url: `${BASE_URL}/scholarships/`,  type: 'Scholarship' },
  { url: `${BASE_URL}/fellowships/`,   type: 'Fellowship'  },
  { url: `${BASE_URL}/internships/`,   type: 'Internship'  },
  { url: `${BASE_URL}/jobs/`,          type: 'Job'         },
  { url: `${BASE_URL}/conferences/`,   type: 'Conference'  },
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

// ── Organisation extraction ─────────────────────────────────────────────────

function extractOrg(title) {
  const m = title.match(/^(.+?)\s+(?:\d{4}\s+)?(?:Scholarship|Fellowship|Internship|Grant|Job|Conference|Award|Program|Programme)/i)
  if (m && m[1].length < 80) return m[1].trim()
  return null
}

// ── Format detection ────────────────────────────────────────────────────────

function detectFormat(text) {
  const lower = text.toLowerCase()
  if (lower.includes('online') || lower.includes('virtual') || lower.includes('remote')) return 'Online'
  if (lower.includes('in-person') || lower.includes('on-site') || lower.includes('on campus')) return 'In-Person'
  return null
}

// ── Scrape a single post ────────────────────────────────────────────────────

async function scrapePost(url, type) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = load(html)

  const title = $('h1.entry-title, h1.post-title, h1').first().text().trim()
  if (!title) return null

  const body = $('.entry-content, .post-content, article').first()
  const paragraphs = []
  body.find('p').each((_, el) => {
    const t = $(el).text().trim()
    if (t.length > 40 && paragraphs.length < 3) paragraphs.push(t)
  })
  const description = paragraphs.join('\n\n') || null

  let applyUrl = null
  body.find('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase()
    const href  = $(el).attr('href') || ''
    if (!applyUrl && href && href.startsWith('http') && !href.includes('afterschoolafrica')) {
      if (text.match(/apply|official|website|here|click/)) applyUrl = href
    }
  })

  const fullText = body.text()
  const deadline = parseDeadline(fullText)
  const org      = extractOrg(title)
  const format   = detectFormat(fullText)

  const tags = []
  $('a[rel="tag"], .post-tags a, .tags a, .cat-links a').each((_, el) => {
    const t = $(el).text().trim()
    if (t) tags.push(t)
  })

  return { title, org, description, applyUrl, deadline, format, tags }
}

// ── Collect post URLs from a listing page ───────────────────────────────────

function collectPostUrls($, domain) {
  const seen = new Set()
  const urls = []

  $('article h2 a, article h3 a, h2.entry-title a, h3.entry-title a, .post-title a').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (href && href.includes(domain) && !seen.has(href)) {
      seen.add(href)
      urls.push(href)
    }
  })

  if (urls.length === 0) {
    $('a[rel="bookmark"]').each((_, el) => {
      const href = $(el).attr('href') || ''
      if (href && !seen.has(href)) { seen.add(href); urls.push(href) }
    })
  }

  return urls
}

function hasNextPage($) {
  return $('a.next, a[rel="next"], .nav-links .next, .page-numbers.next').length > 0
}

// ── Scrape one category ─────────────────────────────────────────────────────

async function scrapeCategory(baseUrl, type) {
  let page = 1
  let proceed = true

  while (proceed) {
    const url = page === 1 ? baseUrl : `${baseUrl}page/${page}/`
    console.log(`\n[AfterSchoolAfrica] ${type} — page ${page}: ${url}`)

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' },
      })
      if (!res.ok) { console.log(`  HTTP ${res.status} — stopping`); break }

      const html = await res.text()
      const $ = load(html)
      const postUrls = collectPostUrls($, 'afterschoolafrica.com')

      if (postUrls.length === 0) { console.log('  No posts found — stopping pagination'); break }
      console.log(`  Found ${postUrls.length} posts`)

      for (const postUrl of postUrls) {
        await delay(2000)
        try {
          const post = await scrapePost(postUrl, type)
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
            format:               post.format || null,
            tags:                 post.tags.length ? post.tags : null,
            is_published:         true,
            open_to_africans:     true,
            min_age:              18,
          }
          record.completeness_score = calculateCompleteness(record)
          await saveOpportunity(record)
        } catch (err) {
          console.error(`  Error scraping post ${postUrl}:`, err.message)
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

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== AfterSchoolAfrica Scraper ===')
  for (const cat of CATEGORIES) {
    await scrapeCategory(cat.url, cat.type)
  }
  console.log('\n=== AfterSchoolAfrica scraper complete ===')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
