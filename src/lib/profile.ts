export interface ProfileData {
  first_name?: string | null
  last_name?: string | null
  date_of_birth?: string | null
  gender?: string | null
  nationalities?: string[] | null
  country_of_residence?: string | null
  is_refugee?: boolean | null
  is_first_generation?: boolean | null
  education_level?: string | null
  field_of_study?: string | null
  institution_name?: string | null
  year_of_study?: string | null
  gpa_value?: number | null
  languages?: unknown[] | null
  years_work_experience?: number | null
  professional_sector?: string | null
  skills?: string[] | null
  certifications?: unknown[] | null
  portfolio_url?: string | null
  has_passport?: boolean | null
  has_transcripts?: boolean | null
  recommendation_letters_count?: number | null
  volunteer_hours?: number | null
  opportunity_types_interest?: string[] | null
  target_countries?: string[] | null
  preferred_format?: string | null
  max_self_fund_usd?: number | null
}

export function calculateCompletionPct(profile: ProfileData): number {
  const checks: boolean[] = [
    !!profile.first_name,
    !!profile.last_name,
    !!profile.date_of_birth,
    !!(profile.nationalities && profile.nationalities.length > 0),
    !!profile.country_of_residence,
    !!profile.education_level,
    !!profile.field_of_study,
    !!profile.institution_name,
    !!profile.year_of_study,
    !!(profile.languages && (profile.languages as unknown[]).length > 0),
    !!profile.professional_sector,
    !!(profile.skills && profile.skills.length > 0),
    typeof profile.years_work_experience === 'number' && profile.years_work_experience >= 0,
    !!profile.has_passport,
    !!profile.has_transcripts,
    !!(profile.recommendation_letters_count && profile.recommendation_letters_count > 0),
    !!(profile.opportunity_types_interest && profile.opportunity_types_interest.length > 0),
    !!(profile.target_countries && profile.target_countries.length > 0),
    !!profile.preferred_format,
    profile.max_self_fund_usd !== null && profile.max_self_fund_usd !== undefined,
  ]
  const filled = checks.filter(Boolean).length
  return Math.round((filled / checks.length) * 100)
}
