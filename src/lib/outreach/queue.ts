import { prisma } from '@/lib/db'
import { sendEmail, type SendEmailParams } from './providers/resend'
import { sendSMS, type SendSMSParams } from './providers/twilio'
import { renderTemplate } from './template-renderer'

export interface OutreachJob {
  campaignLeadId: string
  channel: 'EMAIL' | 'SMS'
  template: string
  variables: Record<string, any>
}

export interface OutreachResult {
  success: boolean
  jobId: string
  error?: string
  provider?: string
}

/**
 * Process a batch of outreach jobs
 * Creates OutreachLog entries and updates CampaignLead status
 */
export async function processOutreachQueue(
  jobs: OutreachJob[]
): Promise<OutreachResult[]> {
  const results: OutreachResult[] = []

  for (const job of jobs) {
    try {
      // Fetch campaign lead with related data
      const campaignLead = await prisma.campaignLead.findUnique({
        where: { id: job.campaignLeadId },
        include: {
          lead: true,
          campaign: true,
        },
      })

      if (!campaignLead) {
        results.push({
          success: false,
          jobId: job.campaignLeadId,
          error: 'Campaign lead not found',
        })
        continue
      }

      // Render template with lead data
      const rendered = renderTemplate(job.template, {
        ...job.variables,
        firstName: campaignLead.lead.firstName,
        lastName: campaignLead.lead.lastName,
        organization: campaignLead.lead.organization || '',
        email: campaignLead.lead.email,
        phone: campaignLead.lead.phone || '',
      })

      let providerResult: { id: string; success: boolean; error?: string } | null = null

      // Send via appropriate channel
      if (job.channel === 'EMAIL') {
        providerResult = await sendEmail({
          to: campaignLead.lead.email,
          subject: job.variables.subject || 'Message from Deke Sharon',
          html: rendered,
          campaignId: campaignLead.campaignId,
          leadId: campaignLead.leadId,
        })
      } else if (job.channel === 'SMS') {
        if (!campaignLead.lead.phone) {
          results.push({
            success: false,
            jobId: job.campaignLeadId,
            error: 'Lead has no phone number',
          })
          continue
        }

        providerResult = await sendSMS({
          to: campaignLead.lead.phone,
          body: rendered,
          campaignId: campaignLead.campaignId,
          leadId: campaignLead.leadId,
        })
      }

      if (!providerResult) {
        results.push({
          success: false,
          jobId: job.campaignLeadId,
          error: 'Invalid channel',
        })
        continue
      }

      // Create OutreachLog entry with provider message ID for verification
      await prisma.outreachLog.create({
        data: {
          campaignLeadId: job.campaignLeadId,
          campaignId: campaignLead.campaignId,
          channel: job.channel,
          status: providerResult.success ? 'SENT' : 'FAILED',
          sentAt: providerResult.success ? new Date() : null,
          errorMessage: providerResult.error,
          providerMessageId: providerResult.success ? (providerResult.id || null) : null,
        },
      })

      // Update CampaignLead status if successful
      if (providerResult.success) {
        await prisma.campaignLead.update({
          where: { id: job.campaignLeadId },
          data: { status: 'CONTACTED' },
        })
      }

      results.push({
        success: providerResult.success,
        jobId: job.campaignLeadId,
        error: providerResult.error,
        provider: job.channel.toLowerCase(),
      })
    } catch (error) {
      results.push({
        success: false,
        jobId: job.campaignLeadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}

/**
 * Get default template for a service type and channel
 */
export async function getDefaultTemplate(
  serviceType: string,
  channel: 'EMAIL' | 'SMS'
): Promise<string | null> {
  const template = await prisma.messageTemplate.findFirst({
    where: {
      serviceType,
      channel,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return template?.body || null
}
