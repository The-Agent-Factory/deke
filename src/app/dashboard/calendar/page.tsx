"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { bookingTitle } from '@/lib/booking-display';
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Loader2,
  AlertCircle,
  List,
  Grid3X3,
} from "lucide-react";
import { QuickBookingModal } from "@/components/bookings/quick-booking-modal";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface CalendarBooking {
  id: string;
  serviceType: string;
  status: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  availabilityBefore: number | null;
  availabilityAfter: number | null;
  publicTitle: string | null;
  organization: string | null;
  // Null for dates entered without a contact attached.
  contact: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  campaigns: { id: string; status: string }[];
}

// ------------------------------------------------------------------
// Status colors
// ------------------------------------------------------------------

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-300",
  },
  CONFIRMED: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-300",
  },
  IN_PROGRESS: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
  },
  COMPLETED: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-300",
  },
  CANCELLED: {
    bg: "bg-red-50",
    text: "text-red-500 line-through",
    border: "border-red-200",
  },
};

function getStatusStyle(status: string) {
  return (
    STATUS_STYLES[status] ?? {
      bg: "bg-gray-100",
      text: "text-gray-700",
      border: "border-gray-300",
    }
  );
}

// ------------------------------------------------------------------
// Service type label
// ------------------------------------------------------------------

const SERVICE_LABELS: Record<string, string> = {
  ARRANGEMENT: "Arrangement",
  GROUP_COACHING: "Group Coaching",
  INDIVIDUAL_COACHING: "Coaching",
  WORKSHOP: "Workshop",
  SPEAKING: "Speaking",
  MASTERCLASS: "Masterclass",
  CONSULTATION: "Consult",
};

function serviceLabel(type: string) {
  return SERVICE_LABELS[type] ?? type;
}

// ------------------------------------------------------------------
// Day names
// ------------------------------------------------------------------

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------

export default function CalendarPage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Responsive: detect mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Fetch bookings for the visible month range
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    // Extend to cover the full calendar grid (includes trailing/leading days)
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    try {
      const res = await fetch(
        `/api/bookings/calendar?start=${calStart.toISOString()}&end=${calEnd.toISOString()}`
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch bookings: ${res.status}`);
      }
      const data: CalendarBooking[] = await res.json();
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Build calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Map bookings by date string for fast lookup — multi-day bookings appear on every day they span
  const bookingsByDate = useMemo(() => {
    const map: Record<string, CalendarBooking[]> = {};
    for (const booking of bookings) {
      if (!booking.startDate) continue;
      const start = parseISO(booking.startDate);
      const end = booking.endDate ? parseISO(booking.endDate) : start;
      const days = eachDayOfInterval({ start, end });
      for (const day of days) {
        const dateKey = format(day, "yyyy-MM-dd");
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(booking);
      }
    }
    return map;
  }, [bookings]);

  // Navigation
  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // Quick-booking modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<string | undefined>(undefined);

  // Click handlers
  const handleBookingClick = (bookingId: string) => {
    router.push(`/dashboard/bookings/${bookingId}`);
  };

  const handleDayClick = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    setModalDate(dateStr);
    setModalOpen(true);
  };

  // Effective view: force list on mobile
  const effectiveView = isMobile ? "list" : viewMode;

  // ------------------------------------------------------------------
  // Render: Booking pill
  // ------------------------------------------------------------------

  type BookingPosition = "single" | "start" | "middle" | "end";

  function getBookingPosition(booking: CalendarBooking, day: Date): BookingPosition {
    const start = parseISO(booking.startDate);
    const end = booking.endDate ? parseISO(booking.endDate) : start;
    if (isSameDay(start, end)) return "single";
    if (isSameDay(day, start)) return "start";
    if (isSameDay(day, end)) return "end";
    return "middle";
  }

  function BookingPill({ booking, position = "single" }: { booking: CalendarBooking; position?: BookingPosition }) {
    const style = getStatusStyle(booking.status);

    const roundingClass =
      position === "single" ? "rounded" :
      position === "start" ? "rounded-l rounded-r-none" :
      position === "end" ? "rounded-r rounded-l-none" :
      "rounded-none";

    const isMiddle = position === "middle";

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleBookingClick(booking.id);
        }}
        className={`w-full truncate border px-1.5 py-0.5 text-left text-[11px] font-medium leading-tight transition-opacity hover:opacity-80 ${roundingClass} ${style.bg} ${style.text} ${style.border} ${isMiddle ? "opacity-60 border-x-0" : ""}`}
        title={`${serviceLabel(booking.serviceType)} - ${bookingTitle(booking)} (${booking.status})${position !== "single" ? ` [${position}]` : ""}`}
        aria-label={`${serviceLabel(booking.serviceType)}: ${bookingTitle(booking)}, status ${booking.status}`}
      >
        {position === "middle" ? (
          <span className="block truncate text-[10px]">&nbsp;</span>
        ) : (
          <>
            <span className="block truncate">
              {position === "end" ? `\u2190 ${serviceLabel(booking.serviceType)}` : serviceLabel(booking.serviceType)}
              {position === "start" ? " \u2192" : ""}
            </span>
            {position !== "end" && (
              <span className="block truncate opacity-75">
                {bookingTitle(booking)}
              </span>
            )}
          </>
        )}
      </button>
    );
  }

  // ------------------------------------------------------------------
  // Render: List view (mobile or toggled)
  // ------------------------------------------------------------------

  function ListView() {
    // In list view, only show bookings on their start date to avoid duplication
    const daysWithBookings = calendarDays.filter((day) => {
      const key = format(day, "yyyy-MM-dd");
      const dayBookings = bookingsByDate[key] || [];
      return dayBookings.some((b) => isSameDay(parseISO(b.startDate), day));
    });

    if (daysWithBookings.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarDays className="mb-3 h-10 w-10 text-[#999]" />
          <p className="text-sm text-[#666]">No bookings this month</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {daysWithBookings.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayBookings = (bookingsByDate[key] || []).filter((b) =>
            isSameDay(parseISO(b.startDate), day)
          );
          return (
            <div key={key} className="rounded-lg border border-[#e5e2dc] bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3
                  className={`text-sm font-semibold ${
                    isToday(day) ? "text-[#C05A3C]" : "text-[#1a1a1a]"
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {format(day, "EEEE, MMMM d")}
                  {isToday(day) && (
                    <span className="ml-2 rounded bg-[#C05A3C] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
                      Today
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => handleDayClick(day)}
                  className="text-xs text-[#C05A3C] hover:underline"
                  aria-label={`Add booking on ${format(day, "MMMM d")}`}
                >
                  + Add
                </button>
              </div>
              <div className="space-y-1.5">
                {dayBookings.map((booking) => {
                  const style = getStatusStyle(booking.status);
                  const start = parseISO(booking.startDate);
                  const end = booking.endDate ? parseISO(booking.endDate) : start;
                  const isMultiDay = !isSameDay(start, end);
                  return (
                    <button
                      key={booking.id}
                      onClick={() => handleBookingClick(booking.id)}
                      className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:opacity-80 ${style.bg} ${style.border}`}
                      aria-label={`${serviceLabel(booking.serviceType)}: ${bookingTitle(booking)}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${style.text}`}>
                          {serviceLabel(booking.serviceType)}
                          {isMultiDay && (
                            <span className="ml-2 text-[10px] font-normal opacity-70">
                              {format(start, "MMM d")} – {format(end, "MMM d")}
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-[#666]">
                          {bookingTitle(booking)}
                          {booking.location ? ` - ${booking.location}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isMultiDay && (
                          <span className="rounded bg-[#1a1a1a]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#666]">
                            Multi-day
                          </span>
                        )}
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.bg} ${style.text}`}
                        >
                          {booking.status.replace("_", " ")}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render: Grid view
  // ------------------------------------------------------------------

  function GridView() {
    return (
      <div>
        {/* Day name headers */}
        <div className="grid grid-cols-7 border-b border-[#e5e2dc]">
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-[#666]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const key = format(day, "yyyy-MM-dd");
            const dayBookings = bookingsByDate[key] || [];
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);

            return (
              <div
                key={idx}
                onClick={() => handleDayClick(day)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleDayClick(day);
                  }
                }}
                aria-label={`${format(day, "MMMM d, yyyy")}${
                  dayBookings.length > 0
                    ? `, ${dayBookings.length} booking${dayBookings.length > 1 ? "s" : ""}`
                    : ", no bookings. Click to create one."
                }`}
                className={`min-h-[100px] cursor-pointer border-b border-r border-[#e5e2dc] p-1.5 transition-colors hover:bg-[#f0ede7] ${
                  !inMonth ? "bg-[#faf9f6] opacity-50" : "bg-white"
                } ${today ? "ring-2 ring-inset ring-[#C05A3C]/30" : ""}`}
              >
                {/* Day number */}
                <div className="mb-1 flex items-center justify-end">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      today
                        ? "bg-[#C05A3C] text-white"
                        : inMonth
                          ? "text-[#1a1a1a]"
                          : "text-[#bbb]"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Booking pills */}
                <div className="space-y-0.5">
                  {dayBookings.slice(0, 3).map((booking) => (
                    <BookingPill key={booking.id} booking={booking} position={getBookingPosition(booking, day)} />
                  ))}
                  {dayBookings.length > 3 && (
                    <p className="px-1 text-[10px] font-medium text-[#999]">
                      +{dayBookings.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Status legend
  // ------------------------------------------------------------------

  function StatusLegend() {
    const statuses = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    return (
      <div className="flex flex-wrap gap-3">
        {statuses.map((status) => {
          const style = getStatusStyle(status);
          return (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-sm border ${style.bg} ${style.border}`}
              />
              <span className="text-[11px] text-[#666]">
                {status.replace("_", " ")}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Main render
  // ------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-[#1a1a1a]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Calendar
          </h1>
          <p className="mt-1 text-sm text-[#666]">
            View and manage bookings across dates
          </p>
        </div>

        {/* View toggle (desktop only) */}
        {!isMobile && (
          <div className="flex items-center gap-1 rounded-lg border border-[#e5e2dc] bg-white p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "grid"
                  ? "bg-[#1a1a1a] text-white"
                  : "text-[#666] hover:text-[#1a1a1a]"
              }`}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-[#1a1a1a] text-white"
                  : "text-[#666] hover:text-[#1a1a1a]"
              }`}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>
        )}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between rounded-lg border border-[#e5e2dc] bg-white px-4 py-3">
        <button
          onClick={goToPrevMonth}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-[#666] transition-colors hover:bg-[#f0ede7] hover:text-[#1a1a1a]"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="flex items-center gap-3">
          <h2
            className="text-lg font-semibold text-[#1a1a1a]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <button
            onClick={goToToday}
            className="rounded-md border border-[#e5e2dc] px-2.5 py-1 text-xs font-medium text-[#666] transition-colors hover:border-[#C05A3C] hover:text-[#C05A3C]"
            aria-label="Go to today"
          >
            Today
          </button>
        </div>

        <button
          onClick={goToNextMonth}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-[#666] transition-colors hover:bg-[#f0ede7] hover:text-[#1a1a1a]"
          aria-label="Next month"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Status legend */}
      <StatusLegend />

      {/* Calendar content */}
      <div className="overflow-hidden rounded-lg border border-[#e5e2dc] bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-[#C05A3C]" />
            <span className="ml-2 text-sm text-[#666]">Loading bookings...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <AlertCircle className="mb-2 h-8 w-8 text-red-500" />
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              onClick={fetchBookings}
              className="mt-3 rounded-md bg-[#C05A3C] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#a84d33]"
            >
              Try again
            </button>
          </div>
        ) : effectiveView === "list" ? (
          <div className="p-4">
            <ListView />
          </div>
        ) : (
          <GridView />
        )}
      </div>

      {/* Quick-booking modal */}
      <QuickBookingModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultDate={modalDate}
        onSuccess={fetchBookings}
      />
    </div>
  );
}
