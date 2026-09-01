'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ArrowUpDown, UserMinus, UserPlus, CheckCircle, AlertCircle, ExternalLink, Phone, Mail, Globe, Building2, MapPin, Star, RotateCw, Tag } from 'lucide-react'
import { classifyOrganization, getOrgTypeLabel } from '@/lib/discovery/org-classifier'

interface CampaignLead {
  id: string
  score: number
  distance: number | null
  source: string
  status: string
  lead: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
    organization: string | null
    contactTitle: string | null
    website: string | null
    status: string
    score: number
    emailVerified?: boolean
    needsEnrichment?: boolean
    editorialSummary: string | null
  }
  outreachLogs: Array<{
    id: string
    channel: string
    status: string
    sentAt: string | null
    openedAt: string | null
    clickedAt: string | null
    respondedAt: string | null
    errorMessage: string | null
  }>
}

interface LeadsTableSelectableProps {
  leads: CampaignLead[]
  campaignId?: string
  onSelectionChange: (selected: CampaignLead[]) => void
  onLeadStatusChange?: () => void
}

const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  PAST_CLIENT: { label: 'Past Client', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  DORMANT: { label: 'Dormant', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  SIMILAR_ORG: { label: 'Similar Org', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  AI_RESEARCH: { label: 'AI Research', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  MANUAL_IMPORT: { label: 'Manual', className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
}

export function LeadsTableSelectable({ leads, campaignId, onSelectionChange, onLeadStatusChange }: LeadsTableSelectableProps) {
  const [rowSelection, setRowSelection] = useState({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null)
  const [enrichingLeadId, setEnrichingLeadId] = useState<string | null>(null)
  const [previewLead, setPreviewLead] = useState<CampaignLead | null>(null)

  const handleReEnrich = useCallback(async (leadId: string) => {
    setEnrichingLeadId(leadId)
    try {
      const response = await fetch(`/api/leads/${leadId}/enrich`, {
        method: 'POST',
      })
      if (response.ok && onLeadStatusChange) {
        onLeadStatusChange() // Refresh the table
      }
    } catch (err) {
      console.error('Failed to re-enrich lead:', err)
    } finally {
      setEnrichingLeadId(null)
    }
  }, [onLeadStatusChange])

  const handleToggleStatus = useCallback(async (leadId: string, currentStatus: string) => {
    if (!campaignId) return
    const newStatus = currentStatus === 'REMOVED' ? 'PENDING' : 'REMOVED'
    setUpdatingLeadId(leadId)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok && onLeadStatusChange) {
        onLeadStatusChange()
      }
    } catch (err) {
      console.error('Failed to update lead status:', err)
    } finally {
      setUpdatingLeadId(null)
    }
  }, [campaignId, onLeadStatusChange])

  const columns: ColumnDef<CampaignLead>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      size: 32,
    },
    {
      accessorFn: (row) => row.lead.organization || `${row.lead.firstName} ${row.lead.lastName}`,
      id: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 -ml-2 text-xs"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const lead = row.original.lead
        const isPlaceholderName = lead.firstName === 'Contact' && lead.lastName.startsWith('at ')
        const displayName = isPlaceholderName ? null : `${lead.firstName} ${lead.lastName}`
        const primaryLabel = lead.organization || displayName || 'Unknown'
        const secondaryLabel = lead.organization && displayName ? displayName : null
        const orgType = lead.organization ? classifyOrganization(lead.organization) : 'UNKNOWN'
        const styleLabel = orgType !== 'UNKNOWN' ? getOrgTypeLabel(orgType) : null

        return (
          <button
            type="button"
            className="text-left hover:underline cursor-pointer"
            onClick={() => setPreviewLead(row.original)}
          >
            <span className="font-medium text-xs flex items-center gap-1">
              {primaryLabel}
              {lead.emailVerified && (
                <CheckCircle className="h-3 w-3 text-emerald-500 inline-flex shrink-0" />
              )}
              {lead.needsEnrichment && (
                <AlertCircle className="h-3 w-3 text-amber-500 inline-flex shrink-0" />
              )}
            </span>
            {(secondaryLabel || lead.contactTitle) && (
              <span className="text-[11px] text-muted-foreground block truncate max-w-[180px]">
                {secondaryLabel}{secondaryLabel && lead.contactTitle ? ' · ' : ''}{lead.contactTitle || ''}
              </span>
            )}
            {styleLabel && (
              <span className="text-[10px] text-muted-foreground/80 block truncate max-w-[180px]">
                {styleLabel}
              </span>
            )}
            {lead.editorialSummary && (
              <span className="text-[10px] text-muted-foreground/80 block truncate max-w-[220px] italic">
                {lead.editorialSummary}
              </span>
            )}
          </button>
        )
      },
    },
    {
      accessorKey: 'distance',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 -ml-2 text-xs"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Dist
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const dist = row.original.distance
        return <span className="text-xs">{dist != null ? `${Math.round(dist)} mi` : '—'}</span>
      },
      size: 60,
    },
    {
      accessorKey: 'score',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 -ml-2 text-xs"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Score
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-xs tabular-nums">{row.getValue('score')}</span>
      ),
      size: 55,
    },
    {
      accessorKey: 'source',
      header: () => <span className="text-xs">Source</span>,
      cell: ({ row }) => {
        const source = row.original.source
        const config = SOURCE_BADGE[source] || { label: source, className: 'bg-zinc-500/20 text-zinc-400' }
        return (
          <Badge variant="outline" className={`${config.className} text-[10px] px-1.5 py-0`}>
            {config.label}
          </Badge>
        )
      },
      size: 85,
    },
    {
      id: 'contact',
      header: () => <span className="text-xs">Contact</span>,
      cell: ({ row }) => {
        const lead = row.original.lead
        const hasPhone = !!lead.phone
        const hasWebsite = !!lead.website
        return (
          <div className="flex items-center gap-1">
            {lead.emailVerified ? (
              <Mail className="h-3 w-3 text-emerald-500" title="Verified email" />
            ) : lead.needsEnrichment ? (
              <Mail className="h-3 w-3 text-red-400" title="No email" />
            ) : (
              <Mail className="h-3 w-3 text-blue-400" title="Has email" />
            )}
            {hasPhone && <Phone className="h-3 w-3 text-muted-foreground" title="Has phone" />}
            {hasWebsite && <Globe className="h-3 w-3 text-muted-foreground" title="Has website" />}
          </div>
        )
      },
      size: 65,
    },
    {
      accessorKey: 'status',
      header: () => <span className="text-xs">Status</span>,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {row.getValue('status') as string}
        </Badge>
      ),
      size: 75,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const isRemoved = row.original.status === 'REMOVED'
        const isUpdating = updatingLeadId === row.original.id
        const isEnriching = enrichingLeadId === row.original.lead.id
        const needsEnrich = row.original.lead.needsEnrichment || row.original.lead.email?.includes('@placeholder.local')
        return (
          <div className="flex items-center gap-0.5">
            {needsEnrich && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-amber-500 hover:text-amber-400"
                onClick={() => handleReEnrich(row.original.lead.id)}
                disabled={isEnriching}
                title="Re-enrich: find email"
              >
                <RotateCw className={`h-3.5 w-3.5 ${isEnriching ? 'animate-spin' : ''}`} />
              </Button>
            )}
            {campaignId && (
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 ${isRemoved ? 'text-emerald-500 hover:text-emerald-400' : 'text-destructive hover:text-destructive'}`}
                onClick={() => handleToggleStatus(row.original.id, row.original.status)}
                disabled={isUpdating}
              >
                {isRemoved ? <UserPlus className="h-3.5 w-3.5" /> : <UserMinus className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        )
      },
      size: 36,
    },
  ]

  const table = useReactTable({
    data: leads,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: { sorting, rowSelection },
    enableRowSelection: true,
  })

  useEffect(() => {
    const selected = table.getFilteredSelectedRowModel().rows.map(r => r.original)
    onSelectionChange(selected)
  }, [rowSelection, onSelectionChange, table])

  return (
    <>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="py-1.5 px-2 h-8">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && 'selected'}
              className={`${row.original.status === 'REMOVED' ? 'opacity-40' : ''} cursor-pointer hover:bg-muted/50`}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="py-1.5 px-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Lead Preview Sheet */}
      <Sheet open={!!previewLead} onOpenChange={(open) => !open && setPreviewLead(null)}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          {previewLead && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg">
                  {(() => {
                    const isPlaceholder = previewLead.lead.firstName === 'Contact' && previewLead.lead.lastName.startsWith('at ')
                    return isPlaceholder
                      ? (previewLead.lead.organization || 'Unknown Contact')
                      : `${previewLead.lead.firstName} ${previewLead.lead.lastName}`
                  })()}
                </SheetTitle>
                <SheetDescription>
                  {previewLead.lead.contactTitle
                    ? `${previewLead.lead.contactTitle} · Score ${previewLead.score}/100`
                    : `Lead preview — score ${previewLead.score}/100`}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 px-4 pb-4">
                {/* Score & Source */}
                <div className="flex items-center gap-2">
                  {(() => {
                    const config = SOURCE_BADGE[previewLead.source] || { label: previewLead.source, className: 'bg-zinc-500/20 text-zinc-400' }
                    return (
                      <Badge variant="outline" className={config.className}>
                        {config.label}
                      </Badge>
                    )
                  })()}
                  <Badge variant="outline">{previewLead.status}</Badge>
                  {previewLead.distance != null && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {Math.round(previewLead.distance)} mi
                    </span>
                  )}
                </div>

                {/* Score bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Quality Score</span>
                    <span className="font-semibold">{previewLead.score}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        previewLead.score >= 70 ? 'bg-emerald-500' :
                        previewLead.score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${previewLead.score}%` }}
                    />
                  </div>
                </div>

                {/* Organization */}
                {previewLead.lead.organization && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Organization</p>
                      <p className="font-medium text-sm">{previewLead.lead.organization}</p>
                    </div>
                  </div>
                )}

                {/* Group Style / Type */}
                {(() => {
                  const orgType = previewLead.lead.organization
                    ? classifyOrganization(previewLead.lead.organization)
                    : 'UNKNOWN'
                  if (orgType === 'UNKNOWN') return null
                  return (
                    <div className="flex items-start gap-3">
                      <Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Style</p>
                        <p className="font-medium text-sm">{getOrgTypeLabel(orgType)}</p>
                      </div>
                    </div>
                  )
                })()}

                {/* Blurb / About */}
                {previewLead.lead.editorialSummary && (
                  <div className="rounded-md border bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground mb-1">About</p>
                    <p className="text-sm italic leading-snug">
                      {previewLead.lead.editorialSummary}
                    </p>
                  </div>
                )}

                {/* Email */}
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Email
                      {previewLead.lead.emailVerified && (
                        <span className="text-emerald-500 ml-1">(verified)</span>
                      )}
                    </p>
                    {previewLead.lead.email.includes('@placeholder.local') ? (
                      <p className="text-sm text-amber-500 italic">No email found</p>
                    ) : (
                      <a
                        href={`mailto:${previewLead.lead.email}`}
                        className="text-sm font-medium hover:underline text-primary"
                      >
                        {previewLead.lead.email}
                      </a>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    {previewLead.lead.phone ? (
                      <a
                        href={`tel:${previewLead.lead.phone}`}
                        className="text-sm font-medium hover:underline text-primary"
                      >
                        {previewLead.lead.phone}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Not available</p>
                    )}
                  </div>
                </div>

                {/* Website */}
                <div className="flex items-start gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Website</p>
                    {previewLead.lead.website ? (
                      <a
                        href={previewLead.lead.website.startsWith('http') ? previewLead.lead.website : `https://${previewLead.lead.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline text-primary flex items-center gap-1"
                      >
                        {previewLead.lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Not available</p>
                    )}
                  </div>
                </div>

                {/* Outreach History */}
                {previewLead.outreachLogs.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground mb-2">Outreach History</p>
                    <div className="space-y-2">
                      {previewLead.outreachLogs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1.5">
                          <span>{log.channel}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {log.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="border-t pt-4 flex flex-col gap-2">
                  {(previewLead.lead.needsEnrichment || previewLead.lead.email?.includes('@placeholder.local')) && (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full bg-amber-600 hover:bg-amber-500"
                      onClick={() => {
                        handleReEnrich(previewLead.lead.id)
                      }}
                      disabled={enrichingLeadId === previewLead.lead.id}
                    >
                      <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${enrichingLeadId === previewLead.lead.id ? 'animate-spin' : ''}`} />
                      {enrichingLeadId === previewLead.lead.id ? 'Searching for email...' : 'Re-enrich: Find Email'}
                    </Button>
                  )}
                  <div className="flex gap-2">
                    {campaignId && (
                      <Button
                        variant={previewLead.status === 'REMOVED' ? 'default' : 'destructive'}
                        size="sm"
                        onClick={() => {
                          handleToggleStatus(previewLead.id, previewLead.status)
                          setPreviewLead(null)
                        }}
                        className="flex-1"
                      >
                        {previewLead.status === 'REMOVED' ? (
                          <><UserPlus className="h-3.5 w-3.5 mr-1.5" />Re-add to Campaign</>
                        ) : (
                          <><UserMinus className="h-3.5 w-3.5 mr-1.5" />Remove from Campaign</>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href={`/dashboard/leads/${previewLead.lead.id}`}>
                        Full Profile
                        <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
