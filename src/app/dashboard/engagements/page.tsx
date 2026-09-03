import { prisma } from "@/lib/db"
import { EngagementsClient } from "./engagements-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function EngagementsPage() {
  // Fetch all active bookings (CONFIRMED, IN_PROGRESS, PENDING) with lead data
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ["CONFIRMED", "IN_PROGRESS", "PENDING"] },
    },
    include: {
      contact: {
        select: {
          firstName: true,
          lastName: true,
          organization: true,
          email: true,
        },
      },
    },
    orderBy: { startDate: "asc" },
  })

  // Serialize dates for client component
  const serialized = bookings.map((b) => ({
    id: b.id,
    serviceType: b.serviceType,
    status: b.status,
    startDate: b.startDate?.toISOString() ?? null,
    endDate: b.endDate?.toISOString() ?? null,
    location: b.location,
    amount: b.amount,
    paymentStatus: b.paymentStatus,
    engagementStatus: b.engagementStatus ?? null,
    prepNotes: b.prepNotes ?? null,
    deliverables: b.deliverables ?? null,
    followUpNotes: b.followUpNotes ?? null,
    publicTitle: b.publicTitle ?? null,
    organization: b.organization ?? null,
    contact: b.contact,
  }))

  return <EngagementsClient bookings={serialized} />
}
