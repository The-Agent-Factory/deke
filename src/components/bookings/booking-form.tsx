'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { parseISO, addDays, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CalendarRange, CalendarDays as CalendarDaysIcon } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Check, ChevronDown, ChevronsUpDown, Loader2, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

const SERVICE_TYPES = [
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
] as const;

const STATUSES = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'RESCHEDULED'
] as const;

const PAYMENT_STATUSES = [
  'UNPAID',
  'DEPOSIT_PAID',
  'PAID_IN_FULL',
  'REFUNDED',
  'OVERDUE'
] as const;

const makeBookingFormSchema = (requireCore: boolean) => z.object({
  // Only title + start date are required. Everything else is optional so a date
  // can be logged in seconds and filled in properly later. `requireCore` is
  // relaxed when editing so older bookings saved without a title or date can
  // still be updated.
  publicTitle: requireCore
    ? z.string().min(1, 'Title is required')
    : z.string().optional(),
  startDate: requireCore
    ? z.string().min(1, 'Start date is required')
    : z.string().optional(),
  contactId: z.string().optional(),
  serviceType: z.enum(SERVICE_TYPES),
  status: z.enum(STATUSES).optional(),
  endDate: z.string().optional(),
  timezone: z.string().optional(),
  location: z.string().optional(),
  amount: z.string().optional(),
  depositPaid: z.string().optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  internalNotes: z.string().optional(),
  clientNotes: z.string().optional(),
  tripId: z.string().optional(),
  isPublic: z.boolean().optional(),
  publicDescription: z.string().optional(),
  organization: z.string().optional(),
  ticketUrl: z.string().optional(),
});

export type BookingFormValues = z.infer<ReturnType<typeof makeBookingFormSchema>>;

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  organization: string | null;
}

interface Trip {
  id: string;
  name: string;
  location: string;
  startDate: string;
}

interface BookingFormProps {
  initialValues?: Partial<BookingFormValues>;
  onSubmit: (values: BookingFormValues) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
  /**
   * Require a title and start date. True for new bookings (fast entry needs
   * those two); false when editing so legacy records without them still save.
   */
  requireCoreFields?: boolean;
}

export function BookingForm({
  initialValues,
  onSubmit,
  isLoading = false,
  submitLabel = 'Create Booking',
  requireCoreFields = true,
}: BookingFormProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [creatingContact, setCreatingContact] = useState(false);
  const [newContact, setNewContact] = useState({ firstName: '', lastName: '', email: '', organization: '' });
  const [contactOpen, setContactOpen] = useState(false);

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts?limit=500');
      if (res.ok) {
        const data = await res.json();
        setContacts(Array.isArray(data) ? data : data.contacts || []);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [contactsRes, tripsRes] = await Promise.all([
          fetch('/api/contacts?limit=500'),
          fetch('/api/trips'),
        ]);

        if (contactsRes.ok) {
          const contactsData = await contactsRes.json();
          setContacts(Array.isArray(contactsData) ? contactsData : contactsData.contacts || []);
        }

        if (tripsRes.ok) {
          const tripsData = await tripsRes.json();
          setTrips(tripsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingContacts(false);
      }
    }

    fetchData();
  }, []);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(makeBookingFormSchema(requireCoreFields)),
    defaultValues: {
      contactId: initialValues?.contactId || '',
      serviceType: initialValues?.serviceType || 'WORKSHOP',
      status: initialValues?.status || 'PENDING',
      startDate: initialValues?.startDate || '',
      endDate: initialValues?.endDate || '',
      timezone: initialValues?.timezone || '',
      location: initialValues?.location || '',
      amount: initialValues?.amount || '',
      depositPaid: initialValues?.depositPaid || '',
      paymentStatus: initialValues?.paymentStatus || 'UNPAID',
      internalNotes: initialValues?.internalNotes || '',
      clientNotes: initialValues?.clientNotes || '',
      tripId: initialValues?.tripId || '',
      isPublic: initialValues?.isPublic ?? true,
      publicTitle: initialValues?.publicTitle || '',
      publicDescription: initialValues?.publicDescription || '',
      organization: initialValues?.organization || '',
      ticketUrl: initialValues?.ticketUrl || '',
    },
  });

  const isPublic = form.watch('isPublic');
  const startDateValue = form.watch('startDate');

  // Detect single-day from initial values
  const [isSingleDay, setIsSingleDay] = useState(() => {
    if (initialValues?.startDate && initialValues?.endDate) {
      try {
        return isSameDay(parseISO(initialValues.startDate), parseISO(initialValues.endDate));
      } catch {
        return true;
      }
    }
    // Most dates Deke enters are one-day gigs. Defaulting to single-day means a
    // single date click is enough - no second date to fill in.
    return true;
  });

  // Everything past title + date is optional and stays folded away until asked for.
  const [showDetails, setShowDetails] = useState(false);

  // Auto-fill end date based on single-day toggle
  useEffect(() => {
    if (startDateValue) {
      try {
        const start = parseISO(startDateValue);
        if (isSingleDay) {
          form.setValue('endDate', startDateValue);
        } else {
          const currentEnd = form.getValues('endDate');
          if (!currentEnd || parseISO(currentEnd) <= start) {
            form.setValue('endDate', addDays(start, 1).toISOString());
          }
        }
      } catch {
        // ignore parse errors
      }
    }
  }, [startDateValue, isSingleDay, form]);

  // When toggling single-day mode, sync end date immediately
  const handleSingleDayToggle = (checked: boolean) => {
    setIsSingleDay(checked);
    const currentStart = form.getValues('startDate');
    if (currentStart) {
      try {
        const start = parseISO(currentStart);
        if (checked) {
          form.setValue('endDate', currentStart);
        } else {
          form.setValue('endDate', addDays(start, 1).toISOString());
        }
      } catch {
        // ignore parse errors
      }
    }
  };

  const parsedStartDate = startDateValue ? (() => { try { return parseISO(startDateValue); } catch { return undefined; } })() : undefined;

  const handleCreateContact = async () => {
    if (!newContact.firstName) return;

    setCreatingContact(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create contact');
      }

      const created = await res.json();
      await fetchContacts();
      form.setValue('contactId', created.id);
      setShowCreateContact(false);
      setNewContact({ firstName: '', lastName: '', email: '', organization: '' });
    } catch (error) {
      console.error('Error creating contact:', error);
      alert(error instanceof Error ? error.message : 'Failed to create contact');
    } finally {
      setCreatingContact(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ---------- FAST ENTRY: the only two required fields ---------- */}

        <FormField
          control={form.control}
          name="publicTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Holiday Concert at Dominion-Chalmers"
                  autoFocus
                  {...field}
                />
              </FormControl>
              <FormDescription>
                What this date is. Shown on the public events page.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dates */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel className="text-sm font-medium">Event Dates</FormLabel>
            <div className="flex items-center gap-2">
              {isSingleDay ? (
                <CalendarDaysIcon className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">
                {isSingleDay ? 'Single day' : 'Multi-day'}
              </span>
              <Switch
                checked={isSingleDay}
                onCheckedChange={handleSingleDayToggle}
                aria-label="Toggle single day event"
              />
            </div>
          </div>

          <div className={`grid gap-4 ${isSingleDay ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isSingleDay ? 'Date' : 'Start Date'}</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value ? parseISO(field.value) : null}
                      onChange={(date) => field.onChange(date ? date.toISOString() : '')}
                      enableTime
                      placeholder={isSingleDay ? 'Select date' : 'Select start date'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isSingleDay && (
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value ? parseISO(field.value) : null}
                        onChange={(date) => field.onChange(date ? date.toISOString() : '')}
                        enableTime
                        placeholder="Select end date"
                        defaultMonth={parsedStartDate}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        {/* ---------- Everything below is optional ---------- */}
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
            onClick={() => setShowDetails((prev) => !prev)}
            aria-expanded={showDetails}
          >
            <span className="text-muted-foreground">
              {showDetails ? 'Hide extra details' : 'Add details (contact, location, fee, notes)'}
            </span>
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 transition-transform', showDetails && 'rotate-180')}
            />
          </Button>
        </div>

        {showDetails && (
          <div className="space-y-6 border-l-2 border-muted pl-4">

          {/* Contact Selection */}
          <FormField
            control={form.control}
            name="contactId"
            render={({ field }) => {
              const selectedContact = contacts.find((c) => c.id === field.value);
              return (
                <FormItem className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <FormLabel>Contact (optional)</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowCreateContact(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      New Contact
                    </Button>
                  </div>
                  {loadingContacts ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading contacts...
                    </div>
                  ) : contacts.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No contacts found.{' '}
                      <button type="button" className="underline" onClick={() => setShowCreateContact(true)}>
                        Create a new contact
                      </button>{' '}
                      to get started.
                    </div>
                  ) : (
                    <Popover open={contactOpen} onOpenChange={setContactOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={contactOpen}
                            className={cn(
                              'w-full justify-between font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <span className="truncate">
                              {selectedContact
                                ? `${selectedContact.firstName} ${selectedContact.lastName}`
                                : 'Search for a contact...'}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command filter={(value, search) => {
                          const contact = contacts.find((c) => c.id === value);
                          if (!contact) return 0;
                          const haystack = `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.organization || ''}`.toLowerCase();
                          return haystack.includes(search.toLowerCase()) ? 1 : 0;
                        }}>
                          <CommandInput placeholder="Type a name or email..." />
                          <CommandList>
                            <CommandEmpty>No contact found.</CommandEmpty>
                            <CommandGroup>
                              {contacts.map((contact) => (
                                <CommandItem
                                  key={contact.id}
                                  value={contact.id}
                                  onSelect={() => {
                                    field.onChange(contact.id);
                                    setContactOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      field.value === contact.id ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{contact.firstName} {contact.lastName}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {contact.email}{contact.organization ? ` · ${contact.organization}` : ''}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                  <FormDescription>
                    Attach a person later if you just need the date on the calendar
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {/* Trip Selection (Optional) */}
          <FormField
            control={form.control}
            name="tripId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trip (Optional)</FormLabel>
                <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a trip (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No trip</SelectItem>
                    {trips.map((trip) => (
                      <SelectItem key={trip.id} value={trip.id}>
                        {trip.name} - {trip.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Associate this booking with a trip for tracking
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Service Type */}
          <FormField
            control={form.control}
            name="serviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SERVICE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Location & Timezone */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter location" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., America/New_York" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Financial */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Amount ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="depositPaid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deposit Paid ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Payment Status */}
          <FormField
            control={form.control}
            name="paymentStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PAYMENT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="internalNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Internal Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Notes for internal use (not visible to client)"
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Notes visible to client"
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Public Event Settings */}
          <div className="rounded-lg border p-4 space-y-4">
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel>Show on Public Events Page</FormLabel>
                    <FormDescription>
                      Display this booking on the public /events page
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isPublic && (
              <>
                <FormField
                  control={form.control}
                  name="organization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization / Venue</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Salem High School" {...field} />
                      </FormControl>
                      <FormDescription>
                        Hosting organization shown on the events page
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="publicDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description for the public events page"
                          className="resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>

          </div>
        )}

        {/* Submit */}
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </form>

      {/* Quick Create Contact Dialog */}
      <Dialog open={showCreateContact} onOpenChange={setShowCreateContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Contact</DialogTitle>
            <DialogDescription>
              Add a new contact to associate with this booking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newContactFirstName">First Name *</Label>
                <Input
                  id="newContactFirstName"
                  value={newContact.firstName}
                  onChange={(e) => setNewContact(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newContactLastName">Last Name</Label>
                <Input
                  id="newContactLastName"
                  value={newContact.lastName}
                  onChange={(e) => setNewContact(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newContactEmail">Email</Label>
              <Input
                id="newContactEmail"
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newContactOrg">Organization</Label>
              <Input
                id="newContactOrg"
                value={newContact.organization}
                onChange={(e) => setNewContact(prev => ({ ...prev, organization: e.target.value }))}
                placeholder="Organization name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateContact(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateContact}
              disabled={creatingContact || !newContact.firstName}
            >
              {creatingContact ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Contact'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
