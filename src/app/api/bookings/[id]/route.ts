import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError, ApiError } from '@/lib/api-error'
import { updateBookingSchema, type UpdateBookingInput } from '@/lib/validations/booking'
import { geocodeAddress } from '@/lib/services/geocoding'

// GET /api/bookings/[id] - Fetch single booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            organization: true,
          }
        },
        inquiry: {
          select: {
            id: true,
            serviceType: true,
            status: true,
            message: true,
            quotedAmount: true,
          }
        },
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
            baseLocation: true,
            startDate: true,
            endDate: true,
            _count: {
              select: {
                leads: true,
                outreachLogs: true,
              }
            }
          }
        },
      }
    })

    if (!booking) {
      throw new ApiError(404, 'Booking not found', 'BOOKING_NOT_FOUND')
    }

    return NextResponse.json(booking)
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH /api/bookings/[id] - Update booking
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate input
    const validatedData: UpdateBookingInput = updateBookingSchema.parse(body)

    // Check if booking exists
    const existingBooking = await prisma.booking.findUnique({
      where: { id }
    })

    if (!existingBooking) {
      throw new ApiError(404, 'Booking not found', 'BOOKING_NOT_FOUND')
    }

    // Geocode location if provided but coordinates missing
    let latitude = validatedData.latitude
    let longitude = validatedData.longitude

    if (validatedData.location && (!latitude || !longitude)) {
      console.log(`Geocoding updated location: ${validatedData.location}`)
      const geocodingResult = await geocodeAddress(validatedData.location)

      if (geocodingResult) {
        latitude = geocodingResult.latitude
        longitude = geocodingResult.longitude
        console.log(`Geocoding successful: ${latitude}, ${longitude}`)
      } else {
        console.warn(`Geocoding failed for location: ${validatedData.location}`)
      }
    }

    // Auto-calculate balanceDue if amount or depositPaid changes
    let balanceDue = validatedData.balanceDue

    if (validatedData.amount !== undefined || validatedData.depositPaid !== undefined) {
      const amount = validatedData.amount ?? existingBooking.amount ?? 0
      const depositPaid = validatedData.depositPaid ?? existingBooking.depositPaid ?? 0
      balanceDue = amount - depositPaid
    }

    // Update booking
    const booking = await prisma.booking.update({
      where: { id },
      data: {
        serviceType: validatedData.serviceType,
        status: validatedData.status,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : undefined,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
        timezone: validatedData.timezone,
        location: validatedData.location,
        latitude: latitude !== undefined ? latitude : undefined,
        longitude: longitude !== undefined ? longitude : undefined,
        amount: validatedData.amount,
        depositPaid: validatedData.depositPaid,
        balanceDue: balanceDue,
        paymentStatus: validatedData.paymentStatus,
        internalNotes: validatedData.internalNotes,
        clientNotes: validatedData.clientNotes,
        isPublic: validatedData.isPublic,
        publicTitle: validatedData.publicTitle,
        publicDescription: validatedData.publicDescription,
        organization: validatedData.organization,
        ticketUrl: validatedData.ticketUrl,
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            organization: true,
          }
        },
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
          }
        }
      }
    })

    return NextResponse.json(booking)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/bookings/[id] - Delete booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if booking exists
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        campaigns: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    if (!booking) {
      throw new ApiError(404, 'Booking not found', 'BOOKING_NOT_FOUND')
    }

    // If campaigns exist, delete them first (cascade)
    if (booking.campaigns && booking.campaigns.length > 0) {
      for (const campaign of booking.campaigns) {
        await prisma.campaign.delete({
          where: { id: campaign.id }
        })
      }
    }

    await prisma.booking.delete({
      where: { id }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleApiError(error)
  }
}
