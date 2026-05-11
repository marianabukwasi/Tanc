/**
 * Scraper: Scholars4Dev.com
 * Focus: Scholarships and fellowships for developing countries
 * Sets open_to_developing = true on all records
 */

import fetch from 'node-fetch'
import { load } from 'cheerio'
import { delay, saveOpportunity, calculateCompleteness } from './lib/scraper-utils.js'

const BASE_URL = 'https://www.scholars4dev.com'

const CATEGORIES = [
  { url: `${BASE_URL}/category/scholarships/`, type: 'Scholarship' },
  { url: `${BASE_URL}/category/fellowships/`,  type: 'Fellowship'  },
  { url: `${BASE_URL}/category/grants/`,       type: 'Grant'       },
]

// ── Date parsing ────────────────────────────────────────────────────────────

const DATE_PATTERNS = [
  /(?:deadline|closing date|apply by|due|applications?\s+close)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
  /(?:deadline|closing date|apply by|due|applications?\s+close)[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  /(?:deadline|closing date|apply by|due)[:\s]+(\d{4}-\d{2}-\d{2})/i,
  /(?:deadline|closing date|apply by|due)[:\s]+(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+\d{4})/i,
  /(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+\d{4})\s+(?:deadline|is the deadline)/i,
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
  const m = title.match(/^(.+?)\s+(?:\d{4}\s+)?(?:Scholarship|Fellowship|Grant|Award|Prize|Program|Programme)/i)
  if (m && m[1].length < 80) return m[1].trim()
  return null
}

// ── Country extraction ──────────────────────────────────────────────────────

const COUNTRY_PATTERNS = [
  /(?:study|held|based)\s+in\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/,
  /hosted\s+by\s+[^,]+,\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/,
]

function extractCountry(text) {
  for (const p of COUNTRY_PATTERNS) {
    const m = text.match(p)
    if (m) return m[1]
  }
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

  // Apply URL — prefer explicit apply links
  let applyUrl = null
  body.find('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase()
    const href  = $(el).attr('href') || ''
    if (!applyUrl && href && href.startsWith('http') && !href.includes('scholars4dev')) {
      if (text.match(/apply|official|website|here/)) applyUrl = href
    }
  })

  const fullText = body.text()
  const deadline = parseDeadline(fullText)
  const org      = extractOrg(title)
  const country  = extractCountry(fullText)

  const tags = []
  $('a[rel="tag"], .post-tags a, .tags a').each((_, el) => {
    const t = $(el).text().trim()
    if (t) tags.push(t)
  })

  return { title, org, description, applyUrl, deadline, country, tags }
}

// ── Collect post URLs from a listing page ───────────────────────────────────

function collectPostUrls($) {
  const seen = new Set()
  const urls = []

  $('article h2 a, article h3 a, h2.entry-title a, h3.entry-title a, .post-title a').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (href && href.includes('scholars4dev.com') && !seen.has(href)) {
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
    console.log(`\n[Scholars4Dev] ${type} — page ${page}: ${url}`)

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' },
      })
      if (!res.ok) { console.log(`  HTTP ${res.status} — stopping`); break }

      const html = await res.text()
      const $ = load(html)
      const postUrls = collectPostUrls($)

      if (postUrls.length === 0) { console.log('  No posts found — stopping pagination'); break }
      console.log(`  Found ${postUrls.length} posts`)

      for (const postUrl of postUrls) {
        await delay(2000)
        try {
          const post = await scrapePost(postUrl, type)
          if (!post || !post.title) continue

          const record = {
            title:                post.title,
            organization_name:    post.org || null,
            opportunity_type:     type,
            description:          post.description,
            apply_url:            post.applyUrl,
            source_url:           postUrl,
            application_deadline: post.deadline,
            country:              post.country || null,
            tags:                 post.tags.length ? post.tags : null,
            is_published:         true,
            open_to_developing:   true,
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
  console.log('=== Scholars4Dev Scraper ===')
  for (const cat of CATEGORIES) {
    await scrapeCategory(cat.url, cat.type)
  }
  console.log('\n=== Scholars4Dev scraper complete ===')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
