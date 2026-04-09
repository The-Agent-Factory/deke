import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { handleApiError, ApiError } from '@/lib/api-error'
import { updateDraftSchema } from '@/lib/validations/email-draft'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; draftId: string }> }
) {
  try {
    const { id: campaignId, draftId } = await params
    const body = await request.json()
    const data = updateDraftSchema.parse(body)

    const draft = await prisma.emailDraft.findFirst({
      where: { id: draftId, campaignId },
    })

    if (!draft) {
      throw new ApiError(404, 'Draft not found', 'NOT_FOUND')
    }

    if (draft.status !== 'DRAFT' && draft.status !== 'FAILED') {
      throw new ApiError(400, `Cannot edit a draft with status ${draft.status}`, 'INVALID_STATUS')
    }

    const updated = await prisma.emailDraft.update({
      where: { id: draftId },
      data: {
        subject: data.subject,
        body: data.body,
        overrideEmail: data.overrideEmail,
        ccEmail: data.ccEmail,
        attachments: data.attachments === null ? Prisma.JsonNull : data.attachments,
        editedByUser: true,
        // Reset FAILED drafts back to DRAFT so they can be re-sent
        ...(draft.status === 'FAILED' ? { status: 'DRAFT', errorMessage: null } : {}),
      },
      include: {
        lead: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            organization: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; draftId: string }> }
) {
  try {
    const { id: campaignId, draftId } = await params

    const draft = await prisma.emailDraft.findFirst({
      where: { id: draftId, campaignId },
    })

    if (!draft) {
      throw new ApiError(404, 'Draft not found', 'NOT_FOUND')
    }

    if (draft.status !== 'DRAFT' && draft.status !== 'FAILED') {
      throw new ApiError(400, `Cannot delete a draft with status ${draft.status}`, 'INVALID_STATUS')
    }

    await prisma.emailDraft.delete({
      where: { id: draftId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
