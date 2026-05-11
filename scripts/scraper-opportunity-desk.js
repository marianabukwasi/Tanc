/**
 * Scraper: OpportunityDesk.org
 * Categories: Scholarships, Fellowships, Internships, Conferences, Grants
 */

import fetch from 'node-fetch'
import { load } from 'cheerio'
import { delay, saveOpportunity, calculateCompleteness } from './lib/scraper-utils.js'

const CATEGORIES = [
  { url: 'https://opportunitydesk.org/category/scholarships/', type: 'Scholarship' },
  { url: 'https://opportunitydesk.org/category/fellowships/',  type: 'Fellowship'  },
  { url: 'https://opportunitydesk.org/category/internships/',  type: 'Internship'  },
  { url: 'https://opportunitydesk.org/category/conferences/',  type: 'Conference'  },
  { url: 'https://opportunitydesk.org/category/grants/',       type: 'Grant'       },
]

// ── Expiry guard ─────────────────────────────────────────────────────────────

function isExpired(deadline) {
  if (!deadline) return false
  return new Date(deadline) < new Date(new Date().toISOString().split('T')[0])
}

// ── Date parsing ────────────────────────────────────────────────────────────

const DATE_PATTERNS = [
  // "March 15, 2025" / "15 March 2025"
  /(?:deadline|closing date|apply by|due)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
  /(?:deadline|closing date|apply by|due)[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  // ISO "2025-03-15"
  /(?:deadline|closing date|apply by|due)[:\s]+(\d{4}-\d{2}-\d{2})/i,
  // Loose: "31st December 2025"
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

function extractOrg(title, $) {
  // Try meta / structured data first
  const metaOrg = $('meta[property="article:publisher"]').attr('content') ||
                  $('[class*="author"], [class*="source"]').first().text().trim()
  if (metaOrg && metaOrg.length < 80) return metaOrg

  // Heuristic: text before common program keywords in title
  const m = title.match(/^(.+?)\s+(?:\d{4}\s+)?(?:Scholarship|Fellowship|Internship|Grant|Conference|Program|Award|Prize)/i)
  if (m && m[1].length < 60) return m[1].trim()

  return null
}

// ── Scrape a single post ────────────────────────────────────────────────────

async function scrapePost(url, type) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = load(html)

  const title = $('h1.entry-title, h1.post-title, h1').first().text().trim()
  if (!title) return null

  // Description: first 2 non-empty paragraphs from post body
  const body = $('.entry-content, .post-content, .article-content, article .content').first()
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
    if (!applyUrl && href && (text.includes('apply here') || text.includes('apply now') || text.match(/^apply\b/))) {
      applyUrl = href
    }
  })
  // Fallback: "Click here to apply"
  if (!applyUrl) {
    body.find('a').each((_, el) => {
      const text = $(el).text().trim().toLowerCase()
      const href  = $(el).attr('href') || ''
      if (!applyUrl && href && text.includes('click here')) applyUrl = href
    })
  }

  const fullText = body.text()
  const deadline = parseDeadline(fullText)
  const org = extractOrg(title, $)

  // Tags from post categories / tags
  const tags = []
  $('a[rel="tag"], .tags a, .post-tags a').each((_, el) => {
    const t = $(el).text().trim()
    if (t) tags.push(t)
  })

  return { title, org, description, applyUrl, deadline, tags }
}

// ── Collect post URLs from a listing page ───────────────────────────────────

function collectPostUrls($) {
  const seen = new Set()
  const urls = []

  $('article h2 a, article h3 a, .post-title a, h2.entry-title a, h3.entry-title a').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (href && href.includes('opportunitydesk.org') && !seen.has(href)) {
      seen.add(href)
      urls.push(href)
    }
  })

  // Fallback: any internal permalink not in nav/sidebar
  if (urls.length === 0) {
    $('a[rel="bookmark"]').each((_, el) => {
      const href = $(el).attr('href') || ''
      if (href && !seen.has(href)) { seen.add(href); urls.push(href) }
    })
  }

  return urls
}

function hasNextPage($, currentPage) {
  const next = $('a.next, a[rel="next"], .nav-links .next, .pagination .next, .page-numbers.next')
  return next.length > 0
}

// ── Scrape one category ─────────────────────────────────────────────────────

async function scrapeCategory(baseUrl, type) {
  let page = 1
  let proceed = true

  while (proceed) {
    const url = page === 1 ? baseUrl : `${baseUrl}page/${page}/`
    console.log(`\n[OpportunityDesk] ${type} — page ${page}: ${url}`)

    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' } })
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

          if (isExpired(post.deadline)) { console.log('  Skip (expired):', post.title); continue }

          const record = {
            title:                post.title,
            organization_name:    post.org || null,
            opportunity_type:     type,
            description:          post.description,
            apply_url:            post.applyUrl,
            source_url:           postUrl,
            application_deadline: post.deadline,
            tags:                 post.tags.length ? post.tags : null,
            is_published:         true,
            min_age:              18,
          }
          record.completeness_score = calculateCompleteness(record)
          await saveOpportunity(record)
        } catch (err) {
          console.error(`  Error scraping post ${postUrl}:`, err.message)
        }
      }

      proceed = hasNextPage($, page)
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
  console.log('=== OpportunityDesk Scraper ===')
  for (const cat of CATEGORIES) {
    await scrapeCategory(cat.url, cat.type)
  }
  console.log('\n=== OpportunityDesk scraper complete ===')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
