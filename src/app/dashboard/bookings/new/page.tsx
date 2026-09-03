'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { BookingForm, BookingFormValues } from '@/components/bookings/booking-form';

function NewBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedDate = searchParams.get('date');
  const preselectedTripId = searchParams.get('tripId');
  const [error, setError] = useState<string | null>(null);

  const initialValues: Record<string, string> = {};
  if (preselectedDate) {
    initialValues.startDate = new Date(`${preselectedDate}T09:00:00`).toISOString();
  }
  if (preselectedTripId) {
    initialValues.tripId = preselectedTripId;
  }

  const handleSubmit = async (values: BookingFormValues) => {
    setError(null);
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactId: values.contactId || null,
        serviceType: values.serviceType,
        status: values.status,
        startDate: values.startDate,
        endDate: values.endDate || null,
        timezone: values.timezone || null,
        location: values.location || null,
        amount: values.amount ? parseFloat(values.amount) : null,
        depositPaid: values.depositPaid ? parseFloat(values.depositPaid) : null,
        paymentStatus: values.paymentStatus,
        internalNotes: values.internalNotes || null,
        clientNotes: values.clientNotes || null,
        tripId: values.tripId || null,
        isPublic: values.isPublic ?? false,
        publicTitle: values.publicTitle || null,
        publicDescription: values.publicDescription || null,
        organization: values.organization || null,
        ticketUrl: values.ticketUrl || null,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || data.message || 'Failed to create booking');
    }

    const result = await response.json();
    router.push(`/dashboard/bookings/${result.id}`);
    router.refresh();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Booking</h1>
          <p className="text-muted-foreground">
            A title and a date are all you need. Everything else can wait.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-6">
              {error}
            </div>
          )}
          <BookingForm
            initialValues={Object.keys(initialValues).length > 0 ? initialValues : undefined}
            onSubmit={async (values) => {
              try {
                await handleSubmit(values);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to create booking');
                throw err;
              }
            }}
            submitLabel="Save Booking"
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <NewBookingForm />
    </Suspense>
  );
}
