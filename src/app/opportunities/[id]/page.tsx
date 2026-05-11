import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import OpportunityDetail from './OpportunityDetail'

type Props = { params: Promise<{ id: string }> }

async function fetchBasic(id: string) {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await client
    .from('opportunities')
    .select('title,description,organization_name,country')
    .eq('id', id)
    .single()
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const opp = await fetchBasic(id)
  if (!opp) return { title: 'Opportunity Not Found' }
  const title = `${opp.title} — ${opp.organization_name ?? 'TANC'}`
  const description = opp.description
    ? opp.description.substring(0, 155)
    : `${opp.title} by ${opp.organization_name ?? ''} in ${opp.country ?? ''}. Discover and apply on TANC.`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return <OpportunityDetail id={id} />
}
