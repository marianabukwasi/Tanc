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
  if (!opp) return { title: 'Opportunity — TANC' }
  return {
    title: `${opp.title} — TANC`,
    description: opp.description
      ? opp.description.slice(0, 160)
      : `${opp.title} by ${opp.organization_name ?? ''} in ${opp.country ?? ''}. Discover and apply on TANC.`,
  }
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return <OpportunityDetail id={id} />
}
