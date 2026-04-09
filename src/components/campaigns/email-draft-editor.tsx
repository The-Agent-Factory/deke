'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, Send, PenLine, Paperclip, X, Upload } from 'lucide-react'

interface AttachmentInfo {
  filename: string
  path: string
  size: number
}

interface EmailDraftEditorProps {
  draft: {
    id: string
    subject: string
    body: string
    status: string
    editedByUser: boolean
    overrideEmail: string | null
    ccEmail: string | null
    attachments: AttachmentInfo[] | null
    errorMessage?: string | null
    lead: {
      firstName: string
      lastName: string
      email: string
      organization: string | null
    }
  }
  campaignId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function EmailDraftEditor({
  draft,
  campaignId,
  open,
  onOpenChange,
  onSave,
}: EmailDraftEditorProps) {
  const [subject, setSubject] = useState(draft.subject)
  const [body, setBody] = useState(draft.body)
  const [toEmail, setToEmail] = useState(draft.overrideEmail || draft.lead.email)
  const [ccEmail, setCcEmail] = useState(draft.ccEmail || '')
  const [attachments, setAttachments] = useState<AttachmentInfo[]>(draft.attachments || [])
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isSent = draft.status === 'SENT'
  const isEdited = draft.editedByUser
  const originalToEmail = draft.overrideEmail || draft.lead.email
  const hasChanges =
    subject !== draft.subject ||
    body !== draft.body ||
    toEmail !== originalToEmail ||
    ccEmail !== (draft.ccEmail || '') ||
    JSON.stringify(attachments) !== JSON.stringify(draft.attachments || [])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      // Determine if email was changed from lead's original
      const overrideEmail = toEmail !== draft.lead.email ? toEmail : null

      const response = await fetch(
        `/api/campaigns/${campaignId}/drafts/${draft.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject,
            body,
            overrideEmail,
            ccEmail: ccEmail || null,
            attachments: attachments.length > 0 ? attachments : null,
          }),
        }
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save draft')
      }
      onSave()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSend = async () => {
    setIsSending(true)
    setError(null)
    try {
      // Save any pending changes first
      if (hasChanges) {
        const overrideEmail = toEmail !== draft.lead.email ? toEmail : null
        const saveResponse = await fetch(
          `/api/campaigns/${campaignId}/drafts/${draft.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject,
              body,
              overrideEmail,
              ccEmail: ccEmail || null,
              attachments: attachments.length > 0 ? attachments : null,
            }),
          }
        )
        if (!saveResponse.ok) {
          throw new Error('Failed to save changes before sending')
        }
      }

      const response = await fetch(
        `/api/campaigns/${campaignId}/drafts/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draftIds: [draft.id] }),
        }
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send email')
      }
      onSave()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setIsSending(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(
        `/api/campaigns/${campaignId}/drafts/${draft.id}/attachments`,
        { method: 'POST', body: formData }
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to upload file')
      }
      const attachment: AttachmentInfo = await response.json()
      setAttachments((prev) => [...prev, attachment])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveAttachment = async (filename: string) => {
    setError(null)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/drafts/${draft.id}/attachments`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename }),
        }
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to remove attachment')
      }
      setAttachments((prev) => prev.filter((a) => a.filename !== filename))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove attachment')
    }
  }

  const isProcessing = isSaving || isSending || isUploading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>
              {draft.lead.firstName} {draft.lead.lastName}
            </DialogTitle>
            {isEdited && (
              <Badge
                variant="outline"
                className="bg-blue-100 text-blue-800 border-blue-300"
              >
                <PenLine className="h-3 w-3" />
                Edited
              </Badge>
            )}
            {isSent && (
              <Badge
                variant="outline"
                className="bg-green-100 text-green-800 border-green-300"
              >
                Sent
              </Badge>
            )}
          </div>
          <DialogDescription>
            {draft.lead.organization || draft.lead.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Previous send error */}
          {draft.status === 'FAILED' && draft.errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-medium">Previous send failed</p>
              <p className="mt-0.5 text-red-700">{draft.errorMessage}</p>
              <p className="mt-1 text-xs text-red-600">Edit the draft and save to retry.</p>
            </div>
          )}

          {/* To Email */}
          <div className="space-y-2">
            <Label htmlFor="draft-to-email">To</Label>
            <Input
              id="draft-to-email"
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              disabled={isSent || isProcessing}
              placeholder="Recipient email address"
            />
            {toEmail !== draft.lead.email && (
              <p className="text-xs text-amber-600">
                Original lead email: {draft.lead.email}
              </p>
            )}
          </div>

          {/* CC Email */}
          <div className="space-y-2">
            <Label htmlFor="draft-cc-email">CC (optional)</Label>
            <Input
              id="draft-cc-email"
              type="email"
              value={ccEmail}
              onChange={(e) => setCcEmail(e.target.value)}
              disabled={isSent || isProcessing}
              placeholder="CC email address"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="draft-subject">Subject</Label>
            <Input
              id="draft-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSent || isProcessing}
              placeholder="Email subject line"
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="draft-body">Body</Label>
            <Textarea
              id="draft-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isSent || isProcessing}
              rows={15}
              className="font-mono text-sm resize-none"
              placeholder="Email body content"
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            {attachments.length > 0 && (
              <div className="space-y-1">
                {attachments.map((att) => (
                  <div
                    key={att.filename}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{att.filename}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatFileSize(att.size)}
                    </span>
                    {!isSent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveAttachment(att.filename)}
                        disabled={isProcessing}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!isSent && attachments.length < 5 && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isProcessing}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {isUploading ? 'Uploading...' : 'Add Attachment'}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Max 10MB per file, up to 5 attachments
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          {!isSent && (
            <>
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isProcessing || !hasChanges}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
              <Button onClick={handleSend} disabled={isProcessing}>
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send This Email
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
