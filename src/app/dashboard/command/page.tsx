import { prisma } from '@/lib/db'
import { CommandClient, type ActivityDTO, type UpcomingDTO } from './command-client'

export const dynamic = 'force-dynamic'

/**
 * The Command Center.
 *
 * One page that answers "what is going on and what do I do next" for a
 * non-technical client. Cards come from the Activity table; the Coming Up rail
 * reads real confirmed bookings so the board can never drift from the calendar.
 */
export default async function CommandPage() {
  const now = new Date()

  const [activities, upcoming, pendingInquiries, queuedJobs] = await Promise.all([
    prisma.activity.findMany({
      where: { archivedAt: null },
      orderBy: [{ sortIndex: 'asc' }, { createdAt: 'desc' }],
      include: {
        notes: { orderBy: { createdAt: 'desc' }, take: 3 },
        jobs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
    prisma.booking.findMany({
      where: { startDate: { gte: now }, status: { in: ['CONFIRMED', 'PENDING'] } },
      orderBy: { startDate: 'asc' },
      take: 12,
      select: {
        id: true,
        publicTitle: true,
        organization: true,
        location: true,
        startDate: true,
        status: true,
        serviceType: true,
      },
    }),
    prisma.inquiry.count({ where: { status: 'PENDING' } }),
    prisma.skillJob.count({ where: { status: { in: ['QUEUED', 'CLAIMED', 'RUNNING'] } } }),
  ])

  const activityDTOs: ActivityDTO[] = activities.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    lane: a.lane,
    kind: a.kind,
    owner: a.owner,
    priority: a.priority,
    dueAt: a.dueAt ? a.dueAt.toISOString() : null,
    source: a.source,
    sortIndex: a.sortIndex,
    lastNote: a.notes[0]?.body ?? null,
    lastJobStatus: a.jobs[0]?.status ?? null,
    lastJobSkill: a.jobs[0]?.skill ?? null,
  }))

  const upcomingDTOs: UpcomingDTO[] = upcoming.map((b) => ({
    id: b.id,
    title: b.publicTitle || b.organization || b.serviceType,
    location: b.location,
    startDate: b.startDate ? b.startDate.toISOString() : null,
    status: b.status,
  }))

  return (
    <CommandClient
      initialActivities={activityDTOs}
      upcoming={upcomingDTOs}
      pendingInquiries={pendingInquiries}
      queuedJobs={queuedJobs}
    />
  )
}
