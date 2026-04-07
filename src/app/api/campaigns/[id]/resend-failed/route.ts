import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError, ApiError } from '@/lib/api-error'
import { sendEmail, EmailAttachment } from '@/lib/outreach/providers/resend'
import { readFile } from 'fs/promises'
import path from 'path'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const body = await request.json().catch(() => ({}))
    const logIds: string[] | undefined = body.logIds

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    })
    if (!campaign) {
      throw new ApiError(404, 'Campaign not found', 'NOT_FOUND')
    }

    // Find failed outreach logs for this campaign
    const failedLogs = await prisma.outreachLog.findMany({
      where: {
        campaignId,
        status: 'FAILED',
        ...(logIds && logIds.length > 0 ? { id: { in: logIds } } : {}),
      },
      include: {
        campaignLead: {
          include: {
            lead: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            emailDraft: true,
          },
        },
      },
    })

    if (failedLogs.length === 0) {
      return NextResponse.json({ resent: 0, failed: 0, skipped: 0 })
    }

    let resent = 0
    let failed = 0
    let skipped = 0

    for (const log of failedLogs) {
      const draft = log.campaignLead.emailDraft

      if (!draft || !['FAILED', 'DRAFT', 'SENT'].includes(draft.status)) {
        // No draft content available to resend
        skipped++
        continue
      }

      try {
        const toEmail = draft.overrideEmail || log.campaignLead.lead.email

        // Build attachments from stored file references
        const emailAttachments: EmailAttachment[] = []
        if (draft.attachments && Array.isArray(draft.attachments)) {
          for (const att of draft.attachments as Array<{ filename: string; path: string }>) {
            try {
              const filePath = path.join(process.cwd(), 'public', att.path)
              const content = await readFile(filePath)
              emailAttachments.push({ filename: att.filename, content })
            } catch {
              // Skip attachments that can't be read
            }
          }
        }

        const result = await sendEmail({
          to: toEmail,
          subject: draft.subject,
          html: draft.body,
          campaignId,
          leadId: log.campaignLead.lead.id,
          cc: draft.ccEmail || undefined,
          attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
        })

        if (result.success) {
          // Update the original failed log to mark it retried
          await prisma.outreachLog.update({
            where: { id: log.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              errorMessage: null,
              providerMessageId: result.id || null,
            },
          })

          // Update email draft status
          await prisma.emailDraft.update({
            where: { id: draft.id },
            data: { status: 'SENT', sentAt: new Date(), errorMessage: null },
          })

          // Update campaign lead status to CONTACTED
          await prisma.campaignLead.update({
            where: { id: log.campaignLeadId },
            data: { status: 'CONTACTED' },
          })

          resent++
        } else {
          // Update error message with latest failure reason
          await prisma.outreachLog.update({
            where: { id: log.id },
            data: { errorMessage: result.error },
          })

          await prisma.emailDraft.update({
            where: { id: draft.id },
            data: { status: 'FAILED', errorMessage: result.error },
          })

          failed++
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        await prisma.outreachLog.update({
          where: { id: log.id },
          data: { errorMessage },
        })
        failed++
      }
    }

    return NextResponse.json({ resent, failed, skipped })
  } catch (error) {
    return handleApiError(error)
  }
}
