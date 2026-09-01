import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/db'
import { handleApiError, ApiError } from '@/lib/api-error'

type Params = {
  params: Promise<{ id: string }>
}

// POST /api/campaigns/[id]/verify-emails
// Queries Resend for the latest delivery status of sent emails and updates OutreachLog records
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: campaignId } = await params

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new ApiError(500, 'RESEND_API_KEY is not configured', 'MISSING_CONFIG')
    }

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign) {
      throw new ApiError(404, 'Campaign not found', 'NOT_FOUND')
    }

    // Fetch outreach logs for this campaign that have a provider message ID
    const logs = await prisma.outreachLog.findMany({
      where: {
        campaignId,
        channel: 'EMAIL',
        providerMessageId: { not: null },
      },
    })

    if (logs.length === 0) {
      return NextResponse.json({ verified: 0, updated: 0, message: 'No verifiable emails found' })
    }

    const resend = new Resend(apiKey)

    const STATUS_RANK: Record<string, number> = {
      PENDING: 0,
      SENT: 1,
      DELIVERED: 2,
      OPENED: 3,
      CLICKED: 4,
      RESPONDED: 5,
      BOUNCED: 6,
      FAILED: 7,
    }

    // Map Resend's last_event to our status
    function mapResendStatus(lastEvent: string): string {
      switch (lastEvent) {
        case 'delivered':
          return 'DELIVERED'
        case 'opened':
          return 'OPENED'
        case 'clicked':
          return 'CLICKED'
        case 'bounced':
        case 'delivery_delayed':
          return 'BOUNCED'
        case 'complained':
        case 'failed':
          return 'FAILED'
        default:
          return 'SENT'
      }
    }

    let updated = 0

    for (const log of logs) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (resend.emails as any).get(log.providerMessageId!)

        if (error || !data) continue

        const newStatus = mapResendStatus(data.last_event || '')

        // Only update if the new status is "higher" than current (avoid regressing)
        const currentRank = STATUS_RANK[log.status] ?? 0
        const newRank = STATUS_RANK[newStatus] ?? 0

        if (newRank <= currentRank) continue

        const updateData: Record<string, unknown> = { status: newStatus }

        if (newStatus === 'DELIVERED' && !log.sentAt) {
          updateData.sentAt = new Date()
        }
        if (newStatus === 'OPENED' && !log.openedAt && data.opened_at) {
          updateData.openedAt = new Date(data.opened_at)
        }
        if (newStatus === 'CLICKED' && !log.clickedAt && data.clicked_at) {
          updateData.clickedAt = new Date(data.clicked_at)
        }

        await prisma.outreachLog.update({
          where: { id: log.id },
          data: updateData,
        })

        updated++
      } catch {
        // Skip individual lookup failures — Resend may not have data yet
      }
    }

    return NextResponse.json({ verified: logs.length, updated })
  } catch (error) {
    return handleApiError(error)
  }
}
