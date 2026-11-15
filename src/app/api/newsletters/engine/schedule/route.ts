import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/db'
import { engineAuthorized } from '@/lib/content-review'
import {
  newsletterSender,
  renderOneVoiceHtml,
  renderOneVoiceText,
  toArchiveFields,
  validateDraft,
} from '@/lib/newsletter/one-voice'
import { syncOneVoiceSegment } from '@/lib/newsletter/resend-sync'

/**
 * POST /api/newsletters/engine/schedule  { draft, sendAt }   (Bearer ENGINE_REVIEW_SECRET)
 *
 * Called by the content engine ONLY after Deke tapped Approve on the issue.
 * Syncs the list, creates a Resend broadcast scheduled for sendAt, and files the
 * issue in the /news archive (shown there once sendAt has passed).
 * Refuses: without a postal address, without a segment, for a time under 15 minutes
 * away, or for an issue number that was already scheduled.
 */
export const maxDuration = 300

const MEMORY_AGENT = 'one-voice'

export async function POST(request: NextRequest) {
  if (!engineAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = (await request.json().catch(() => null)) as { draft?: unknown; sendAt?: string } | null
  const { draft, errors } = validateDraft(body?.draft)
  if (!draft) return NextResponse.json({ error: 'Draft failed the One Voice rules', errors }, { status: 400 })

  const sendAt = new Date(body?.sendAt ?? '')
  if (Number.isNaN(sendAt.getTime()) || sendAt.getTime() < Date.now() + 15 * 60 * 1000) {
    return NextResponse.json({ error: 'sendAt must be an ISO time at least 15 minutes from now' }, { status: 400 })
  }

  const sender = newsletterSender()
  if (!sender.postalAddress) {
    return NextResponse.json(
      { error: 'NEWSLETTER_POSTAL_ADDRESS is not set. US law requires a postal address in every newsletter.' },
      { status: 412 },
    )
  }
  if (!sender.segmentId) return NextResponse.json({ error: 'NEWSLETTER_SEGMENT_ID is not set on the site' }, { status: 500 })
  const key = process.env.RESEND_API_KEY
  if (!key) return NextResponse.json({ error: 'RESEND_API_KEY is not set on the site' }, { status: 500 })

  const memKey = `issue-${draft.issueNumber}`
  const prior = await prisma.agentMemory.findUnique({
    where: { agentId_key: { agentId: MEMORY_AGENT, key: memKey } },
  })
  if (prior) {
    return NextResponse.json(
      { error: `Issue ${draft.issueNumber} was already scheduled`, prior: JSON.parse(prior.value) },
      { status: 409 },
    )
  }

  let sync
  try {
    sync = await syncOneVoiceSegment(sender.segmentId)
  } catch (e) {
    return NextResponse.json({ error: `List sync failed, nothing scheduled: ${e instanceof Error ? e.message : e}` }, { status: 502 })
  }

  const mode = { kind: 'broadcast' as const, postalAddress: sender.postalAddress }
  const created = await new Resend(key).broadcasts.create({
    name: `One Voice ${draft.issueNumber}: ${draft.subject}`.slice(0, 120),
    segmentId: sender.segmentId,
    from: sender.from,
    replyTo: sender.replyTo,
    subject: draft.subject,
    previewText: draft.previewText,
    html: renderOneVoiceHtml(draft, mode),
    text: renderOneVoiceText(draft, mode),
    send: true,
    scheduledAt: sendAt.toISOString(),
  })
  if (created.error || !created.data?.id) {
    return NextResponse.json({ error: `Resend broadcast failed: ${created.error?.message ?? 'no id returned'}`, sync }, { status: 502 })
  }
  const broadcastId = created.data.id

  const record = { broadcastId, sendAt: sendAt.toISOString(), scheduledAt: new Date().toISOString(), recipients: sync.optedIn }
  await prisma.agentMemory.create({
    data: { agentId: MEMORY_AGENT, key: memKey, memoryType: 'context', value: JSON.stringify(record) },
  })

  const fields = toArchiveFields(draft)
  await prisma.newsletterIssue.upsert({
    where: { issueNumber: draft.issueNumber },
    create: { issueNumber: draft.issueNumber, ...fields, status: 'SCHEDULED', sentAt: sendAt, subscriberCount: sync.optedIn },
    update: { ...fields, status: 'SCHEDULED', sentAt: sendAt, subscriberCount: sync.optedIn },
  })

  return NextResponse.json({ ok: true, ...record, sync })
}
