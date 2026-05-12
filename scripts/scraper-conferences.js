/**
 * Scraper: Academic & Professional Conferences
 * Sources: Papercall.io, Conferencealerts.com, WikiCFP
 * Sets: opportunity_type = 'Conference', min_age = 18
 * Adds ticket_affiliate_url for fee-based events
 */

import fetch from 'node-fetch'
import { load } from 'cheerio'
import { delay, saveOpportunity, calculateCompleteness } from './lib/scraper-utils.js'

// Inline ticket link generator (mirrors src/lib/affiliates.ts)
function generateTicketLink(name) {
  const q  = encodeURIComponent(name)
  const id = process.env.TICKETNETWORK_AFFILIATE_ID || ''
  return id
    ? `https://www.ticketnetwork.com/search?q=${q}&aff=${id}`
    : `https://www.ticketnetwork.com/search?q=${q}`
}

// ── Expiry guard ─────────────────────────────────────────────────────────────

function isExpired(deadline) {
  if (!deadline) return false
  return new Date(deadline) < new Date(new Date().toISOString().split('T')[0])
}

// ── Date parsing ────────────────────────────────────────────────────────────

const DATE_PATTERNS = [
  /(?:abstract|paper|submission|proposal|cfp|application|registration)?\s*deadline[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
  /(?:abstract|paper|submission|proposal|cfp|application|registration)?\s*deadline[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  /(?:deadline|due|closes?)[:\s]+(\d{4}-\d{2}-\d{2})/i,
  /(?:deadline|due|closes?)[:\s]+(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+\d{4})/i,
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

// ── Format detection ────────────────────────────────────────────────────────

function detectFormat(text) {
  const lower = text.toLowerCase()
  if (lower.match(/\bonline\b|\bvirtual\b|\bremote\b|\bdigital\b|\bwebinar\b/)) return 'Online'
  if (lower.match(/\bhybrid\b/)) return 'Hybrid'
  return null
}

// ── Cost extraction ─────────────────────────────────────────────────────────

function extractCostUsd(text) {
  const m = text.match(/\$\s*([\d,]+)(?:\s*(?:USD|registration|fee|per person|early))?/i)
  if (m) {
    const n = parseInt(m[1].replace(/,/g, ''), 10)
    if (!isNaN(n) && n > 0 && n < 10000) return n
  }
  return null
}

// ═══════════════════════════════════════════════════════════════════════════
// SOURCE 1: Papercall.io (/cfps)
// ═══════════════════════════════════════════════════════════════════════════

async function scrapePapercall() {
  console.log('\n[Conferences] Scraping Papercall.io…')
  const BASE = 'https://www.papercall.io/cfps'
  let page = 1
  let proceed = true

  while (proceed) {
    const url = page === 1 ? BASE : `${BASE}?page=${page}`
    console.log(`  Page ${page}: ${url}`)

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)', 'Accept': 'text/html' },
      })
      if (!res.ok) { console.log(`  HTTP ${res.status} — stopping`); break }
      const html = await res.text()
      const $ = load(html)

      const seen = new Set()
      const cfpUrls = []
      $('a[href*="/cfps/"], a[href^="/cfps/"]').each((_, el) => {
        const href = $(el).attr('href') || ''
        const full = href.startsWith('http') ? href : `https://www.papercall.io${href}`
        const path = href.replace(/^https?:\/\/[^/]+/, '')
        const segs = path.split('/').filter(Boolean)
        if (segs.length >= 2 && segs[0] === 'cfps' && !seen.has(full)) {
          seen.add(full)
          cfpUrls.push(full)
        }
      })

      if (cfpUrls.length === 0) { console.log('  No CFPs found — stopping'); break }
      console.log(`  Found ${cfpUrls.length} CFPs`)

      for (const cfpUrl of cfpUrls) {
        await delay(2000)
        try {
          const res2 = await fetch(cfpUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' },
          })
          if (!res2.ok) continue
          const html2 = await res2.text()
          const $2 = load(html2)

          const title = $2('h1').first().text().trim()
          if (!title) continue

          const body = $2('main, .cfp-description, [class*="description"], article').first()
          const paragraphs = []
          body.find('p').each((_, el) => {
            const t = $2(el).text().trim()
            if (t.length > 40 && paragraphs.length < 3) paragraphs.push(t)
          })
          const description = paragraphs.join('\n\n') || null
          const fullText = $2('body').text()

          const org = $2('[class*="event-name"], [class*="organizer"]').first().text().trim() || null
          const country = $2('[class*="location"], [class*="country"]').first().text().trim() || null
          const deadline = parseDeadline(fullText)
          const format = detectFormat(fullText)
          const cost = extractCostUsd(fullText)

          const tags = []
          $2('[class*="tag"] a, [class*="topic"] a, a[rel="tag"]').each((_, el) => {
            const t = $2(el).text().trim()
            if (t && t.length < 50) tags.push(t)
          })

          await saveConference({
            title, org, country, description, deadline, format, cost, tags,
            applyUrl: cfpUrl, sourceUrl: cfpUrl,
          })
        } catch (err) {
          console.error(`  Error: ${cfpUrl}:`, err.message)
        }
      }

      proceed = $('a[rel="next"], .next a, a.next, [aria-label="Next page"]').length > 0
      page++
      await delay(2000)
    } catch (err) {
      console.error(`  Error fetching ${url}:`, err.message)
      proceed = false
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SOURCE 2: Conferencealerts.com
// ═══════════════════════════════════════════════════════════════════════════

const CONF_ALERT_CATEGORIES = [
  { url: 'https://conferencealerts.com/topic-listing?topic=Social+Sciences', field: 'Social Sciences' },
  { url: 'https://conferencealerts.com/topic-listing?topic=Science', field: 'Science' },
  { url: 'https://conferencealerts.com/topic-listing?topic=Technology', field: 'Technology' },
  { url: 'https://conferencealerts.com/topic-listing?topic=Humanities', field: 'Humanities' },
  { url: 'https://conferencealerts.com/topic-listing?topic=Health', field: 'Health' },
  { url: 'https://conferencealerts.com/topic-listing?topic=Education', field: 'Education' },
  { url: 'https://conferencealerts.com/topic-listing?topic=Arts', field: 'Arts' },
  { url: 'https://conferencealerts.com/topic-listing?topic=Business', field: 'Business' },
]

async function scrapeConferenceAlerts() {
  console.log('\n[Conferences] Scraping Conferencealerts.com…')

  for (const cat of CONF_ALERT_CATEGORIES) {
    console.log(`  Category: ${cat.field}`)
    let page = 1
    let proceed = true

    while (proceed) {
      const url = page === 1 ? cat.url : `${cat.url}&page=${page}`
      console.log(`    Page ${page}: ${url}`)

      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' },
        })
        if (!res.ok) { console.log(`    HTTP ${res.status} — stopping`); break }
        const html = await res.text()
        const $ = load(html)

        const seen = new Set()
        const confUrls = []
        $('a[href*="/show/"], h3 a, h2 a, .conference-title a').each((_, el) => {
          const href = $(el).attr('href') || ''
          const full = href.startsWith('http') ? href : `https://conferencealerts.com${href}`
          if (full.includes('conferencealerts.com') && !seen.has(full)) {
            seen.add(full)
            confUrls.push(full)
          }
        })

        if (confUrls.length === 0) { console.log('    No conferences found — stopping'); break }
        console.log(`    Found ${confUrls.length} conferences`)

        for (const confUrl of confUrls) {
          await delay(1500)
          try {
            const res2 = await fetch(confUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' },
            })
            if (!res2.ok) continue
            const html2 = await res2.text()
            const $2 = load(html2)

            const title = $2('h1').first().text().trim()
            if (!title) continue

            const fullText = $2('body').text()
            const body = $2('main, [class*="description"], [class*="content"]').first()
            const paragraphs = []
            body.find('p').each((_, el) => {
              const t = $2(el).text().trim()
              if (t.length > 40 && paragraphs.length < 3) paragraphs.push(t)
            })
            const description = paragraphs.join('\n\n') || null

            const org = $2('[class*="organizer"], [class*="organization"]').first().text().trim() || null
            const country = $2('[class*="country"], [class*="location"]').first().text().trim() || null
            const deadline = parseDeadline(fullText)
            const format = detectFormat(fullText)
            const cost = extractCostUsd(fullText)

            await saveConference({
              title, org, country, description, deadline, format, cost,
              tags: [cat.field],
              applyUrl: confUrl, sourceUrl: confUrl,
            })
          } catch (err) {
            console.error(`    Error: ${confUrl}:`, err.message)
          }
        }

        proceed = $('a[rel="next"], .next a, a.next').length > 0
        page++
        await delay(2000)
      } catch (err) {
        console.error(`    Error fetching ${url}:`, err.message)
        proceed = false
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SOURCE 3: WikiCFP (wikicfp.com/cfp/)
// ═══════════════════════════════════════════════════════════════════════════

async function scrapeWikiCFP() {
  console.log('\n[Conferences] Scraping WikiCFP…')

  const CATEGORIES = [
    { url: 'http://www.wikicfp.com/cfp/call?conference=ai', field: 'Artificial Intelligence' },
    { url: 'http://www.wikicfp.com/cfp/call?conference=machine+learning', field: 'Machine Learning' },
    { url: 'http://www.wikicfp.com/cfp/call?conference=computer+science', field: 'Computer Science' },
    { url: 'http://www.wikicfp.com/cfp/call?conference=social+science', field: 'Social Sciences' },
    { url: 'http://www.wikicfp.com/cfp/call?conference=health', field: 'Health' },
    { url: 'http://www.wikicfp.com/cfp/call?conference=education', field: 'Education' },
    { url: 'http://www.wikicfp.com/cfp/call?conference=economics', field: 'Economics' },
    { url: 'http://www.wikicfp.com/cfp/call?conference=environment', field: 'Environment' },
  ]

  for (const cat of CATEGORIES) {
    console.log(`  Category: ${cat.field}`)
    let page = 1
    let proceed = true

    while (proceed) {
      const url = page === 1 ? cat.url : `${cat.url}&page=${page}`
      console.log(`    Page ${page}: ${url}`)

      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' },
        })
        if (!res.ok) { console.log(`    HTTP ${res.status} — stopping`); break }
        const html = await res.text()
        const $ = load(html)

        const seen = new Set()
        const cfpUrls = []

        // WikiCFP lists CFPs in a table; links go to /cfp/servlet/event.showcfp?eventid=XXX
        $('a[href*="showcfp"], a[href*="eventid"]').each((_, el) => {
          const href = $(el).attr('href') || ''
          const full = href.startsWith('http')
            ? href
            : `http://www.wikicfp.com${href.startsWith('/') ? '' : '/cfp/'}${href}`
          if (!seen.has(full)) { seen.add(full); cfpUrls.push(full) }
        })

        if (cfpUrls.length === 0) { console.log('    No CFPs found — stopping'); break }
        console.log(`    Found ${cfpUrls.length} CFPs`)

        for (const cfpUrl of cfpUrls) {
          await delay(2000)
          try {
            const res2 = await fetch(cfpUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' },
            })
            if (!res2.ok) continue
            const html2 = await res2.text()
            const $2 = load(html2)

            const title = $2('h1, .contsec h3').first().text().trim()
            if (!title) continue

            const fullText = $2('body').text()

            // WikiCFP has structured fields in a table
            let org = null, country = null, city = null
            $2('table tr').each((_, tr) => {
              const cells = $2(tr).find('td')
              if (cells.length >= 2) {
                const label = $2(cells[0]).text().trim().toLowerCase()
                const val   = $2(cells[1]).text().trim()
                if (label.includes('where') || label.includes('location')) {
                  const parts = val.split(',').map(s => s.trim())
                  city    = parts[0] || null
                  country = parts[parts.length - 1] || null
                }
                if (label.includes('organiz')) org = val
              }
            })

            const paragraphs = []
            $2('.contsec p, main p').each((_, el) => {
              const t = $2(el).text().trim()
              if (t.length > 40 && paragraphs.length < 3) paragraphs.push(t)
            })
            const description = paragraphs.join('\n\n') || null

            const deadline = parseDeadline(fullText)
            const format   = detectFormat(fullText)
            const cost     = extractCostUsd(fullText)

            // External link from WikiCFP page
            let applyUrl = cfpUrl
            $2('a[href^="http"]').each((_, el) => {
              const href = $2(el).attr('href') || ''
              const text = $2(el).text().trim().toLowerCase()
              if (!href.includes('wikicfp') && (text.includes('website') || text.includes('official') || text.includes('link'))) {
                applyUrl = href
                return false
              }
            })

            await saveConference({
              title, org, country, city, description, deadline, format, cost,
              tags: [cat.field],
              applyUrl, sourceUrl: cfpUrl,
            })
          } catch (err) {
            console.error(`    Error: ${cfpUrl}:`, err.message)
          }
        }

        // WikiCFP pagination: next page link
        const nextLink = $('a:contains("next"), a[rel="next"]').first().attr('href')
        if (nextLink) {
          page++
          await delay(2000)
        } else {
          proceed = false
        }
      } catch (err) {
        console.error(`    Error fetching ${url}:`, err.message)
        proceed = false
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared save helper
// ═══════════════════════════════════════════════════════════════════════════

async function saveConference({ title, org, country, city, description, deadline, format, cost, tags, applyUrl, sourceUrl }) {
  if (isExpired(deadline)) { console.log('  Skip (expired):', title); return }

  const record = {
    title,
    organization_name:    org || null,
    opportunity_type:     'Conference',
    description:          description || null,
    apply_url:            applyUrl || sourceUrl,
    source_url:           sourceUrl,
    application_deadline: deadline || null,
    country:              country || null,
    city:                 city || null,
    format:               format || null,
    tags:                 tags && tags.length ? tags : null,
    is_published:         true,
    min_age:              18,
  }

  if (cost && cost > 0) {
    record.self_fund_cost_usd    = cost
    record.ticket_affiliate_url  = generateTicketLink(title)
  }

  record.completeness_score = calculateCompleteness(record)
  await saveOpportunity(record)
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Conferences Scraper ===')
  await scrapePapercall()
  await scrapeConferenceAlerts()
  await scrapeWikiCFP()
  console.log('\n=== Conferences scraper complete ===')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
