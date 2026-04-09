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
    // draftIds: resend specific failed drafts; if omitted, resend all failed drafts
    // logIds: OutreachLog IDs (from Messages tab) — resolved to draft IDs via CampaignLead
    let draftIds: string[] | undefined = body.draftIds
    const logIds: string[] | undefined = body.logIds

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    })
    if (!campaign) {
      throw new ApiError(404, 'Campaign not found', 'NOT_FOUND')
    }

    // Resolve OutreachLog IDs → draft IDs via their CampaignLead
    if (logIds && logIds.length > 0 && (!draftIds || draftIds.length === 0)) {
      const logs = await prisma.outreachLog.findMany({
        where: { id: { in: logIds }, campaignId },
        select: { campaignLeadId: true },
      })
      const campaignLeadIds = logs.map(l => l.campaignLeadId)
      if (campaignLeadIds.length > 0) {
        const drafts = await prisma.emailDraft.findMany({
          where: { campaignId, campaignLeadId: { in: campaignLeadIds }, status: 'FAILED' },
          select: { id: true },
        })
        draftIds = drafts.map(d => d.id)
      }
    }

    // Find failed EmailDraft records (these are the canonical source of truth for failures)
    const failedDrafts = await prisma.emailDraft.findMany({
      where: {
        campaignId,
        status: 'FAILED',
        ...(draftIds && draftIds.length > 0 ? { id: { in: draftIds } } : {}),
      },
      include: {
        lead: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Also find failed OutreachLogs that have no corresponding draft failure
    // (can occur from queue-based sends)
    const failedLogs = await prisma.outreachLog.findMany({
      where: {
        campaignId,
        status: 'FAILED',
        channel: 'EMAIL',
      },
      include: {
        campaignLead: {
          include: {
            lead: {
              select: {
                id: true,
                email: true,
              },
            },
            emailDraft: true,
          },
        },
      },
    })

    // Collect draft IDs already covered by failedDrafts to avoid double-sending
    const coveredDraftIds = new Set(failedDrafts.map(d => d.id))

    // Add logs whose draft isn't already in failedDrafts
    const extraDraftsFromLogs: typeof failedDrafts = []
    for (const log of failedLogs) {
      const draft = log.campaignLead.emailDraft
      if (draft && draft.status === 'FAILED' && !coveredDraftIds.has(draft.id)) {
        coveredDraftIds.add(draft.id)
        extraDraftsFromLogs.push({
          ...draft,
          lead: log.campaignLead.lead as typeof failedDrafts[0]['lead'],
        })
      }
    }

    const allDrafts = [...failedDrafts, ...extraDraftsFromLogs]

    if (allDrafts.length === 0) {
      return NextResponse.json({ resent: 0, failed: 0, skipped: 0 })
    }

    let resent = 0
    let failed = 0
    let skipped = 0

    for (const draft of allDrafts) {
      try {
        const toEmail = draft.overrideEmail || draft.lead.email

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
          leadId: draft.lead.id,
          cc: draft.ccEmail || undefined,
          attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
        })

        if (result.success) {
          // Update draft to SENT
          await prisma.emailDraft.update({
            where: { id: draft.id },
            data: { status: 'SENT', sentAt: new Date(), errorMessage: null },
          })

          // Create a new OutreachLog (or update existing failed one)
          const existingLog = await prisma.outreachLog.findFirst({
            where: { campaignLeadId: draft.campaignLeadId, channel: 'EMAIL', status: 'FAILED' },
          })

          if (existingLog) {
            await prisma.outreachLog.update({
              where: { id: existingLog.id },
              data: {
                status: 'SENT',
                sentAt: new Date(),
                errorMessage: null,
                providerMessageId: result.id || null,
              },
            })
          } else {
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
          }

          // Mark lead as CONTACTED
          await prisma.campaignLead.update({
            where: { id: draft.campaignLeadId },
            data: { status: 'CONTACTED' },
          })

          resent++
        } else {
          await prisma.emailDraft.update({
            where: { id: draft.id },
            data: { status: 'FAILED', errorMessage: result.error },
          })
          failed++
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        await prisma.emailDraft.update({
          where: { id: draft.id },
          data: { status: 'FAILED', errorMessage },
        })
        failed++
      }
    }

    return NextResponse.json({ resent, failed, skipped })
  } catch (error) {
    return handleApiError(error)
  }
}
