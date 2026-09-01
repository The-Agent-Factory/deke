/**
 * Server-side Cloudflare Turnstile token verification.
 *
 * Graceful degradation:
 *  - If TURNSTILE_SECRET_KEY is not set → always returns success (local dev).
 *  - If Cloudflare is unreachable (timeout / network error) → returns success (fail-open).
 *  - Only fails closed when Cloudflare explicitly returns success: false.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TurnstileResult {
  success: boolean
  error?: string
}

interface CloudflareResponse {
  success: boolean
  'error-codes'?: string[]
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let warnedOnce = false

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Verify a Turnstile token with Cloudflare.
 *
 * @param token  The cf-turnstile-response token from the client
 * @param ip     Optional client IP for additional verification
 */
export async function verifyTurnstile(
  token: string | undefined,
  ip?: string
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY

  // Graceful degradation — no secret configured (local dev)
  if (!secret) {
    if (!warnedOnce) {
      console.warn('[Turnstile] TURNSTILE_SECRET_KEY not set — skipping verification')
      warnedOnce = true
    }
    return { success: true }
  }

  // No token provided by client
  if (!token) {
    return { success: false, error: 'missing-input-response' }
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
      ...(ip ? { remoteip: ip } : {}),
    })

    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(5000),
      }
    )

    const data = (await res.json()) as CloudflareResponse

    if (data.success) {
      return { success: true }
    }

    return {
      success: false,
      error: data['error-codes']?.[0] ?? 'verification-failed',
    }
  } catch (err) {
    // Fail-open: network error or timeout should not block real users
    console.error('[Turnstile] Verification request failed (fail-open):', err)
    return { success: true }
  }
}
