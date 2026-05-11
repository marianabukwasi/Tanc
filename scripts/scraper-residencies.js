/**
 * Scraper: Artist & Writer Residencies
 * Sources: Res Artis, Alliance of Artists Communities, Poets & Writers
 * Sets: opportunity_type = 'Residency', min_age = 18
 */

import fetch from 'node-fetch'
import { load } from 'cheerio'
import { delay, saveOpportunity, calculateCompleteness } from './lib/scraper-utils.js'

// ── Date parsing ────────────────────────────────────────────────────────────

const DATE_PATTERNS = [
  /(?:deadline|apply by|application(?:s)? (?:due|close[sd]?)|closing date)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
  /(?:deadline|apply by|application(?:s)? (?:due|close[sd]?)|closing date)[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  /(?:deadline|apply by|due)[:\s]+(\d{4}-\d{2}-\d{2})/i,
  /(?:deadline|apply by|due)[:\s]+(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+\d{4})/i,
  /(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+\d{4})\s+(?:deadline)/i,
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

// ── Funding detection ───────────────────────────────────────────────────────

function detectFunding(text) {
  const lower = text.toLowerCase()
  if (lower.match(/fully.funded|all.inclusive|stipend|housing.*provided|meals.*provided/)) return 'Fully Funded'
  if (lower.match(/partially.funded|some.*support|partial.*support/)) return 'Partially Funded'
  if (lower.match(/self.funded|fee.*required|application fee|tuition|pay.*\$|cost.*\$/)) return 'Self-Funded'
  return null
}

// ── Discipline / tag extraction ─────────────────────────────────────────────

const DISCIPLINES = [
  'Writing', 'Visual Art', 'Music', 'Dance', 'Theatre', 'Film', 'Photography',
  'Sculpture', 'Painting', 'Poetry', 'Fiction', 'Nonfiction', 'Ceramics',
  'Printmaking', 'Performance', 'New Media', 'Architecture', 'Design',
  'Interdisciplinary', 'Literature', 'Drawing', 'Installation', 'Video Art',
]

function extractDisciplines(text) {
  return DISCIPLINES.filter(d => new RegExp(`\\b${d}\\b`, 'i').test(text))
}

// ── Cost extraction ─────────────────────────────────────────────────────────

function extractCostUsd(text) {
  const m = text.match(/\$\s*([\d,]+)(?:\s*(?:USD|fee|per|\/|application))?/i)
  if (m) {
    const n = parseInt(m[1].replace(/,/g, ''), 10)
    if (!isNaN(n) && n > 0 && n < 50000) return n
  }
  return null
}

// ── Duration extraction ─────────────────────────────────────────────────────

function extractDuration(text) {
  const m = text.match(/(\d+)\s*(?:–|-to-)?\s*(\d+)?\s*(week|month|day)s?/i)
  if (m) return m[0].trim()
  return null
}

// ═══════════════════════════════════════════════════════════════════════════
// SOURCE 1: Res Artis (resartis.org/residencies/)
// ═══════════════════════════════════════════════════════════════════════════

async function scrapeResArtisListing(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = load(html)

  const seen = new Set()
  const urls = []

  // Res Artis uses cards with links to individual residency pages
  $('a[href*="/residencies/"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const full = href.startsWith('http') ? href : `https://resartis.org${href}`
    // Only individual residency pages (not the listing itself or category pages)
    if (full !== url && full !== 'https://resartis.org/residencies/' && !seen.has(full)) {
      const path = full.replace('https://resartis.org', '')
      const segs = path.split('/').filter(Boolean)
      if (segs.length >= 2 && segs[0] === 'residencies') {
        seen.add(full)
        urls.push(full)
      }
    }
  })

  return urls
}

async function scrapeResArtisPost(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = load(html)

  const title = $('h1').first().text().trim()
  if (!title) return null

  const body = $('main, .entry-content, article, [class*="content"]').first()
  const paragraphs = []
  body.find('p').each((_, el) => {
    const t = $(el).text().trim()
    if (t.length > 40 && paragraphs.length < 3) paragraphs.push(t)
  })
  const description = paragraphs.join('\n\n') || null
  const fullText = body.text()

  // Org — often the residency name itself or meta author
  const org = $('meta[name="author"]').attr('content')
    || $('[class*="organization"], [class*="host"]').first().text().trim()
    || null

  // Location
  const country = $('[class*="country"]').first().text().trim() || null
  const city    = $('[class*="city"], [class*="location"]').first().text().trim() || null

  const deadline  = parseDeadline(fullText)
  const funding   = detectFunding(fullText)
  const cost      = extractCostUsd(fullText)
  const duration  = extractDuration(fullText)
  const disciplines = extractDisciplines(fullText + ' ' + title)

  let applyUrl = null
  body.find('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase()
    const href = $(el).attr('href') || ''
    if (!applyUrl && href.startsWith('http') && text.match(/apply|official|website/)) applyUrl = href
  })

  return { title, org, country, city, description, deadline, funding, cost, duration, disciplines, applyUrl }
}

async function scrapeResArtis() {
  console.log('\n[Residencies] Scraping Res Artis…')
  const BASE = 'https://resartis.org/residencies/'
  let page = 1
  let proceed = true

  while (proceed) {
    const url = page === 1 ? BASE : `${BASE}page/${page}/`
    console.log(`  Page ${page}: ${url}`)

    try {
      const postUrls = await scrapeResArtisListing(url)
      if (postUrls.length === 0) { console.log('  No listings — stopping'); break }
      console.log(`  Found ${postUrls.length} residencies`)

      for (const postUrl of postUrls) {
        await delay(2000)
        try {
          const post = await scrapeResArtisPost(postUrl)
          if (!post || !post.title) continue
          await saveResidency(post, postUrl, 'ResArtis')
        } catch (err) {
          console.error(`  Error: ${postUrl}:`, err.message)
        }
      }

      // Check for next page
      const res2 = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' } })
      const html2 = await res2.text()
      const $2 = load(html2)
      proceed = $2('a.next, a[rel="next"], .page-numbers.next').length > 0
      page++
      await delay(2000)
    } catch (err) {
      console.error(`  Error fetching ${url}:`, err.message)
      proceed = false
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SOURCE 2: Alliance of Artists Communities (artistcommunities.org)
// ═══════════════════════════════════════════════════════════════════════════

async function scrapeAAC() {
  console.log('\n[Residencies] Scraping Alliance of Artists Communities…')
  const BASE = 'https://www.artistcommunities.org/residencies/'
  let page = 1
  let proceed = true

  while (proceed) {
    const url = page === 1 ? BASE : `${BASE}?page=${page}`
    console.log(`  Page ${page}: ${url}`)

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' },
      })
      if (!res.ok) { console.log(`  HTTP ${res.status} — stopping`); break }
      const html = await res.text()
      const $ = load(html)

      const seen = new Set()
      const postUrls = []
      $('a[href*="/residency/"], a[href*="/member/"], a[href*="/program/"]').each((_, el) => {
        const href = $(el).attr('href') || ''
        const full = href.startsWith('http') ? href : `https://www.artistcommunities.org${href}`
        if (!seen.has(full)) { seen.add(full); postUrls.push(full) }
      })

      if (postUrls.length === 0) { console.log('  No listings — stopping'); break }
      console.log(`  Found ${postUrls.length} residencies`)

      for (const postUrl of postUrls) {
        await delay(2000)
        try {
          const res2 = await fetch(postUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' } })
          if (!res2.ok) continue
          const html2 = await res2.text()
          const $2 = load(html2)

          const title = $2('h1').first().text().trim()
          if (!title) continue

          const body = $2('main, .field--name-body, article, [class*="content"]').first()
          const paragraphs = []
          body.find('p').each((_, el) => {
            const t = $2(el).text().trim()
            if (t.length > 40 && paragraphs.length < 3) paragraphs.push(t)
          })
          const description = paragraphs.join('\n\n') || null
          const fullText = body.text()

          const post = {
            title,
            org: $2('[class*="organization"], [class*="field--name-field-org"]').first().text().trim() || null,
            country: $2('[class*="country"], [class*="field--name-field-country"]').first().text().trim() || null,
            city: $2('[class*="city"], [class*="field--name-field-city"]').first().text().trim() || null,
            description,
            deadline: parseDeadline(fullText),
            funding: detectFunding(fullText),
            cost: extractCostUsd(fullText),
            duration: extractDuration(fullText),
            disciplines: extractDisciplines(fullText + ' ' + title),
            applyUrl: null,
          }
          body.find('a').each((_, el) => {
            const text = $2(el).text().trim().toLowerCase()
            const href = $2(el).attr('href') || ''
            if (!post.applyUrl && href.startsWith('http') && text.match(/apply|official|website/)) {
              post.applyUrl = href
            }
          })

          await saveResidency(post, postUrl, 'ArtistCommunities')
        } catch (err) {
          console.error(`  Error: ${postUrl}:`, err.message)
        }
      }

      proceed = $('a.next, a[rel="next"], .pager__item--next a, li.next a').length > 0
      page++
      await delay(2000)
    } catch (err) {
      console.error(`  Error fetching ${url}:`, err.message)
      proceed = false
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SOURCE 3: Poets & Writers (pw.org/grants)
// ═══════════════════════════════════════════════════════════════════════════

async function scrapePoetsWriters() {
  console.log('\n[Residencies] Scraping Poets & Writers…')
  const BASE = 'https://www.pw.org/grants'
  let page = 1
  let proceed = true

  while (proceed) {
    const url = page === 1 ? BASE : `${BASE}?page=${page}`
    console.log(`  Page ${page}: ${url}`)

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' },
      })
      if (!res.ok) { console.log(`  HTTP ${res.status} — stopping`); break }
      const html = await res.text()
      const $ = load(html)

      const seen = new Set()
      const postUrls = []
      $('a[href*="/content/"], a[href*="/grants/"], h3 a, h2 a, .views-row a').each((_, el) => {
        const href = $(el).attr('href') || ''
        if (!href || href === BASE || href === '/grants') return
        const full = href.startsWith('http') ? href : `https://www.pw.org${href}`
        if (full.includes('pw.org') && !seen.has(full)) { seen.add(full); postUrls.push(full) }
      })

      if (postUrls.length === 0) { console.log('  No listings — stopping'); break }
      console.log(`  Found ${postUrls.length} listings`)

      for (const postUrl of postUrls) {
        await delay(2000)
        try {
          const res2 = await fetch(postUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' } })
          if (!res2.ok) continue
          const html2 = await res2.text()
          const $2 = load(html2)

          const title = $2('h1').first().text().trim()
          if (!title) continue

          // Only process residency-related pages
          const fullText = $2('body').text()
          if (!/(residen|retreat|artist.in|writer.in)/i.test(fullText + title)) continue

          const body = $2('main, .field--name-body, article, .region-content').first()
          const paragraphs = []
          body.find('p').each((_, el) => {
            const t = $2(el).text().trim()
            if (t.length > 40 && paragraphs.length < 3) paragraphs.push(t)
          })
          const description = paragraphs.join('\n\n') || null

          const post = {
            title,
            org: $2('[class*="organization"], [class*="field-name-field-sponsor"]').first().text().trim() || null,
            country: null,
            city: $2('[class*="location"], [class*="field-name-field-city"]').first().text().trim() || null,
            description,
            deadline: parseDeadline(fullText),
            funding: detectFunding(fullText),
            cost: extractCostUsd(fullText),
            duration: extractDuration(fullText),
            disciplines: extractDisciplines(fullText + ' ' + title),
            applyUrl: postUrl,
          }

          await saveResidency(post, postUrl, 'PoetsWriters')
        } catch (err) {
          console.error(`  Error: ${postUrl}:`, err.message)
        }
      }

      proceed = $('a[title="Go to next page"], a.next, li.pager__item--next a').length > 0
      page++
      await delay(2000)
    } catch (err) {
      console.error(`  Error fetching ${url}:`, err.message)
      proceed = false
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared save helper
// ═══════════════════════════════════════════════════════════════════════════

async function saveResidency(post, sourceUrl, source) {
  const tags = [...(post.disciplines || [])]
  if (post.duration) tags.push(post.duration)

  const record = {
    title:                post.title,
    organization_name:    post.org || null,
    opportunity_type:     'Residency',
    description:          post.description,
    apply_url:            post.applyUrl || sourceUrl,
    source_url:           sourceUrl,
    application_deadline: post.deadline,
    country:              post.country || null,
    city:                 post.city || null,
    funding_type:         post.funding || null,
    self_fund_cost_usd:   post.cost || null,
    tags:                 tags.length ? tags : null,
    is_published:         true,
    min_age:              18,
  }
  record.completeness_score = calculateCompleteness(record)
  await saveOpportunity(record)
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Residencies Scraper ===')
  await scrapeResArtis()
  await scrapeAAC()
  await scrapePoetsWriters()
  console.log('\n=== Residencies scraper complete ===')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
