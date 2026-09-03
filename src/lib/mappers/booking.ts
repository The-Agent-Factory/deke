import type { Booking, Contact, Inquiry } from '@prisma/client';

type BookingWithRelations = Booking & {
  // Bookings can exist without a contact (fast date entry), so this is nullable.
  contact: Contact | null;
  inquiry?: Inquiry | null;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
  }>;
};

export type ComponentBooking = {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  serviceType: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  amount: number | null;
  depositPaid: number | null;
  balanceDue: number | null;
  paymentStatus: 'UNPAID' | 'DEPOSIT_PAID' | 'PAID_IN_FULL' | 'REFUNDED' | 'OVERDUE';
  internalNotes: string | null;
  clientNotes: string | null;

  // Event identity. A booking can exist without a contact, so the title is the
  // headline and the contact is supporting detail.
  publicTitle: string | null;
  organization: string | null;

  // Contact info (flattened for easy display)
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  contactOrganization: string | null;

  // Related counts
  campaignCount: number;
  campaignId: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
};

export function mapBookingToComponent(
  booking: BookingWithRelations
): ComponentBooking {
  return {
    id: booking.id,
    status: booking.status as ComponentBooking['status'],
    serviceType: booking.serviceType,
    startDate: booking.startDate?.toISOString() || null,
    endDate: booking.endDate?.toISOString() || null,
    location: booking.location,
    amount: booking.amount,
    depositPaid: booking.depositPaid,
    balanceDue: booking.balanceDue,
    paymentStatus: booking.paymentStatus as ComponentBooking['paymentStatus'],
    internalNotes: booking.internalNotes,
    clientNotes: booking.clientNotes,

    publicTitle: booking.publicTitle,
    // Per-booking organization, falling back to the contact's.
    organization: booking.organization ?? booking.contact?.organization ?? null,

    // Flatten contact info
    contactName: booking.contact ? `${booking.contact.firstName} ${booking.contact.lastName}`.trim() : '',
    contactEmail: booking.contact?.email ?? '',
    contactPhone: booking.contact?.phone ?? null,
    contactOrganization: booking.contact?.organization ?? null,

    // Counts
    campaignCount: booking.campaigns.length,
    campaignId: booking.campaigns.length > 0 ? booking.campaigns[0].id : null,

    // Timestamps
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

export function mapBookingsToComponent(
  bookings: BookingWithRelations[]
): ComponentBooking[] {
  return bookings.map(mapBookingToComponent);
}
