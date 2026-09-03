import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError, ApiError } from '@/lib/api-error'

// GET /api/bookings/calendar?start=2026-03-01&end=2026-03-31
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')

    if (!startParam || !endParam) {
      throw new ApiError(400, 'Both start and end query parameters are required', 'MISSING_PARAMS')
    }

    const start = new Date(startParam)
    const end = new Date(endParam)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ApiError(400, 'Invalid date format. Use ISO date strings.', 'INVALID_DATE')
    }

    // Ensure end covers the full day
    end.setHours(23, 59, 59, 999)

    const bookings = await prisma.booking.findMany({
      where: {
        startDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        campaigns: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    })

    // Map to include availability window info
    const result = bookings.map((booking) => ({
      id: booking.id,
      serviceType: booking.serviceType,
      status: booking.status,
      startDate: booking.startDate,
      endDate: booking.endDate,
      location: booking.location,
      availabilityBefore: booking.availabilityBefore,
      availabilityAfter: booking.availabilityAfter,
      publicTitle: booking.publicTitle,
      organization: booking.organization,
      contact: booking.contact,
      campaigns: booking.campaigns,
    }))

    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
