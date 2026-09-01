/**
 * Outreach send throttling
 *
 * Resend's default rate limit is 2 requests/second. Sending in a tight loop
 * (the previous behavior) would trigger 429 "Too many requests" errors.
 *
 * This module provides a small token-bucket-style helper that paces sends to
 * stay under provider limits and retries individual sends that hit a 429.
 *
 * Limits are intentionally conservative defaults; override via env vars:
 *   RESEND_RPS  — max sends per second (default 2)
 *   RESEND_MAX_RETRIES — max 429 retries per send (default 3)
 */

const DEFAULT_RPS = 2
const DEFAULT_MAX_RETRIES = 3

function getRps(): number {
  const raw = process.env.RESEND_RPS
  if (!raw) return DEFAULT_RPS
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RPS
}

function getMaxRetries(): number {
  const raw = process.env.RESEND_MAX_RETRIES
  if (!raw) return DEFAULT_MAX_RETRIES
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_MAX_RETRIES
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Returns true if an error/result string looks like a rate-limit response.
 */
export function isRateLimitError(error: string | undefined | null): boolean {
  if (!error) return false
  const msg = error.toLowerCase()
  return (
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('too many') ||
    msg.includes('429')
  )
}

/**
 * Wrap a single send call with retry-on-429 + exponential backoff.
 *
 * The send function should return a result object with `success` and an
 * optional `error` string (matching the EmailResponse / SMS response shape).
 */
export async function withRateLimitRetry<T extends { success: boolean; error?: string }>(
  send: () => Promise<T>
): Promise<T> {
  const maxRetries = getMaxRetries()
  let attempt = 0
  let lastResult: T

  while (true) {
    lastResult = await send()
    if (lastResult.success || !isRateLimitError(lastResult.error)) {
      return lastResult
    }
    if (attempt >= maxRetries) {
      return lastResult
    }
    // Exponential backoff: 1s, 2s, 4s...
    const backoffMs = 1000 * Math.pow(2, attempt)
    await sleep(backoffMs)
    attempt++
  }
}

/**
 * Run an array of async tasks with a max-RPS throttle.
 *
 * Tasks run sequentially (preserving order in the results array) with a
 * minimum gap of `1000 / rps` ms between starts. This is the simplest
 * implementation that stays correct under Resend's bucket; we don't need
 * concurrency here because each send is fast enough that serializing at
 * 2 RPS still gets us ~7,200 sends/hour — well above any realistic batch.
 */
export async function runThrottled<T>(
  tasks: Array<() => Promise<T>>
): Promise<T[]> {
  const rps = getRps()
  const minGapMs = Math.ceil(1000 / rps)
  const results: T[] = []
  let lastStart = 0

  for (const task of tasks) {
    const now = Date.now()
    const elapsed = now - lastStart
    if (lastStart > 0 && elapsed < minGapMs) {
      await sleep(minGapMs - elapsed)
    }
    lastStart = Date.now()
    results.push(await task())
  }

  return results
}
