import { Metadata } from "next";
import Link from "next/link";
import { MapPin, Music, ArrowRight, Mic2, Calendar, Download, Ticket } from "lucide-react";
import { format, isPast, isSameDay } from "date-fns";
import { prisma } from "@/lib/db";
import { generateGoogleCalendarUrl } from "@/lib/utils/ical";

// Force dynamic rendering so new public bookings appear quickly
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Upcoming Events",
  description:
    "See where Deke Sharon is performing, coaching, and teaching next. Browse upcoming workshops, masterclasses, and speaking engagements.",
};

// ------------------------------------------------------------------
// Service type display labels
// ------------------------------------------------------------------

const SERVICE_LABELS: Record<string, string> = {
  ARRANGEMENT: "Arrangement Session",
  CONCERT: "Concert",
  FESTIVAL: "Festival",
  GROUP_COACHING: "Group Coaching",
  INDIVIDUAL_COACHING: "Individual Coaching",
  MASTERCLASS: "Masterclass",
  SINGALONG: "Singalong",
  SPEAKING: "Speaking Engagement",
  WORKSHOP: "Workshop",
  CONSULTATION: "Consultation",
};

function serviceLabel(type: string) {
  return SERVICE_LABELS[type] ?? type;
}

// ------------------------------------------------------------------
// Service type accent colors for variety
// ------------------------------------------------------------------

const SERVICE_ACCENT: Record<string, string> = {
  ARRANGEMENT: "border-[#1a1a1a]",
  CONCERT: "border-[#C05A3C]",
  CONSULTATION: "border-[#C9A96E]",
  FESTIVAL: "border-[#C9A96E]",
  GROUP_COACHING: "border-[#C05A3C]",
  INDIVIDUAL_COACHING: "border-[#C9A96E]",
  MASTERCLASS: "border-[#C9A96E]",
  SINGALONG: "border-[#C05A3C]",
  SPEAKING: "border-[#1a1a1a]",
  WORKSHOP: "border-[#C05A3C]",
};

// ------------------------------------------------------------------
// Data fetching
// ------------------------------------------------------------------

interface PublicEvent {
  id: string;
  serviceType: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  location: string | null;
  publicTitle: string | null;
  publicDescription: string | null;
  ticketUrl: string | null;
}

async function getUpcomingEvents(): Promise<PublicEvent[]> {
  try {
    const now = new Date();

    const bookings = await prisma.booking.findMany({
      where: {
        isPublic: true,
        status: {
          notIn: ["CANCELLED"],
        },
        OR: [
          { startDate: { gte: now } },
          { endDate: { gte: now } },
          { startDate: null },
        ],
      },
      select: {
        id: true,
        serviceType: true,
        status: true,
        startDate: true,
        endDate: true,
        location: true,
        publicTitle: true,
        publicDescription: true,
        ticketUrl: true,
      },
      orderBy: {
        startDate: "asc",
      },
      take: 50,
    });

    return bookings.map((b) => ({
      id: b.id,
      serviceType: b.serviceType,
      status: b.status,
      startDate: b.startDate,
      endDate: b.endDate,
      location: b.location,
      publicTitle: b.publicTitle ?? null,
      publicDescription: b.publicDescription ?? null,
      ticketUrl: b.ticketUrl ?? null,
    }));
  } catch (error) {
    console.error("Error fetching public events:", error);
    return [];
  }
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default async function EventsPage() {
  const events = await getUpcomingEvents();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-[#1a1a1a] px-4 py-20 text-center sm:py-28">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#C9A96E]/40 bg-[#C9A96E]/10">
              <Mic2 className="h-7 w-7 text-[#C9A96E]" />
            </div>
          </div>
          <h1
            className="text-4xl font-bold tracking-tight text-[#F5F3EF] sm:text-5xl"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Upcoming Events
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-[#999]">
            See where Deke is performing, coaching, and teaching next
          </p>
          <a
            href="/api/events/feed"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#C9A96E]/30 px-5 py-2 text-sm text-[#C9A96E] transition-colors hover:bg-[#C9A96E]/10"
          >
            <Calendar className="h-4 w-4" />
            Subscribe to Calendar
          </a>
        </div>

        {/* Decorative bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A96E]/30 to-transparent" />
      </section>

      {/* Timeline Section */}
      <section className="bg-[#F5F3EF] px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          {events.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="relative">
              {/* Vertical timeline line - centered on desktop, left-aligned on mobile */}
              <div
                className="absolute left-4 top-0 bottom-0 w-px bg-[#d5d0c8] sm:left-1/2 sm:-translate-x-px"
                aria-hidden="true"
              />

              <div>
                {events.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#1a1a1a] px-4 py-16 text-center sm:py-20">
        <div className="mx-auto max-w-2xl">
          <h2
            className="text-3xl font-bold text-[#F5F3EF]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Book Deke for Your Event
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[#999]">
            Workshops, masterclasses, speaking engagements, and more.
            Bring the magic of a cappella to your organization.
          </p>
          <Link
            href="/booking"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#C05A3C] px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#a84d33] focus:outline-none focus:ring-2 focus:ring-[#C05A3C] focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------
// Event Card (timeline item)
// ------------------------------------------------------------------

function EventCard({
  event,
  index,
}: {
  event: PublicEvent;
  index: number;
}) {
  const isLeft = index % 2 === 0;
  const past = event.startDate ? isPast(event.startDate) : false;
  const accentBorder =
    SERVICE_ACCENT[event.serviceType] ?? "border-[#C05A3C]";
  const isMultiDay =
    event.startDate && event.endDate && !isSameDay(event.startDate, event.endDate);

  return (
    <div
      className={`relative flex mt-8 sm:-mt-12 sm:first:mt-0 ${past ? "opacity-60" : ""}`}
      style={{ zIndex: index + 1 }}
      role="article"
      aria-label={`${serviceLabel(event.serviceType)}${event.location ? ` in ${event.location}` : ""}`}
    >
      {/* Timeline dot */}
      <div
        className="absolute left-4 z-10 flex h-3 w-3 -translate-x-1/2 items-center justify-center sm:left-1/2"
        aria-hidden="true"
      >
        <span className="h-3 w-3 rounded-full border-2 border-[#C9A96E] bg-[#F5F3EF]" />
      </div>

      {/* Card positioned - mobile: always right; desktop: alternating */}
      <div
        className={`ml-10 w-full sm:ml-0 sm:w-[calc(50%-2rem)] ${
          isLeft
            ? "sm:mr-auto sm:pr-0 sm:text-right"
            : "sm:ml-auto sm:pl-0 sm:text-left"
        }`}
      >
        <div
          className={`rounded-lg border-l-4 bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${accentBorder}`}
        >
          {/* Date badge */}
          {event.startDate && (
            <div
              className={`mb-3 inline-flex items-center gap-1 rounded-md bg-[#1a1a1a] px-3 py-2 leading-none ${
                isLeft ? "sm:float-right sm:ml-4" : ""
              }`}
            >
              <div className="flex flex-col items-center">
                <span
                  className="text-[10px] font-semibold uppercase tracking-widest text-[#C9A96E]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {format(event.startDate, "MMM")}
                </span>
                <span
                  className="text-xl font-bold text-[#F5F3EF]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {format(event.startDate, "d")}
                </span>
              </div>
              {isMultiDay && event.endDate && (
                <>
                  <span className="text-[#C9A96E]/50 text-xs font-medium px-0.5">&ndash;</span>
                  <div className="flex flex-col items-center">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-widest text-[#C9A96E]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {format(event.endDate, "MMM")}
                    </span>
                    <span
                      className="text-xl font-bold text-[#F5F3EF]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {format(event.endDate, "d")}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Service type label */}
          <div className="mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F3EF] px-2.5 py-1 text-xs font-medium text-[#1a1a1a]">
              <Music className="h-3 w-3 text-[#C05A3C]" />
              {serviceLabel(event.serviceType)}
            </span>
          </div>

          {/* Event title */}
          {event.publicTitle && (
            <h3 className="text-base font-semibold text-[#1a1a1a] mb-1">
              {event.publicTitle}
            </h3>
          )}

          {/* Event description */}
          {event.publicDescription && (
            <p className="text-sm text-[#666] mb-2">
              {event.publicDescription}
            </p>
          )}

          {/* Location */}
          {event.location && (
            <p className="flex items-center gap-1.5 text-sm text-[#666]">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#C05A3C]" />
              <span>{event.location}</span>
            </p>
          )}

          {/* Ticket link */}
          {event.ticketUrl && (
            <div className={`mt-3 flex ${isLeft ? "sm:justify-end" : ""}`}>
              <a
                href={event.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#C05A3C] px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#a84d33] focus:outline-none focus:ring-2 focus:ring-[#C05A3C] focus:ring-offset-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <Ticket className="h-3.5 w-3.5" />
                Get Tickets
              </a>
            </div>
          )}

          {/* Calendar buttons */}
          {event.startDate && (
            <div className={`mt-3 flex gap-2 ${isLeft ? "sm:justify-end" : ""}`}>
              <a
                href={generateGoogleCalendarUrl({
                  title: `Deke Sharon: ${event.publicTitle || serviceLabel(event.serviceType)}`,
                  description: event.publicDescription,
                  location: event.location,
                  startDate: event.startDate,
                  endDate: event.endDate,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-[#e5e2dc] px-2.5 py-1 text-[11px] font-medium text-[#666] transition-colors hover:border-[#C05A3C] hover:text-[#C05A3C]"
              >
                <Calendar className="h-3 w-3" />
                Google Cal
              </a>
              <a
                href={`/api/events/${event.id}/ical`}
                download
                className="inline-flex items-center gap-1 rounded-md border border-[#e5e2dc] px-2.5 py-1 text-[11px] font-medium text-[#666] transition-colors hover:border-[#C05A3C] hover:text-[#C05A3C]"
              >
                <Download className="h-3 w-3" />
                .ics
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Empty state
// ------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e5e2dc]">
        <Mic2 className="h-8 w-8 text-[#999]" />
      </div>
      <h3
        className="text-xl font-semibold text-[#1a1a1a]"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        No upcoming events
      </h3>
      <p className="mt-2 max-w-sm text-sm text-[#666]">
        Check back soon for new workshops, masterclasses, and speaking
        engagements.
      </p>
    </div>
  );
}
