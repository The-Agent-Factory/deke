import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError, ApiError } from '@/lib/api-error'
import {
  createBookingSchema,
  bookingFiltersSchema,
  type CreateBookingInput
} from '@/lib/validations/booking'
import { geocodeAddress } from '@/lib/services/geocoding'
import { sendBookingNotification } from '@/lib/notifications/booking-notification'

// POST /api/bookings - Create new booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validatedData: CreateBookingInput = createBookingSchema.parse(body)

    // Contact is optional: a date can be logged with just a title + start date.
    // Only verify it when one was actually supplied.
    if (validatedData.contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: validatedData.contactId }
      })

      if (!contact) {
        throw new ApiError(404, 'Contact not found', 'CONTACT_NOT_FOUND')
      }
    }

    // Geocode location if provided but coordinates missing
    let latitude = validatedData.latitude
    let longitude = validatedData.longitude

    if (validatedData.location && (!latitude || !longitude)) {
      console.log(`Geocoding location: ${validatedData.location}`)
      const geocodingResult = await geocodeAddress(validatedData.location)

      if (geocodingResult) {
        latitude = geocodingResult.latitude
        longitude = geocodingResult.longitude
        console.log(`Geocoding successful: ${latitude}, ${longitude}`)
      } else {
        console.warn(`Geocoding failed for location: ${validatedData.location}`)
        // Continue without coordinates - they're optional
      }
    }

    // Check if inquiry exists (if provided)
    if (validatedData.inquiryId) {
      const inquiry = await prisma.inquiry.findUnique({
        where: { id: validatedData.inquiryId }
      })

      if (!inquiry) {
        throw new ApiError(404, 'Inquiry not found', 'INQUIRY_NOT_FOUND')
      }

      // Check if booking already exists for this inquiry
      const existingBooking = await prisma.booking.findUnique({
        where: { inquiryId: validatedData.inquiryId }
      })

      if (existingBooking) {
        throw new ApiError(400, 'Booking already exists for this inquiry', 'BOOKING_EXISTS')
      }
    }

    // Check if trip exists (if provided)
    if (validatedData.tripId) {
      const trip = await prisma.trip.findUnique({ where: { id: validatedData.tripId } })
      if (!trip) {
        throw new ApiError(404, 'Trip not found', 'TRIP_NOT_FOUND')
      }
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        contactId: validatedData.contactId || null,
        inquiryId: validatedData.inquiryId ?? null,
        tripId: validatedData.tripId ?? null,
        serviceType: validatedData.serviceType,
        ...(validatedData.status ? { status: validatedData.status } : {}),
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        timezone: validatedData.timezone ?? null,
        location: validatedData.location ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        amount: validatedData.amount ?? null,
        depositPaid: validatedData.depositPaid ?? null,
        balanceDue: validatedData.balanceDue ?? null,
        internalNotes: validatedData.internalNotes ?? null,
        clientNotes: validatedData.clientNotes ?? null,
        availabilityBefore: validatedData.availabilityBefore ?? null,
        availabilityAfter: validatedData.availabilityAfter ?? null,
        isPublic: validatedData.isPublic ?? false,
        publicTitle: validatedData.publicTitle ?? null,
        publicDescription: validatedData.publicDescription ?? null,
        organization: validatedData.organization ?? null,
        ticketUrl: validatedData.ticketUrl ?? null,
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
        inquiry: true,
      }
    })

    // Send booking notification emails (async - don't block response).
    // Skipped for quick date entries that have no contact attached - there is
    // nobody to confirm to, and Deke does not need a "New Booking Request"
    // email for a date he just typed in himself.
    if (booking.contact?.email) {
      sendBookingNotification({
        bookingId: booking.id,
        contactName: `${booking.contact.firstName} ${booking.contact.lastName}`,
        contactEmail: booking.contact.email,
        contactPhone: booking.contact.phone ?? null,
        organization: booking.contact.organization ?? null,
        serviceType: booking.serviceType,
        startDate: booking.startDate,
        endDate: booking.endDate,
        location: booking.location,
        amount: booking.amount,
        clientNotes: booking.clientNotes,
      }).catch((error) => {
        console.error('Failed to send booking notification:', error)
      })
    }

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

// GET /api/bookings - List bookings with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filters = bookingFiltersSchema.parse({
      status: searchParams.get('status') || undefined,
      serviceType: searchParams.get('serviceType') || undefined,
      contactId: searchParams.get('contactId') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    })

    const where: any = {}
    if (filters.status) where.status = filters.status
    if (filters.serviceType) where.serviceType = filters.serviceType
    if (filters.contactId) where.contactId = filters.contactId

    const limit = filters.limit ?? 50
    const offset = filters.offset ?? 0

    // Get bookings with related data
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: {
          createdAt: 'desc'
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
          inquiry: {
            select: {
              id: true,
              serviceType: true,
              status: true,
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
      }),
      prisma.booking.count({ where })
    ])

    return NextResponse.json({
      bookings,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + bookings.length < total
      }
    })
  } catch (error) {
    return handleApiError(error)
  }
}
