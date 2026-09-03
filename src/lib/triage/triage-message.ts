import { prisma } from '@/lib/db'
import { getAnthropic, hasAnthropic, MODEL_FAST } from '@/lib/anthropic'

/**
 * Turn a free-form inbound message into an Activity card.
 *
 * Hard rule: this never swallows a message. If the model is unavailable or
 * returns nonsense, we still create an INBOX card carrying the raw text and
 * record why triage failed. A message that arrives must always become visible.
 */

export type TriageResult = {
  title: string
  kind: string
  owner: string | null
  priority: string
  dueAt: Date | null
  body: string | null
}

const KINDS = ['GIG', 'CONTENT', 'ADMIN', 'IDEA', 'FOLLOWUP']
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH']
const OWNERS = ['Denis', 'Deke']

const SYSTEM_PROMPT = `You turn short messages from Deke Sharon (a cappella
director, author, and performer) or his producer Denis into a single task card.

Deke dictates by voice, so expect garbled words, run-on sentences, and missing
punctuation. Extract the intent, not the wording.

Reply with ONLY a JSON object, no prose and no code fence:
{
  "title": "short imperative task title, max 70 chars",
  "kind": "GIG | CONTENT | ADMIN | IDEA | FOLLOWUP",
  "owner": "Denis | Deke | null",
  "priority": "LOW | NORMAL | HIGH",
  "dueAt": "YYYY-MM-DD or null",
  "body": "any useful detail worth keeping, or null"
}

Guidance:
- GIG: a booking, gig, tour date, festival, workshop, travel, or venue.
- CONTENT: video, reel, post, interview, podcast, newsletter, thumbnail.
- ADMIN: contracts, invoices, scheduling, email, logistics.
- IDEA: a thought to keep, no action yet.
- FOLLOWUP: chase a person or an unanswered thread.
- owner: Denis handles production, editing, posting, tech, and the admin and
  logistics around gigs (contracts, invoices, scheduling, travel booking,
  chasing people). Deke handles performing, teaching, arranging, writing, and
  anything only he can personally decide or say yes to. When a task is about
  arranging a gig rather than doing it, that is Denis. Use null when it is
  genuinely unclear.
- priority HIGH only for something time-critical or explicitly urgent.
- Never invent a date. If no date is stated or clearly implied, use null.
- Never invent a person's surname.`

function coerce(raw: unknown, fallbackTitle: string): TriageResult {
  const o = (raw ?? {}) as Record<string, unknown>

  const title =
    typeof o.title === 'string' && o.title.trim()
      ? o.title.trim().slice(0, 200)
      : fallbackTitle

  const kind =
    typeof o.kind === 'string' && KINDS.includes(o.kind.toUpperCase())
      ? o.kind.toUpperCase()
      : 'ADMIN'

  const priority =
    typeof o.priority === 'string' && PRIORITIES.includes(o.priority.toUpperCase())
      ? o.priority.toUpperCase()
      : 'NORMAL'

  const owner =
    typeof o.owner === 'string' && OWNERS.includes(o.owner)
      ? o.owner
      : null

  let dueAt: Date | null = null
  if (typeof o.dueAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.dueAt)) {
    const parsed = new Date(`${o.dueAt}T12:00:00Z`)
    if (!Number.isNaN(parsed.getTime())) dueAt = parsed
  }

  const body = typeof o.body === 'string' && o.body.trim() ? o.body.trim() : null

  return { title, kind, owner, priority, dueAt, body }
}

/** Best-effort title when the model is unavailable: first line, trimmed. */
function fallbackTitle(text: string): string {
  const firstLine = text.trim().split(/[\n.!?]/)[0]?.trim() || text.trim()
  return firstLine.slice(0, 70) || 'New message'
}

export async function classifyMessage(text: string): Promise<TriageResult> {
  const fallback = fallbackTitle(text)

  if (!hasAnthropic()) {
    return { title: fallback, kind: 'ADMIN', owner: null, priority: 'NORMAL', dueAt: null, body: text }
  }

  const today = new Date().toISOString().slice(0, 10)

  const response = await getAnthropic().messages.create({
    model: MODEL_FAST,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Today is ${today}.\n\nMessage:\n${text}` }],
  })

  const block = response.content.find((c) => c.type === 'text')
  const rawText = block && block.type === 'text' ? block.text : ''

  // The model is told not to fence, but tolerate it anyway.
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`Triage returned no JSON object: ${rawText.slice(0, 200)}`)
  }

  return coerce(JSON.parse(jsonMatch[0]), fallback)
}

/**
 * Triage an InboundMessage row into an Activity, in place.
 * Always produces a card. Returns the activity id.
 */
export async function triageInboundMessage(messageId: string): Promise<string> {
  const message = await prisma.inboundMessage.findUnique({ where: { id: messageId } })
  if (!message) throw new Error(`InboundMessage ${messageId} not found`)
  if (message.activityId) return message.activityId

  let result: TriageResult
  let triageError: string | null = null

  try {
    result = await classifyMessage(message.body)
  } catch (err) {
    triageError = err instanceof Error ? err.message : String(err)
    result = {
      title: fallbackTitle(message.body),
      kind: 'ADMIN',
      owner: null,
      priority: 'NORMAL',
      dueAt: null,
      body: message.body,
    }
  }

  const activity = await prisma.activity.create({
    data: {
      title: result.title,
      body: result.body ?? message.body,
      lane: 'INBOX',
      kind: result.kind,
      owner: result.owner,
      priority: result.priority,
      dueAt: result.dueAt,
      source: message.channel,
      notes: {
        create: {
          author: message.fromName || message.fromAddress,
          kind: 'intake',
          body: triageError
            ? `Received via ${message.channel}. Automatic sorting failed, so the raw message was kept: ${triageError}`
            : `Received via ${message.channel}: "${message.body.slice(0, 500)}"`,
        },
      },
    },
  })

  await prisma.inboundMessage.update({
    where: { id: message.id },
    data: {
      activityId: activity.id,
      triageStatus: triageError ? 'FAILED' : 'TRIAGED',
      triageError,
    },
  })

  return activity.id
}
