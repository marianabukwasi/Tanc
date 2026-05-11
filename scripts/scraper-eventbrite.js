/**
 * Scraper: Eventbrite
 * Categories: conferences, leadership, professional development, business, tech
 */

import fetch from 'node-fetch'
import { load } from 'cheerio'
import { delay, saveOpportunity, calculateCompleteness } from './lib/scraper-utils.js'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

// ── Category targets ────────────────────────────────────────────────────────

const TARGETS = [
  // Online
  { url: 'https://www.eventbrite.com/d/online/conferences/',                slug: 'conferences',             region: 'Online' },
  { url: 'https://www.eventbrite.com/d/online/leadership/',                  slug: 'leadership',              region: 'Online' },
  { url: 'https://www.eventbrite.com/d/online/professional-development/',    slug: 'professional-development',region: 'Online' },
  { url: 'https://www.eventbrite.com/d/online/business/',                    slug: 'business',                region: 'Online' },
  { url: 'https://www.eventbrite.com/d/online/technology/',                  slug: 'technology',              region: 'Online' },
  // UK
  { url: 'https://www.eventbrite.com/d/united-kingdom/conferences/',         slug: 'conferences',             region: 'United Kingdom' },
  { url: 'https://www.eventbrite.com/d/united-kingdom/professional-development/', slug: 'professional-development', region: 'United Kingdom' },
  // US
  { url: 'https://www.eventbrite.com/d/united-states/conferences/',          slug: 'conferences',             region: 'United States' },
  { url: 'https://www.eventbrite.com/d/united-states/leadership/',           slug: 'leadership',              region: 'United States' },
  // Canada
  { url: 'https://www.eventbrite.com/d/canada/conferences/',                 slug: 'conferences',             region: 'Canada' },
  // Australia
  { url: 'https://www.eventbrite.com/d/australia/conferences/',              slug: 'conferences',             region: 'Australia' },
  // Africa / Global South
  { url: 'https://www.eventbrite.com/d/south-africa/conferences/',           slug: 'conferences',             region: 'South Africa' },
  { url: 'https://www.eventbrite.com/d/nigeria/conferences/',                slug: 'conferences',             region: 'Nigeria' },
  { url: 'https://www.eventbrite.com/d/kenya/conferences/',                  slug: 'conferences',             region: 'Kenya' },
  { url: 'https://www.eventbrite.com/d/ghana/conferences/',                  slug: 'conferences',             region: 'Ghana' },
]

// ── Type mapping ────────────────────────────────────────────────────────────

function inferType(slug, title) {
  const combined = `${slug} ${title}`.toLowerCase()
  if (combined.includes('conference') || combined.includes('summit')) return 'conference'
  if (combined.includes('workshop'))                                   return 'Workshops'
  if (combined.includes('leadership'))                                 return 'Leadership Programs'
  if (combined.includes('professional') || combined.includes('dev'))  return 'Training Programs'
  if (combined.includes('hackathon'))                                  return 'Hackathons'
  if (combined.includes('tech') || combined.includes('technology'))   return 'conference'
  return 'conference'
}

// ── Youth exclusion filter ──────────────────────────────────────────────────

const YOUTH_TERMS = [
  'youth', 'children', 'child', 'kids', 'kid', 'grades', 'grade ',
  'under 18', 'high school students', 'junior', 'teen ', 'teenage',
  'elementary', 'middle school', 'for kids', 'for children',
]

function isAdultEvent(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase()
  return !YOUTH_TERMS.some(term => text.includes(term))
}

// ── Price parser ────────────────────────────────────────────────────────────

function parsePrice(text) {
  if (!text) return null
  const lower = text.toLowerCase()
  if (lower.includes('free') || lower.includes('$0')) return 0
  const m = text.replace(/,/g, '').match(/\$?([\d]+(?:\.\d{1,2})?)/)
  return m ? Math.round(parseFloat(m[1])) : null
}

// ── Date parser ─────────────────────────────────────────────────────────────

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

// ── Exponential backoff fetch ───────────────────────────────────────────────

async function fetchWithBackoff(url, options = {}, maxRetries = 4) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, { ...options, headers: { ...HEADERS, ...options.headers } })
      if (res.status === 429 || res.status === 503) {
        const wait = Math.pow(2, attempt) * 4000
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

// ── Extract from Eventbrite __SERVER_DATA__ / __NEXT_DATA__ ────────────────

function extractFromServerData(html) {
  const results = []

  // Eventbrite embeds server state in various formats
  const patterns = [
    /__SERVER_DATA__\s*=\s*(\{[\s\S]*?\})(?=;<\/script>)/,
    /window\.__SERVER_DATA__\s*=\s*(\{[\s\S]*?\})(?=;)/,
    /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    /window\.__eventData__\s*=\s*(\{[\s\S]*?\})(?=;)/,
  ]

  for (const pattern of patterns) {
    const m = html.match(pattern)
    if (!m) continue
    try {
      const data = JSON.parse(m[1])
      // Walk common Eventbrite data paths
      const lists = [
        data?.events,
        data?.search?.events,
        data?.props?.pageProps?.events,
        data?.props?.pageProps?.data?.events,
        data?.props?.pageProps?.searchData?.events,
        data?.serverData?.events,
      ]
      for (const list of lists) {
        if (Array.isArray(list) && list.length > 0) {
          for (const ev of list) {
            results.push(normaliseEventbriteEvent(ev))
          }
          return results
        }
      }
    } catch (_) {}
  }

  return results
}

function normaliseEventbriteEvent(ev) {
  const title     = ev.name?.text || ev.name || ev.title || ''
  const desc      = ev.description?.text || ev.summary || ev.description || null
  const organizer = ev.organizer?.name || ev.organizer_name || null
  const startRaw  = ev.start?.local || ev.start_date || ev.starts_at || null
  const priceRaw  = ev.ticket_availability?.minimum_ticket_price?.major_value
                 ?? ev.price ?? ev.cost ?? null
  const paid      = typeof priceRaw === 'number' ? priceRaw > 0 : false
  const url       = ev.url || ev.link || ev.event_url || null
  const location  = ev.venue?.address?.city
                 || ev.venue?.name
                 || (ev.online_event ? 'Online' : null)
  const country   = ev.venue?.address?.country || null
  return { title, desc, organizer, startRaw, price: typeof priceRaw === 'number' ? priceRaw : parsePrice(String(priceRaw || '')), paid, url, location, country }
}

// ── JSON-LD extraction ──────────────────────────────────────────────────────

function extractFromJsonLd(html) {
  const results = []
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const obj = JSON.parse(m[1])
      const items = Array.isArray(obj) ? obj : obj['@graph'] ? obj['@graph'] : [obj]
      for (const item of items) {
        const type = Array.isArray(item['@type']) ? item['@type'][0] : item['@type']
        if (!type?.toString().includes('Event')) continue
        const price = item.offers?.price ?? item.offers?.lowPrice ?? null
        results.push({
          title:     item.name || '',
          desc:      typeof item.description === 'string' ? item.description.slice(0, 800) : null,
          organizer: item.organizer?.name || null,
          startRaw:  item.startDate || null,
          price:     typeof price === 'number' ? price : parsePrice(String(price || '')),
          paid:      typeof price === 'number' ? price > 0 : false,
          url:       item.url || item.offers?.url || null,
          location:  item.location?.name || item.location?.address?.addressLocality || null,
          country:   item.location?.address?.addressCountry || null,
        })
      }
    } catch (_) {}
  }
  return results
}

// ── HTML fallback ───────────────────────────────────────────────────────────

function extractFromHtml($, region) {
  const results = []

  const cardSels = [
    '[data-testid="event-card"]',
    '[class*="event-card"]',
    '[class*="EventCard"]',
    '[class*="search-event-card"]',
    '[class*="eds-event-card"]',
    'article',
    'li[class*="event"]',
  ]

  let cards = $()
  for (const sel of cardSels) {
    const found = $(sel)
    if (found.length > 0) { cards = found; break }
  }

  if (cards.length === 0) {
    // Last resort: structured h3 links
    $('h3 a, [class*="event-name"] a, [class*="EventName"] a').each((_, el) => {
      const title = $(el).text().trim()
      const href  = $(el).attr('href') || null
      if (title) results.push({ title, desc: null, organizer: null, startRaw: null, price: null, paid: false, url: href, location: region === 'Online' ? 'Online' : region, country: null })
    })
    return results
  }

  cards.each((_, el) => {
    const c = $(el)
    const title      = c.find('[class*="title"], [class*="name"], h3, h2').first().text().trim()
    const desc       = c.find('[class*="description"], [class*="summary"], p').first().text().trim() || null
    const organizer  = c.find('[class*="organizer"], [class*="host"]').first().text().trim() || null
    const dateRaw    = c.find('time, [class*="date"], [datetime]').first().attr('datetime') || c.find('time, [class*="date"]').first().text().trim() || null
    const priceRaw   = c.find('[class*="price"], [class*="ticket"]').first().text().trim()
    const href       = c.find('a[href*="eventbrite"]').first().attr('href') || c.find('a[href]').first().attr('href') || null
    const locationEl = c.find('[class*="location"], [class*="venue"]').first().text().trim()

    if (!title) return
    const price = parsePrice(priceRaw)
    results.push({
      title,
      desc:      desc && desc.length > 20 ? desc.slice(0, 800) : null,
      organizer: organizer && organizer.length < 100 ? organizer : null,
      startRaw:  dateRaw,
      price,
      paid:      typeof price === 'number' && price > 0,
      url:       href,
      location:  locationEl || (region === 'Online' ? 'Online' : region),
      country:   null,
    })
  })

  return results
}

// ── Next page detection ─────────────────────────────────────────────────────

function hasNextPage($, html, page) {
  if ($('a[aria-label="Next"], a[rel="next"], [class*="pagination"] [class*="next"], [data-spec="page-next"]').length > 0) return true
  // Eventbrite uses ?page=N
  if ($(`a[href*="page=${page + 1}"]`).length > 0) return true
  // Check for total pages in embedded data
  try {
    const m = html.match(/"total_pages"\s*:\s*(\d+)/) || html.match(/"totalPages"\s*:\s*(\d+)/)
    if (m && page < parseInt(m[1])) return true
    const m2 = html.match(/"page_count"\s*:\s*(\d+)/)
    if (m2 && page < parseInt(m2[1])) return true
  } catch (_) {}
  return false
}

// ── Scrape one category/region ──────────────────────────────────────────────

async function scrapeTarget(baseUrl, slug, region) {
  let page = 1
  let proceed = true

  while (proceed) {
    const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`
    console.log(`\n[Eventbrite] ${slug} / ${region} — page ${page}: ${url}`)

    try {
      const res = await fetchWithBackoff(url)
      if (!res.ok) {
        console.log(`  HTTP ${res.status} — stopping`)
        break
      }

      const html = await res.text()
      const $    = load(html)

      // Try richest sources first
      let items = extractFromServerData(html)
      if (items.length === 0) items = extractFromJsonLd(html)
      if (items.length === 0) items = extractFromHtml($, region)

      if (items.length === 0) { console.log('  No events found — stopping'); break }
      console.log(`  Found ${items.length} events`)

      for (const item of items) {
        if (!item.title) continue

        // Exclude youth-focused events
        if (!isAdultEvent(item.title, item.desc || '')) {
          console.log(`  Skip (youth): ${item.title}`)
          continue
        }

        const opportunityType = inferType(slug, item.title)
        const startDate = parseDate(item.startRaw)

        const record = {
          title:                item.title,
          organization_name:    item.organizer || null,
          opportunity_type:     opportunityType,
          description:          item.desc || null,
          apply_url:            item.url || null,
          source_url:           baseUrl,
          // paid events: set ticket_affiliate_url (for future affiliate integration)
          ticket_affiliate_url: item.paid && item.url ? item.url : null,
          self_fund_cost_usd:   typeof item.price === 'number' ? item.price : null,
          funding_type:         item.price === 0 ? 'Free' : item.paid ? 'Paid' : null,
          country:              item.country || (region !== 'Online' ? region : null),
          city:                 typeof item.location === 'string' ? item.location : null,
          format:               item.location === 'Online' || region === 'Online' ? 'Online' : 'in-person',
          start_date:           startDate,
          is_published:         true,
          min_age:              18,
          tags:                 [slug.replace(/-/g, ' ')],
        }
        record.completeness_score = calculateCompleteness(record)
        await saveOpportunity(record)
      }

      proceed = hasNextPage($, html, page)
      page++
      await delay(3000)

      // Eventbrite is aggressive with rate limits — extra pause after first page
      if (page === 2) await delay(2000)
    } catch (err) {
      console.error(`  Error on page ${page}:`, err.message)
      proceed = false
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Eventbrite Scraper ===')
  for (const { url, slug, region } of TARGETS) {
    await scrapeTarget(url, slug, region)
    await delay(4000) // extra courtesy delay between categories
  }
  console.log('\n=== Eventbrite scraper complete ===')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
