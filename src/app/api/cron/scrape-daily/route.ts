import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export async function GET(request: Request) {
  const auth = request.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scriptPath = path.join(process.cwd(), 'scripts', 'scraper-eventbrite.js')

  try {
    const { stdout } = await execAsync(`node "${scriptPath}"`, { timeout: 270000 })
    const scraped = (stdout.match(/  Saved:/g) ?? []).length
    console.log(`[cron/scrape-daily] Eventbrite scraped ${scraped} new records`)
    return NextResponse.json({ scraped })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cron/scrape-daily] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
