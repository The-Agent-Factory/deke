import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSkill } from '@/lib/skills/catalog'

type Ctx = { params: Promise<{ id: string }> }

/**
 * POST /api/jobs/[id]/complete
 *
 * The runner reports back here: DONE or FAILED, plus a log tail.
 * Same CRON_SECRET bearer guard as the claim endpoint.
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await ctx.params
    const payload = await request.json().catch(() => null)
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { status, log, error } = payload as Record<string, unknown>

    if (status !== 'DONE' && status !== 'FAILED' && status !== 'RUNNING') {
      return NextResponse.json({ error: 'status must be RUNNING, DONE or FAILED' }, { status: 400 })
    }

    const existing = await prisma.skillJob.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const job = await prisma.skillJob.update({
      where: { id },
      data: {
        status,
        // Keep the tail: logs can be long and only the end explains a failure.
        log: typeof log === 'string' ? log.slice(-20000) : existing.log,
        error: typeof error === 'string' ? error.slice(0, 2000) : null,
        finishedAt: status === 'RUNNING' ? null : new Date(),
      },
    })

    if (existing.activityId && status !== 'RUNNING') {
      const def = getSkill(existing.skill)
      const label = def?.label ?? existing.skill
      await prisma.activityNote.create({
        data: {
          activityId: existing.activityId,
          author: 'system',
          kind: 'job',
          body:
            status === 'DONE'
              ? `Finished: ${label}.`
              : `Failed: ${label}. ${typeof error === 'string' ? error.slice(0, 300) : 'No error text reported.'}`,
        },
      })
    }

    return NextResponse.json({ job })
  } catch (err) {
    console.error('POST /api/jobs/[id]/complete failed:', err)
    return NextResponse.json({ error: 'Failed to complete job' }, { status: 500 })
  }
}
