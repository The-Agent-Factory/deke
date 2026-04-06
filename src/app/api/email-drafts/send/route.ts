import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError, ApiError } from '@/lib/api-error'
import { sendEmail } from '@/lib/outreach/providers/resend'
import { z } from 'zod'

const sendSchema = z.object({
  draftIds: z.array(z.string().min(1)).min(1, 'At least one draft ID is required'),
})

// POST /api/email-drafts/send — send drafts across any campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { draftIds } = sendSchema.parse(body)

    const drafts = await prisma.emailDraft.findMany({
      where: {
        id: { in: draftIds },
        status: { in: ['DRAFT', 'APPROVED'] },
      },
      include: {
        lead: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
    })

    if (drafts.length === 0) {
      throw new ApiError(400, 'No eligible drafts found to send', 'NO_DRAFTS')
    }

    let sent = 0
    let failed = 0

    for (const draft of drafts) {
      try {
        const result = await sendEmail({
          to: draft.lead.email,
          subject: draft.subject,
          html: draft.body,
          campaignId: draft.campaignId,
          leadId: draft.leadId,
        })

        if (result.success) {
          await prisma.emailDraft.update({
            where: { id: draft.id },
            data: { status: 'SENT', sentAt: new Date() },
          })

          // Create outreach log with Resend message ID for verification
          await prisma.outreachLog.create({
            data: {
              campaignLeadId: draft.campaignLeadId,
              campaignId: draft.campaignId,
              channel: 'EMAIL',
              status: 'SENT',
              sentAt: new Date(),
              providerMessageId: result.id || null,
            },
          })

          // Update campaign lead status
          await prisma.campaignLead.update({
            where: { id: draft.campaignLeadId },
            data: { status: 'CONTACTED' },
          })

          sent++
        } else {
          await prisma.emailDraft.update({
            where: { id: draft.id },
            data: { status: 'FAILED', errorMessage: result.error },
          })
          failed++
        }
      } catch (emailError) {
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error'
        await prisma.emailDraft.update({
          where: { id: draft.id },
          data: { status: 'FAILED', errorMessage },
        })
        failed++
      }
    }

    return NextResponse.json({ sent, failed })
  } catch (error) {
    return handleApiError(error)
  }
}
