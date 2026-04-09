"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Target,
  Users,
  Mail,
  TrendingUp,
  Play,
  Pause,
  Trash2,
  Edit,
  Loader2,
  AlertTriangle,
  CheckCircle,
  RotateCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessagesTab } from "@/components/campaigns/messages-tab";
import { LeadsTableSelectable } from "@/components/campaigns/leads-table-selectable";
import { BulkActionsToolbar } from "@/components/campaigns/bulk-actions-toolbar";
import { SourceStats } from "@/components/campaigns/source-stats";
import { DraftsTab } from "@/components/campaigns/drafts-tab";

interface Campaign {
  id: string;
  name: string;
  baseLocation: string;
  latitude: number;
  longitude: number;
  radius: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  booking?: {
    id: string;
    serviceType: string;
    startDate: string | null;
    location: string;
  };
  leads: Array<{
    id: string;
    score: number;
    distance: number | null;
    source: string;
    status: string;
    lead: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      organization: string | null;
      contactTitle: string | null;
      status: string;
      score: number;
      emailVerified?: boolean;
      needsEnrichment?: boolean;
      website: string | null;
    };
    outreachLogs: Array<{
      id: string;
      channel: string;
      status: string;
      sentAt: string | null;
      openedAt: string | null;
      clickedAt: string | null;
      respondedAt: string | null;
      errorMessage: string | null;
    }>;
  }>;
  _count: {
    leads: number;
    outreachLogs: number;
  };
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params); // Unwrap the Promise
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Campaign['leads']>([]);

  const fetchCampaign = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/campaigns/${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch campaign");
      }

      const data = await response.json();
      setCampaign(data);
    } catch (err) {
      console.error("Error fetching campaign:", err);
      setError("Failed to load campaign");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!campaign) return;

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update campaign status");
      }

      await fetchCampaign();
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update campaign status");
    }
  };

  const handleLaunch = async () => {
    if (!campaign) return;

    try {
      setShowLaunchConfirm(false);

      const response = await fetch(`/api/campaigns/${campaign.id}/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "EMAIL" // Default to email; could make this configurable
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to launch campaign");
      }

      const result = await response.json();

      // Show success message with details
      const sent = result.outreach?.sent ?? result.sent ?? 0;
      const failed = result.outreach?.failed ?? result.failed ?? 0;
      alert(`Campaign launched! Sent: ${sent}, Failed: ${failed}`);

      // Refresh campaign data to show new status and outreach logs
      await fetchCampaign();
    } catch (err) {
      console.error("Error launching campaign:", err);
      alert(err instanceof Error ? err.message : "Failed to launch campaign");
    }
  };

  const [isReEnriching, setIsReEnriching] = useState(false);
  const [reEnrichResult, setReEnrichResult] = useState<{ enriched: number; total: number } | null>(null);

  const handleReEnrichAll = async () => {
    if (!campaign) return;
    const needsEnrich = campaign.leads.filter(
      l => l.lead.needsEnrichment || l.lead.email?.includes('@placeholder.local')
    );
    if (needsEnrich.length === 0) return;

    setIsReEnriching(true);
    setReEnrichResult(null);
    let enriched = 0;

    for (const cl of needsEnrich) {
      try {
        const res = await fetch(`/api/leads/${cl.lead.id}/enrich`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.enriched) enriched++;
        }
      } catch {
        // continue with next lead
      }
    }

    setReEnrichResult({ enriched, total: needsEnrich.length });
    setIsReEnriching(false);
    await fetchCampaign();
  };

  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<any>(null);
  const [discoveryElapsed, setDiscoveryElapsed] = useState(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollDiscoveryStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/campaigns/${id}/discover`);
      if (!response.ok) return;

      const data = await response.json();

      if (data.status === "running") {
        setDiscoveryElapsed(data.elapsedMs || 0);
      } else if (data.status === "completed") {
        stopPolling();
        setIsDiscovering(false);
        setDiscoveryResult(data);
        await fetchCampaign();
      } else if (data.status === "failed") {
        stopPolling();
        setIsDiscovering(false);
        setDiscoveryResult({ error: data.error || "Discovery failed" });
      }
    } catch {
      // Network error during poll — keep trying
    }
  }, [id, stopPolling]);

  // Start polling for discovery status
  const startPolling = useCallback(() => {
    stopPolling();
    setIsDiscovering(true);
    setDiscoveryElapsed(0);
    pollIntervalRef.current = setInterval(pollDiscoveryStatus, 3000);
  }, [stopPolling, pollDiscoveryStatus]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Auto-resume polling if discovery is running, or auto-start if fresh campaign with 0 leads
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (!campaign) return;

    const checkAndAutoStart = async () => {
      try {
        // Check if discovery is already running
        const response = await fetch(`/api/campaigns/${id}/discover`);
        if (!response.ok) return;
        const data = await response.json();

        if (data.status === "running") {
          startPolling();
          return;
        }

        // Auto-start discovery for fresh campaigns (0 leads, DRAFT status, never started)
        if (
          !hasAutoStarted.current &&
          campaign.leads.length === 0 &&
          (campaign.status === "DRAFT" || campaign.status === "ACTIVE") &&
          data.status !== "completed" &&
          data.status !== "failed"
        ) {
          hasAutoStarted.current = true;
          // Kick off discovery automatically
          const startRes = await fetch(`/api/campaigns/${campaign.id}/discover`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          if (startRes.ok || startRes.status === 409) {
            startPolling();
          }
        }
      } catch {
        // Ignore
      }
    };
    checkAndAutoStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign?.id]);

  const handleDiscoverLeads = async () => {
    if (!campaign) return;

    try {
      setDiscoveryResult(null);
      const response = await fetch(`/api/campaigns/${campaign.id}/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (response.status === 409) {
        // Already running — just start polling
        startPolling();
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to start discovery");
      }

      // Started successfully — begin polling
      startPolling();
    } catch (err) {
      console.error("Error starting discovery:", err);
      setDiscoveryResult({ error: err instanceof Error ? err.message : "Failed to start discovery" });
    }
  };

  const handleSendOutreach = () => {
    if (campaign?.status === "READY" || campaign?.status === "APPROVED") {
      setShowLaunchConfirm(true);
    } else if (campaign?.status === "ACTIVE" || campaign?.status === "SENDING") {
      alert("Campaign already launched.");
    } else {
      alert("Run discovery first to prepare emails.");
    }
  };

  const handleViewAnalytics = () => {
    // Navigate to analytics page (when implemented)
    // For now, show a placeholder message
    alert("Analytics dashboard coming soon! Will show open rates, click rates, and conversion metrics.");
  };

  const handleDelete = async () => {
    if (!campaign) return;

    try {
      setIsDeleting(true);
      setShowDeleteConfirm(false);
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete campaign");
      }

      router.push("/dashboard/campaigns");
    } catch (err) {
      console.error("Error deleting campaign:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to delete campaign. Make sure it's not active."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      DRAFT: "secondary",
      READY: "default",
      APPROVED: "outline",
      ACTIVE: "default",
      SENDING: "default",
      PAUSED: "secondary",
      COMPLETED: "outline",
      CANCELLED: "destructive",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-heading text-3xl font-bold">Campaign Not Found</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              {error || "The campaign you're looking for doesn't exist."}
            </p>
            <div className="mt-4">
              <Link href="/dashboard/campaigns">
                <Button>Back to Campaigns</Button>
              </Link>
            </div>
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
          <Link href="/dashboard/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-3xl font-bold">{campaign.name}</h1>
              {getStatusBadge(campaign.status)}
            </div>
            <p className="text-muted-foreground mt-2">
              {campaign.startDate && campaign.endDate && (
                <span>
                  {new Date(campaign.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' - '}
                  {new Date(campaign.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' . '}
                </span>
              )}
              {campaign.radius}mi radius . {campaign._count.leads} contacts found
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4">
          {/* Status action buttons with help text */}
          {campaign.status === "DRAFT" && (
            <div className="flex flex-col gap-2">
              <Button onClick={handleDiscoverLeads} disabled={isDiscovering}>
                {isDiscovering ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Discovering... {discoveryElapsed > 0 ? `${Math.round(discoveryElapsed / 1000)}s` : ''}</>
                ) : (
                  <><Target className="h-4 w-4 mr-2" />Discover & Draft</>
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                {isDiscovering
                  ? "Running in background — safe to navigate away"
                  : "Find leads, enrich contacts, and generate email drafts"}
              </p>
            </div>
          )}
          {(campaign.status === "READY" || campaign.status === "APPROVED") && (
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => setShowLaunchConfirm(true)}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Send All Emails
              </Button>
              <p className="text-sm text-muted-foreground">
                Review drafts first, then send to {campaign._count?.leads || 0} leads
              </p>
            </div>
          )}

          {/* Action buttons row */}
          <div className="flex items-center gap-2">
            {campaign.status === "ACTIVE" && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange("PAUSED")}
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
            {campaign.status === "PAUSED" && (
              <Button onClick={() => handleStatusChange("ACTIVE")}>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push(`/dashboard/campaigns/${campaign.id}/edit`)}
              disabled={campaign.status !== "DRAFT" && campaign.status !== "APPROVED"}
              title={campaign.status !== "DRAFT" && campaign.status !== "APPROVED" ? "Can only edit DRAFT or APPROVED campaigns" : "Edit campaign"}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting || campaign.status === "ACTIVE"}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs - default to drafts where the action is */}
      <Tabs defaultValue={campaign.leads.length > 0 ? "drafts" : "overview"} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leads">Leads ({campaign.leads.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="messages">Messages ({campaign._count.outreachLogs})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign._count.leads}</div>
            <p className="text-xs text-muted-foreground">
              Discovered in campaign area
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacted</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaign.leads.filter((l) => l.status === "CONTACTED").length}
            </div>
            <p className="text-xs text-muted-foreground">
              {campaign._count.outreachLogs} total outreach attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engaged</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                campaign.leads.filter(
                  (l) => l.status === "RESPONDED" || l.status === "INTERESTED"
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Responded or expressed interest
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaign.leads.length > 0
                ? Math.round(
                    campaign.leads.reduce((sum, l) => sum + l.score, 0) /
                      campaign.leads.length
                  )
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">Lead quality score</p>
          </CardContent>
        </Card>
      </div>

      {/* Source Stats */}
      {campaign.leads.length > 0 && (
        <SourceStats leads={campaign.leads} />
      )}

      {/* Discovery Diagnostics (shown when discovery ran but found 0 leads or had warnings) */}
      {discoveryResult && (
        <Card className={discoveryResult.error || discoveryResult.status === 'no_results' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : 'border-green-500 bg-green-50 dark:bg-green-950/20'}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {discoveryResult.error || discoveryResult.status === 'no_results' ? (
                <><AlertTriangle className="h-4 w-4 text-amber-500" /> Discovery Results — {discoveryResult.error ? 'Error' : 'No Leads Found'}</>
              ) : (
                <>Discovery Complete — {discoveryResult.discovered?.total} leads found</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {discoveryResult.error && (
              <p className="text-red-600 font-medium">{discoveryResult.error}</p>
            )}

            {/* Per-source breakdown */}
            {discoveryResult.diagnostics && discoveryResult.diagnostics.length > 0 && (
              <div>
                <p className="font-medium mb-1">Source Breakdown:</p>
                <div className="space-y-1">
                  {discoveryResult.diagnostics.map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs font-mono bg-white dark:bg-gray-900 rounded px-2 py-1">
                      <span>{d.source}</span>
                      <span className={d.error ? 'text-red-500' : 'text-muted-foreground'}>
                        {d.error ? `ERROR: ${d.error.substring(0, 80)}` : `${d.count} leads (${d.durationMs}ms)`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Research details */}
            {discoveryResult.diagnostics?.find((d: any) => d.source === 'AI Research')?.details && (() => {
              const aiDetails = discoveryResult.diagnostics.find((d: any) => d.source === 'AI Research').details;
              return (
                <div>
                  <p className="font-medium mb-1">AI Research Pipeline:</p>
                  <div className="text-xs font-mono bg-white dark:bg-gray-900 rounded px-2 py-1 space-y-0.5">
                    <p>API calls: {aiDetails.apiCallsMade} made, {aiDetails.apiCallsFailed} failed</p>
                    <p>Places: {aiDetails.rawPlaces} raw → {aiDetails.uniquePlaces} unique → {aiDetails.musicRelevant} music-relevant</p>
                    <p>Enriched: {aiDetails.enriched} → {aiDetails.leadsCreated} leads created</p>
                  </div>
                </div>
              );
            })()}

            {/* Warnings */}
            {discoveryResult.warnings && discoveryResult.warnings.length > 0 && (
              <div>
                <p className="font-medium mb-1">Warnings:</p>
                <ul className="list-disc list-inside text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
                  {discoveryResult.warnings.map((w: string, i: number) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Errors */}
            {discoveryResult.errors && discoveryResult.errors.length > 0 && (
              <div>
                <p className="font-medium mb-1 text-red-600">Errors:</p>
                <ul className="list-disc list-inside text-xs text-red-600 space-y-0.5">
                  {discoveryResult.errors.map((e: string, i: number) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDiscoveryResult(null)}
              className="mt-2"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Campaign Info */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Location & Radius</p>
                <p className="text-sm text-muted-foreground">
                  {campaign.baseLocation}
                </p>
                <p className="text-sm text-muted-foreground">
                  {campaign.radius} miles radius
                </p>
              </div>
            </div>

            {(campaign.startDate || campaign.endDate) && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Campaign Period</p>
                  <p className="text-sm text-muted-foreground">
                    {campaign.startDate
                      ? new Date(campaign.startDate).toLocaleDateString()
                      : "Not set"}{" "}
                    -{" "}
                    {campaign.endDate
                      ? new Date(campaign.endDate).toLocaleDateString()
                      : "Not set"}
                  </p>
                </div>
              </div>
            )}

            {campaign.booking && (
              <div className="pt-2 border-t">
                <p className="font-medium text-sm mb-2">Linked Booking</p>
                <Link href={`/dashboard/bookings/${campaign.booking.id}`}>
                  <Button variant="outline" size="sm">
                    View Booking Details
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                // Navigate to the Drafts tab
                const tabsTrigger = document.querySelector('[data-state][value="drafts"]') as HTMLElement;
                tabsTrigger?.click();
              }}
              disabled={!campaign || campaign.leads.length === 0}
            >
              <Mail className="h-4 w-4 mr-2" />
              Generate Email Drafts
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={handleDiscoverLeads}
              disabled={!campaign || isDiscovering}
            >
              {isDiscovering ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Discovering... {discoveryElapsed > 0 ? `${Math.round(discoveryElapsed / 1000)}s` : ''}</>
              ) : (
                <><Target className="h-4 w-4 mr-2" />Discover More Leads</>
              )}
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={handleViewAnalytics}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="leads">
          <div className="space-y-4">
            {/* Contacts Summary */}
            {campaign.leads.length > 0 && (() => {
              const active = campaign.leads.filter(l => l.status !== 'REMOVED')
              const removed = campaign.leads.filter(l => l.status === 'REMOVED')
              const withEmail = active.filter(l => l.lead.emailVerified || (!l.lead.needsEnrichment && !l.lead.email?.includes?.('@placeholder')))
              const bySource: Record<string, number> = {}
              for (const l of active) {
                bySource[l.source] = (bySource[l.source] || 0) + 1
              }
              const sourceLabels: Record<string, string> = {
                PAST_CLIENT: 'Past Clients',
                DORMANT: 'Dormant',
                SIMILAR_ORG: 'Similar Orgs',
                AI_RESEARCH: 'AI Research',
                MANUAL_IMPORT: 'Manual',
              }
              return (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                  <span className="font-medium flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {active.length} contacts
                  </span>
                  <span className="text-muted-foreground">|</span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {withEmail.length} emailable
                  </span>
                  {Object.entries(bySource).map(([source, count]) => (
                    <Badge key={source} variant="outline" className="text-xs">
                      {sourceLabels[source] || source}: {count}
                    </Badge>
                  ))}
                  {removed.length > 0 && (
                    <span className="text-muted-foreground text-xs">
                      ({removed.length} removed)
                    </span>
                  )}
                </div>
              )
            })()}
            <BulkActionsToolbar
              selectedCount={selectedLeads.length}
              selectedLeadIds={selectedLeads.map(l => l.id)}
              campaignId={campaign.id}
              onActionComplete={() => {
                setSelectedLeads([])
                fetchCampaign()
              }}
            />
            {campaign.leads.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No leads discovered yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {discoveryResult?.status === 'no_results'
                      ? 'Discovery ran but found no leads — check the Overview tab for diagnostics'
                      : 'Run discovery to find leads in the target area'}
                  </p>
                  <Button
                    onClick={handleDiscoverLeads}
                    disabled={isDiscovering}
                    className="mt-4"
                    variant="outline"
                  >
                    {isDiscovering ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Discovering... {discoveryElapsed > 0 ? `${Math.round(discoveryElapsed / 1000)}s` : ''}</>
                    ) : (
                      <><Target className="h-4 w-4 mr-2" />{discoveryResult ? 'Re-run Discovery' : 'Run Discovery'}</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Re-enrich banner for leads missing emails */}
                {(() => {
                  const needsEnrich = campaign.leads.filter(
                    l => l.lead.needsEnrichment || l.lead.email?.includes('@placeholder.local')
                  );
                  if (needsEnrich.length === 0) return null;
                  return (
                    <Card className="border-amber-200 bg-amber-50">
                      <CardContent className="py-3 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <span className="text-sm text-amber-800">
                            <strong>{needsEnrich.length}</strong> lead{needsEnrich.length !== 1 ? 's' : ''} missing email
                            {reEnrichResult && (
                              <span className="ml-2 text-emerald-700">
                                — found {reEnrichResult.enriched} of {reEnrichResult.total}
                              </span>
                            )}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-300 text-amber-800 hover:bg-amber-100"
                          onClick={handleReEnrichAll}
                          disabled={isReEnriching}
                        >
                          <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${isReEnriching ? 'animate-spin' : ''}`} />
                          {isReEnriching ? 'Searching...' : 'Re-enrich All'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })()}
                <Card>
                  <CardContent className="p-0">
                    <LeadsTableSelectable
                      leads={campaign.leads}
                      campaignId={campaign.id}
                      onSelectionChange={setSelectedLeads}
                      onLeadStatusChange={fetchCampaign}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="drafts">
          <DraftsTab
            campaignId={campaign.id}
            campaignLeadIds={campaign.leads.map(l => l.id)}
            onDraftsChange={fetchCampaign}
          />
        </TabsContent>

        <TabsContent value="messages">
          <MessagesTab
            campaignId={campaign.id}
            outreachLogs={campaign.leads.flatMap(cl =>
              cl.outreachLogs.map(ol => ({
                ...ol,
                leadName: `${cl.lead.firstName} ${cl.lead.lastName}`,
                leadEmail: cl.lead.email
              }))
            )}
            onRefresh={fetchCampaign}
          />
        </TabsContent>

        {/* Analytics tab removed - placeholder wasn't useful */}
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Campaign?</DialogTitle>
            <DialogDescription>
              This will permanently delete the campaign, all discovered leads, and outreach logs. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-start gap-2 text-amber-600">
              <AlertTriangle className="h-6 w-6 mt-1" />
              <div>
                <p className="font-medium">Permanent deletion</p>
                <p className="text-sm">
                  Campaign "{campaign?.name}" with {campaign?._count?.leads || 0} leads will be removed.
                </p>
              </div>
            </div>
          </div>
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
                "Delete Campaign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Launch Confirmation Dialog */}
      <Dialog open={showLaunchConfirm} onOpenChange={setShowLaunchConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Launch Campaign Outreach?</DialogTitle>
            <DialogDescription>
              This will start sending messages to leads. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="flex items-start gap-2">
              <span className="text-2xl">✓</span>
              <div>
                <p className="font-medium">Approve campaign for launch</p>
                <p className="text-sm text-muted-foreground">Campaign has been reviewed and is ready</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-2xl">🚀</span>
              <div>
                <p className="font-medium">Send outreach to {campaign?._count?.leads || 0} pending leads</p>
                <p className="text-sm text-muted-foreground">Messages will be sent via configured channels</p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-amber-600">
              <AlertTriangle className="h-6 w-6 mt-1" />
              <div>
                <p className="font-medium">This action cannot be undone</p>
                <p className="text-sm">Once launched, the campaign will actively send messages</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLaunchConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLaunch}
            >
              Confirm Launch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
