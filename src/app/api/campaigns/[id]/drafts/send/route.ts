import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError, ApiError } from '@/lib/api-error'
import { sendEmail, EmailAttachment } from '@/lib/outreach/providers/resend'
import { runThrottled, withRateLimitRetry } from '@/lib/outreach/rate-limit'
import { sendDraftsSchema, Attachment } from '@/lib/validations/email-draft'
import { readFile } from 'fs/promises'
import path from 'path'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const body = await request.json()
    const { draftIds } = sendDraftsSchema.parse(body)

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    })
    if (!campaign) {
      throw new ApiError(404, 'Campaign not found', 'NOT_FOUND')
    }

    // Build query - either specific drafts or all DRAFT status
    const where: { campaignId: string; status: string; id?: { in: string[] } } = {
      campaignId,
      status: 'DRAFT',
    }
    if (draftIds && draftIds.length > 0) {
      where.id = { in: draftIds }
    }

    const drafts = await prisma.emailDraft.findMany({
      where,
      include: {
        lead: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (drafts.length === 0) {
      throw new ApiError(400, 'No eligible drafts found to send', 'NO_DRAFTS')
    }

    let sent = 0
    let failed = 0

    // Throttled send: paces requests to stay under Resend's 2 RPS default
    // and retries individual sends that hit a 429.
    await runThrottled(
      drafts.map((draft) => async () => {
        try {
          // Use override email if set, otherwise fall back to lead email
          const toEmail = draft.overrideEmail || draft.lead.email

          // Build attachments from stored file references
          const emailAttachments: EmailAttachment[] = []
          if (draft.attachments && Array.isArray(draft.attachments)) {
            for (const att of draft.attachments as Attachment[]) {
              try {
                const filePath = path.join(process.cwd(), 'public', att.path)
                const content = await readFile(filePath)
                emailAttachments.push({ filename: att.filename, content })
              } catch {
                // Skip attachments that can't be read
              }
            }
          }

          const result = await withRateLimitRetry(() =>
            sendEmail({
              to: toEmail,
              subject: draft.subject,
              html: draft.body,
              campaignId,
              leadId: draft.leadId,
              cc: draft.ccEmail || undefined,
              attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
            })
          )

          if (result.success) {
            await prisma.emailDraft.update({
              where: { id: draft.id },
              data: { status: 'SENT', sentAt: new Date() },
            })

            // Create outreach log with Resend message ID for verification
            await prisma.outreachLog.create({
              data: {
                campaignLeadId: draft.campaignLeadId,
                campaignId,
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
      })
    )

    return NextResponse.json({ sent, failed })
  } catch (error) {
    return handleApiError(error)
  }
}
