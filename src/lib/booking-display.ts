/**
 * Naming bookings for display.
 *
 * A booking can be created from just a title and a date, so the contact is
 * optional. These helpers pick whatever actually identifies the date instead of
 * printing "Unknown Contact" at people.
 */

function serviceLabel(serviceType: string): string {
  return serviceType
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

type ContactLike = {
  firstName?: string | null;
  lastName?: string | null;
} | null | undefined;

/** Full contact name, or '' when there is no contact. */
export function contactName(contact: ContactLike): string {
  if (!contact) return '';
  return `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim();
}

type BookingLike = {
  publicTitle?: string | null;
  organization?: string | null;
  location?: string | null;
  serviceType: string;
  /** Either a nested contact (Prisma shape) or an already-flattened name. */
  contact?: ContactLike;
  contactName?: string | null;
};

/**
 * The one line that best names this booking: its title, else who it is with,
 * else the host, else the service and where it happens.
 */
export function bookingTitle(booking: BookingLike): string {
  const name = booking.contactName?.trim() || contactName(booking.contact);
  return (
    booking.publicTitle?.trim() ||
    name ||
    booking.organization?.trim() ||
    `${serviceLabel(booking.serviceType)}${booking.location ? ` in ${booking.location}` : ''}`
  );
}
