import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, created_at')
    .eq('is_published', true)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(5000)

  const oppEntries: MetadataRoute.Sitemap = (opps ?? []).map(o => ({
    url: `https://tancglobal.com/opportunities/${o.id}`,
    lastModified: new Date(o.created_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const statics: MetadataRoute.Sitemap = [
    { url: 'https://tancglobal.com',               lastModified: new Date(), changeFrequency: 'daily',  priority: 1.0 },
    { url: 'https://tancglobal.com/opportunities', lastModified: new Date(), changeFrequency: 'daily',  priority: 1.0 },
    { url: 'https://tancglobal.com/blog',          lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
  ]

  return [...statics, ...oppEntries]
}
