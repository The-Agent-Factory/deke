'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { EmailDraftEditor } from './email-draft-editor'
import {
  Loader2,
  Send,
  Sparkles,
  Trash2,
  FileText,
  Mail,
  Paperclip,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'

interface AttachmentInfo {
  filename: string
  path: string
  size: number
}

interface Draft {
  id: string
  subject: string
  body: string
  status: string
  editedByUser: boolean
  overrideEmail: string | null
  ccEmail: string | null
  attachments: AttachmentInfo[] | null
  errorMessage: string | null
  lead: {
    firstName: string
    lastName: string
    email: string
    organization: string | null
  }
}

interface DraftsTabProps {
  campaignId: string
  campaignLeadIds: string[]  // All campaign lead IDs for generating drafts
  onDraftsChange?: () => void
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  SENT: {
    label: 'Sent',
    className: 'bg-green-100 text-green-800 border-green-300',
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 border-red-300',
  },
}

export function DraftsTab({ campaignId, campaignLeadIds, onDraftsChange }: DraftsTabProps) {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isForceGenerating, setIsForceGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [isResendingAll, setIsResendingAll] = useState(false)
  const [resendResult, setResendResult] = useState<{ resent: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchDrafts = useCallback(async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/drafts`)
      if (!response.ok) throw new Error('Failed to fetch drafts')
      const data = await response.json()
      setDrafts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drafts')
    } finally {
      setIsLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    fetchDrafts()
  }, [fetchDrafts])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/generate-drafts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadIds: campaignLeadIds,
          }),
        }
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate drafts')
      }
      setSelectedIds(new Set())
      await fetchDrafts()
      onDraftsChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate drafts')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleForceGenerate = async () => {
    setIsForceGenerating(true)
    setError(null)
    try {
      // Find lead IDs that don't have drafts yet
      const draftCampaignLeadIds = new Set(drafts.map(d => d.id))
      const missingLeadIds = campaignLeadIds.filter(id => !draftCampaignLeadIds.has(id))

      if (missingLeadIds.length === 0) return

      const response = await fetch(
        `/api/campaigns/${campaignId}/generate-drafts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadIds: missingLeadIds,
            force: true,
          }),
        }
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate drafts')
      }
      setSelectedIds(new Set())
      await fetchDrafts()
      onDraftsChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate drafts for skipped leads')
    } finally {
      setIsForceGenerating(false)
    }
  }

  const handleSendSelected = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    setIsSending(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/drafts/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draftIds: ids }),
        }
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send drafts')
      }
      setSelectedIds(new Set())
      await fetchDrafts()
      onDraftsChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send emails')
    } finally {
      setIsSending(false)
    }
  }

  const handleSendAll = async () => {
    const draftIds = drafts
      .filter((d) => d.status === 'DRAFT')
      .map((d) => d.id)
    if (draftIds.length === 0) return

    setIsSending(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/drafts/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draftIds }),
        }
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send all drafts')
      }
      setSelectedIds(new Set())
      await fetchDrafts()
      onDraftsChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send emails')
    } finally {
      setIsSending(false)
    }
  }

  const handleDelete = async (draftId: string) => {
    setDeletingId(draftId)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/drafts/${draftId}`,
        { method: 'DELETE' }
      )
      if (!response.ok) throw new Error('Failed to delete draft')
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(draftId)
        return next
      })
      await fetchDrafts()
      onDraftsChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete draft')
    } finally {
      setDeletingId(null)
    }
  }

  const handleResendFailed = async (draftId?: string) => {
    if (draftId) setResendingId(draftId)
    else setIsResendingAll(true)
    setResendResult(null)
    setError(null)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/resend-failed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftId ? { draftIds: [draftId] } : {}),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to resend')
      }
      const data = await response.json()
      setResendResult({ resent: data.resent, failed: data.failed })
      if (data.resent > 0) {
        await fetchDrafts()
        onDraftsChange?.()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend emails')
    } finally {
      setResendingId(null)
      setIsResendingAll(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    const draftOnlyIds = drafts
      .filter((d) => d.status === 'DRAFT')
      .map((d) => d.id)
    if (selectedIds.size === draftOnlyIds.length && draftOnlyIds.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(draftOnlyIds))
    }
  }

  const handleEditorSave = () => {
    fetchDrafts()
    onDraftsChange?.()
  }

  const draftCount = drafts.filter((d) => d.status === 'DRAFT').length
  const failedCount = drafts.filter((d) => d.status === 'FAILED').length
  const selectedDraftIds = Array.from(selectedIds).filter((id) =>
    drafts.find((d) => d.id === id && d.status === 'DRAFT')
  )
  const skippedCount = campaignLeadIds.length - drafts.length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading drafts...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Top toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || isSending || isForceGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Generate Drafts
        </Button>

        {drafts.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {resendResult && (
              <p className="text-sm text-muted-foreground">
                {resendResult.resent > 0
                  ? `Resent ${resendResult.resent} email${resendResult.resent !== 1 ? 's' : ''}${resendResult.failed > 0 ? `, ${resendResult.failed} still failed` : ''}`
                  : 'All resends failed'}
              </p>
            )}
            {failedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResendFailed()}
                disabled={isResendingAll || isSending}
              >
                {isResendingAll ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Resend Failed ({failedCount})
              </Button>
            )}
            {selectedDraftIds.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendSelected}
                disabled={isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Selected ({selectedDraftIds.length})
              </Button>
            )}
            {draftCount > 0 && (
              <Button
                size="sm"
                onClick={handleSendAll}
                disabled={isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Send All Drafts ({draftCount})
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Skipped leads banner */}
      {skippedCount > 0 && drafts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">
              {skippedCount} lead{skippedCount !== 1 ? 's' : ''} skipped
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              These leads were filtered out due to missing, placeholder, or generic email addresses.
              You can force-generate drafts for them, then edit the email address before sending.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={handleForceGenerate}
            disabled={isForceGenerating || isGenerating || isSending}
          >
            {isForceGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate for Skipped
          </Button>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Select all checkbox */}
      {drafts.length > 0 && draftCount > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            id="select-all-drafts"
            checked={
              selectedIds.size === draftCount && draftCount > 0
            }
            onCheckedChange={toggleSelectAll}
            aria-label="Select all drafts"
          />
          <label
            htmlFor="select-all-drafts"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Select all drafts ({draftCount})
          </label>
        </div>
      )}

      {/* Draft cards */}
      {drafts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No email drafts yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Click &quot;Generate Drafts&quot; to create personalized emails
              for your campaign leads
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {drafts.map((draft) => {
            const statusConfig = STATUS_BADGE[draft.status] || {
              label: draft.status,
              className: 'bg-gray-100 text-gray-800 border-gray-300',
            }
            const isDraft = draft.status === 'DRAFT'
            const bodyPreview =
              draft.body.length > 100
                ? draft.body.slice(0, 100) + '...'
                : draft.body
            const displayEmail = draft.overrideEmail || draft.lead.email
            const hasOverride = !!draft.overrideEmail
            const attachmentCount = draft.attachments?.length || 0

            return (
              <Card
                key={draft.id}
                className="transition-colors hover:bg-muted/50 cursor-pointer"
                onClick={() => setEditingDraft(draft)}
              >
                <CardContent className="flex items-start gap-3 py-3 px-4">
                  {/* Checkbox - only for DRAFT status */}
                  {isDraft && (
                    <div
                      className="pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedIds.has(draft.id)}
                        onCheckedChange={() => toggleSelect(draft.id)}
                        aria-label={`Select draft for ${draft.lead.firstName} ${draft.lead.lastName}`}
                      />
                    </div>
                  )}
                  {!isDraft && <div className="w-4" />}

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">
                        {draft.lead.firstName} {draft.lead.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {displayEmail}
                      </span>
                      {hasOverride && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          edited
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold truncate">
                      {draft.subject}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                        {bodyPreview}
                      </p>
                      {attachmentCount > 0 && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          <Paperclip className="h-3 w-3 mr-1" />
                          {attachmentCount}
                        </Badge>
                      )}
                    </div>
                    {draft.status === 'FAILED' && draft.errorMessage && (
                      <p className="text-xs text-red-600 mt-1">
                        Error: {draft.errorMessage}
                      </p>
                    )}
                  </div>

                  {/* Status + actions */}
                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Badge
                      variant="outline"
                      className={statusConfig.className}
                    >
                      {statusConfig.label}
                    </Badge>
                    {draft.status === 'FAILED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleResendFailed(draft.id)}
                        disabled={resendingId === draft.id || isResendingAll}
                        aria-label={`Resend email for ${draft.lead.firstName} ${draft.lead.lastName}`}
                      >
                        {resendingId === draft.id ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3 mr-1" />
                        )}
                        Resend
                      </Button>
                    )}
                    {isDraft && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(draft.id)}
                        disabled={deletingId === draft.id}
                        aria-label={`Delete draft for ${draft.lead.firstName} ${draft.lead.lastName}`}
                      >
                        {deletingId === draft.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Email Draft Editor Dialog */}
      {editingDraft && (
        <EmailDraftEditor
          draft={editingDraft}
          campaignId={campaignId}
          open={!!editingDraft}
          onOpenChange={(open) => {
            if (!open) setEditingDraft(null)
          }}
          onSave={handleEditorSave}
        />
      )}
    </div>
  )
}
