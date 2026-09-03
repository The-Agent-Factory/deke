import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { classifyMessage } from '@/lib/triage/triage-message'

import { LANES, KINDS, PRIORITIES, canonicalizeOwner } from '@/lib/activity-fields'

/** GET /api/activities — all live cards, board order. */
export async function GET() {
  try {
    await requireAuth()

    const activities = await prisma.activity.findMany({
      where: { archivedAt: null },
      orderBy: [{ lane: 'asc' }, { sortIndex: 'asc' }, { createdAt: 'desc' }],
      include: {
        notes: { orderBy: { createdAt: 'desc' }, take: 3 },
        jobs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    return NextResponse.json({ activities })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('GET /api/activities failed:', error)
    return NextResponse.json({ error: 'Failed to load activities' }, { status: 500 })
  }
}

/** POST /api/activities — create a card by hand. */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const payload = await request.json().catch(() => null)
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { title, body, lane, kind, owner, priority, dueAt, smart } = payload as Record<
      string,
      unknown
    >

    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const text = title.trim()

    // `smart` is the dashboard composer: the operator types one sentence and the
    // triage agent turns it into a sorted card. Everything else (the edit form)
    // passes explicit fields and must be stored exactly as given.
    //
    // Triage is best-effort by design. If the model is unavailable or returns
    // junk we still create the card from the raw text, because losing what
    // someone typed is far worse than a mis-sorted card.
    let resolved = {
      title: text.slice(0, 200),
      body: typeof body === 'string' && body.trim() ? body.trim() : null,
      kind: typeof kind === 'string' && (KINDS as readonly string[]).includes(kind) ? kind : 'ADMIN',
      owner: canonicalizeOwner(owner),
      priority:
        typeof priority === 'string' && (PRIORITIES as readonly string[]).includes(priority) ? priority : 'NORMAL',
      dueAt: typeof dueAt === 'string' && dueAt ? new Date(dueAt) : null,
    }
    let triageNote: string | null = null

    if (smart === true) {
      try {
        const t = await classifyMessage(text)
        resolved = {
          title: t.title,
          body: t.body ?? (text.length > t.title.length ? text : null),
          kind: t.kind,
          owner: t.owner,
          priority: t.priority,
          dueAt: t.dueAt,
        }
        triageNote = `Typed: "${text.slice(0, 500)}"`
      } catch (err) {
        console.error('Composer triage failed, keeping raw text:', err)
        triageNote = `Typed: "${text.slice(0, 500)}". Automatic sorting was unavailable, so this card kept the raw wording.`
      }
    }

    const activity = await prisma.activity.create({
      data: {
        ...resolved,
        lane: typeof lane === 'string' && (LANES as readonly string[]).includes(lane) ? lane : 'INBOX',
        source: 'web',
        ...(triageNote
          ? { notes: { create: { author: 'Denis', kind: 'intake', body: triageNote } } }
          : {}),
      },
    })

    return NextResponse.json({ activity }, { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('POST /api/activities failed:', error)
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 })
  }
}
