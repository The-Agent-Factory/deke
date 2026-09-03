import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { getSkill } from '@/lib/skills/catalog'

/** GET /api/jobs — recent jobs, newest first. */
export async function GET() {
  try {
    await requireAuth()
    const jobs = await prisma.skillJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({ jobs })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('GET /api/jobs failed:', error)
    return NextResponse.json({ error: 'Failed to load jobs' }, { status: 500 })
  }
}

/**
 * POST /api/jobs — queue a skill run.
 *
 * This only enqueues. Railway cannot reach Denis's machine, so the runner there
 * polls /api/jobs/claim and executes. Dangerous skills require confirm:true so
 * a single stray click can never publish.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()

    const payload = await request.json().catch(() => null)
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { skill, args, activityId, confirm } = payload as Record<string, unknown>

    if (typeof skill !== 'string') {
      return NextResponse.json({ error: 'skill is required' }, { status: 400 })
    }

    const def = getSkill(skill)
    if (!def) {
      return NextResponse.json({ error: `Unknown skill: ${skill}` }, { status: 400 })
    }

    if (def.danger && confirm !== true) {
      return NextResponse.json(
        { error: `${def.label} needs an explicit confirmation.`, needsConfirm: true },
        { status: 409 },
      )
    }

    if (typeof activityId === 'string') {
      const activity = await prisma.activity.findUnique({ where: { id: activityId } })
      if (!activity) {
        return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
      }
    }

    const requestedBy = session?.user?.name || session?.user?.email || 'Denis'

    const job = await prisma.skillJob.create({
      data: {
        skill,
        args: args ? JSON.stringify(args) : null,
        activityId: typeof activityId === 'string' ? activityId : null,
        requestedBy,
      },
    })

    if (typeof activityId === 'string') {
      await prisma.activityNote.create({
        data: {
          activityId,
          author: requestedBy,
          kind: 'job',
          body: `Queued: ${def.label}`,
        },
      })
    }

    return NextResponse.json({ job }, { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('POST /api/jobs failed:', error)
    return NextResponse.json({ error: 'Failed to queue job' }, { status: 500 })
  }
}
