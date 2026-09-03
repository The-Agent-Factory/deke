import { NextRequest, NextResponse } from 'next/server'
import { isAllowedSender, recordInboundMessage } from '@/lib/triage/intake'

/**
 * POST /api/webhooks/inbound-email
 *
 * Email intake for the Command Center. Deke forwards or writes an email and it
 * becomes a card. Shared-secret auth, matching the pattern the existing
 * Cloudflare notification Worker already uses.
 *
 * Expected body:
 *   { from, fromName?, subject?, text, messageId?, secret? }
 * The secret may also travel as the X-Webhook-Secret header.
 */
export async function POST(request: NextRequest) {
  try {
    const expected = process.env.COMMAND_INTAKE_SECRET
    if (!expected) {
      console.error('inbound-email: COMMAND_INTAKE_SECRET not configured')
      return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    }

    const payload = await request.json().catch(() => null)
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const provided = request.headers.get('x-webhook-secret') || (payload as Record<string, unknown>).secret
    if (provided !== expected) {
      console.error('inbound-email: bad secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { from, fromName, subject, text, messageId } = payload as Record<string, string | undefined>

    if (!from || !text) {
      return NextResponse.json({ error: 'from and text are required' }, { status: 400 })
    }

    if (!isAllowedSender(from)) {
      // Not an error: unknown senders are simply not task authors.
      return NextResponse.json({ received: true, ignored: true })
    }

    // Subject carries the intent in most forwarded mail, so lead with it.
    const body = subject ? `${subject}\n\n${text}` : text

    const result = await recordInboundMessage({
      channel: 'email',
      fromAddress: from,
      fromName: fromName ?? null,
      body,
      externalId: messageId ?? null,
    })

    return NextResponse.json({
      received: true,
      duplicate: result.duplicate,
      activityId: result.activityId,
    })
  } catch (error) {
    console.error('inbound-email webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
