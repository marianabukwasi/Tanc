/**
 * Scraper: Adult Sports Camps
 * Sources: US Sports Camps, IMG Academy
 */

import fetch from 'node-fetch'
import { load } from 'cheerio'
import { delay, saveOpportunity, calculateCompleteness } from './lib/scraper-utils.js'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

// ── Youth exclusion filter ──────────────────────────────────────────────────

const YOUTH_TERMS = [
  'youth', 'children', 'child', 'kids', 'kid', 'grades', 'grade ',
  'under 18', 'high school students', 'junior', 'teen ', 'teenage',
  'elementary', 'middle school', 'little league', 'peewee',
]

function isAdultProgram(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase()
  return !YOUTH_TERMS.some(term => text.includes(term))
}

// ── Sport-type tag inference ────────────────────────────────────────────────

const SPORT_TAGS = [
  'basketball', 'tennis', 'soccer', 'football', 'baseball', 'softball',
  'volleyball', 'golf', 'swimming', 'track', 'lacrosse', 'hockey',
  'wrestling', 'gymnastics', 'cheerleading', 'rowing', 'crew',
  'rugby', 'cricket', 'cycling', 'triathlon', 'crossfit', 'fitness',
]

function extractSportTags(text) {
  const lower = text.toLowerCase()
  return SPORT_TAGS.filter(s => lower.includes(s))
}

// ── Price parser ────────────────────────────────────────────────────────────

function parsePrice(text) {
  if (!text) return null
  const m = text.replace(/,/g, '').match(/\$?([\d]+(?:\.\d{1,2})?)/)
  return m ? Math.round(parseFloat(m[1])) : null
}

// ── Exponential backoff fetch ───────────────────────────────────────────────

async function fetchWithBackoff(url, options = {}, maxRetries = 4) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, { ...options, headers: { ...HEADERS, ...options.headers } })
      if (res.status === 429 || res.status === 503) {
        const wait = Math.pow(2, attempt) * 3000
        console.log(`  Rate limited (${res.status}) — waiting ${wait / 1000}s`)
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

// ══════════════════════════════════════════════════════════════════════════════
// US SPORTS CAMPS — ussportscamps.com
// ══════════════════════════════════════════════════════════════════════════════

const USS_SPORT_PAGES = [
  { url: 'https://www.ussportscamps.com/basketball',  sport: 'basketball' },
  { url: 'https://www.ussportscamps.com/tennis',      sport: 'tennis'     },
  { url: 'https://www.ussportscamps.com/soccer',      sport: 'soccer'     },
  { url: 'https://www.ussportscamps.com/baseball',    sport: 'baseball'   },
  { url: 'https://www.ussportscamps.com/volleyball',  sport: 'volleyball' },
  { url: 'https://www.ussportscamps.com/golf',        sport: 'golf'       },
  { url: 'https://www.ussportscamps.com/lacrosse',    sport: 'lacrosse'   },
  { url: 'https://www.ussportscamps.com/field-hockey',sport: 'hockey'     },
  { url: 'https://www.ussportscamps.com/swimming',    sport: 'swimming'   },
  { url: 'https://www.ussportscamps.com/softball',    sport: 'softball'   },
]

function extractFromNextData(html) {
  try {
    const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!m) return []
    const root = JSON.parse(m[1])
    const tryPaths = [
      root?.props?.pageProps?.camps,
      root?.props?.pageProps?.programs,
      root?.props?.pageProps?.data?.camps,
      root?.props?.pageProps?.data?.programs,
      root?.props?.pageProps?.results,
    ]
    for (const list of tryPaths) {
      if (Array.isArray(list) && list.length > 0) return list
    }
  } catch (_) {}
  return []
}

function extractJsonLdEvents(html) {
  const results = []
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const obj = JSON.parse(m[1])
      const items = Array.isArray(obj) ? obj : obj['@graph'] ? obj['@graph'] : [obj]
      for (const item of items) {
        if (!item['@type']?.toString().includes('Event') && item['@type'] !== 'Product') continue
        results.push({
          title:       item.name || '',
          description: typeof item.description === 'string' ? item.description : null,
          url:         item.url || item.offers?.url || null,
          price:       item.offers?.price ?? null,
          startDate:   item.startDate || null,
          endDate:     item.endDate   || null,
          location:    item.location?.address?.addressLocality || null,
          country:     item.location?.address?.addressCountry  || 'United States',
          org:         item.organizer?.name || 'US Sports Camps',
        })
      }
    } catch (_) {}
  }
  return results
}

async function scrapeUSSPage(pageUrl, sport) {
  console.log(`\n[USSportsCamps] ${sport}: ${pageUrl}`)
  try {
    const res = await fetchWithBackoff(pageUrl)
    if (!res.ok) { console.log(`  HTTP ${res.status} — skipping`); return }
    const html = await res.text()
    const $ = load(html)

    // Try structured data first
    let rawItems = extractJsonLdEvents(html)
    if (rawItems.length === 0) {
      // HTML fallback: camp cards
      const cardSels = [
        '[class*="camp-card"]', '[class*="CampCard"]',
        '[class*="program-card"]', '[class*="camp-listing"]',
        '.camp', 'article',
      ]
      for (const sel of cardSels) {
        const els = $(sel)
        if (els.length === 0) continue
        els.each((_, el) => {
          const c = $(el)
          const title    = c.find('h2, h3, h4, [class*="title"]').first().text().trim()
          const desc     = c.find('p, [class*="description"]').first().text().trim()
          const priceRaw = c.find('[class*="price"], [class*="cost"]').first().text().trim()
          const location = c.find('[class*="location"], [class*="city"], [class*="venue"]').first().text().trim()
          const href     = c.find('a[href]').first().attr('href') || null
          const dateRaw  = c.find('[class*="date"], time').first().text().trim()
          if (title) rawItems.push({ title, description: desc, url: href, price: parsePrice(priceRaw), startDate: dateRaw, country: 'United States', location, org: 'US Sports Camps' })
        })
        break
      }
    }

    // Also collect detail-page links to scrape individually
    const detailLinks = new Set()
    $('a[href*="ussportscamps.com/"], a[href*="/camps/"], a[href*="/programs/"]').each((_, el) => {
      const href = $(el).attr('href')
      if (href && href.includes(sport) && !href.includes('page=')) {
        detailLinks.add(href.startsWith('http') ? href : `https://www.ussportscamps.com${href}`)
      }
    })

    // Combine and save
    const allItems = [...rawItems]

    // For each unique detail link not already covered
    for (const link of [...detailLinks].slice(0, 20)) {
      if (rawItems.some(r => r.url === link)) continue
      await delay(2000)
      try {
        const dRes = await fetchWithBackoff(link)
        if (!dRes.ok) continue
        const dHtml = await dRes.text()
        const d$ = load(dHtml)
        const ldItems = extractJsonLdEvents(dHtml)
        if (ldItems.length > 0) { allItems.push(...ldItems); continue }
        const title = d$('h1').first().text().trim()
        const desc  = d$('[class*="description"], .content, article p').first().text().trim()
        const priceRaw = d$('[class*="price"], [class*="cost"], [class*="fee"]').first().text().trim()
        if (title) allItems.push({ title, description: desc, url: link, price: parsePrice(priceRaw), startDate: null, country: 'United States', location: null, org: 'US Sports Camps' })
      } catch (err) {
        console.error(`  Detail page error ${link}:`, err.message)
      }
    }

    console.log(`  Processing ${allItems.length} items`)
    for (const item of allItems) {
      if (!item.title) continue
      if (!isAdultProgram(item.title, item.description || '')) {
        console.log(`  Skip (youth): ${item.title}`)
        continue
      }
      const sportTags = extractSportTags(`${item.title} ${sport}`)
      const record = {
        title:              item.title,
        organization_name:  item.org || 'US Sports Camps',
        opportunity_type:   'sports_camp',
        description:        item.description || null,
        apply_url:          item.url?.startsWith('http') ? item.url : item.url ? `https://www.ussportscamps.com${item.url}` : null,
        source_url:         pageUrl,
        country:            item.country || 'United States',
        city:               item.location || null,
        self_fund_cost_usd: typeof item.price === 'number' ? item.price : null,
        start_date:         item.startDate ? parseDate(item.startDate) : null,
        tags:               sportTags.length ? sportTags : [sport],
        format:             'in-person',
        is_published:       true,
        min_age:            18,
      }
      record.completeness_score = calculateCompleteness(record)
      await saveOpportunity(record)
    }
  } catch (err) {
    console.error(`  Error scraping ${pageUrl}:`, err.message)
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// IMG ACADEMY — imgacademy.com
// ══════════════════════════════════════════════════════════════════════════════

const IMG_SPORT_PAGES = [
  'https://www.imgacademy.com/sport-camps',
  'https://www.imgacademy.com/programs/adult-programs',
  'https://www.imgacademy.com/programs/tennis/adult-programs',
  'https://www.imgacademy.com/programs/golf/adult-programs',
  'https://www.imgacademy.com/programs/baseball/adult-programs',
  'https://www.imgacademy.com/programs/basketball/adult-programs',
  'https://www.imgacademy.com/programs/soccer/adult-programs',
  'https://www.imgacademy.com/programs/pickleball',
]

async function scrapeIMGPage(pageUrl) {
  console.log(`\n[IMGAcademy] ${pageUrl}`)
  try {
    const res = await fetchWithBackoff(pageUrl)
    if (!res.ok) { console.log(`  HTTP ${res.status} — skipping`); return }
    const html = await res.text()
    const $ = load(html)

    // Try JSON-LD and __NEXT_DATA__ first
    let items = extractJsonLdEvents(html)

    // HTML fallback
    if (items.length === 0) {
      const cardSels = [
        '[class*="program-card"]', '[class*="ProgramCard"]',
        '[class*="camp-card"]', '[class*="sport-card"]',
        '[class*="card"]', 'article', '.program',
      ]
      for (const sel of cardSels) {
        const els = $(sel)
        if (els.length === 0) continue
        els.each((_, el) => {
          const c = $(el)
          const title    = c.find('h2, h3, h4, [class*="title"], [class*="heading"]').first().text().trim()
          const desc     = c.find('p, [class*="description"], [class*="text"]').first().text().trim()
          const priceRaw = c.find('[class*="price"], [class*="cost"], [class*="fee"]').first().text().trim()
          const href     = c.find('a[href]').first().attr('href') || null
          if (title) items.push({ title, description: desc, url: href, price: parsePrice(priceRaw), startDate: null, country: 'United States', location: 'Bradenton, FL', org: 'IMG Academy' })
        })
        if (items.length > 0) break
      }
    }

    // Grab detail links from page
    const seen = new Set(items.map(i => i.url).filter(Boolean))
    $('a[href*="imgacademy.com/programs"], a[href*="/programs/"]').each((_, el) => {
      const href = $(el).attr('href')
      if (!href) return
      const full = href.startsWith('http') ? href : `https://www.imgacademy.com${href}`
      if (!seen.has(full) && !full.includes('#')) { seen.add(full); }
    })

    console.log(`  Processing ${items.length} items`)
    for (const item of items) {
      if (!item.title) continue
      if (!isAdultProgram(item.title, item.description || '')) {
        console.log(`  Skip (youth): ${item.title}`)
        continue
      }
      const sportTags = extractSportTags(`${item.title} ${item.description || ''}`)
      const record = {
        title:              item.title,
        organization_name:  'IMG Academy',
        opportunity_type:   'sports_camp',
        description:        item.description || null,
        apply_url:          item.url?.startsWith('http') ? item.url : item.url ? `https://www.imgacademy.com${item.url}` : pageUrl,
        source_url:         pageUrl,
        country:            'United States',
        city:               'Bradenton, FL',
        self_fund_cost_usd: typeof item.price === 'number' ? item.price : null,
        tags:               sportTags.length ? sportTags : ['sports'],
        format:             'in-person',
        is_published:       true,
        min_age:            18,
      }
      record.completeness_score = calculateCompleteness(record)
      await saveOpportunity(record)
    }
  } catch (err) {
    console.error(`  Error scraping ${pageUrl}:`, err.message)
  }
}

// ── Date parser helper ──────────────────────────────────────────────────────

function parseDate(raw) {
  if (!raw) return null
  try {
    const d = new Date(raw)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  } catch (_) {}
  const m = raw.match(/([A-Za-z]+ \d{1,2},?\s*\d{4})/)
  if (m) {
    try {
      const d = new Date(m[1])
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    } catch (_) {}
  }
  return null
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Sports Scraper ===')

  console.log('\n--- US Sports Camps ---')
  for (const { url, sport } of USS_SPORT_PAGES) {
    await scrapeUSSPage(url, sport)
    await delay(3000)
  }

  console.log('\n--- IMG Academy ---')
  for (const url of IMG_SPORT_PAGES) {
    await scrapeIMGPage(url)
    await delay(3000)
  }

  console.log('\n=== Sports scraper complete ===')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
