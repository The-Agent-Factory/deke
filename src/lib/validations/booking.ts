import { z } from 'zod'

// Service type enum
export const serviceTypeSchema = z.enum([
  'ARRANGEMENT',
  'CONCERT',
  'FESTIVAL',
  'GROUP_COACHING',
  'INDIVIDUAL_COACHING',
  'MASTERCLASS',
  'SINGALONG',
  'SPEAKING',
  'WORKSHOP',
  'CONSULTATION'
])

// Booking status enum
export const bookingStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'RESCHEDULED'
])

// Payment status enum
export const paymentStatusSchema = z.enum([
  'UNPAID',
  'DEPOSIT_PAID',
  'PAID_IN_FULL',
  'REFUNDED',
  'OVERDUE'
])

// Create booking schema
export const createBookingSchema = z.object({
  // Contact is optional so a date can be entered fast with just a title + start date.
  contactId: z.string().optional().nullable(),
  inquiryId: z.string().optional().nullable(),
  tripId: z.string().optional().nullable(),
  serviceType: serviceTypeSchema.default('CONCERT'),
  status: bookingStatusSchema.optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  amount: z.number().min(0).optional().nullable(),
  depositPaid: z.number().min(0).optional().nullable(),
  balanceDue: z.number().min(0).optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  clientNotes: z.string().optional().nullable(),
  availabilityBefore: z.number().int().min(0).max(30).optional().nullable(),
  availabilityAfter: z.number().int().min(0).max(30).optional().nullable(),
  isPublic: z.boolean().optional(),
  publicTitle: z.string().min(1, 'Title is required').max(200),
  publicDescription: z.string().max(1000).optional().nullable(),
  organization: z.string().max(200).optional().nullable(),
  ticketUrl: z.string().max(500).optional().nullable(),
})

// Query filters for listing bookings
export const bookingFiltersSchema = z.object({
  status: bookingStatusSchema.optional(),
  serviceType: serviceTypeSchema.optional(),
  contactId: z.string().optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().min(0)).optional(),
})

// Update booking schema
export const updateBookingSchema = z.object({
  serviceType: serviceTypeSchema.optional(),
  status: bookingStatusSchema.optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  amount: z.number().min(0).optional().nullable(),
  depositPaid: z.number().min(0).optional().nullable(),
  balanceDue: z.number().min(0).optional().nullable(),
  paymentStatus: paymentStatusSchema.optional(),
  internalNotes: z.string().optional().nullable(),
  clientNotes: z.string().optional().nullable(),
  availabilityBefore: z.number().int().min(0).max(30).optional().nullable(),
  availabilityAfter: z.number().int().min(0).max(30).optional().nullable(),
  isPublic: z.boolean().optional(),
  publicTitle: z.string().max(200).optional().nullable(),
  publicDescription: z.string().max(1000).optional().nullable(),
  organization: z.string().max(200).optional().nullable(),
  ticketUrl: z.string().max(500).optional().nullable(),
})

// Type exports
export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>
export type BookingFilters = z.infer<typeof bookingFiltersSchema>
