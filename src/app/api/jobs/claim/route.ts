import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/jobs/claim
 *
 * The machine-side runner calls this to take the next queued job.
 * Guarded by CRON_SECRET, the same bearer pattern /api/cron/follow-up uses.
 *
 * Claiming is a conditional update on status, so two runners racing cannot both
 * take the same job: the second update matches zero rows.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Re-queue anything a dead runner claimed and never finished.
    const staleCutoff = new Date(Date.now() - 60 * 60 * 1000)
    await prisma.skillJob.updateMany({
      where: { status: { in: ['CLAIMED', 'RUNNING'] }, claimedAt: { lt: staleCutoff } },
      data: { status: 'QUEUED', claimedAt: null },
    })

    const next = await prisma.skillJob.findFirst({
      where: { status: 'QUEUED' },
      orderBy: { createdAt: 'asc' },
    })

    if (!next) {
      return NextResponse.json({ job: null })
    }

    const claimed = await prisma.skillJob.updateMany({
      where: { id: next.id, status: 'QUEUED' },
      data: { status: 'CLAIMED', claimedAt: new Date() },
    })

    if (claimed.count === 0) {
      // Another runner won the race. It will be picked up next poll.
      return NextResponse.json({ job: null })
    }

    const job = await prisma.skillJob.findUnique({ where: { id: next.id } })
    return NextResponse.json({ job })
  } catch (error) {
    console.error('POST /api/jobs/claim failed:', error)
    return NextResponse.json({ error: 'Failed to claim job' }, { status: 500 })
  }
}
