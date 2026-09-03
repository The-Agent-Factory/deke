import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

type Ctx = { params: Promise<{ id: string }> }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * POST /api/activities/[id]/email — hand a task to a person by email.
 *
 * This is the only thing on the board that reaches someone outside it, so it
 * refuses without `confirm: true`, exactly like the publishing skill. Every
 * send is written to the card timeline, so the board records who was told what
 * and when, rather than that living only in a sent-mail folder.
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireAuth()
    const { id } = await ctx.params

    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!payload) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { to, subject, message, confirm } = payload

    if (confirm !== true) {
      return NextResponse.json(
        { error: 'Sending an email needs an explicit confirmation.', needsConfirm: true },
        { status: 400 },
      )
    }

    if (typeof to !== 'string' || !EMAIL_RE.test(to.trim())) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
    }
    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'The message cannot be empty.' }, { status: 400 })
    }

    const activity = await prisma.activity.findUnique({ where: { id } })
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const apiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.RESEND_FROM_EMAIL
    if (!apiKey || !fromEmail) {
      // Fail loudly: a silent no-op here would look like a successful send.
      return NextResponse.json(
        { error: 'Email is not configured on the server (RESEND_API_KEY / RESEND_FROM_EMAIL).' },
        { status: 503 },
      )
    }

    const recipient = to.trim()
    const subjectLine =
      typeof subject === 'string' && subject.trim()
        ? subject.trim().slice(0, 200)
        : activity.title.slice(0, 200)
    const text = message.trim().slice(0, 10000)
    const senderName = session.user?.name || 'Deke Sharon'
    const replyTo = session.user?.email || undefined

    const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#171717;max-width:600px">
<p style="white-space:pre-wrap;margin:0 0 20px">${escapeHtml(text)}</p>
<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
<p style="font-size:12px;color:#737373;margin:0">Sent by ${escapeHtml(senderName)}</p>
</div>`

    const resend = new Resend(apiKey)
    const result = await resend.emails.send({
      from: fromEmail,
      to: recipient,
      replyTo,
      subject: subjectLine,
      html,
      text,
      tags: [{ name: 'type', value: 'activity_handoff' }],
    })

    if (result.error) {
      console.error('Activity email failed:', result.error)
      await prisma.activityNote.create({
        data: {
          activityId: id,
          author: senderName,
          kind: 'status',
          body: `Email to ${recipient} FAILED: ${result.error.message}`,
        },
      })
      return NextResponse.json({ error: result.error.message }, { status: 502 })
    }

    const note = await prisma.activityNote.create({
      data: {
        activityId: id,
        author: senderName,
        kind: 'status',
        body: `Emailed to ${recipient} — "${subjectLine}"`,
      },
    })

    return NextResponse.json({ ok: true, emailId: result.data?.id, note })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('POST email failed:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
