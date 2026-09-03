"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MapPin,
  Calendar,
  Briefcase,
  List,
  LayoutGrid,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react"

// ---------- Types ----------

interface BookingLead {
  firstName: string
  lastName: string
  organization: string | null
  email: string
}

interface SerializedBooking {
  id: string
  serviceType: string
  status: string
  startDate: string | null
  endDate: string | null
  location: string | null
  amount: number | null
  paymentStatus: string
  engagementStatus: string | null
  prepNotes: string | null
  deliverables: string | null
  followUpNotes: string | null
  // Null for quick date entries created without a contact attached.
  contact: BookingLead | null
}

interface EngagementsClientProps {
  bookings: SerializedBooking[]
}

// ---------- Constants ----------

type EngagementStage = "PREP" | "READY" | "DELIVERED" | "FOLLOW_UP"

const STAGES: EngagementStage[] = ["PREP", "READY", "DELIVERED", "FOLLOW_UP"]

const STAGE_LABELS: Record<EngagementStage, string> = {
  PREP: "Prep",
  READY: "Ready",
  DELIVERED: "Delivered",
  FOLLOW_UP: "Follow-up",
}

const STAGE_COLORS: Record<EngagementStage, string> = {
  PREP: "bg-blue-100 text-blue-800",
  READY: "bg-green-100 text-green-800",
  DELIVERED: "bg-sky-100 text-sky-800",
  FOLLOW_UP: "bg-amber-100 text-amber-800",
}

const STAGE_HEADER_BG: Record<EngagementStage, string> = {
  PREP: "bg-blue-50 border-blue-200",
  READY: "bg-green-50 border-green-200",
  DELIVERED: "bg-sky-50 border-sky-200",
  FOLLOW_UP: "bg-amber-50 border-amber-200",
}

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  UNPAID: "bg-red-50 text-red-700 border-red-200",
  DEPOSIT_PAID: "bg-yellow-50 text-yellow-700 border-yellow-200",
  PAID_IN_FULL: "bg-green-50 text-green-700 border-green-200",
  REFUNDED: "bg-gray-50 text-gray-600 border-gray-200",
  OVERDUE: "bg-red-100 text-red-800 border-red-300",
}

const SERVICE_TYPES = [
  "WORKSHOP",
  "SPEAKING",
  "FESTIVAL",
  "GROUP_COACHING",
  "INDIVIDUAL_COACHING",
  "MASTERCLASS",
  "CONSULTATION",
  "ARRANGEMENT",
]

// ---------- Helpers ----------

function formatServiceType(type: string): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--"
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatPaymentStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function getStage(booking: SerializedBooking): EngagementStage {
  if (
    booking.engagementStatus &&
    STAGES.includes(booking.engagementStatus as EngagementStage)
  ) {
    return booking.engagementStatus as EngagementStage
  }
  return "PREP"
}

// ---------- Sub-components ----------

function EngagementCard({ booking }: { booking: SerializedBooking }) {
  return (
    <Card className="border-[#E8E4DD] bg-white shadow-none hover:bg-[#FAFAF8] transition-colors duration-150">
      <CardContent className="p-4 space-y-3">
        {/* Service type */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-sm font-semibold text-[#1a1a1a]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {formatServiceType(booking.serviceType)}
          </span>
          <Badge
            className={`text-[10px] px-1.5 py-0 ${
              PAYMENT_STATUS_STYLES[booking.paymentStatus] ?? "bg-gray-50 text-gray-600 border-gray-200"
            }`}
          >
            {formatPaymentStatus(booking.paymentStatus)}
          </Badge>
        </div>

        {/* Client */}
        <div>
          <p className="text-sm font-medium text-[#1a1a1a]">
            {booking.contact?.firstName ?? 'Unknown'} {booking.contact?.lastName ?? ''}
          </p>
          {booking.contact?.organization && (
            <p className="text-xs text-[#666666]">{booking.contact?.organization}</p>
          )}
        </div>

        {/* Location */}
        {booking.location && (
          <div className="flex items-center gap-1.5 text-xs text-[#666666]">
            <MapPin className="h-3 w-3 text-[#999999] shrink-0" />
            <span className="truncate">{booking.location}</span>
          </div>
        )}

        {/* Date */}
        {booking.startDate && (
          <div className="flex items-center gap-1.5 text-xs text-[#666666]">
            <Calendar className="h-3 w-3 text-[#999999] shrink-0" />
            <span>{formatDate(booking.startDate)}</span>
          </div>
        )}

        {/* View link */}
        <div className="pt-1">
          <Link href={`/dashboard/bookings/${booking.id}`}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-[#C05A3C] hover:text-[#C05A3C] hover:bg-[#C05A3C]/10"
            >
              View
              <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Main Component ----------

export function EngagementsClient({ bookings }: EngagementsClientProps) {
  const [view, setView] = useState<"board" | "list">("board")
  const [serviceFilter, setServiceFilter] = useState("ALL")
  const [stageFilter, setStageFilter] = useState("ALL")
  const [sortAsc, setSortAsc] = useState(true)

  // Apply filters
  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (serviceFilter !== "ALL" && b.serviceType !== serviceFilter) return false
      if (stageFilter !== "ALL" && getStage(b) !== stageFilter) return false
      return true
    })
  }, [bookings, serviceFilter, stageFilter])

  // Group by stage for board view
  const grouped = useMemo(() => {
    const groups: Record<EngagementStage, SerializedBooking[]> = {
      PREP: [],
      READY: [],
      DELIVERED: [],
      FOLLOW_UP: [],
    }
    for (const b of filtered) {
      groups[getStage(b)].push(b)
    }
    return groups
  }, [filtered])

  // Sorted list for list view
  const sortedList = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0
      return sortAsc ? dateA - dateB : dateB - dateA
    })
  }, [filtered, sortAsc])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-[#1a1a1a] tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Engagements
        </h1>
        <p className="text-sm text-[#666666] mt-1">
          {bookings.length} active engagement{bookings.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Toolbar: filters + view toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Service type filter */}
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-[180px] h-9 border-[#E8E4DD] text-sm">
              <Briefcase className="h-3.5 w-3.5 mr-1.5 text-[#999999]" />
              <SelectValue placeholder="Service type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Services</SelectItem>
              {SERVICE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {formatServiceType(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stage filter */}
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[160px] h-9 border-[#E8E4DD] text-sm">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Stages</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-white border border-[#E8E4DD] rounded-lg p-0.5">
          <button
            onClick={() => setView("board")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === "board"
                ? "bg-[#C05A3C]/10 text-[#C05A3C]"
                : "text-[#666666] hover:text-[#1a1a1a]"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Board
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === "list"
                ? "bg-[#C05A3C]/10 text-[#C05A3C]"
                : "text-[#666666] hover:text-[#1a1a1a]"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
        </div>
      </div>

      {/* Board View */}
      {view === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STAGES.map((stage) => (
            <div key={stage} className="flex flex-col gap-3">
              {/* Column header */}
              <div
                className={`flex items-center justify-between px-3 py-2 rounded-lg border ${STAGE_HEADER_BG[stage]}`}
              >
                <span
                  className="text-sm font-semibold text-[#1a1a1a]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {STAGE_LABELS[stage]}
                </span>
                <span
                  className={`inline-flex items-center justify-center h-5 min-w-[20px] rounded-full px-1.5 text-xs font-medium ${STAGE_COLORS[stage]}`}
                >
                  {grouped[stage].length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 min-h-[120px]">
                {grouped[stage].length === 0 ? (
                  <div className="flex items-center justify-center h-[120px] border border-dashed border-[#E8E4DD] rounded-lg">
                    <p className="text-xs text-[#999999]">No engagements</p>
                  </div>
                ) : (
                  grouped[stage].map((booking) => (
                    <EngagementCard key={booking.id} booking={booking} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="border border-[#E8E4DD] rounded-lg overflow-hidden bg-white">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_140px_140px_120px_100px_80px] gap-2 px-4 py-3 border-b border-[#E8E4DD] bg-[#FAFAF8]">
            <span className="text-xs font-medium text-[#999999] uppercase tracking-wide">
              Service
            </span>
            <span className="text-xs font-medium text-[#999999] uppercase tracking-wide">
              Client
            </span>
            <span className="text-xs font-medium text-[#999999] uppercase tracking-wide">
              Location
            </span>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="flex items-center gap-1 text-xs font-medium text-[#999999] uppercase tracking-wide hover:text-[#666666] transition-colors"
            >
              Date
              <ArrowUpDown className="h-3 w-3" />
            </button>
            <span className="text-xs font-medium text-[#999999] uppercase tracking-wide">
              Stage
            </span>
            <span className="text-xs font-medium text-[#999999] uppercase tracking-wide">
              Payment
            </span>
            <span className="text-xs font-medium text-[#999999] uppercase tracking-wide" />
          </div>

          {/* Table rows */}
          {sortedList.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-[#999999]">No engagements match the current filters.</p>
            </div>
          ) : (
            sortedList.map((booking) => {
              const stage = getStage(booking)
              return (
                <div
                  key={booking.id}
                  className="grid grid-cols-[1fr_1fr_140px_140px_120px_100px_80px] gap-2 px-4 py-3 border-b border-[#E8E4DD] last:border-b-0 hover:bg-[#FAFAF8] transition-colors items-center"
                >
                  {/* Service */}
                  <div>
                    <p
                      className="text-sm font-medium text-[#1a1a1a]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {formatServiceType(booking.serviceType)}
                    </p>
                  </div>

                  {/* Client */}
                  <div>
                    <p className="text-sm text-[#1a1a1a]">
                      {booking.contact?.firstName ?? 'Unknown'} {booking.contact?.lastName ?? ''}
                    </p>
                    {booking.contact?.organization && (
                      <p className="text-xs text-[#666666] truncate">
                        {booking.contact?.organization}
                      </p>
                    )}
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-1 text-xs text-[#666666] truncate">
                    {booking.location ? (
                      <>
                        <MapPin className="h-3 w-3 text-[#999999] shrink-0" />
                        <span className="truncate">{booking.location}</span>
                      </>
                    ) : (
                      <span className="text-[#999999]">--</span>
                    )}
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1 text-xs text-[#666666]">
                    <Calendar className="h-3 w-3 text-[#999999] shrink-0" />
                    <span>{formatDate(booking.startDate)}</span>
                  </div>

                  {/* Stage badge */}
                  <div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${STAGE_COLORS[stage]}`}
                    >
                      {STAGE_LABELS[stage]}
                    </span>
                  </div>

                  {/* Payment */}
                  <div>
                    <Badge
                      className={`text-[10px] px-1.5 py-0 ${
                        PAYMENT_STATUS_STYLES[booking.paymentStatus] ??
                        "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {formatPaymentStatus(booking.paymentStatus)}
                    </Badge>
                  </div>

                  {/* View */}
                  <div>
                    <Link href={`/dashboard/bookings/${booking.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-[#C05A3C] hover:text-[#C05A3C] hover:bg-[#C05A3C]/10"
                      >
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
