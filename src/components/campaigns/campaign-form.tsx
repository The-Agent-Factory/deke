"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const campaignFormSchema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters"),
  location: z.string().min(3, "Location is required"),
  radiusMiles: z.number().min(50).max(200),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  serviceType: z.enum([
    "COACHING",
    "WORKSHOPS",
    "MASTERCLASS",
    "ARRANGEMENTS",
    "SPEAKING",
  ]),
  targetOrgTypes: z.array(z.string()).optional(),
  includeOffSeason: z.boolean().optional(),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

const TARGET_ORG_OPTIONS = [
  { value: "CHOIR", label: "Choir / Chorus" },
  { value: "BARBERSHOP", label: "Barbershop" },
  { value: "A_CAPPELLA_GROUP", label: "A Cappella Group" },
  { value: "GOSPEL_CHOIR", label: "Gospel Choir" },
  { value: "COMMUNITY_CHORUS", label: "Community Chorus" },
  { value: "YOUTH_CHOIR", label: "Youth Choir" },
  { value: "MUSIC_SCHOOL", label: "Music School" },
  { value: "CONSERVATORY", label: "Conservatory" },
  { value: "UNIVERSITY", label: "University" },
  { value: "HIGH_SCHOOL", label: "High School" },
  { value: "CHURCH", label: "Church" },
];

export type CampaignFormValues = z.infer<typeof campaignFormSchema>;

interface CampaignFormProps {
  onSubmit: (values: CampaignFormValues, isDraft: boolean) => void;
  initialValues?: Partial<CampaignFormValues>;
  initialBooking?: any; // Booking data to pre-populate from
  isLoading?: boolean;
}

export function CampaignForm({
  onSubmit,
  initialValues,
  initialBooking,
  isLoading = false,
}: CampaignFormProps) {
  // Transform booking data into form values if provided
  const getInitialValues = (): Partial<CampaignFormValues> => {
    if (initialValues) return initialValues;

    if (initialBooking) {
      const serviceTypeMap: Record<string, CampaignFormValues['serviceType']> = {
        'ARRANGEMENT': 'ARRANGEMENTS',
        'GROUP_COACHING': 'COACHING',
        'INDIVIDUAL_COACHING': 'COACHING',
        'WORKSHOP': 'WORKSHOPS',
        'SPEAKING': 'SPEAKING',
        'MASTERCLASS': 'MASTERCLASS',
      };

      // Auto-generate dates if booking doesn't have them
      const today = new Date();
      const thirtyDaysLater = new Date(today);
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

      let startDate = '';
      let endDate = '';

      if (initialBooking.startDate) {
        // Use booking's start date if it exists
        startDate = new Date(initialBooking.startDate).toISOString().split('T')[0];

        // If booking has end date, use it; otherwise add 30 days to start
        if (initialBooking.endDate) {
          endDate = new Date(initialBooking.endDate).toISOString().split('T')[0];
        } else {
          const autoEndDate = new Date(initialBooking.startDate);
          autoEndDate.setDate(autoEndDate.getDate() + 30);
          endDate = autoEndDate.toISOString().split('T')[0];
        }
      } else {
        // No booking date - use today + 30 days
        startDate = today.toISOString().split('T')[0];
        endDate = thirtyDaysLater.toISOString().split('T')[0];
      }

      return {
        name: `${initialBooking.serviceType} - ${initialBooking.lead.firstName} ${initialBooking.lead.lastName}`,
        location: initialBooking.location || '',
        radiusMiles: 100,
        startDate,
        endDate,
        serviceType: serviceTypeMap[initialBooking.serviceType] || 'COACHING',
      };
    }

    return {};
  };

  const computedInitialValues = getInitialValues();
  const [prospectMode, setProspectMode] = useState(!initialBooking);

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: computedInitialValues?.name || "",
      location: computedInitialValues?.location || "",
      radiusMiles: computedInitialValues?.radiusMiles || 100,
      startDate: computedInitialValues?.startDate || "",
      endDate: computedInitialValues?.endDate || "",
      serviceType: computedInitialValues?.serviceType || "COACHING",
      targetOrgTypes: [],
      includeOffSeason: computedInitialValues?.includeOffSeason ?? false,
    },
  });

  // Watch dates for auto-end-date logic and summary display
  const watchStartDate = form.watch("startDate");
  const watchEndDate = form.watch("endDate");

  const handleStartDateChange = (newStartDate: string) => {
    form.setValue("startDate", newStartDate);

    if (newStartDate) {
      const start = new Date(newStartDate);
      const currentEnd = form.getValues("endDate");

      // Auto-set end date if: empty, or end is before/equal to new start
      if (!currentEnd || new Date(currentEnd) <= start) {
        const autoEnd = new Date(start);
        autoEnd.setDate(autoEnd.getDate() + 30);
        form.setValue("endDate", autoEnd.toISOString().split("T")[0]);
      }
    }
  };

  const handleSubmit = (isDraft: boolean) => {
    return form.handleSubmit((values) => onSubmit(values, isDraft));
  };

  return (
    <Form {...form}>
      <form className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Campaign Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Spring 2025 Vocal Workshop Tour"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Give your campaign a descriptive name
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., San Francisco, CA or 94102"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Enter city, state, or zip code for the campaign center
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="radiusMiles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Search Radius: {field.value} miles</FormLabel>
              <FormControl>
                <Slider
                  min={50}
                  max={200}
                  step={10}
                  value={[field.value]}
                  onValueChange={(value) => field.onChange(value[0])}
                  disabled={isLoading}
                  className="py-4"
                />
              </FormControl>
              <FormDescription>
                Set the radius for discovering potential clients
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Availability Window</p>
            <div className="flex gap-1.5">
              {[
                { label: "Next 2 wks", days: 14 },
                { label: "Next month", days: 30 },
                { label: "Next 2 mo", days: 60 },
                { label: "Next 3 mo", days: 90 },
              ].map((preset) => (
                <Button
                  key={preset.days}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2"
                  disabled={isLoading}
                  onClick={() => {
                    const start = new Date();
                    const end = new Date();
                    end.setDate(end.getDate() + preset.days);
                    form.setValue("startDate", start.toISOString().split("T")[0]);
                    form.setValue("endDate", end.toISOString().split("T")[0]);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      disabled={isLoading}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      disabled={isLoading}
                      min={watchStartDate || new Date().toISOString().split("T")[0]}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {watchStartDate && watchEndDate && (
            <p className="text-xs text-muted-foreground">
              {Math.ceil((new Date(watchEndDate).getTime() - new Date(watchStartDate).getTime()) / (1000 * 60 * 60 * 24))} day window
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="serviceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="COACHING">Coaching</SelectItem>
                  <SelectItem value="WORKSHOPS">Workshops</SelectItem>
                  <SelectItem value="MASTERCLASS">Masterclass</SelectItem>
                  <SelectItem value="ARRANGEMENTS">Arrangements</SelectItem>
                  <SelectItem value="SPEAKING">Speaking</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                What service are you promoting with this campaign?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Prospect Mode - Target Org Types */}
        {!initialBooking && (
          <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Prospect Mode</p>
                <p className="text-xs text-muted-foreground">
                  Discover leads without a linked booking - just enter a city
                </p>
              </div>
              <Badge variant={prospectMode ? "default" : "outline"} className="text-xs">
                {prospectMode ? "On" : "Off"}
              </Badge>
            </div>

            {prospectMode && (
              <FormField
                control={form.control}
                name="targetOrgTypes"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm">Target Organization Types</FormLabel>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => field.onChange(TARGET_ORG_OPTIONS.map(o => o.value))}
                          disabled={isLoading}
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:underline"
                          onClick={() => field.onChange([])}
                          disabled={isLoading}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {TARGET_ORG_OPTIONS.map((opt) => (
                        <div key={opt.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`org-${opt.value}`}
                            checked={field.value?.includes(opt.value) || false}
                            onCheckedChange={(checked) => {
                              const current = field.value || []
                              if (checked) {
                                field.onChange([...current, opt.value])
                              } else {
                                field.onChange(current.filter((v: string) => v !== opt.value))
                              }
                            }}
                            disabled={isLoading}
                          />
                          <label htmlFor={`org-${opt.value}`} className="text-sm cursor-pointer">
                            {opt.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormDescription>
                      Select which types of organizations to search for
                    </FormDescription>
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        {/* Seasonal filter override */}
        <FormField
          control={form.control}
          name="includeOffSeason"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 bg-muted/30">
              <FormControl>
                <Checkbox
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-medium">
                  Include off-season groups
                </FormLabel>
                <FormDescription className="text-xs">
                  By default, collegiate, school, and youth groups are skipped during summer break
                  (and similar off-seasons). Enable this to build pipeline ahead of an upcoming
                  active season.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleSubmit(true)}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Draft"
            )}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit(false)}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create & Discover Leads"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
