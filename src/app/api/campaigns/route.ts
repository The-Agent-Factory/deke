import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError, ApiError } from '@/lib/api-error'
import {
  createCampaignSchema,
  campaignFiltersSchema,
  type CreateCampaignInput
} from '@/lib/validations/campaign'

// POST /api/campaigns - Create new campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validatedData: CreateCampaignInput = createCampaignSchema.parse(body)

    // Auto-populate location from booking if bookingId provided
    let baseLocation = validatedData.baseLocation
    let latitude = validatedData.latitude
    let longitude = validatedData.longitude

    // Check if booking exists (if bookingId provided)
    if (validatedData.bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: validatedData.bookingId },
        select: {
          id: true,
          location: true,
          latitude: true,
          longitude: true,
        }
      })

      if (!booking) {
        throw new ApiError(404, 'Booking not found', 'BOOKING_NOT_FOUND')
      }

      // Check if campaign already exists for this booking
      const existingCampaign = await prisma.campaign.findUnique({
        where: { bookingId: validatedData.bookingId }
      })

      if (existingCampaign) {
        throw new ApiError(400, 'Campaign already exists for this booking', 'CAMPAIGN_EXISTS')
      }

      // Auto-populate location from booking if not provided in request
      if (!baseLocation && booking.location) {
        baseLocation = booking.location
      }
      if (!latitude && booking.latitude) {
        latitude = booking.latitude
      }
      if (!longitude && booking.longitude) {
        longitude = booking.longitude
      }
    }

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        name: validatedData.name,
        baseLocation: baseLocation!,
        latitude: latitude!,
        longitude: longitude!,
        radius: validatedData.radius ?? 100,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        bookingId: validatedData.bookingId ?? null,
        targetOrgTypes: validatedData.targetOrgTypes ?? null,
        includeOffSeason: validatedData.includeOffSeason ?? false,
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

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

// GET /api/campaigns - List campaigns with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filters = campaignFiltersSchema.parse({
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    })

    const where = filters.status ? { status: filters.status } : {}
    const limit = filters.limit ?? 50
    const offset = filters.offset ?? 0

    // Get campaigns with counts
    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          booking: {
            select: {
              id: true,
              serviceType: true,
              startDate: true,
              location: true,
            }
          },
          _count: {
            select: {
              leads: true,
              outreachLogs: true,
            }
          }
        }
      }),
      prisma.campaign.count({ where })
    ])

    return NextResponse.json({
      campaigns,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + campaigns.length < total
      }
    })
  } catch (error) {
    return handleApiError(error)
  }
}
