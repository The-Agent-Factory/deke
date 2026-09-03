'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BookingForm, BookingFormValues } from '@/components/bookings/booking-form';

interface QuickBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-filled date string from calendar click (YYYY-MM-DD) */
  defaultDate?: string;
  /** Called after a booking is successfully created */
  onSuccess?: () => void;
}

export function QuickBookingModal({
  open,
  onOpenChange,
  defaultDate,
  onSuccess,
}: QuickBookingModalProps) {
  const [success, setSuccess] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSuccess(false);
    }
    onOpenChange(isOpen);
  };

  const initialValues = defaultDate
    ? { startDate: new Date(`${defaultDate}T09:00:00`).toISOString() }
    : undefined;

  const handleSubmit = async (values: BookingFormValues) => {
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

    setSuccess(true);
    onSuccess?.();

    setTimeout(() => {
      handleOpenChange(false);
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Booking</DialogTitle>
          <DialogDescription>
            Create a booking. Pick an existing contact or create a new one.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="text-sm font-medium">Booking created!</p>
          </div>
        ) : (
          <BookingForm
            initialValues={initialValues}
            onSubmit={handleSubmit}
            submitLabel="Save Booking"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
