'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookingForm } from '@/components/bookings/booking-form';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function EditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await fetch(`/api/bookings/${id}`);
        if (!response.ok) throw new Error('Failed to fetch booking');
        const data = await response.json();
        setBooking(data);
      } catch (error) {
        console.error('Error fetching booking:', error);
        alert('Failed to load booking');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [id]);

  const handleSubmit = async (values: any) => {
    try {
      setIsSaving(true);

      const payload = {
        status: values.status,
        serviceType: values.serviceType,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
        timezone: values.timezone || null,
        location: values.location || null,
        amount: values.amount ? parseFloat(values.amount) : null,
        depositPaid: values.depositPaid ? parseFloat(values.depositPaid) : null,
        paymentStatus: values.paymentStatus,
        internalNotes: values.internalNotes || null,
        clientNotes: values.clientNotes || null,
        isPublic: values.isPublic ?? false,
        publicTitle: values.publicTitle || null,
        publicDescription: values.publicDescription || null,
        organization: values.organization || null,
        ticketUrl: values.ticketUrl || null,
      };

      const response = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to update booking');
      }

      router.push(`/dashboard/bookings/${id}`);
    } catch (error) {
      console.error('Error updating booking:', error);
      alert(error instanceof Error ? error.message : 'Failed to update booking');
    } finally {
      setIsSaving(false);
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Booking</h1>
          <p className="text-muted-foreground">
            {booking.contact?.firstName ?? 'Unknown'} {booking.contact?.lastName ?? ''} - {booking.serviceType.replace('_', ' ')}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Update Booking Details</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingForm
            initialValues={{
              contactId: booking.contact?.id ?? '',
              serviceType: booking.serviceType,
              status: booking.status,
              startDate: booking.startDate ? booking.startDate.slice(0, 16) : '',
              endDate: booking.endDate ? booking.endDate.slice(0, 16) : '',
              timezone: booking.timezone || '',
              location: booking.location || '',
              amount: booking.amount?.toString() || '',
              depositPaid: booking.depositPaid?.toString() || '',
              paymentStatus: booking.paymentStatus,
              internalNotes: booking.internalNotes || '',
              clientNotes: booking.clientNotes || '',
              isPublic: booking.isPublic ?? false,
              publicTitle: booking.publicTitle || '',
              publicDescription: booking.publicDescription || '',
              organization: booking.organization || '',
              ticketUrl: booking.ticketUrl || '',
            }}
            requireCoreFields={false}
            onSubmit={handleSubmit}
            isLoading={isSaving}
            submitLabel="Save Changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
