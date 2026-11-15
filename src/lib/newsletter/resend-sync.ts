import { Resend } from 'resend'
import { prisma } from '@/lib/db'

/**
 * Keeps the Resend "One Voice" segment in step with the site's subscriber table.
 *
 * - Opted-in subscribers missing from the segment are added.
 * - Anyone who unsubscribed through a newsletter link (Resend) is opted out here.
 * - Anyone who unsubscribed through the site's own link is marked unsubscribed in Resend.
 *
 * Note: Resend's "unsubscribed" flag is per contact for the whole Resend account,
 * which other brands share. A Deke reader who unsubscribed from another brand's
 * broadcast is therefore not emailed either (safe direction).
 *
 * Resend allows a few requests per second, so writes are spaced out.
 */

export type SyncResult = {
  optedIn: number
  inSegment: number
  added: string[]
  optedOutHere: string[]
  unsubscribedThere: string[]
  failures: { email: string; error: string }[]
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))
const WRITE_GAP_MS = 600

async function listSegment(resend: Resend, segmentId: string) {
  const all: { id: string; email: string; unsubscribed: boolean }[] = []
  let after: string | undefined
  for (let page = 0; page < 100; page++) {
    const res = await resend.contacts.list(after ? { segmentId, limit: 100, after } : { segmentId, limit: 100 })
    if (res.error) throw new Error(`Resend list contacts failed: ${res.error.message}`)
    const data = res.data?.data ?? []
    all.push(...data.map((c) => ({ id: c.id, email: c.email.toLowerCase(), unsubscribed: c.unsubscribed })))
    if (!res.data?.has_more || data.length === 0) break
    after = data[data.length - 1].id
    await pause(300)
  }
  return all
}

export async function syncOneVoiceSegment(segmentId: string, opts: { dryRun?: boolean } = {}): Promise<SyncResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  const resend = new Resend(key)

  const remote = await listSegment(resend, segmentId)
  const remoteByEmail = new Map(remote.map((c) => [c.email, c]))
  const subscribers = await prisma.emailSubscriber.findMany({
    select: { email: true, firstName: true, newsletterOptIn: true },
  })

  const result: SyncResult = {
    optedIn: 0,
    inSegment: remote.length,
    added: [],
    optedOutHere: [],
    unsubscribedThere: [],
    failures: [],
  }

  // 1. Unsubscribed in Resend wins: opt them out on the site.
  const resendUnsubs = new Set(remote.filter((c) => c.unsubscribed).map((c) => c.email))
  for (const s of subscribers) {
    const email = s.email.toLowerCase()
    if (s.newsletterOptIn && resendUnsubs.has(email)) {
      result.optedOutHere.push(email)
      if (!opts.dryRun) {
        await prisma.emailSubscriber.update({ where: { email: s.email }, data: { newsletterOptIn: false } })
      }
      s.newsletterOptIn = false
    }
  }

  for (const s of subscribers) {
    const email = s.email.toLowerCase()
    const there = remoteByEmail.get(email)

    // 2. Unsubscribed on the site wins: mark them unsubscribed in Resend.
    if (!s.newsletterOptIn) {
      if (there && !there.unsubscribed) {
        result.unsubscribedThere.push(email)
        if (!opts.dryRun) {
          const r = await resend.contacts.update({ id: there.id, unsubscribed: true })
          if (r.error) result.failures.push({ email, error: r.error.message })
          await pause(WRITE_GAP_MS)
        }
      }
      continue
    }

    // 3. Opted in and missing from the segment: add them.
    result.optedIn++
    if (there) continue
    result.added.push(email)
    if (opts.dryRun) continue
    const created = await resend.contacts.create({
      email,
      firstName: s.firstName?.trim() || undefined,
      segments: [{ id: segmentId }],
    })
    await pause(WRITE_GAP_MS)
    if (created.error) {
      // The contact may already exist in the account (another segment). Add it to ours,
      // without touching its unsubscribed flag.
      const added = await resend.contacts.segments.add({ email, segmentId })
      await pause(WRITE_GAP_MS)
      if (added.error) result.failures.push({ email, error: `${created.error.message} / ${added.error.message}` })
    }
  }

  return result
}
