import { prisma } from '@/lib/db'
import { sendEmail, type SendEmailParams } from './providers/resend'
import { sendSMS, type SendSMSParams } from './providers/twilio'
import { renderTemplate } from './template-renderer'
import { runThrottled, withRateLimitRetry } from './rate-limit'

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
  // Throttled send: paces requests to stay under provider rate limits and
  // retries individual sends that hit a 429.
  return runThrottled(
    jobs.map((job) => async (): Promise<OutreachResult> => {
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
          return {
            success: false,
            jobId: job.campaignLeadId,
            error: 'Campaign lead not found',
          }
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
          providerResult = await withRateLimitRetry(() =>
            sendEmail({
              to: campaignLead.lead.email,
              subject: job.variables.subject || 'Message from Deke Sharon',
              html: rendered,
              campaignId: campaignLead.campaignId,
              leadId: campaignLead.leadId,
            })
          )
        } else if (job.channel === 'SMS') {
          if (!campaignLead.lead.phone) {
            return {
              success: false,
              jobId: job.campaignLeadId,
              error: 'Lead has no phone number',
            }
          }

          providerResult = await withRateLimitRetry(() =>
            sendSMS({
              to: campaignLead.lead.phone!,
              body: rendered,
              campaignId: campaignLead.campaignId,
              leadId: campaignLead.leadId,
            })
          )
        }

        if (!providerResult) {
          return {
            success: false,
            jobId: job.campaignLeadId,
            error: 'Invalid channel',
          }
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

        return {
          success: providerResult.success,
          jobId: job.campaignLeadId,
          error: providerResult.error,
          provider: job.channel.toLowerCase(),
        }
      } catch (error) {
        return {
          success: false,
          jobId: job.campaignLeadId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })
  )
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
