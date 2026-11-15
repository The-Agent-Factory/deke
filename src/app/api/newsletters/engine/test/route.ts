import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { engineAuthorized } from '@/lib/content-review'
import { newsletterSender, renderOneVoiceHtml, renderOneVoiceText, validateDraft } from '@/lib/newsletter/one-voice'

/**
 * POST /api/newsletters/engine/test  { draft, to: string[] }   (Bearer ENGINE_REVIEW_SECRET)
 * Sends ONE test copy of an issue to up to 3 named addresses. Never touches the list.
 * With render:true and no "to", returns the HTML instead of sending.
 */
export async function POST(request: NextRequest) {
  if (!engineAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = (await request.json().catch(() => null)) as { draft?: unknown; to?: unknown; render?: boolean } | null
  const { draft, errors } = validateDraft(body?.draft)
  if (!draft) return NextResponse.json({ error: 'Draft failed the One Voice rules', errors }, { status: 400 })

  const sender = newsletterSender()
  const mode = { kind: 'test' as const, postalAddress: sender.postalAddress }
  const html = renderOneVoiceHtml(draft, mode)
  if (body?.render && !body.to) return NextResponse.json({ html, text: renderOneVoiceText(draft, mode) })

  const to = Array.isArray(body?.to) ? body.to.filter((x): x is string => typeof x === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)) : []
  if (to.length === 0 || to.length > 3) {
    return NextResponse.json({ error: 'to must hold 1 to 3 email addresses' }, { status: 400 })
  }
  const key = process.env.RESEND_API_KEY
  if (!key) return NextResponse.json({ error: 'RESEND_API_KEY is not set on the site' }, { status: 500 })

  const sent = await new Resend(key).emails.send({
    from: sender.from,
    to,
    replyTo: sender.replyTo,
    subject: `[TEST] ${draft.subject}`,
    html,
    text: renderOneVoiceText(draft, mode),
    tags: [{ name: 'type', value: 'one-voice-test' }],
  })
  if (sent.error) return NextResponse.json({ error: `Resend: ${sent.error.message}` }, { status: 502 })
  return NextResponse.json({ ok: true, id: sent.data?.id, to, postalAddressSet: Boolean(sender.postalAddress) })
}
