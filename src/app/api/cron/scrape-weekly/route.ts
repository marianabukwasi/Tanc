import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { logError } from '@/lib/errors'

const execAsync = promisify(exec)

const SCRAPERS = [
  { name: 'opportunity-desk',  file: 'scraper-opportunity-desk.js'  },
  { name: 'profellow',         file: 'scraper-profellow.js'         },
  { name: 'globalsouth',       file: 'scraper-globalsouth.js'       },
  { name: 'bookretreats',      file: 'scraper-bookretreats.js'      },
  { name: 'retreatguru',       file: 'scraper-retreatguru.js'       },
  { name: 'sports',            file: 'scraper-sports.js'            },
  { name: 'eventbrite',        file: 'scraper-eventbrite.js'        },
  { name: 'scholars4dev',      file: 'scraper-scholars4dev.js'      },
  { name: 'afterschoolafrica', file: 'scraper-afterschoolafrica.js' },
  { name: 'volunteerworld',    file: 'scraper-volunteerworld.js'    },
  { name: 'unvolunteers',      file: 'scraper-unvolunteers.js'      },
  { name: 'residencies',              file: 'scraper-residencies.js'              },
  { name: 'conferences',              file: 'scraper-conferences.js'              },
  { name: 'opportunitiesforafricans', file: 'scraper-opportunitiesforafricans.js' },
  { name: 'youthop',                  file: 'scraper-youthop.js'                  },
  { name: 'unjobs',                   file: 'scraper-unjobs.js'                   },
  { name: 'idealist',                 file: 'scraper-idealist.js'                 },
  { name: 'opportunitiescorners',     file: 'scraper-opportunitiescorners.js'     },
  { name: 'opportunityportal',        file: 'scraper-opportunityportal.js'        },
]

export async function GET(request: Request) {
  const auth = request.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const counts: Record<string, number> = {}

  for (const { name, file } of SCRAPERS) {
    const scriptPath = path.join(process.cwd(), 'scripts', file)
    try {
      const { stdout } = await execAsync(`node "${scriptPath}"`, { timeout: 270000 })
      const saved = (stdout.match(/  Saved:/g) ?? []).length
      counts[name] = saved
      console.log(`[cron/scrape-weekly] ${name}: ${saved} saved`)
    } catch (err) {
      logError(err, `[cron/scrape-weekly] ${name}`)
      counts[name] = 0
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  console.log(`[cron/scrape-weekly] Total saved: ${total}`)
  return NextResponse.json({ counts, total })
}
