/**
 * Seasonal Filtering
 *
 * Filters out groups whose org type is currently off-season. For example,
 * collegiate and youth groups are pointless to contact during summer break,
 * since music directors are away and decisions stall until fall.
 *
 * Resolution order for whether a lead is in-season *right now*:
 *   1. If the campaign sets `includeOffSeason: true`, every lead passes.
 *   2. If the lead has an explicit `activeSeasons` JSON array, use it.
 *   3. Else look up the SeasonalRule for the lead's classified org type.
 *   4. Else (no rule, no override) treat the lead as year-round.
 *
 * Seasons are meteorological (Northern Hemisphere) for simplicity:
 *   WINTER: Dec, Jan, Feb
 *   SPRING: Mar, Apr, May
 *   SUMMER: Jun, Jul, Aug
 *   FALL:   Sep, Oct, Nov
 *
 * If we ever expand internationally, swap getSeasonForDate() for a
 * hemisphere-aware version.
 */

import { prisma } from '@/lib/db'
import { classifyOrganization, type OrgType } from './org-classifier'

export type Season = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL'

export const ALL_SEASONS: readonly Season[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL'] as const

/**
 * Default active seasons for each org type. These get loaded into the
 * SeasonalRule table by `prisma db seed`, but are exported here so the
 * filter still works in environments where the table hasn't been seeded.
 */
export const DEFAULT_SEASONAL_RULES: Record<string, Season[]> = {
  // Academic-year orgs: dark in summer
  COLLEGE: ['FALL', 'WINTER', 'SPRING'],
  UNIVERSITY: ['FALL', 'WINTER', 'SPRING'],
  HIGH_SCHOOL: ['FALL', 'WINTER', 'SPRING'],
  MIDDLE_SCHOOL: ['FALL', 'WINTER', 'SPRING'],
  ELEMENTARY_SCHOOL: ['FALL', 'WINTER', 'SPRING'],
  YOUTH_CHOIR: ['FALL', 'WINTER', 'SPRING'],
  MUSIC_SCHOOL: ['FALL', 'WINTER', 'SPRING'],
  CONSERVATORY: ['FALL', 'WINTER', 'SPRING'],
  PERFORMING_ARTS: ['FALL', 'WINTER', 'SPRING'],

  // Year-round orgs (default): all seasons
  CHURCH: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
  SYNAGOGUE: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
  MOSQUE: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
  TEMPLE: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
  CHOIR: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
  COMMUNITY_CHORUS: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
  BARBERSHOP: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
  A_CAPPELLA_GROUP: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
  GOSPEL_CHOIR: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],

  // Venues / events / generic — year-round
  THEATRE: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
  THEATER: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
  ARTS_CENTER: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
  COMMUNITY_CENTER: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
  FESTIVAL: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
  CONFERENCE: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
  CONVENTION: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
  CORPORATE: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
  NONPROFIT: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
}

/**
 * Get the meteorological season for a given date (Northern Hemisphere).
 */
export function getSeasonForDate(date: Date): Season {
  const month = date.getMonth() // 0-indexed
  if (month === 11 || month <= 1) return 'WINTER' // Dec, Jan, Feb
  if (month <= 4) return 'SPRING' // Mar, Apr, May
  if (month <= 7) return 'SUMMER' // Jun, Jul, Aug
  return 'FALL' // Sep, Oct, Nov
}

/**
 * Parse a JSON-encoded activeSeasons string into a Season array.
 * Returns null on parse failure (so callers can fall back to defaults).
 * Returns [] for an empty array (which means "always off-season").
 */
export function parseActiveSeasons(raw: string | null | undefined): Season[] | null {
  if (raw === null || raw === undefined) return null
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((s): s is Season =>
      typeof s === 'string' && (ALL_SEASONS as readonly string[]).includes(s)
    )
  } catch {
    return null
  }
}

/**
 * In-memory cache of SeasonalRule rows, keyed by orgType. Discovery sources
 * call resolveActiveSeasons() many times per run; loading the table once per
 * run keeps it cheap.
 */
type RuleCache = Map<string, Season[]>

let cachedRules: RuleCache | null = null
let cacheLoadedAt = 0
const CACHE_TTL_MS = 60_000

async function loadRuleCache(): Promise<RuleCache> {
  const now = Date.now()
  if (cachedRules && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedRules
  }

  const map: RuleCache = new Map()
  try {
    const rules = await prisma.seasonalRule.findMany({ where: { enabled: true } })
    for (const rule of rules) {
      const seasons = parseActiveSeasons(rule.activeSeasons)
      if (seasons) {
        map.set(rule.orgType, seasons)
      }
    }
  } catch (err) {
    // If the table doesn't exist yet (pre-migration), fall back silently to
    // DEFAULT_SEASONAL_RULES — the filter still works.
    console.warn('[Seasons] Failed to load SeasonalRule table, using defaults:', err)
  }

  cachedRules = map
  cacheLoadedAt = now
  return map
}

/** Force-clear the cache. Useful in tests. */
export function clearSeasonalRuleCache(): void {
  cachedRules = null
  cacheLoadedAt = 0
}

/**
 * Resolve the active seasons for a single lead, applying the override
 * resolution order described at the top of this file.
 */
export function resolveActiveSeasons(
  lead: { activeSeasons?: string | null; organization?: string | null },
  rules: RuleCache
): Season[] {
  // 1. Per-lead override wins
  const override = parseActiveSeasons(lead.activeSeasons ?? null)
  if (override !== null) return override

  // 2. Org-type rule (DB or in-code default)
  const orgType = classifyOrganization(lead.organization || '')
  const fromDb = rules.get(orgType)
  if (fromDb) return fromDb

  const fromDefault = DEFAULT_SEASONAL_RULES[orgType]
  if (fromDefault) return fromDefault

  // 3. Unknown org type → year-round (don't filter what we can't classify)
  return [...ALL_SEASONS]
}

export interface SeasonalFilterInput {
  activeSeasons?: string | null
  organization?: string | null
}

export interface SeasonalFilterResult<T extends SeasonalFilterInput> {
  kept: T[]
  skipped: Array<{ lead: T; reason: string }>
}

/**
 * Filter an array of leads against the seasonal rules.
 *
 * Pass `includeOffSeason: true` to short-circuit (used by campaigns that
 * want to build pipeline ahead of an upcoming active season).
 *
 * Optionally pass a `now` Date for testability.
 */
export async function filterBySeasonality<T extends SeasonalFilterInput>(
  leads: T[],
  options: { includeOffSeason?: boolean; now?: Date } = {}
): Promise<SeasonalFilterResult<T>> {
  if (options.includeOffSeason) {
    return { kept: leads, skipped: [] }
  }

  const currentSeason = getSeasonForDate(options.now ?? new Date())
  const rules = await loadRuleCache()

  const kept: T[] = []
  const skipped: Array<{ lead: T; reason: string }> = []

  for (const lead of leads) {
    const seasons = resolveActiveSeasons(lead, rules)
    if (seasons.includes(currentSeason)) {
      kept.push(lead)
    } else {
      const orgType = classifyOrganization(lead.organization || '')
      skipped.push({
        lead,
        reason: `${orgType} is off-season in ${currentSeason} (active: ${seasons.join(', ') || 'none'})`,
      })
    }
  }

  return { kept, skipped }
}

/**
 * Synchronous variant of filterBySeasonality for callers that have already
 * loaded the rule cache (or want to use only in-code defaults). Useful in
 * tight loops or unit tests.
 */
export function filterBySeasonalitySync<T extends SeasonalFilterInput>(
  leads: T[],
  rules: RuleCache,
  options: { includeOffSeason?: boolean; now?: Date } = {}
): SeasonalFilterResult<T> {
  if (options.includeOffSeason) {
    return { kept: leads, skipped: [] }
  }

  const currentSeason = getSeasonForDate(options.now ?? new Date())
  const kept: T[] = []
  const skipped: Array<{ lead: T; reason: string }> = []

  for (const lead of leads) {
    const seasons = resolveActiveSeasons(lead, rules)
    if (seasons.includes(currentSeason)) {
      kept.push(lead)
    } else {
      const orgType = classifyOrganization(lead.organization || '')
      skipped.push({
        lead,
        reason: `${orgType} is off-season in ${currentSeason} (active: ${seasons.join(', ') || 'none'})`,
      })
    }
  }

  return { kept, skipped }
}

/**
 * Build an in-memory rule map from the in-code defaults. Used by tests and
 * by callers that don't want to hit the database.
 */
export function buildDefaultRuleCache(): Map<string, Season[]> {
  const map = new Map<string, Season[]>()
  for (const [orgType, seasons] of Object.entries(DEFAULT_SEASONAL_RULES)) {
    map.set(orgType, seasons)
  }
  return map
}

/**
 * Convenience: classify an org name and look up its current contactability.
 * Used by ad-hoc callers (e.g. the leads dashboard) that just want a yes/no.
 */
export async function isLeadInSeason(
  lead: SeasonalFilterInput,
  options: { includeOffSeason?: boolean; now?: Date } = {}
): Promise<boolean> {
  const { kept } = await filterBySeasonality([lead], options)
  return kept.length === 1
}

// Re-export for convenience
export type { OrgType }
