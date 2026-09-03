import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  isAllowedSender,
  recordInboundMessage,
  verifyTwilioSignature,
} from '@/lib/triage/intake'

/**
 * Webhook handler for Twilio SMS events
 * Receives delivery status and reply events from Twilio
 *
 * Status callbacks:
 * - queued
 * - sent
 * - delivered
 * - undelivered
 * - failed
 *
 * Incoming messages:
 * - User replies (including STOP for opt-out)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Flatten the form for both signature verification and field access.
    const params: Record<string, string> = {}
    formData.forEach((value, key) => {
      if (typeof value === 'string') params[key] = value
    })

    // Verify Twilio's signature. This endpoint is public (see middleware
    // PUBLIC_API_ROUTES) and now creates tasks, so an unsigned request must
    // never reach the intake path. Skipped only when no auth token is
    // configured, which is the local-development case.
    const signature = request.headers.get('x-twilio-signature')
    if (process.env.TWILIO_AUTH_TOKEN) {
      const url = process.env.TWILIO_WEBHOOK_URL || request.url
      if (!verifyTwilioSignature(url, params, signature)) {
        console.error('Twilio webhook: invalid signature')
        return new Response('Invalid signature', { status: 403 })
      }
    }

    const messageStatus = params['MessageStatus']
    const messageSid = params['MessageSid']
    const to = params['To']
    const from = params['From']
    const body = params['Body']

    // WhatsApp and SMS arrive on this same webhook; WhatsApp prefixes the
    // addresses with "whatsapp:".
    const channel = from?.startsWith('whatsapp:') ? 'whatsapp' : 'sms'

    // Handle incoming messages (replies)
    if (body && from) {
      const normalizedFrom = from.replace(/[^0-9]/g, '')

      // Check for STOP message (opt-out)
      const isOptOut = /^stop$/i.test(body.trim())

      if (isOptOut) {
        // Add to suppression list
        await prisma.suppression.upsert({
          where: { phone: normalizedFrom },
          create: {
            phone: normalizedFrom,
            reason: 'opt_out',
            source: 'sms_reply',
          },
          update: {
            reason: 'opt_out',
          },
        })

        // Update any campaign leads with this phone
        const lead = await prisma.lead.findFirst({
          where: { phone: normalizedFrom },
        })

        if (lead) {
          await prisma.campaignLead.updateMany({
            where: { leadId: lead.id },
            data: { status: 'REMOVED' },
          })
        }

        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
          headers: { 'Content-Type': 'text/xml' },
        })
      }

      // Command Center intake: a message from an allow-listed sender (Deke or
      // Denis) becomes a task card rather than a campaign reply.
      if (isAllowedSender(from)) {
        const mediaCount = parseInt(params['NumMedia'] || '0', 10)
        const mediaUrls: string[] = []
        for (let i = 0; i < mediaCount; i++) {
          const url = params[`MediaUrl${i}`]
          if (url) mediaUrls.push(url)
        }

        const result = await recordInboundMessage({
          channel,
          fromAddress: from,
          fromName: params['ProfileName'] || null,
          body,
          mediaUrls,
          externalId: messageSid || null,
        })

        const reply = result.duplicate
          ? 'Already got that one.'
          : result.activityId
            ? 'Got it. Added to your board.'
            : 'Got it. Saved to your inbox.'

        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`,
          { headers: { 'Content-Type': 'text/xml' } },
        )
      }

      // Handle regular reply
      const lead = await prisma.lead.findFirst({
        where: { phone: normalizedFrom },
      })

      if (lead) {
        // Find the most recent outreach log for this lead
        const outreachLog = await prisma.outreachLog.findFirst({
          where: {
            campaignLead: { leadId: lead.id },
            channel: 'SMS',
          },
          orderBy: {
            sentAt: 'desc',
          },
        })

        if (outreachLog) {
          // Update outreach log
          await prisma.outreachLog.update({
            where: { id: outreachLog.id },
            data: {
              status: 'RESPONDED',
              respondedAt: new Date(),
            },
          })

          // Update campaign lead status
          await prisma.campaignLead.update({
            where: { id: outreachLog.campaignLeadId },
            data: { status: 'RESPONDED' },
          })

          // Phase 6: Auto-pause follow-ups on response
          const { autoPauseFollowUp } = await import('@/lib/follow-up/scheduler')
          await autoPauseFollowUp(outreachLog.campaignLeadId, 'responded')
        }
      }

      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Handle status callbacks
    if (messageStatus && messageSid) {
      // Find outreach log by message SID (would need to store SID in OutreachLog)
      // For now, we'll match by phone number and recent timestamp
      const normalizedTo = to?.replace(/[^0-9]/g, '')

      if (!normalizedTo) {
        return NextResponse.json({ received: true })
      }

      const lead = await prisma.lead.findFirst({
        where: { phone: normalizedTo },
      })

      if (!lead) {
        return NextResponse.json({ received: true })
      }

      // Find the most recent SMS outreach log for this lead
      const outreachLog = await prisma.outreachLog.findFirst({
        where: {
          campaignLead: { leadId: lead.id },
          channel: 'SMS',
        },
        orderBy: {
          sentAt: 'desc',
        },
      })

      if (!outreachLog) {
        return NextResponse.json({ received: true })
      }

      // Update status based on Twilio status
      const updates: any = {}

      switch (messageStatus) {
        case 'delivered':
          updates.status = 'DELIVERED'
          break

        case 'undelivered':
        case 'failed':
          updates.status = 'FAILED'
          updates.errorMessage = formData.get('ErrorCode') as string || 'Delivery failed'
          break
      }

      if (Object.keys(updates).length > 0) {
        await prisma.outreachLog.update({
          where: { id: outreachLog.id },
          data: updates,
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Twilio webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
