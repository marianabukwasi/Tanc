/**
 * Scraper: Idealist.org
 * Target: https://www.idealist.org/en/opportunities
 * Types: fellowships, internships, volunteer opportunities
 *
 * Note: Idealist uses client-side rendering. We use their public JSON API
 * endpoint which returns structured listings data.
 */

import fetch from 'node-fetch'
import { delay, saveOpportunity, calculateCompleteness } from './lib/scraper-utils.js'

const BASE_URL = 'https://www.idealist.org'
const HEADERS  = {
  'User-Agent': 'Mozilla/5.0 (compatible; TANC-Bot/1.0)',
  'Accept': 'application/json',
  'Referer': 'https://www.idealist.org/',
}

// ── Expiry guard ─────────────────────────────────────────────────────────────

function isExpired(deadline) {
  if (!deadline) return false
  return new Date(deadline) < new Date(new Date().toISOString().split('T')[0])
}

// ── Type mapping ──────────────────────────────────────────────────────────────

const TYPE_SECTIONS = [
  { apiType: 'FELLOWSHIP',   displayType: 'Fellowship'         },
  { apiType: 'INTERNSHIP',   displayType: 'Internship'         },
  { apiType: 'VOLUNTEER',    displayType: 'Volunteer Programs' },
]

// ── Fetch from Idealist search API ────────────────────────────────────────────

async function fetchListings(apiType, page = 1) {
  const url = `${BASE_URL}/api/v1/listing?type=${apiType}&page=${page}&pageSize=20`
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) {
    console.log(`  API HTTP ${res.status} for ${apiType} page ${page}`)
    return null
  }
  try {
    return await res.json()
  } catch {
    return null
  }
}

// ── Map a single API listing to our record format ─────────────────────────────

function mapListing(item, displayType) {
  const title = item.name || item.title || ''
  if (!title) return null

  const org = item.organization?.name || item.orgName || null
  const description = item.description
    ? item.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
    : null

  const deadline = item.applicationDeadline || item.deadline || null
  const applyUrl = item.applicationUrl || item.applyUrl || (item.id ? `${BASE_URL}/en/${displayType.toLowerCase()}s/${item.id}` : null)
  const sourceUrl = item.id ? `${BASE_URL}/en/${displayType.toLowerCase()}s/${item.id}` : null

  const country = item.country || item.location?.country || null
  const city    = item.city    || item.location?.city    || null

  const tags = []
  if (item.causes)   tags.push(...(Array.isArray(item.causes)   ? item.causes   : []))
  if (item.themes)   tags.push(...(Array.isArray(item.themes)   ? item.themes   : []))
  if (item.skills)   tags.push(...(Array.isArray(item.skills)   ? item.skills   : []))

  return { title, org, description, deadline, applyUrl, sourceUrl, country, city, tags: tags.slice(0, 10) }
}

// ── Scrape one type ────────────────────────────────────────────────────────────

async function scrapeType(apiType, displayType) {
  console.log(`\n[Idealist] Scraping ${displayType}s…`)
  let page = 1
  let hasMore = true

  while (hasMore) {
    console.log(`  Page ${page}`)
    const data = await fetchListings(apiType, page)
    if (!data) break

    const items = data.results || data.data || data.listings || data.hits || []
    if (items.length === 0) { console.log('  No results — stopping'); break }

    console.log(`  Found ${items.length} listings`)

    for (const item of items) {
      const listing = mapListing(item, displayType)
      if (!listing || !listing.title) continue

      if (isExpired(listing.deadline)) { console.log('  Skip (expired):', listing.title); continue }

      const record = {
        title:                listing.title,
        organization_name:    listing.org,
        opportunity_type:     displayType,
        description:          listing.description,
        apply_url:            listing.applyUrl,
        source_url:           listing.sourceUrl,
        application_deadline: listing.deadline,
        country:              listing.country,
        city:                 listing.city,
        tags:                 listing.tags.length ? listing.tags : null,
        is_published:         true,
        min_age:              18,
      }
      record.completeness_score = calculateCompleteness(record)
      await saveOpportunity(record)
    }

    hasMore = data.hasMore ?? data.next ?? (items.length === 20)
    page++
    await delay(2000)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Idealist Scraper ===')
  for (const section of TYPE_SECTIONS) {
    await scrapeType(section.apiType, section.displayType)
  }
  console.log('\n=== Idealist scraper complete ===')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
