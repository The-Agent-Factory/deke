'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, MessageSquare, Pause, Play } from 'lucide-react'

interface BulkActionsToolbarProps {
  selectedCount: number
  selectedLeadIds: string[]
  campaignId: string
  onActionComplete: () => void
}

export function BulkActionsToolbar({
  selectedCount,
  selectedLeadIds,
  campaignId,
  onActionComplete,
}: BulkActionsToolbarProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleGenerateDrafts = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/generate-drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate drafts')

      const result = await response.json()
      alert(`Generated ${result.created} draft${result.created !== 1 ? 's' : ''}${result.skipped > 0 ? ` (${result.skipped} already existed)` : ''}`)
      onActionComplete()
    } catch (error) {
      alert('Failed to generate drafts')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePauseFollowUps = async () => {
    setIsProcessing(true)
    try {
      await Promise.all(
        selectedLeadIds.map(leadId =>
          fetch(`/api/campaigns/${campaignId}/leads/${leadId}/pause`, {
            method: 'POST',
          })
        )
      )
      alert(`Paused follow-ups for ${selectedCount} leads`)
      onActionComplete()
    } catch (error) {
      alert('Failed to pause follow-ups')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleResumeFollowUps = async () => {
    setIsProcessing(true)
    try {
      await Promise.all(
        selectedLeadIds.map(leadId =>
          fetch(`/api/campaigns/${campaignId}/leads/${leadId}/resume`, {
            method: 'POST',
          })
        )
      )
      alert(`Resumed follow-ups for ${selectedCount} leads`)
      onActionComplete()
    } catch (error) {
      alert('Failed to resume follow-ups')
    } finally {
      setIsProcessing(false)
    }
  }

  if (selectedCount === 0) return null

  return (
    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
      <p className="text-sm font-medium">{selectedCount} leads selected</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateDrafts}
          disabled={isProcessing}
        >
          <FileText className="h-4 w-4 mr-2" />
          Generate Drafts
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePauseFollowUps}
          disabled={isProcessing}
        >
          <Pause className="h-4 w-4 mr-2" />
          Pause Follow-ups
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResumeFollowUps}
          disabled={isProcessing}
        >
          <Play className="h-4 w-4 mr-2" />
          Resume
        </Button>
      </div>
    </div>
  )
}
