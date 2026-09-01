'use client'

/**
 * Reusable Cloudflare Turnstile widget.
 *
 * Renders the challenge widget and calls onVerify(token) when the user passes.
 * Returns null if NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set (graceful degradation for dev).
 */

import { useEffect, useRef, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Turnstile global type augmentation
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
        }
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

export function TurnstileWidget({
  onVerify,
  onError,
  onExpire,
  className,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  // Stable refs for callbacks so we don't re-render the widget
  const onVerifyRef = useRef(onVerify)
  const onErrorRef = useRef(onError)
  const onExpireRef = useRef(onExpire)
  onVerifyRef.current = onVerify
  onErrorRef.current = onError
  onExpireRef.current = onExpire

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !siteKey) return
    // Avoid double-rendering
    if (widgetIdRef.current) return

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => onVerifyRef.current(token),
      'error-callback': () => onErrorRef.current?.(),
      'expired-callback': () => onExpireRef.current?.(),
      theme: 'auto',
    })
  }, [siteKey])

  useEffect(() => {
    if (!siteKey) return

    // Check if script is already loaded
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      // Script tag exists — check if turnstile API is ready
      if (window.turnstile) {
        renderWidget()
      } else {
        existing.addEventListener('load', renderWidget)
      }
      return
    }

    // Load the Turnstile script
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.addEventListener('load', renderWidget)
    document.head.appendChild(script)

    return () => {
      // Cleanup widget on unmount
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [siteKey, renderWidget])

  // Graceful degradation — no site key configured
  if (!siteKey) return null

  return <div ref={containerRef} className={className} />
}
