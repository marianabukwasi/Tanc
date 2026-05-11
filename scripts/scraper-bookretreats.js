/**
 * Scraper: BookRetreats.com
 * Categories: wellness, yoga, meditation, writing retreats
 */

import fetch from 'node-fetch'
import { load } from 'cheerio'
import { delay, saveOpportunity, calculateCompleteness } from './lib/scraper-utils.js'

const CATEGORIES = [
  { url: 'https://bookretreats.com/s/wellness-retreats',   slug: 'wellness'   },
  { url: 'https://bookretreats.com/s/yoga-retreats',       slug: 'yoga'       },
  { url: 'https://bookretreats.com/s/meditation-retreats', slug: 'meditation' },
  { url: 'https://bookretreats.com/s/writing-retreats',    slug: 'writing'    },
]

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

// ── Type mapping ────────────────────────────────────────────────────────────

const TAG_TYPE_MAP = {
  yoga:        'wellness_retreat',
  meditation:  'wellness_retreat',
  wellness:    'wellness_retreat',
  spiritual:   'wellness_retreat',
  mindfulness: 'wellness_retreat',
  healing:     'wellness_retreat',
  detox:       'wellness_retreat',
  writing:     'writing_retreat',
}

function inferType(tags, slug) {
  const combined = [...tags.map(t => t.toLowerCase()), slug.toLowerCase()].join(' ')
  for (const [keyword, type] of Object.entries(TAG_TYPE_MAP)) {
    if (combined.includes(keyword)) return type
  }
  return 'Retreats'
}

// ── Exponential backoff fetch ───────────────────────────────────────────────

async function fetchWithBackoff(url, options = {}, maxRetries = 4) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, { ...options, headers: { ...HEADERS, ...options.headers } })
      if (res.status === 429 || res.status === 503 || res.status === 503) {
        const wait = Math.pow(2, attempt) * 3000
        console.log(`  Rate limited (${res.status}) — waiting ${wait / 1000}s (attempt ${attempt + 1}/${maxRetries})`)
        await delay(wait)
        continue
      }
      return res
    } catch (err) {
      if (attempt === maxRetries - 1) throw err
      const wait = Math.pow(2, attempt) * 2000
      console.log(`  Fetch error — retrying in ${wait / 1000}s: ${err.message}`)
      await delay(wait)
    }
  }
  throw new Error(`Failed after ${maxRetries} attempts: ${url}`)
}

// ── Parse price ─────────────────────────────────────────────────────────────

function parsePrice(text) {
  if (!text) return null
  const m = text.replace(/,/g, '').match(/\$?([\d]+(?:\.\d{1,2})?)/)
  return m ? Math.round(parseFloat(m[1])) : null
}

// ── Parse duration (return days as integer) ─────────────────────────────────

function parseDurationDays(text) {
  if (!text) return null
  const mDays  = text.match(/(\d+)\s*(?:day|night)/i)
  const mWeeks = text.match(/(\d+)\s*week/i)
  if (mDays)  return parseInt(mDays[1])
  if (mWeeks) return parseInt(mWeeks[1]) * 7
  return null
}

// ── Try extracting from embedded Next.js / JSON-LD data ─────────────────────

function extractFromNextData(html, slug) {
  const results = []
  try {
    const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!m) return results
    const data = JSON.parse(m[1])

    // Walk common paths where listing data lives
    const tryPaths = [
      data?.props?.pageProps?.retreats,
      data?.props?.pageProps?.listings,
      data?.props?.pageProps?.results,
      data?.props?.pageProps?.data?.retreats,
      data?.props?.pageProps?.data?.listings,
    ]

    for (const list of tryPaths) {
      if (Array.isArray(list) && list.length > 0) {
        for (const item of list) {
          const title   = item.title || item.name || item.retreat_name || ''
          const city    = item.city || item.location?.city || null
          const country = item.country || item.location?.country || null
          const price   = item.price || item.min_price || item.price_from || null
          const desc    = item.description || item.summary || null
          const bookUrl = item.url || item.booking_url || item.link || null
          const tags    = item.tags || item.types || item.categories || []

          if (title) results.push({ title, city, country, price, desc, bookUrl, tags: Array.isArray(tags) ? tags : [] })
        }
        break
      }
    }
  } catch (_) {}
  return results
}

// ── Extract from JSON-LD structured data ────────────────────────────────────

function extractFromJsonLd(html) {
  const results = []
  const matches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)
  for (const m of matches) {
    try {
      const obj = JSON.parse(m[1])
      const items = Array.isArray(obj) ? obj : obj['@graph'] || [obj]
      for (const item of items) {
        if (item['@type'] === 'Event' || item['@type'] === 'Product' || item['@type'] === 'Course') {
          const title   = item.name || ''
          const desc    = typeof item.description === 'string' ? item.description : null
          const bookUrl = item.url || item.offers?.url || null
          const price   = item.offers?.price || item.offers?.lowPrice || null
          const location = item.location || item.offers?.availabilityStarts
          const city    = location?.address?.addressLocality || null
          const country = location?.address?.addressCountry || null
          if (title) results.push({ title, city, country, price, desc, bookUrl, tags: [] })
        }
      }
    } catch (_) {}
  }
  return results
}

// ── HTML fallback extraction ─────────────────────────────────────────────────

function extractFromHtml($, slug) {
  const results = []

  // BookRetreats uses card-style listings
  const cardSelectors = [
    '[class*="RetreatCard"]',
    '[class*="retreat-card"]',
    '[class*="listing-card"]',
    '[class*="search-result"]',
    'article',
    '[data-testid*="retreat"]',
    '[data-testid*="listing"]',
  ]

  let cards = $()
  for (const sel of cardSelectors) {
    const found = $(sel)
    if (found.length > 0) { cards = found; break }
  }

  if (cards.length === 0) {
    // Last resort: look for any h2/h3 links inside a structured container
    $('h2 a, h3 a, [class*="title"] a').each((_, el) => {
      const title   = $(el).text().trim()
      const bookUrl = $(el).attr('href') || null
      if (title && title.length > 5) {
        results.push({ title, city: null, country: null, price: null, desc: null, bookUrl, tags: [] })
      }
    })
    return results
  }

  cards.each((_, el) => {
    const card    = $(el)
    const title   = card.find('[class*="title"], [class*="name"], h2, h3').first().text().trim()
    const bookUrl = card.find('a').first().attr('href') || null
    const priceRaw = card.find('[class*="price"], [class*="Price"]').first().text().trim()
    const locationRaw = card.find('[class*="location"], [class*="Location"], [class*="city"]').first().text().trim()
    const desc    = card.find('[class*="description"], [class*="summary"], p').first().text().trim() || null

    const tagEls = []
    card.find('[class*="tag"], [class*="Tag"], [class*="type"]').each((_, t) => { tagEls.push($(t).text().trim()) })

    const [city, country] = locationRaw.includes(',')
      ? [locationRaw.split(',')[0].trim(), locationRaw.split(',').pop().trim()]
      : [null, locationRaw || null]

    if (title) {
      results.push({
        title,
        city: city || null,
        country: country || null,
        price: parsePrice(priceRaw),
        desc: desc && desc.length > 20 ? desc : null,
        bookUrl: bookUrl && !bookUrl.startsWith('http') ? `https://bookretreats.com${bookUrl}` : bookUrl,
        tags: tagEls.filter(Boolean),
      })
    }
  })

  return results
}

// ── Detect if there's a next page ───────────────────────────────────────────

function hasNextPage($, html, page) {
  // Pagination controls
  if ($('a[aria-label="Next"], a[rel="next"], [class*="pagination"] a.next, [class*="Pagination"] a').filter((_, el) => /next/i.test($(el).text())).length > 0) return true
  // Check __NEXT_DATA__ for totalPages
  try {
    const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (m) {
      const data = JSON.parse(m[1])
      const total = data?.props?.pageProps?.totalPages || data?.props?.pageProps?.data?.totalPages
      if (total && page < total) return true
    }
  } catch (_) {}
  return false
}

// ── Scrape one category ─────────────────────────────────────────────────────

async function scrapeCategory(baseUrl, slug) {
  let page = 1
  let proceed = true

  while (proceed) {
    const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`
    console.log(`\n[BookRetreats] ${slug} — page ${page}: ${url}`)

    try {
      const res = await fetchWithBackoff(url)
      if (!res.ok) { console.log(`  HTTP ${res.status} — stopping`); break }

      const html = await res.text()
      const $ = load(html)

      // Try embedded data sources first, fall back to HTML
      let items = extractFromNextData(html, slug)
      if (items.length === 0) items = extractFromJsonLd(html)
      if (items.length === 0) items = extractFromHtml($, slug)

      if (items.length === 0) { console.log('  No listings found — stopping'); break }
      console.log(`  Found ${items.length} listings`)

      for (const item of items) {
        try {
          const tags = Array.isArray(item.tags) ? item.tags.map(String) : []
          const record = {
            title:              item.title,
            organization_name:  null,
            opportunity_type:   inferType(tags, slug),
            description:        item.desc || null,
            apply_url:          item.bookUrl || null,
            source_url:         baseUrl,
            country:            item.country || null,
            city:               item.city || null,
            self_fund_cost_usd: typeof item.price === 'number' ? item.price : parsePrice(String(item.price || '')),
            format:             'in-person',
            tags:               tags.length ? tags : null,
            is_published:       true,
            min_age:            18,
          }
          record.completeness_score = calculateCompleteness(record)
          await saveOpportunity(record)
        } catch (err) {
          console.error(`  Error processing listing:`, err.message)
        }
      }

      proceed = hasNextPage($, html, page)
      page++
      await delay(3000)
    } catch (err) {
      console.error(`  Error on page ${page} (${url}):`, err.message)
      proceed = false
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== BookRetreats Scraper ===')
  for (const cat of CATEGORIES) {
    await scrapeCategory(cat.url, cat.slug)
  }
  console.log('\n=== BookRetreats scraper complete ===')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
