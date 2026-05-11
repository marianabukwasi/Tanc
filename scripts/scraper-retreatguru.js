/**
 * Scraper: Retreat.guru
 * Target: https://retreat.guru/ category pages
 */

import fetch from 'node-fetch'
import { load } from 'cheerio'
import { delay, saveOpportunity, calculateCompleteness } from './lib/scraper-utils.js'

// Retreat.guru category pages to scrape
const CATEGORIES = [
  { url: 'https://retreat.guru/retreats/yoga',         slug: 'yoga'        },
  { url: 'https://retreat.guru/retreats/meditation',   slug: 'meditation'  },
  { url: 'https://retreat.guru/retreats/wellness',     slug: 'wellness'    },
  { url: 'https://retreat.guru/retreats/spiritual',    slug: 'spiritual'   },
  { url: 'https://retreat.guru/retreats/writing',      slug: 'writing'     },
  { url: 'https://retreat.guru/retreats/mindfulness',  slug: 'mindfulness' },
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
  ayurveda:    'wellness_retreat',
  breathwork:  'wellness_retreat',
  writing:     'writing_retreat',
  creative:    'writing_retreat',
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
      if (res.status === 429 || res.status === 503) {
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

// ── Parse duration ──────────────────────────────────────────────────────────

function parseDurationDays(text) {
  if (!text) return null
  const mDays  = text.match(/(\d+)\s*(?:day|night)/i)
  const mWeeks = text.match(/(\d+)\s*week/i)
  if (mDays)  return parseInt(mDays[1])
  if (mWeeks) return parseInt(mWeeks[1]) * 7
  return null
}

// ── Try embedded JSON (Next.js / custom) ───────────────────────────────────

function extractFromNextData(html, slug) {
  const results = []
  try {
    const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!m) return results
    const data = JSON.parse(m[1])

    const tryPaths = [
      data?.props?.pageProps?.retreats,
      data?.props?.pageProps?.programs,
      data?.props?.pageProps?.listings,
      data?.props?.pageProps?.data?.retreats,
      data?.props?.pageProps?.data?.programs,
    ]

    for (const list of tryPaths) {
      if (Array.isArray(list) && list.length > 0) {
        for (const item of list) {
          const title   = item.title || item.name || item.program_name || ''
          const city    = item.city || item.location?.city || item.center?.city || null
          const country = item.country || item.location?.country || item.center?.country || null
          const price   = item.price || item.price_from || item.min_price || null
          const desc    = item.description || item.summary || item.excerpt || null
          const bookUrl = item.url || item.booking_url || item.permalink || null
          const durationRaw = item.duration || item.length || null
          const tags    = item.tags || item.types || item.categories || item.styles || []
          const org     = item.center_name || item.center?.name || item.organization || null

          if (title) {
            results.push({
              title,
              org: typeof org === 'string' ? org : null,
              city,
              country,
              price: typeof price === 'number' ? price : parsePrice(String(price || '')),
              desc: typeof desc === 'string' ? desc.slice(0, 800) : null,
              bookUrl,
              durationDays: parseDurationDays(String(durationRaw || '')),
              tags: Array.isArray(tags) ? tags.map(String) : [],
            })
          }
        }
        break
      }
    }
  } catch (_) {}
  return results
}

// ── JSON-LD extraction ──────────────────────────────────────────────────────

function extractFromJsonLd(html) {
  const results = []
  const matches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
  for (const m of matches) {
    try {
      const obj = JSON.parse(m[1])
      const items = Array.isArray(obj) ? obj : obj['@graph'] ? obj['@graph'] : [obj]
      for (const item of items) {
        if (!['Event', 'Product', 'Course', 'HealthAndBeautyBusiness'].includes(item['@type'])) continue
        const title   = item.name || ''
        const desc    = typeof item.description === 'string' ? item.description.slice(0, 800) : null
        const bookUrl = item.url || null
        const price   = item.offers?.price ?? item.offers?.lowPrice ?? null
        const loc     = item.location || {}
        const city    = loc?.address?.addressLocality || null
        const country = loc?.address?.addressCountry  || null
        const org     = item.organizer?.name || item.provider?.name || null

        if (title) {
          results.push({
            title,
            org: typeof org === 'string' ? org : null,
            city,
            country,
            price: typeof price === 'number' ? price : parsePrice(String(price || '')),
            desc,
            bookUrl,
            durationDays: null,
            tags: [],
          })
        }
      }
    } catch (_) {}
  }
  return results
}

// ── HTML fallback ───────────────────────────────────────────────────────────

function extractFromHtml($, baseUrl, slug) {
  const results = []

  // Retreat.guru uses .program-card or .retreat-card style selectors
  const cardSelectors = [
    '.program-card',
    '[class*="program-card"]',
    '[class*="ProgramCard"]',
    '[class*="retreat-card"]',
    '[class*="RetreatCard"]',
    '[class*="listing"]',
    'article',
  ]

  let cards = $()
  for (const sel of cardSelectors) {
    const found = $(sel)
    if (found.length > 0) { cards = found; break }
  }

  if (cards.length === 0) {
    // Fallback: grab any titled links
    $('h2 a, h3 a, .program-title a, .retreat-title a').each((_, el) => {
      const title   = $(el).text().trim()
      const href    = $(el).attr('href')
      const bookUrl = href
        ? (href.startsWith('http') ? href : `https://retreat.guru${href}`)
        : null
      if (title && title.length > 5) {
        results.push({ title, org: null, city: null, country: null, price: null, desc: null, bookUrl, durationDays: null, tags: [] })
      }
    })
    return results
  }

  cards.each((_, el) => {
    const card = $(el)

    const title = card.find('[class*="title"], [class*="name"], h2, h3, h4').first().text().trim()
    if (!title) return

    const href = card.find('a[href]').first().attr('href')
    const bookUrl = href
      ? (href.startsWith('http') ? href : `https://retreat.guru${href}`)
      : null

    const priceRaw  = card.find('[class*="price"], [class*="Price"], [class*="cost"]').first().text().trim()
    const locationRaw = card.find('[class*="location"], [class*="Location"], [class*="city"], [class*="Country"]').first().text().trim()
    const durationRaw = card.find('[class*="duration"], [class*="Duration"], [class*="length"]').first().text().trim()
    const desc = card.find('[class*="description"], [class*="summary"], [class*="excerpt"], p').first().text().trim() || null
    const org  = card.find('[class*="center"], [class*="Center"], [class*="host"]').first().text().trim() || null

    const tags = []
    card.find('[class*="tag"], [class*="Tag"], [class*="style"], [class*="type"]').each((_, t) => {
      const txt = $(t).text().trim()
      if (txt) tags.push(txt)
    })

    let city = null
    let country = null
    if (locationRaw.includes(',')) {
      const parts = locationRaw.split(',')
      city    = parts[0].trim()
      country = parts[parts.length - 1].trim()
    } else if (locationRaw) {
      country = locationRaw
    }

    results.push({
      title,
      org: org && org.length < 80 ? org : null,
      city,
      country,
      price: parsePrice(priceRaw),
      desc: desc && desc.length > 20 ? desc.slice(0, 800) : null,
      bookUrl,
      durationDays: parseDurationDays(durationRaw),
      tags,
    })
  })

  return results
}

// ── Detect next page ────────────────────────────────────────────────────────

function hasNextPage($, html, page) {
  if ($('a[aria-label="Next"], a[rel="next"], .pagination__next, [class*="pagination"] .next, [class*="next-page"]').length > 0) return true
  // Some sites embed total count in JSON
  try {
    const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (m) {
      const data = JSON.parse(m[1])
      const totalPages = data?.props?.pageProps?.totalPages
        || data?.props?.pageProps?.data?.totalPages
        || data?.props?.pageProps?.pagination?.totalPages
      if (typeof totalPages === 'number' && page < totalPages) return true
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
    console.log(`\n[RetreatGuru] ${slug} — page ${page}: ${url}`)

    try {
      const res = await fetchWithBackoff(url)
      if (!res.ok) { console.log(`  HTTP ${res.status} — stopping`); break }

      const html = await res.text()
      const $ = load(html)

      let items = extractFromNextData(html, slug)
      if (items.length === 0) items = extractFromJsonLd(html)
      if (items.length === 0) items = extractFromHtml($, baseUrl, slug)

      if (items.length === 0) { console.log('  No listings found — stopping'); break }
      console.log(`  Found ${items.length} listings`)

      for (const item of items) {
        try {
          const tags = Array.isArray(item.tags) ? item.tags.map(String) : []
          const record = {
            title:              item.title,
            organization_name:  item.org || null,
            opportunity_type:   inferType(tags, slug),
            description:        item.desc || null,
            apply_url:          item.bookUrl || null,
            source_url:         baseUrl,
            country:            item.country || null,
            city:               item.city || null,
            self_fund_cost_usd: item.price || null,
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
  console.log('=== RetreatGuru Scraper ===')
  for (const cat of CATEGORIES) {
    await scrapeCategory(cat.url, cat.slug)
  }
  console.log('\n=== RetreatGuru scraper complete ===')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
