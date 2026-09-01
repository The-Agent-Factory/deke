/**
 * Centralized spam logging utility.
 * All bot-protection layers use this for consistent, greppable log output.
 *
 * Format: [SPAM:<TYPE>] <reason> | email=<email> ip=<ip> | <timestamp>
 */

export type SpamType = 'HONEYPOT' | 'RATE_LIMIT' | 'TURNSTILE' | 'EMAIL_QUALITY'

export function logSpam(
  type: SpamType,
  reason: string,
  email: string,
  ip: string
): void {
  const ts = new Date().toISOString()
  console.warn(`[SPAM:${type}] ${reason} | email=${email} ip=${ip} | ${ts}`)
}
