import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

const LANES = ['INBOX', 'TODAY', 'DOING', 'WAITING', 'DONE']
const KINDS = ['GIG', 'CONTENT', 'ADMIN', 'IDEA', 'FOLLOWUP']
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH']
const OWNERS = ['Denis', 'Deke']

type Ctx = { params: Promise<{ id: string }> }

/** PATCH /api/activities/[id] — lane moves, edits, archive. */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireAuth()
    const { id } = await ctx.params

    const payload = await request.json().catch(() => null)
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const existing = await prisma.activity.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const p = payload as Record<string, unknown>
    const data: Record<string, unknown> = {}

    if (typeof p.title === 'string' && p.title.trim()) data.title = p.title.trim().slice(0, 200)
    if (typeof p.body === 'string') data.body = p.body.trim() || null
    if (typeof p.lane === 'string' && LANES.includes(p.lane)) data.lane = p.lane
    if (typeof p.kind === 'string' && KINDS.includes(p.kind)) data.kind = p.kind
    if (typeof p.priority === 'string' && PRIORITIES.includes(p.priority)) data.priority = p.priority
    if (p.owner === null || (typeof p.owner === 'string' && OWNERS.includes(p.owner))) {
      data.owner = p.owner
    }
    if (typeof p.sortIndex === 'number' && Number.isFinite(p.sortIndex)) {
      data.sortIndex = Math.trunc(p.sortIndex)
    }
    if (p.dueAt === null) data.dueAt = null
    else if (typeof p.dueAt === 'string' && p.dueAt) data.dueAt = new Date(p.dueAt)
    if (p.archived === true) data.archivedAt = new Date()
    if (p.archived === false) data.archivedAt = null

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const activity = await prisma.activity.update({ where: { id }, data })

    // Lane moves are the board's history, so record them on the timeline.
    if (typeof data.lane === 'string' && data.lane !== existing.lane) {
      await prisma.activityNote.create({
        data: {
          activityId: id,
          author: session?.user?.name || session?.user?.email || 'Denis',
          kind: 'status',
          body: `Moved from ${existing.lane} to ${data.lane}.`,
        },
      })
    }

    return NextResponse.json({ activity })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('PATCH /api/activities/[id] failed:', error)
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 })
  }
}

/** DELETE /api/activities/[id] — archive, never hard-delete. */
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    await requireAuth()
    const { id } = await ctx.params

    const existing = await prisma.activity.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    await prisma.activity.update({ where: { id }, data: { archivedAt: new Date() } })
    return NextResponse.json({ archived: true })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('DELETE /api/activities/[id] failed:', error)
    return NextResponse.json({ error: 'Failed to archive activity' }, { status: 500 })
  }
}
