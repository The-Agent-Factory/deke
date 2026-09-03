import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { triageInboundMessage } from '@/lib/triage/triage-message'

/**
 * Shared inbound-message intake.
 *
 * Two rules govern everything here:
 *  1. Persist first, interpret second. The raw message is stored before any
 *     model runs, so a triage outage can never lose a message.
 *  2. Idempotent on the provider's message id, because Twilio and email
 *     providers both retry on a slow response.
 */

export type IntakeInput = {
  channel: string       // whatsapp, sms, email, web
  fromAddress: string
  fromName?: string | null
  body: string
  mediaUrls?: string[]
  externalId?: string | null
}

export type IntakeResult = {
  messageId: string
  activityId: string | null
  duplicate: boolean
}

/**
 * Who is allowed to create tasks by messaging in.
 * Comma-separated in COMMAND_INTAKE_SENDERS. Compared on digits only for
 * phone numbers, case-insensitively for email.
 * An empty allow-list rejects everything: this endpoint is public, so it
 * fails closed by design.
 */
export function isAllowedSender(fromAddress: string): boolean {
  // Messaging intake is suspended (Denis, 2026-09-03): the Command Center takes
  // work only from the dashboard composer for now. This gate is the single
  // choke point for every inbound channel, so flipping it here disables
  // WhatsApp/SMS/email intake without deleting the plumbing. Re-enable by
  // setting COMMAND_INTAKE_ENABLED=true and listing senders.
  if (process.env.COMMAND_INTAKE_ENABLED !== 'true') return false

  const raw = process.env.COMMAND_INTAKE_SENDERS
  if (!raw) return false

  const candidate = normalizeAddress(fromAddress)
  return raw
    .split(',')
    .map((s) => normalizeAddress(s.trim()))
    .filter(Boolean)
    .some((allowed) => allowed === candidate)
}

export function normalizeAddress(address: string): string {
  const stripped = address.replace(/^(whatsapp|sms):/i, '').trim()
  if (stripped.includes('@')) return stripped.toLowerCase()
  const digits = stripped.replace(/[^0-9]/g, '')
  // Compare on the last 10 digits so +1 555..., 1555..., and 555... all match.
  return digits.length > 10 ? digits.slice(-10) : digits
}

export async function recordInboundMessage(input: IntakeInput): Promise<IntakeResult> {
  if (input.externalId) {
    const existing = await prisma.inboundMessage.findUnique({
      where: { externalId: input.externalId },
    })
    if (existing) {
      return { messageId: existing.id, activityId: existing.activityId, duplicate: true }
    }
  }

  const message = await prisma.inboundMessage.create({
    data: {
      channel: input.channel,
      fromAddress: input.fromAddress,
      fromName: input.fromName ?? null,
      body: input.body,
      mediaUrls: input.mediaUrls?.length ? JSON.stringify(input.mediaUrls) : null,
      externalId: input.externalId ?? null,
    },
  })

  // Triage after the row is safe on disk. A failure here still leaves a
  // PENDING message that can be retried, and triageInboundMessage itself
  // degrades to a raw card rather than throwing away the text.
  let activityId: string | null = null
  try {
    activityId = await triageInboundMessage(message.id)
  } catch (err) {
    console.error('Triage failed for message', message.id, err)
    await prisma.inboundMessage.update({
      where: { id: message.id },
      data: {
        triageStatus: 'FAILED',
        triageError: err instanceof Error ? err.message : String(err),
      },
    })
  }

  return { messageId: message.id, activityId, duplicate: false }
}

/**
 * Validate Twilio's X-Twilio-Signature.
 * Twilio signs the full request URL concatenated with the POST params sorted
 * by key. See twilio.com/docs/usage/security.
 */
export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken || !signature) return false

  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url)

  const expected = crypto.createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64')

  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
