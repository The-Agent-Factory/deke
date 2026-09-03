'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import { Plus, Search, MapPin, Calendar, CalendarRange, DollarSign } from 'lucide-react';
import type { ComponentBooking } from '@/lib/mappers/booking';
import { bookingTitle } from '@/lib/booking-display';

interface BookingsClientProps {
  initialBookings: ComponentBooking[];
}

const SERVICE_TYPES = [
  'ARRANGEMENT',
  'FESTIVAL',
  'GROUP_COACHING',
  'INDIVIDUAL_COACHING',
  'WORKSHOP',
  'SPEAKING',
  'MASTERCLASS',
  'CONSULTATION',
];

const STATUSES = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'RESCHEDULED',
];

const SERVICE_TYPE_STYLES: Record<string, string> = {
  WORKSHOP: 'bg-blue-100 text-blue-800 border-blue-200',
  SPEAKING: 'bg-purple-100 text-purple-800 border-purple-200',
  COACHING: 'bg-green-100 text-green-800 border-green-200',
  GROUP_COACHING: 'bg-green-100 text-green-800 border-green-200',
  INDIVIDUAL_COACHING: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ARRANGEMENT: 'bg-amber-100 text-amber-800 border-amber-200',
  MASTERCLASS: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  CONSULTATION: 'bg-slate-100 text-slate-700 border-slate-200',
};

function formatServiceType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BookingsClient({ initialBookings }: BookingsClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('ALL');

  const filteredBookings = initialBookings.filter((booking) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      booking.publicTitle?.toLowerCase().includes(searchLower) ||
      booking.contactName.toLowerCase().includes(searchLower) ||
      booking.contactEmail.toLowerCase().includes(searchLower) ||
      booking.organization?.toLowerCase().includes(searchLower) ||
      booking.contactOrganization?.toLowerCase().includes(searchLower) ||
      booking.location?.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'ALL' || booking.status === statusFilter;
    const matchesServiceType = serviceTypeFilter === 'ALL' || booking.serviceType === serviceTypeFilter;

    return matchesSearch && matchesStatus && matchesServiceType;
  });

  const handleCardClick = (bookingId: string) => {
    router.push(`/dashboard/bookings/${bookingId}`);
  };

  const canCreateCampaign = (booking: ComponentBooking): boolean => {
    return (
      booking.campaignCount === 0 &&
      (booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS')
    );
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <span className="text-sm text-muted-foreground">
            {filteredBookings.length} {filteredBookings.length === 1 ? 'booking' : 'bookings'}
          </span>
        </div>
        <Button
          onClick={() => router.push('/dashboard/bookings/new')}
          style={{ backgroundColor: '#C05A3C' }}
          className="text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Booking
        </Button>
      </div>

      {/* Inline filter bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white rounded-xl border border-slate-200 p-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, org, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 border-0 shadow-none focus-visible:ring-0 h-9"
          />
        </div>
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-9 border-slate-200">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
            <SelectTrigger className="w-[160px] h-9 border-slate-200">
              <SelectValue placeholder="All Services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Services</SelectItem>
              {SERVICE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {formatServiceType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Booking cards */}
      {filteredBookings.length > 0 ? (
        <div className="space-y-3">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              role="button"
              tabIndex={0}
              aria-label={`${bookingTitle(booking)} - ${formatServiceType(booking.serviceType)}`}
              onClick={() => handleCardClick(booking.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(booking.id);
                }
              }}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Left section: service type, lead info, location */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={
                        SERVICE_TYPE_STYLES[booking.serviceType] ||
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }
                    >
                      {formatServiceType(booking.serviceType)}
                    </Badge>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                  <p className="font-semibold text-slate-900 truncate">
                    {bookingTitle(booking)}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {/* Contact only appears here when it is not already the
                        headline, so a titled booking still shows who it is with. */}
                    {booking.publicTitle && booking.contactName && (
                      <span className="truncate">{booking.contactName}</span>
                    )}
                    {booking.organization && (
                      <span className="truncate">{booking.organization}</span>
                    )}
                    {booking.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {booking.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Center section: date range, amount */}
                <div className="flex items-center gap-6 text-sm shrink-0">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarRange className="h-4 w-4 shrink-0" />
                    <span>
                      {formatDate(booking.startDate)}
                      {booking.endDate && booking.endDate !== booking.startDate && (
                        <> &ndash; {formatDate(booking.endDate)}</>
                      )}
                    </span>
                  </div>
                  {booking.amount !== null && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <DollarSign className="h-4 w-4 shrink-0" />
                      <span className="font-medium text-slate-700">
                        {formatCurrency(booking.amount)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right section: campaign indicator + action */}
                <div className="flex items-center justify-end shrink-0">
                  {booking.campaignCount > 0 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (booking.campaignId) {
                          router.push(`/dashboard/campaigns/${booking.campaignId}`);
                        }
                      }}
                      className="text-green-700 border-green-300 hover:bg-green-50 gap-2"
                    >
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                      </span>
                      View Campaign
                    </Button>
                  ) : canCreateCampaign(booking) ? (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/bookings/${booking.id}`);
                      }}
                      style={{ backgroundColor: '#C05A3C' }}
                      className="text-white hover:opacity-90"
                    >
                      Find Nearby Leads
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">No campaign</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-slate-100 p-4 mb-4">
            <Calendar className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No bookings found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {searchQuery || statusFilter !== 'ALL' || serviceTypeFilter !== 'ALL'
              ? 'Try adjusting your filters to find what you are looking for.'
              : 'Get started by creating your first booking.'}
          </p>
          {!searchQuery && statusFilter === 'ALL' && serviceTypeFilter === 'ALL' && (
            <Button
              onClick={() => router.push('/dashboard/bookings/new')}
              className="mt-4 text-white hover:opacity-90"
              style={{ backgroundColor: '#C05A3C' }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Booking
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
