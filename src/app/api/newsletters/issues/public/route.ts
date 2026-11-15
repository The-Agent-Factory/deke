import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-error'

// Public, no auth. Returns issues that have actually gone out: old manual SENT ones,
// and One Voice broadcasts (SCHEDULED) once their send time has passed.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const issues = await prisma.newsletterIssue.findMany({
      where: { status: { in: ['SENT', 'SCHEDULED'] }, sentAt: { lte: new Date() } },
      select: {
        id: true,
        issueNumber: true,
        title: true,
        subject: true,
        storyContent: true,
        sentAt: true,
        _count: { select: { comments: { where: { approved: true } } } },
      },
      orderBy: { issueNumber: 'desc' },
    })

    return NextResponse.json({ issues })
  } catch (error) {
    return handleApiError(error)
  }
}
