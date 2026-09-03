import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

type Ctx = { params: Promise<{ id: string }> }

/** GET /api/activities/[id]/notes — full timeline for one card, newest first. */
export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    await requireAuth()
    const { id } = await ctx.params

    const notes = await prisma.activityNote.findMany({
      where: { activityId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ notes })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('GET notes failed:', error)
    return NextResponse.json({ error: 'Failed to load notes' }, { status: 500 })
  }
}

/** POST /api/activities/[id]/notes — write a note onto the card. */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireAuth()
    const { id } = await ctx.params

    const payload = await request.json().catch(() => null)
    const body = (payload as Record<string, unknown> | null)?.body

    if (typeof body !== 'string' || !body.trim()) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 })
    }

    // Fail loudly if the card is gone rather than orphaning a note.
    const activity = await prisma.activity.findUnique({ where: { id }, select: { id: true } })
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const note = await prisma.activityNote.create({
      data: {
        activityId: id,
        author: session.user?.name || session.user?.email || 'Denis',
        kind: 'note',
        body: body.trim().slice(0, 4000),
      },
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('POST note failed:', error)
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
  }
}
