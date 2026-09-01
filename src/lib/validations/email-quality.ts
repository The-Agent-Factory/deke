/**
 * Email quality checker — blocks disposable domains and machine-generated
 * local parts (the pattern observed in the bot attack: random Gmail addresses
 * like hbour4831@gmail.com).
 *
 * Pure functions, no network calls.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailQualityResult {
  blocked: boolean
  reason?: string
}

// ---------------------------------------------------------------------------
// Disposable domain blocklist (23+ domains)
// ---------------------------------------------------------------------------

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.info',
  'guerrillamail.biz',
  'guerrillamail.de',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
  'sharklasers.com',
  'grr.la',
  'dispostable.com',
  'maildrop.cc',
  'trashmail.com',
  'trashmail.at',
  'trashmail.io',
  'trashmail.me',
  'spam4.me',
  'wegwerfmail.de',
  'wegwerfmail.net',
  'wegwerfmail.org',
  'temp-mail.org',
  'fakeinbox.com',
  'mailnesia.com',
  'mailcatch.com',
  'mintemail.com',
  'mohmal.com',
  'burnermail.io',
])

// Domains where we apply random-string pattern detection
const PATTERN_CHECK_DOMAINS = new Set([
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count vowels in a string */
function countVowels(s: string): number {
  return (s.match(/[aeiou]/gi) || []).length
}

/** Count max consecutive consonants */
function maxConsecutiveConsonants(s: string): number {
  const matches = s.match(/[bcdfghjklmnpqrstvwxyz]+/gi) || []
  return matches.reduce((max, m) => Math.max(max, m.length), 0)
}

/**
 * Heuristic: does this local part look machine-generated?
 *
 * Checks (any one triggers):
 *  - 4+ consecutive digits (e.g. hbour4831)
 *  - 5+ consecutive consonants (e.g. bxrqf)
 *  - Short alpha prefix + long number suffix: /^[a-z]{2,6}\d{5,}$/
 *  - Very long (>20 chars) with fewer than 3 vowels
 */
function looksRandom(localPart: string): boolean {
  // Strip dots, plus, underscores, hyphens for analysis
  const clean = localPart.replace(/[.+_-]/g, '').toLowerCase()

  // 4+ consecutive digits
  if (/\d{4,}/.test(clean)) return true

  // 5+ consecutive consonants
  if (maxConsecutiveConsonants(clean) >= 5) return true

  // Short prefix + long number tail: hbour4831, xkj83927
  if (/^[a-z]{2,6}\d{5,}$/.test(clean)) return true

  // Very long with almost no vowels
  if (clean.length > 20 && countVowels(clean) < 3) return true

  return false
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether an email address looks suspicious.
 *
 * Returns { blocked: true, reason } for disposable domains
 * and for random-looking local parts on major providers.
 */
export function checkEmailQuality(email: string): EmailQualityResult {
  if (!email || !email.includes('@')) {
    return { blocked: false } // let Zod handle format validation
  }

  const [localPart, domain] = email.split('@')
  const domainLower = domain?.toLowerCase() ?? ''

  // Check A: Disposable domain
  if (DISPOSABLE_DOMAINS.has(domainLower)) {
    return { blocked: true, reason: 'disposable-domain' }
  }

  // Check B: Random string pattern on major providers
  if (PATTERN_CHECK_DOMAINS.has(domainLower) && localPart) {
    if (looksRandom(localPart)) {
      return { blocked: true, reason: 'random-email-pattern' }
    }
  }

  return { blocked: false }
}
