/**
 * In-memory rate limiter using a fixed-window algorithm.
 * No external dependencies — uses a plain Map.
 *
 * Resets on Railway deploy (acceptable — honeypot + email quality
 * catch most bots before they even reach the rate limiter).
 */

import type { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number
  windowStart: number
}

export interface RateLimitResult {
  limited: boolean
  remaining: number
  resetAt: number // Unix ms timestamp
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const store = new Map<string, RateLimitEntry>()
let cleanupStarted = false

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

/** Remove entries whose window has expired. Runs every 15 min. */
function startCleanup(windowMs: number): void {
  if (cleanupStarted) return
  cleanupStarted = true

  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now - entry.windowStart >= windowMs) {
        store.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS).unref() // unref so it doesn't keep the process alive
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check (and increment) the rate limit for a given IP.
 *
 * @param ip          Client IP address
 * @param maxRequests Max requests allowed per window (default 5)
 * @param windowMs    Window duration in ms (default 1 hour)
 */
export function checkRateLimit(
  ip: string,
  maxRequests = 5,
  windowMs = 60 * 60 * 1000
): RateLimitResult {
  startCleanup(windowMs)

  const now = Date.now()
  const entry = store.get(ip)

  // First request or window expired — reset
  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(ip, { count: 1, windowStart: now })
    return { limited: false, remaining: maxRequests - 1, resetAt: now + windowMs }
  }

  // Within window — increment
  entry.count += 1

  if (entry.count > maxRequests) {
    return {
      limited: true,
      remaining: 0,
      resetAt: entry.windowStart + windowMs,
    }
  }

  return {
    limited: false,
    remaining: maxRequests - entry.count,
    resetAt: entry.windowStart + windowMs,
  }
}

/**
 * Extract the client IP from a Next.js request.
 * Reads x-forwarded-for (first segment), then request.ip, then 'unknown'.
 */
export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }

  // Fallback: check x-real-ip header (set by some reverse proxies)
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return 'unknown'
}
