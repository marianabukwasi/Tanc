const AFFILIATE_IDS = {
  ticketnetwork: process.env.TICKETNETWORK_AFFILIATE_ID || '',
  booking:       process.env.BOOKING_AFFILIATE_ID       || '',
  viator:        process.env.VIATOR_AFFILIATE_ID        || '',
  getyourguide:  process.env.GETYOURGUIDE_AFFILIATE_ID  || '',
  babbel:        process.env.BABBEL_AFFILIATE_URL        || '',
  coursera:      process.env.COURSERA_AFFILIATE_URL      || '',
}

export function generateTicketLink(eventName: string): string {
  const q = encodeURIComponent(eventName)
  const id = AFFILIATE_IDS.ticketnetwork
  return id
    ? `https://www.ticketnetwork.com/search?q=${q}&aff=${id}`
    : `https://www.ticketnetwork.com/search?q=${q}`
}

export function generateBookingLink(city: string | null, country: string | null): string {
  const ss = encodeURIComponent([city, country].filter(Boolean).join(', ') || country || city || '')
  const id = AFFILIATE_IDS.booking
  return id
    ? `https://www.booking.com/search.html?ss=${ss}&aid=${id}`
    : `https://www.booking.com/search.html?ss=${ss}`
}

export function generateViatorLink(city: string | null): string {
  const q = encodeURIComponent(city || '')
  const id = AFFILIATE_IDS.viator
  return id
    ? `https://www.viator.com/search?q=${q}&pid=${id}`
    : `https://www.viator.com/search?q=${q}`
}

export function generateGetYourGuideLink(city: string | null): string {
  const q = encodeURIComponent(city || '')
  const id = AFFILIATE_IDS.getyourguide
  return id
    ? `https://www.getyourguide.com/s/?q=${q}&partner_id=${id}`
    : `https://www.getyourguide.com/s/?q=${q}`
}

export function getBabbelUrl(): string {
  return AFFILIATE_IDS.babbel || 'https://www.babbel.com/'
}

export function getCourseraUrl(): string {
  return AFFILIATE_IDS.coursera || 'https://www.coursera.org/'
}

// Build a tracked redirect URL through our click-logging endpoint
export function trackedUrl(destinationUrl: string, oppId: string, program: string): string {
  const encoded = encodeURIComponent(destinationUrl)
  return `/api/affiliate/click?opp=${oppId}&program=${encodeURIComponent(program)}&url=${encoded}`
}

// Opportunity types that warrant a tickets button
export const TICKET_TYPES = new Set([
  'Sports Events',
  'Sports Camps',
  'Conferences',
  'Cultural Events',
  'Workshops & Training',
  'Camps',
])

// Opportunity types that warrant a book-accommodation button
export const RETREAT_TYPES = new Set([
  'Wellness Retreats',
  'Writing Retreats',
  'Residencies',
])
