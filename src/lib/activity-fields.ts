/**
 * Shared vocabulary for Activity cards.
 *
 * Owner used to be a two-name enum (Denis | Deke). It is now free text, because
 * real work waits on people who will never have accounts here: a venue contact,
 * a guest, a festival organiser. Validation is therefore about shape, not
 * membership — we cap the length and reject anything that looks like an
 * injection of newlines, and let the board suggest names it has seen before.
 */

export const LANES = ['INBOX', 'TODAY', 'DOING', 'WAITING', 'DONE'] as const
export const KINDS = ['GIG', 'CONTENT', 'ADMIN', 'IDEA', 'FOLLOWUP'] as const
export const PRIORITIES = ['LOW', 'NORMAL', 'HIGH'] as const

/** The two people the triage agent is allowed to infer on its own. */
export const CORE_OWNERS = ['Denis', 'Deke'] as const

export const OWNER_MAX = 60

/**
 * Normalise a free-text owner name.
 * Returns null for blank/invalid input, which the callers treat as unassigned.
 */
export function normalizeOwner(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/[\r\n\t]/g, ' ').trim().replace(/\s+/g, ' ')
  if (!cleaned) return null
  return cleaned.slice(0, OWNER_MAX)
}

/** Case-insensitive match against the core two, so "denis" stores as "Denis". */
export function canonicalizeOwner(value: unknown): string | null {
  const cleaned = normalizeOwner(value)
  if (!cleaned) return null
  const core = CORE_OWNERS.find((o) => o.toLowerCase() === cleaned.toLowerCase())
  return core ?? cleaned
}
