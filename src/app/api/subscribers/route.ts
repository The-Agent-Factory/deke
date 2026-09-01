import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { handleApiError, ApiError } from '@/lib/api-error'
import { sendSubscriberNotification } from '@/lib/notifications/subscriber-notification'
import { logSpam } from '@/lib/spam-logger'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'
import { checkEmailQuality } from '@/lib/validations/email-quality'

const subscriberSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  email: z.string().email('Valid email is required'),
  location: z.string().min(1, 'Location is required'),
  groupName: z.string().optional(),
  newsletterOptIn: z.boolean().default(false),
  website: z.string().optional(),
  turnstileToken: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const body = (await request.json()) as Record<string, unknown>

    // ── Layer 1: Honeypot ──────────────────────────────────────────
    if (body.website) {
      logSpam('HONEYPOT', 'website field filled', String(body.email ?? ''), ip)
      return NextResponse.json(
        { success: true, message: "You're on the list!" },
        { status: 200 }
      )
    }

    // ── Layer 2: Rate limit ────────────────────────────────────────
    const rl = checkRateLimit(ip)
    if (rl.limited) {
      logSpam('RATE_LIMIT', 'exceeded 5 req/hour', String(body.email ?? ''), ip)
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // ── Layer 3: Turnstile verification ────────────────────────────
    const turnstileResult = await verifyTurnstile(
      body.turnstileToken as string | undefined,
      ip
    )
    if (!turnstileResult.success) {
      logSpam('TURNSTILE', turnstileResult.error ?? 'verification failed', String(body.email ?? ''), ip)
      return NextResponse.json(
        { error: 'Verification failed. Please try again.' },
        { status: 403 }
      )
    }

    // ── Layer 4: Email quality ─────────────────────────────────────
    const emailCheck = checkEmailQuality(String(body.email ?? ''))
    if (emailCheck.blocked) {
      logSpam('EMAIL_QUALITY', emailCheck.reason ?? 'blocked', String(body.email ?? ''), ip)
      return NextResponse.json(
        { success: true, message: "You're on the list!" },
        { status: 200 }
      )
    }

    // ── Layer 5: Zod validation ────────────────────────────────────
    const result = subscriberSchema.safeParse(body)

    if (!result.success) {
      return ApiError.badRequest(result.error.issues[0].message)
    }

    const data = result.data

    // Check for duplicate
    const existing = await prisma.emailSubscriber.findUnique({
      where: { email: data.email },
    })

    if (existing) {
      return NextResponse.json(
        { success: true, duplicate: true, message: "You're already on the list!" },
        { status: 200 }
      )
    }

    // Create subscriber record
    const subscriber = await prisma.emailSubscriber.create({
      data: {
        firstName: data.firstName,
        email: data.email,
        location: data.location,
        groupName: data.groupName || null,
        newsletterOptIn: data.newsletterOptIn,
        source: 'popup',
      },
    })

    // Send notification emails (fire-and-forget)
    sendSubscriberNotification({
      id: subscriber.id,
      firstName: subscriber.firstName,
      email: subscriber.email,
      location: subscriber.location,
      groupName: subscriber.groupName,
      newsletterOptIn: subscriber.newsletterOptIn,
    }).catch(err => console.error('Subscriber notification failed:', err))

    return NextResponse.json(
      { success: true, message: "You're on the list!" },
      { status: 200 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
