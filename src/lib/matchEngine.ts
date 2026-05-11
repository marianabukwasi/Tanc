// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProfileLang {
  name: string
  level?: string  // CEFR: A1 A2 B1 B2 C1 C2 Native
}

export interface RequiredLang {
  language: string
  level?: string
}

export interface EngineProfile {
  nationalities: string[] | null
  date_of_birth: string | null
  education_level: string | null
  field_of_study: string | null
  languages: ProfileLang[] | string[] | null
  gpa_value: number | null
  gpa_scale: number | null
  years_work_experience: number | null
  has_passport: boolean | null
  has_transcripts: boolean | null
  recommendation_letters_count: number | null
}

export interface EngineOpportunity {
  required_nationalities: string[] | null
  excluded_nationalities: string[] | null
  min_education_level: string | null
  required_fields_of_study: string[] | null
  min_gpa: number | null
  gpa_scale: number | null
  required_languages: RequiredLang[] | string[] | null
  min_age: number | null
  max_age: number | null
  min_work_experience_years: number | null
  requires_passport: boolean | null
  requires_transcripts: boolean | null
  requires_recommendations: boolean | null
  min_recommendations: number | null
}

export interface Gap {
  field: string
  required: string
  userHas: string
  isHardFail: boolean
}

export interface MatchResult {
  score: number
  tier: 'apply_now' | 'almost_there' | 'aspirational'
  met: string[]
  gaps: Gap[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ED_ORDER: Record<string, number> = {
  'high school': 0, 'high_school': 0,
  'undergraduate': 1, 'bachelor': 1, 'bachelors': 1,
  'postgraduate': 2, 'postgraduate_masters': 2, 'masters': 2, "master's": 2, 'master': 2,
  'phd': 3, 'doctoral': 3, 'doctorate': 3,
  'postdoctoral': 4, 'post-doctoral': 4,
}

const CEFR_ORDER: Record<string, number> = {
  a1: 0, a2: 1, b1: 2, b2: 3, c1: 4, c2: 5, native: 6,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
}

function edLevel(val: string | null | undefined): number {
  if (!val) return -1
  return ED_ORDER[val.toLowerCase().trim()] ?? -1
}

function cefrLevel(val: string | null | undefined): number {
  if (!val) return -1
  return CEFR_ORDER[val.toLowerCase().trim()] ?? -1
}

function normalizeGpa(gpa: number, scale: number): number {
  return scale > 0 ? gpa / scale : 0
}

function profileLangName(l: ProfileLang | string): string {
  return typeof l === 'string' ? l : l.name
}

function profileLangLevel(l: ProfileLang | string): string | null {
  return typeof l === 'string' ? null : (l.level ?? null)
}

function requiredLangName(l: RequiredLang | string): string {
  return typeof l === 'string' ? l : l.language
}

function requiredLangLevel(l: RequiredLang | string): string | null {
  return typeof l === 'string' ? null : (l.level ?? null)
}

// ─── Main function ────────────────────────────────────────────────────────────

export function calculateMatchResult(
  profile: EngineProfile,
  opp: EngineOpportunity,
): MatchResult {
  const met: string[] = []
  const gaps: Gap[] = []

  // ── Age ──────────────────────────────────────────────────────────────────────
  if (opp.min_age || opp.max_age) {
    const age = ageFromDob(profile.date_of_birth)
    if (age === null) {
      gaps.push({ field: 'Age', required: `${opp.min_age ?? '—'}–${opp.max_age ?? '—'}`, userHas: 'Not set', isHardFail: false })
    } else {
      const tooYoung = opp.min_age !== null && age < opp.min_age
      const tooOld   = opp.max_age !== null && age > opp.max_age
      if (tooYoung) {
        gaps.push({ field: 'Age', required: `Min ${opp.min_age}`, userHas: `${age}`, isHardFail: true })
      } else if (tooOld) {
        gaps.push({ field: 'Age', required: `Max ${opp.max_age}`, userHas: `${age}`, isHardFail: true })
      } else {
        met.push(`Age ${age} is within ${opp.min_age ?? '—'}–${opp.max_age ?? '—'} range`)
      }
    }
  }

  // ── Nationality ───────────────────────────────────────────────────────────────
  const reqNats = opp.required_nationalities ?? []
  const exclNats = opp.excluded_nationalities ?? []
  const userNats = profile.nationalities ?? []

  if (reqNats.length > 0) {
    const open = reqNats.some(n => ['global', 'all', 'worldwide', 'all countries'].includes(n.toLowerCase()))
    const match = open || userNats.some(n => reqNats.some(r => r.toLowerCase() === n.toLowerCase()))
    if (match) {
      met.push(`Nationality eligible (${userNats[0] ?? 'yours'})`)
    } else {
      gaps.push({
        field: 'Nationality',
        required: reqNats.join(', '),
        userHas: userNats.join(', ') || 'Not set',
        isHardFail: true,
      })
    }
  } else {
    met.push('Open to all nationalities')
  }

  if (exclNats.length > 0 && userNats.length > 0) {
    const excluded = userNats.some(n => exclNats.some(e => e.toLowerCase() === n.toLowerCase()))
    if (excluded) {
      gaps.push({
        field: 'Nationality (excluded)',
        required: `Not from: ${exclNats.join(', ')}`,
        userHas: userNats[0] ?? '',
        isHardFail: true,
      })
    }
  }

  // ── Education ─────────────────────────────────────────────────────────────────
  if (opp.min_education_level && opp.min_education_level.toLowerCase() !== 'any') {
    const reqIdx  = edLevel(opp.min_education_level)
    const userIdx = edLevel(profile.education_level)
    if (reqIdx === -1) {
      met.push('Education level not restricted')
    } else if (userIdx === -1) {
      gaps.push({ field: 'Education', required: opp.min_education_level, userHas: 'Not set', isHardFail: false })
    } else if (userIdx < reqIdx) {
      gaps.push({
        field: 'Education',
        required: opp.min_education_level,
        userHas: profile.education_level ?? 'Not set',
        isHardFail: false,
      })
    } else {
      met.push(`Education (${profile.education_level}) meets ${opp.min_education_level} requirement`)
    }
  } else {
    met.push('Open to all education levels')
  }

  // ── Field of study ────────────────────────────────────────────────────────────
  const reqFields = opp.required_fields_of_study ?? []
  if (reqFields.length > 0) {
    const pf = (profile.field_of_study ?? '').toLowerCase()
    const match = pf
      ? reqFields.some(f => f.toLowerCase().includes(pf) || pf.includes(f.toLowerCase()))
      : false
    if (match) {
      met.push(`Field of study (${profile.field_of_study}) matches`)
    } else {
      gaps.push({
        field: 'Field of study',
        required: reqFields.join(', '),
        userHas: profile.field_of_study ?? 'Not set',
        isHardFail: false,
      })
    }
  }

  // ── GPA ──────────────────────────────────────────────────────────────────────
  if (opp.min_gpa) {
    const reqNorm  = normalizeGpa(opp.min_gpa, opp.gpa_scale ?? 4)
    const userNorm = profile.gpa_value !== null
      ? normalizeGpa(profile.gpa_value, profile.gpa_scale ?? 4)
      : null
    if (userNorm === null) {
      gaps.push({ field: 'GPA', required: `${opp.min_gpa}/${opp.gpa_scale ?? 4}`, userHas: 'Not set', isHardFail: false })
    } else if (userNorm < reqNorm) {
      const diff = (reqNorm - userNorm).toFixed(2)
      gaps.push({
        field: 'GPA',
        required: `${opp.min_gpa}/${opp.gpa_scale ?? 4}`,
        userHas: `${profile.gpa_value}/${profile.gpa_scale ?? 4} (${diff} below required)`,
        isHardFail: false,
      })
    } else {
      met.push(`GPA ${profile.gpa_value}/${profile.gpa_scale ?? 4} meets requirement`)
    }
  }

  // ── Languages ─────────────────────────────────────────────────────────────────
  const rawReqLangs = opp.required_languages
  if (rawReqLangs && (rawReqLangs as unknown[]).length > 0) {
    const userLangs = (profile.languages ?? []) as (ProfileLang | string)[]

    for (const rl of rawReqLangs as (RequiredLang | string)[]) {
      const reqName  = requiredLangName(rl).toLowerCase()
      const reqLevel = requiredLangLevel(rl)

      const found = userLangs.find(ul => profileLangName(ul).toLowerCase() === reqName)
      if (!found) {
        gaps.push({
          field: `Language: ${requiredLangName(rl)}`,
          required: reqLevel ? `${requiredLangName(rl)} ${reqLevel}` : requiredLangName(rl),
          userHas: 'Not in profile',
          isHardFail: false,
        })
      } else if (reqLevel) {
        const userLevel = profileLangLevel(found)
        const userIdx   = cefrLevel(userLevel)
        const reqIdx    = cefrLevel(reqLevel)
        if (reqIdx !== -1 && userIdx !== -1 && userIdx < reqIdx) {
          const bandsDiff = reqIdx - userIdx
          gaps.push({
            field: `Language: ${requiredLangName(rl)}`,
            required: `${requiredLangName(rl)} ${reqLevel}`,
            userHas: `${requiredLangName(rl)} ${userLevel ?? '?'} (${bandsDiff} band${bandsDiff > 1 ? 's' : ''} below)`,
            isHardFail: false,
          })
        } else {
          met.push(`${requiredLangName(rl)} level meets requirement`)
        }
      } else {
        met.push(`${requiredLangName(rl)} in your profile`)
      }
    }
  }

  // ── Work experience ───────────────────────────────────────────────────────────
  const minExp = opp.min_work_experience_years ?? 0
  if (minExp > 0) {
    const userExp = profile.years_work_experience ?? 0
    if (userExp >= minExp) {
      met.push(`Work experience (${userExp} yr${userExp !== 1 ? 's' : ''}) meets ${minExp}yr requirement`)
    } else {
      gaps.push({
        field: 'Work experience',
        required: `${minExp} year${minExp !== 1 ? 's' : ''}`,
        userHas: `${userExp} year${userExp !== 1 ? 's' : ''}`,
        isHardFail: false,
      })
    }
  }

  // ── Documents ────────────────────────────────────────────────────────────────
  if (opp.requires_passport) {
    if (profile.has_passport) {
      met.push('Valid passport in profile')
    } else {
      gaps.push({ field: 'Passport', required: 'Valid passport', userHas: 'Not listed', isHardFail: false })
    }
  }

  if (opp.requires_transcripts) {
    if (profile.has_transcripts) {
      met.push('Transcripts available')
    } else {
      gaps.push({ field: 'Transcripts', required: 'Academic transcripts', userHas: 'Not listed', isHardFail: false })
    }
  }

  if (opp.requires_recommendations) {
    const minRec = opp.min_recommendations ?? 1
    const userRec = profile.recommendation_letters_count ?? 0
    if (userRec >= minRec) {
      met.push(`${userRec} recommendation letter${userRec !== 1 ? 's' : ''} available`)
    } else {
      gaps.push({
        field: 'Recommendation letters',
        required: `${minRec}`,
        userHas: `${userRec}`,
        isHardFail: false,
      })
    }
  }

  // ── Score ─────────────────────────────────────────────────────────────────────
  const totalChecks  = met.length + gaps.length
  const passedChecks = met.length
  const hasHardFail  = gaps.some(g => g.isHardFail)

  let score = totalChecks === 0 ? 80 : Math.round((passedChecks / totalChecks) * 100)
  if (hasHardFail) score = Math.min(score, 40)

  const tier: MatchResult['tier'] =
    score >= 90 && !hasHardFail ? 'apply_now'
    : score >= 60 && !hasHardFail ? 'almost_there'
    : 'aspirational'

  return { score, tier, met, gaps }
}
