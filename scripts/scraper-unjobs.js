/**
 * Scraper: UNJobs.org
 * Target: https://unjobs.org/ — UN, NGO, and international org vacancies
 * Sets opportunity_type = 'Job' (or 'Internship' for tagged internship listings)
 */

import fetch from 'node-fetch'
import { load } from 'cheerio'
import { delay, saveOpportunity, calculateCompleteness } from './lib/scraper-utils.js'

const BASE_URL = 'https://unjobs.org'
const HEADERS  = { 'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)' }

const SECTIONS = [
  { url: `${BASE_URL}/`,              type: 'Job'        },
  { url: `${BASE_URL}/internships`,   type: 'Internship' },
  { url: `${BASE_URL}/consultancy`,   type: 'Job'        },
]

// ── Expiry guard ─────────────────────────────────────────────────────────────

function isExpired(deadline) {
  if (!deadline) return false
  return new Date(deadline) < new Date(new Date().toISOString().split('T')[0])
}

// ── Date parsing ────────────────────────────────────────────────────────────

const DATE_PATTERNS = [
  /(?:closing date|deadline|apply by|due)[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
  /(?:closing date|deadline|apply by|due)[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  /(?:closing date|deadline|apply by|due)[:\s]+(\d{4}-\d{2}-\d{2})/i,
  /(?:closing date|deadline)[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i,
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

// ── Scrape a single job page ──────────────────────────────────────────────────

async function scrapeJob(url, defaultType) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = load(html)

  const title = $('h1').first().text().trim()
  if (!title) return null

  const org = $('[class*="organization"], [class*="agency"], .org').first().text().trim()
    || $('meta[property="og:site_name"]').attr('content')
    || null

  const body = $('main, .job-description, .content, article').first()
  const paragraphs = []
  body.find('p').each((_, el) => {
    const t = $(el).text().trim()
    if (t.length > 40 && paragraphs.length < 2) paragraphs.push(t)
  })
  const description = paragraphs.join('\n\n') || null

  const fullText = $('body').text()
  const deadline = parseDeadline(fullText)

  let country = null
  const locEl = $('[class*="location"], [class*="duty-station"], [class*="city"]').first().text().trim()
  if (locEl) country = locEl

  const type = title.toLowerCase().includes('intern') ? 'Internship' : defaultType

  return { title, org, description, deadline, country, type }
}

// ── Collect job URLs ─────────────────────────────────────────────────────────

function collectJobUrls($) {
  const seen = new Set()
  const urls = []
  $('a[href*="/jobs/"], a[href*="/vacancy/"], h2 a, h3 a, .job-title a').each((_, el) => {
    const href = $(el).attr('href') || ''
    const full = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (full.includes('unjobs.org') && !seen.has(full) && !full.endsWith('/jobs') && !full.endsWith('/internships')) {
      seen.add(full)
      urls.push(full)
    }
  })
  return urls
}

function hasNextPage($) {
  return $('a.next, a[rel="next"], .pagination .next, [aria-label="Next page"]').length > 0
}

function getNextUrl($) {
  const el = $('a.next, a[rel="next"], .pagination .next, [aria-label="Next page"]').first()
  const href = el.attr('href')
  if (!href) return null
  return href.startsWith('http') ? href : `${BASE_URL}${href}`
}

// ── Scrape one section ────────────────────────────────────────────────────────

async function scrapeSection(startUrl, type) {
  let url = startUrl
  let page = 1

  while (url) {
    console.log(`\n[UNJobs] ${type} — page ${page}: ${url}`)

    try {
      const res = await fetch(url, { headers: HEADERS })
      if (!res.ok) { console.log(`  HTTP ${res.status} — stopping`); break }

      const html = await res.text()
      const $ = load(html)
      const jobUrls = collectJobUrls($)

      if (jobUrls.length === 0) { console.log('  No jobs found — stopping'); break }
      console.log(`  Found ${jobUrls.length} jobs`)

      for (const jobUrl of jobUrls) {
        await delay(2000)
        try {
          const job = await scrapeJob(jobUrl, type)
          if (!job || !job.title) continue

          if (isExpired(job.deadline)) { console.log('  Skip (expired):', job.title); continue }

          const record = {
            title:                job.title,
            organization_name:    job.org || null,
            opportunity_type:     job.type,
            description:          job.description,
            apply_url:            jobUrl,
            source_url:           jobUrl,
            application_deadline: job.deadline,
            country:              job.country || null,
            is_published:         true,
            min_age:              18,
          }
          record.completeness_score = calculateCompleteness(record)
          await saveOpportunity(record)
        } catch (err) {
          console.error(`  Error scraping ${jobUrl}:`, err.message)
        }
      }

      url = hasNextPage($) ? getNextUrl($) : null
      page++
      if (url) await delay(2000)
    } catch (err) {
      console.error(`  Error fetching ${url}:`, err.message)
      break
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== UNJobs Scraper ===')
  for (const section of SECTIONS) {
    await scrapeSection(section.url, section.type)
  }
  console.log('\n=== UNJobs scraper complete ===')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
