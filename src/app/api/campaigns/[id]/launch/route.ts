import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError, ApiError } from '@/lib/api-error'
import { processOutreachQueue, type OutreachJob } from '@/lib/outreach/queue'

type Params = {
  params: Promise<{
    id: string
  }>
}

// POST /api/campaigns/[id]/launch - Launch campaign with real outreach
export async function POST(
  request: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params

    // Parse request body for launch options
    const body = await request.json().catch(() => ({}))
    const { channel = 'EMAIL', templateId } = body

    // Validate channel
    if (!['EMAIL', 'SMS'].includes(channel)) {
      throw new ApiError(400, 'Invalid channel. Must be EMAIL or SMS', 'INVALID_CHANNEL')
    }

    // Check if campaign exists and fetch with leads
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        leads: {
          where: {
            status: 'PENDING', // Only contact leads that haven't been contacted yet
          },
          include: {
            lead: true,
          },
        },
      },
    })

    if (!campaign) {
      throw new ApiError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND')
    }

    // Validate campaign can be launched
    if (campaign.status !== 'APPROVED' && campaign.status !== 'READY') {
      throw new ApiError(
        400,
        'Only approved or ready campaigns can be launched',
        'INVALID_STATUS'
      )
    }

    if (campaign.leads.length === 0) {
      throw new ApiError(
        400,
        'No pending leads to contact in this campaign',
        'NO_PENDING_LEADS'
      )
    }

    // Get message template
    let template: { subject?: string; body: string } | null = null

    if (templateId) {
      const messageTemplate = await prisma.messageTemplate.findUnique({
        where: { id: templateId },
      })
      template = messageTemplate
        ? {
            subject: messageTemplate.subject || undefined,
            body: messageTemplate.body,
          }
        : null
    }

    // Use default template if none specified or not found
    if (!template) {
      const defaultTemplate = await prisma.messageTemplate.findFirst({
        where: {
          channel,
          serviceType: null, // Generic template
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      if (defaultTemplate) {
        template = {
          subject: defaultTemplate.subject || undefined,
          body: defaultTemplate.body,
        }
      }
    }

    // Fallback to basic template if no templates exist
    if (!template) {
      if (channel === 'EMAIL') {
        template = {
          subject: 'Exploring Performance Opportunities in Your Area',
          body: `
            <p>Hi {{firstName}},</p>
            <p>I'm Deke Sharon, and I'll be in your area near {{organization}} soon. I wanted to reach out about potential performance or workshop opportunities.</p>
            <p>With over 30 years of experience in vocal performance and arranging, I'd love to explore how we might work together.</p>
            <p>Would you be interested in discussing this further?</p>
            <p>Best regards,<br>Deke Sharon</p>
          `,
        }
      } else {
        template = {
          body: 'Hi {{firstName}}, Deke Sharon here. I\'ll be in your area near {{organization}} soon. Interested in discussing performance opportunities? Let me know!',
        }
      }
    }

    // Create outreach jobs for all pending leads
    const jobs: OutreachJob[] = campaign.leads.map(campaignLead => ({
      campaignLeadId: campaignLead.id,
      channel: channel as 'EMAIL' | 'SMS',
      template: template!.body,
      variables: {
        subject: template!.subject,
        baseLocation: campaign.baseLocation,
      },
    }))

    // Process outreach queue
    const results = await processOutreachQueue(jobs)

    // Count successes and failures
    const sent = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    // Phase 6: Schedule follow-ups for successful sends
    const { scheduleFollowUp } = await import('@/lib/follow-up/scheduler')
    let followUpsScheduled = 0
    for (const result of results.filter(r => r.success)) {
      const scheduleResult = await scheduleFollowUp({
        campaignLeadId: result.jobId,
        currentFollowUpCount: 0, // Initial send
      })
      if (scheduleResult.scheduled) {
        followUpsScheduled++
      }
    }

    // Update campaign status to ACTIVE and set launchedAt
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        launchedAt: new Date(),
      },
      include: {
        _count: {
          select: {
            leads: true,
            outreachLogs: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: 'Campaign launched successfully',
      campaign: updatedCampaign,
      outreach: {
        queued: jobs.length,
        sent,
        failed,
        channel,
        followUpsScheduled, // Phase 6: Count of scheduled follow-ups
      },
      results,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
