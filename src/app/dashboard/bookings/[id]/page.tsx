'use client';

import { use, useEffect, useState } from 'react';
import { bookingTitle, contactName } from '@/lib/booking-display';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookingStatusBadge } from '@/components/bookings/booking-status-badge';
import { ArrowLeft, Edit, Trash2, Loader2, Rocket, Target, Mail, Users, Globe, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Booking {
  id: string;
  status: string;
  serviceType: string;
  startDate: string | null;
  endDate: string | null;
  timezone: string | null;
  location: string | null;
  amount: number | null;
  depositPaid: number | null;
  balanceDue: number | null;
  paymentStatus: string;
  internalNotes: string | null;
  clientNotes: string | null;
  isPublic: boolean;
  publicTitle: string | null;
  publicDescription: string | null;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    organization: string | null;
  };
  inquiry?: {
    id: string;
    serviceType: string;
    status: string;
  } | null;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    _count?: {
      leads: number;
      outreachLogs: number;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLaunchingCampaign, setIsLaunchingCampaign] = useState(false);

  const fetchBooking = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/bookings/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch booking');
      }

      const data = await response.json();
      setBooking(data);
    } catch (error) {
      console.error('Error fetching booking:', error);
      alert('Failed to load booking');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = async () => {
    if (!booking) return;

    try {
      setIsDeleting(true);
      setShowDeleteConfirm(false);
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete booking');
      }

      router.push('/dashboard/bookings');
    } catch (err) {
      console.error('Error deleting booking:', err);
      alert(
        err instanceof Error
          ? err.message
          : 'Failed to delete booking.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLaunchCampaign = async () => {
    if (!booking || !booking.location) return;

    try {
      setIsLaunchingCampaign(true);

      const response = await fetch(`/api/bookings/${booking.id}/campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create campaign');
      }

      const data = await response.json();
      // Navigate directly to the new campaign page
      router.push(`/dashboard/campaigns/${data.campaign.id}`);
    } catch (err) {
      console.error('Error creating campaign:', err);
      alert(
        err instanceof Error ? err.message : 'Failed to create campaign'
      );
    } finally {
      setIsLaunchingCampaign(false);
    }
  };

  // Toggle public visibility with optional auto-generated title
  const handlePublicToggle = async (checked: boolean) => {
    if (!booking) return;
    const autoTitle = checked && !booking.isPublic
      ? `${booking.serviceType.replace('_', ' ')}${booking.location ? ` in ${booking.location}` : ''}`
      : undefined;
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPublic: checked,
          ...(autoTitle ? { publicTitle: autoTitle } : {}),
        }),
      });
      if (response.ok) {
        await fetchBooking();
      }
    } catch (err) {
      console.error('Failed to update visibility:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Booking not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {bookingTitle(booking)} - {booking.serviceType.replace('_', ' ')}
            </h1>
            <p className="text-muted-foreground">Booking Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BookingStatusBadge status={booking.status as 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED'} />
          <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/bookings/${booking.id}/edit`)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            title="Delete booking"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Lead Discovery Banner — shown when booking has location */}
      {booking.location && booking.campaigns.length === 0 && (
        <Card className="border-2 border-[#C05A3C]/30 bg-[#C05A3C]/5">
          <CardContent className="py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C05A3C]/10">
                  <Target className="h-5 w-5 text-[#C05A3C]" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Find groups near {booking.location}</p>
                  <p className="text-xs text-muted-foreground">
                    Scan for a cappella groups, choirs, and music orgs nearby — then send personalized outreach
                  </p>
                </div>
              </div>
              <Button
                onClick={handleLaunchCampaign}
                disabled={isLaunchingCampaign}
                className="bg-[#C05A3C] hover:bg-[#a84d33] shrink-0"
                size="lg"
              >
                {isLaunchingCampaign ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Discover Groups
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign results banner — shown when campaign exists */}
      {booking.campaigns.length > 0 && (
        <Card className="border-2 border-emerald-200 bg-emerald-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-emerald-900">
                    {booking.campaigns[0]._count?.leads ?? 0} groups discovered near {booking.location}
                  </p>
                  <p className="text-xs text-emerald-700">
                    {booking.campaigns[0]._count?.outreachLogs ?? 0} outreach emails sent
                  </p>
                </div>
              </div>
              <Link href={`/dashboard/campaigns/${booking.campaigns[0].id}`}>
                <Button className="bg-emerald-600 hover:bg-emerald-500 shrink-0" size="lg">
                  <Target className="mr-2 h-4 w-4" />
                  View Leads & Send Outreach
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Service Type</p>
                  <p className="text-base">{booking.serviceType.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <BookingStatusBadge status={booking.status as 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED'} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                  <p className="text-base">
                    {booking.startDate ? format(new Date(booking.startDate), 'PPP') : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">End Date</p>
                  <p className="text-base">
                    {booking.endDate ? format(new Date(booking.endDate), 'PPP') : 'Not set'}
                  </p>
                </div>
                {booking.location && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Location</p>
                    <p className="text-base">{booking.location}</p>
                  </div>
                )}
                {booking.timezone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Timezone</p>
                    <p className="text-base">{booking.timezone}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Financial Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">
                    {booking.amount ? `$${booking.amount.toLocaleString()}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                  <p className="text-base">{booking.paymentStatus.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Deposit Paid</p>
                  <p className="text-base">
                    {booking.depositPaid ? `$${booking.depositPaid.toLocaleString()}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Balance Due</p>
                  <p className="text-base font-semibold">
                    {booking.balanceDue ? `$${booking.balanceDue.toLocaleString()}` : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          {(booking.internalNotes || booking.clientNotes) && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {booking.internalNotes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Internal Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{booking.internalNotes}</p>
                  </div>
                )}
                {booking.clientNotes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Client Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{booking.clientNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Lead Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-base">
                  {contactName(booking.contact) || (
                    <span className="text-muted-foreground">No contact attached</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-base">{booking.contact?.email ?? ''}</p>
              </div>
              {booking.contact?.phone && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-base">{booking.contact?.phone}</p>
                </div>
              )}
              {booking.contact?.organization && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Organization</p>
                  <p className="text-base">{booking.contact?.organization}</p>
                </div>
              )}
              {booking.contact && (
              <div className="pt-2">
                <Link href={`/dashboard/leads/${booking.contact.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View Contact Profile
                  </Button>
                </Link>
              </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Inquiry */}
          {booking.inquiry && (
            <Card>
              <CardHeader>
                <CardTitle>Linked Inquiry</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Service:</span> {booking.inquiry.serviceType.replace('_', ' ')}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Status:</span> {booking.inquiry.status}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Public Event Visibility */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Public Visibility
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Show on Events Page</p>
                  <p className="text-xs text-muted-foreground">
                    Display on dekesharon.com/events
                  </p>
                </div>
                <Switch
                  checked={booking.isPublic}
                  onCheckedChange={handlePublicToggle}
                />
              </div>
              {booking.isPublic && (
                <div className="space-y-3 pt-2 border-t">
                  <div>
                    <Label htmlFor="publicTitle" className="text-xs">Event Title</Label>
                    <Input
                      id="publicTitle"
                      placeholder="A Cappella Workshop at UCLA"
                      defaultValue={booking.publicTitle || ''}
                      onBlur={async (e) => {
                        await fetch(`/api/bookings/${booking.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ publicTitle: e.target.value }),
                        });
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="publicDescription" className="text-xs">Description</Label>
                    <Textarea
                      id="publicDescription"
                      placeholder="Short description for the events page..."
                      defaultValue={booking.publicDescription || ''}
                      onBlur={async (e) => {
                        await fetch(`/api/bookings/${booking.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ publicDescription: e.target.value }),
                        });
                      }}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Campaign Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Lead Discovery
              </CardTitle>
            </CardHeader>
            <CardContent>
              {booking.campaigns.length > 0 ? (
                <div className="space-y-3">
                  {booking.campaigns.map((campaign) => (
                    <Link key={campaign.id} href={`/dashboard/campaigns/${campaign.id}`}>
                      <div className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant={campaign.status === 'ACTIVE' ? 'default' : campaign.status === 'DRAFT' ? 'secondary' : 'outline'}>
                            {campaign.status}
                          </Badge>
                        </div>
                        {campaign._count && (
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {campaign._count.leads} groups found
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {campaign._count.outreachLogs} emails sent
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-[#C05A3C] font-medium">View leads & send outreach →</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center space-y-2 py-2">
                  {booking.location ? (
                    <p className="text-sm text-muted-foreground">
                      Use the banner above to discover groups near {booking.location}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Add a location to this booking to discover nearby groups
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {format(new Date(booking.createdAt), 'PPP p')}
              </div>
              <div>
                <span className="font-medium">Updated:</span>{' '}
                {format(new Date(booking.updatedAt), 'PPP p')}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Booking?</DialogTitle>
            <DialogDescription>
              This will permanently delete this booking.
              {booking.campaigns.length > 0 && (
                <span className="block mt-2 font-medium text-amber-600">
                  Warning: This will also delete {booking.campaigns.length} linked campaign(s) and all their discovered leads.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Booking'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
