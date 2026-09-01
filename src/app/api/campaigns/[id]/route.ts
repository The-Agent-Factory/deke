import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError, ApiError } from '@/lib/api-error'
import { updateCampaignSchema, type UpdateCampaignInput } from '@/lib/validations/campaign'

type Params = {
  params: Promise<{
    id: string
  }>
}

// GET /api/campaigns/[id] - Get single campaign
export async function GET(
  request: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        booking: true,
        leads: {
          include: {
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                organization: true,
                contactTitle: true,
                website: true,
                editorialSummary: true,
              }
            },
            outreachLogs: true,
          },
          orderBy: {
            score: 'desc'
          }
        },
        _count: {
          select: {
            leads: true,
            outreachLogs: true,
          }
        }
      }
    })

    if (!campaign) {
      throw new ApiError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND')
    }

    return NextResponse.json(campaign)
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH /api/campaigns/[id] - Update campaign
export async function PATCH(
  request: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate input
    const validatedData: UpdateCampaignInput = updateCampaignSchema.parse(body)

    // Check if campaign exists
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id }
    })

    if (!existingCampaign) {
      throw new ApiError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND')
    }

    // Cannot modify certain fields if campaign is active
    if (existingCampaign.status === 'ACTIVE' && (
      validatedData.baseLocation ||
      validatedData.latitude ||
      validatedData.longitude
    )) {
      throw new ApiError(
        400,
        'Cannot modify location of active campaign',
        'CAMPAIGN_ACTIVE'
      )
    }

    // Update campaign
    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.baseLocation && { baseLocation: validatedData.baseLocation }),
        ...(validatedData.latitude !== undefined && { latitude: validatedData.latitude }),
        ...(validatedData.longitude !== undefined && { longitude: validatedData.longitude }),
        ...(validatedData.radius !== undefined && { radius: validatedData.radius }),
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.startDate !== undefined && {
          startDate: validatedData.startDate ? new Date(validatedData.startDate) : null
        }),
        ...(validatedData.endDate !== undefined && {
          endDate: validatedData.endDate ? new Date(validatedData.endDate) : null
        }),
        ...(validatedData.includeOffSeason !== undefined && {
          includeOffSeason: validatedData.includeOffSeason
        }),
      },
      include: {
        booking: true,
        _count: {
          select: {
            leads: true,
            outreachLogs: true,
          }
        }
      }
    })

    return NextResponse.json(campaign)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/campaigns/[id] - Delete campaign
export async function DELETE(
  request: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { status: true }
    })

    if (!campaign) {
      throw new ApiError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND')
    }

    // Cannot delete active campaigns
    if (campaign.status === 'ACTIVE') {
      throw new ApiError(
        400,
        'Cannot delete active campaign. Pause or cancel it first.',
        'CAMPAIGN_ACTIVE'
      )
    }

    // Delete campaign (cascade will handle related records)
    await prisma.campaign.delete({
      where: { id }
    })

    return NextResponse.json(
      { message: 'Campaign deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
