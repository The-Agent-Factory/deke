"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignForm, CampaignFormValues } from "@/components/campaigns/campaign-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { geocodeAddress } from "@/lib/services/geocoding";

function NewCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  const [isLoading, setIsLoading] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(!!bookingId);

  // Fetch booking data if bookingId is provided
  useEffect(() => {
    if (bookingId) {
      const fetchBooking = async () => {
        try {
          const response = await fetch(`/api/bookings?limit=100`);
          if (response.ok) {
            const data = await response.json();
            const booking = data.bookings.find((b: any) => b.id === bookingId);
            if (booking) {
              setBookingData(booking);
            }
          }
        } catch (error) {
          console.error('Error fetching booking:', error);
        } finally {
          setIsLoadingBooking(false);
        }
      };
      fetchBooking();
    }
  }, [bookingId]);

  const handleSubmit = async (values: CampaignFormValues, isDraft: boolean) => {
    setIsLoading(true);

    try {
      // Geocode the location to get latitude and longitude
      const geocodeResult = await geocodeAddress(values.location);

      if (!geocodeResult) {
        alert("Unable to geocode the location. Please enter a valid address (e.g., 'San Francisco, CA' or '94102')");
        setIsLoading(false);
        return;
      }

      // Convert date strings to ISO datetime format
      const startDateTime = new Date(values.startDate).toISOString();
      const endDateTime = new Date(values.endDate).toISOString();

      // Prepare the payload with correct field names for API
      const payload = {
        name: values.name,
        baseLocation: values.location, // API expects baseLocation, not location
        latitude: geocodeResult.latitude,
        longitude: geocodeResult.longitude,
        radius: values.radiusMiles, // API expects radius, not radiusMiles
        startDate: startDateTime,
        endDate: endDateTime,
        includeOffSeason: values.includeOffSeason ?? false,
        ...(bookingId && { bookingId }), // Include bookingId if present
        ...(values.targetOrgTypes && values.targetOrgTypes.length > 0 && {
          targetOrgTypes: JSON.stringify(values.targetOrgTypes),
        }),
      };

      console.log("Creating campaign:", payload);

      // Create the campaign
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Campaign creation failed:", errorData);
        throw new Error(errorData.message || "Failed to create campaign");
      }

      const campaign = await response.json();

      // If not a draft, trigger lead discovery and approve
      if (!isDraft) {
        console.log("Triggering lead discovery for campaign:", campaign.id);

        // Trigger discovery
        const discoveryResponse = await fetch(
          `/api/campaigns/${campaign.id}/discover`,
          {
            method: "POST",
          }
        );

        if (!discoveryResponse.ok) {
          const errorData = await discoveryResponse.json().catch(() => ({}));
          console.error("Lead discovery failed:", errorData);
          alert(`Campaign created but discovery failed: ${errorData.message || 'Unknown error'}. You can re-run discovery from the campaign page.`);
        } else {
          const discoveryResult = await discoveryResponse.json();

          // Show warnings/diagnostics if zero leads found
          if (discoveryResult.discovered?.total === 0) {
            const warnings = discoveryResult.warnings || [];
            const errors = discoveryResult.errors || [];
            const diagnostics = discoveryResult.diagnostics || [];

            let msg = `Campaign created but no leads were found.\n\n`;

            if (errors.length > 0) {
              msg += `Errors:\n${errors.map((e: string) => `  - ${e}`).join('\n')}\n\n`;
            }

            if (warnings.length > 0) {
              msg += `Warnings:\n${warnings.map((w: string) => `  - ${w}`).join('\n')}\n\n`;
            }

            // Show per-source breakdown
            msg += `Source breakdown:\n`;
            for (const d of diagnostics) {
              const status = d.error ? `ERROR: ${d.error}` : `${d.count} leads (${d.durationMs}ms)`;
              msg += `  - ${d.source}: ${status}\n`;
            }

            msg += `\nYou can re-run discovery from the campaign page.`;
            alert(msg);
          } else {
            // After discovery, approve the campaign
            const approveResponse = await fetch(
              `/api/campaigns/${campaign.id}/approve`,
              {
                method: "POST",
              }
            );

            if (!approveResponse.ok) {
              console.error("Campaign approval failed, but campaign and leads were created");
            }
          }
        }
      }

      // Redirect to campaign detail page
      router.push(`/dashboard/campaigns/${campaign.id}`);
    } catch (error) {
      console.error("Error creating campaign:", error);
      alert(`Failed to create campaign: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="font-heading text-3xl font-bold">Create Campaign</h1>
          <p className="text-muted-foreground mt-2">
            {bookingData
              ? `Create a campaign for ${bookingData.contact?.firstName ?? 'Unknown'} ${bookingData.contact?.lastName ?? ''}'s booking`
              : 'Set up a new outreach campaign to discover potential clients'}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <p className="text-sm text-muted-foreground">
            {bookingData
              ? 'Review and adjust the pre-filled information from the booking'
              : 'Fill in the information below to create your campaign'}
          </p>
        </CardHeader>
        <CardContent>
          {isLoadingBooking ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading booking details...</p>
            </div>
          ) : (
            <CampaignForm
              onSubmit={handleSubmit}
              isLoading={isLoading}
              initialBooking={bookingData}
            />
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="max-w-3xl bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">About Lead Discovery</h3>
          <p className="text-sm text-muted-foreground">
            When you click "Create & Discover Leads," the system will:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
            <li>Search for vocal groups within your specified radius</li>
            <li>Gather contact information and performance data</li>
            <li>Rank leads based on engagement potential</li>
            <li>Generate personalized outreach templates</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-3">
            You can always save as draft and trigger discovery later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <NewCampaignContent />
    </Suspense>
  );
}
