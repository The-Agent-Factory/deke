import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError, ApiError } from '@/lib/api-error'
import { renderTemplate } from '@/lib/outreach/template-renderer'
import { buildDefaultSubject } from '@/lib/outreach/default-subject'
import { resolveCampaignVisitDates } from '@/lib/discovery/draft-generator'
import { generateDraftsSchema } from '@/lib/validations/email-draft'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const body = await request.json()
    const { leadIds, templateId } = generateDraftsSchema.parse(body)

    // Verify campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { booking: { select: { serviceType: true } } },
    })
    if (!campaign) {
      throw new ApiError(404, 'Campaign not found', 'NOT_FOUND')
    }

    // Resolve the dates Deke will be visiting the campaign's area so leads can plan around them.
    const visitDates = await resolveCampaignVisitDates(campaignId)

    // Fetch template
    let templateSubject = buildDefaultSubject(campaign.baseLocation, campaign.booking?.serviceType)
    let templateBody = 'Hi {{firstName}},\n\nI\'m reaching out because I\'ll be in the {{baseLocation}} area{{availabilityDates}} and thought there might be an opportunity to work together.\n\nWould you be open to a conversation?\n\nBest,\nDeke Sharon'

    if (templateId) {
      const template = await prisma.messageTemplate.findUnique({
        where: { id: templateId },
      })
      if (!template) {
        throw new ApiError(404, 'Template not found', 'TEMPLATE_NOT_FOUND')
      }
      templateSubject = template.subject || templateSubject
      templateBody = template.body
    } else {
      // Try to find a default template
      const defaultTemplate = await prisma.messageTemplate.findFirst({
        where: { channel: 'EMAIL' },
        orderBy: { createdAt: 'desc' },
      })
      if (defaultTemplate) {
        templateSubject = defaultTemplate.subject || templateSubject
        templateBody = defaultTemplate.body
      }
    }

    // Fetch campaign leads with lead data
    const campaignLeads = await prisma.campaignLead.findMany({
      where: {
        campaignId,
        id: { in: leadIds },
      },
      include: { lead: true },
    })

    if (campaignLeads.length === 0) {
      throw new ApiError(400, 'No matching campaign leads found', 'NO_LEADS')
    }

    // Check which already have drafts
    const existingDrafts = await prisma.emailDraft.findMany({
      where: {
        campaignId,
        campaignLeadId: { in: campaignLeads.map(cl => cl.id) },
      },
      select: { campaignLeadId: true },
    })
    const existingIds = new Set(existingDrafts.map(d => d.campaignLeadId))

    let created = 0
    let skipped = 0

    for (const cl of campaignLeads) {
      if (existingIds.has(cl.id)) {
        skipped++
        continue
      }

      // Use org-based greeting when no real person name is available
      let greeting = cl.lead.firstName
      if (cl.lead.firstName === 'Contact' && cl.lead.lastName?.startsWith('at ')) {
        greeting = cl.lead.organization ? `${cl.lead.organization} team` : 'there'
      }

      const vars = {
        firstName: greeting,
        lastName: cl.lead.lastName,
        organization: cl.lead.organization || '',
        email: cl.lead.email,
        baseLocation: campaign.baseLocation,
        availabilityDates: visitDates.forTemplate,
      }

      const renderedSubject = renderTemplate(templateSubject, vars)
      const renderedBody = renderTemplate(templateBody, vars)

      await prisma.emailDraft.create({
        data: {
          campaignId,
          campaignLeadId: cl.id,
          leadId: cl.leadId,
          subject: renderedSubject,
          body: renderedBody,
          status: 'DRAFT',
        },
      })
      created++
    }

    return NextResponse.json({ created, skipped })
  } catch (error) {
    return handleApiError(error)
  }
}
