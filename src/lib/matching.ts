export interface MatchProfile {
  nationality: string
  education_level: string
  field_of_study: string
  languages: string[]
  age: number | null
  profile_complete: number
}

export interface MatchOpportunity {
  eligibility_countries?: string | string[] | null
  education_level?: string | null
  field?: string | null
  language_requirements?: string | string[] | null
  min_age?: number | null
  max_age?: number | null
}

export interface MatchResult {
  score: number
  isEstimate: boolean
}

export type MatchInfo =
  | { state: 'anonymous' }
  | { state: 'loading' }
  | { state: 'incomplete' }
  | { state: 'score'; value: number; isEstimate: boolean }

function toArr(val: string | string[] | null | undefined): string[] {
  if (!val) return []
  return Array.isArray(val) ? val : [val]
}

export function calculateMatch(
  profile: MatchProfile,
  opportunity: MatchOpportunity
): MatchResult | null {
  if (profile.profile_complete < 50) return null

  let score = 0

  // Nationality / eligibility: +30
  const eligible = toArr(opportunity.eligibility_countries)
  if (
    eligible.length === 0 ||
    eligible.some(c => ['global', 'all', 'worldwide'].includes(c.toLowerCase()))
  ) {
    score += 30
  } else if (
    profile.nationality &&
    eligible.some(c => c.toLowerCase() === profile.nationality.toLowerCase())
  ) {
    score += 30
  }

  // Education level: +25
  const oppEd = opportunity.education_level
  if (!oppEd || oppEd.toLowerCase() === 'any') {
    score += 25
  } else if (
    profile.education_level &&
    oppEd.toLowerCase() === profile.education_level.toLowerCase()
  ) {
    score += 25
  }

  // Field of study: +20
  const oppField = opportunity.field
  if (!oppField) {
    score += 20
  } else if (profile.field_of_study) {
    const pf = profile.field_of_study.toLowerCase()
    const of = oppField.toLowerCase()
    score += of.includes(pf) || pf.includes(of) ? 20 : 5
  }

  // Language requirements: +15
  const langReqs = toArr(opportunity.language_requirements)
  if (langReqs.length === 0) {
    score += 15
  } else if (profile.languages.length > 0) {
    const userLangs = profile.languages.map(l => l.toLowerCase())
    const allMet = langReqs.every(l => userLangs.includes(l.toLowerCase()))
    const anyMet = langReqs.some(l => userLangs.includes(l.toLowerCase()))
    score += allMet ? 15 : anyMet ? 7 : 0
  }

  // Age range: +10
  const { min_age, max_age } = opportunity
  if (!min_age && !max_age) {
    score += 10
  } else if (profile.age !== null) {
    const withinRange =
      (!min_age || profile.age >= min_age) &&
      (!max_age || profile.age <= max_age)
    if (withinRange) score += 10
  }

  return {
    score: Math.min(100, score),
    isEstimate: profile.profile_complete < 80,
  }
}
