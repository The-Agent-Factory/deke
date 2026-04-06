'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { MessageCard } from './message-card'
import { Mail, RefreshCw } from 'lucide-react'

interface MessagesTabProps {
  campaignId: string
  outreachLogs: Array<{
    id: string
    channel: string
    status: string
    sentAt: string | null
    openedAt: string | null
    clickedAt: string | null
    respondedAt: string | null
    errorMessage: string | null
    leadName: string
    leadEmail: string
  }>
  onRefresh?: () => void
}

export function MessagesTab({ campaignId, outreachLogs, onRefresh }: MessagesTabProps) {
  const [channelFilter, setChannelFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ verified: number; updated: number } | null>(null)

  const filtered = outreachLogs.filter(log => {
    if (channelFilter !== 'ALL' && log.channel !== channelFilter) return false
    if (statusFilter !== 'ALL' && log.status !== statusFilter) return false
    return true
  })

  // Group by date
  const grouped = filtered.reduce((acc, log) => {
    const date = log.sentAt
      ? new Date(log.sentAt).toLocaleDateString()
      : 'Pending'
    if (!acc[date]) acc[date] = []
    acc[date].push(log)
    return acc
  }, {} as Record<string, typeof outreachLogs>)

  const handleVerify = async () => {
    setIsVerifying(true)
    setVerifyResult(null)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/verify-emails`, { method: 'POST' })
      const data = await res.json()
      setVerifyResult(data)
      if (data.updated > 0) {
        onRefresh?.()
      }
    } catch {
      setVerifyResult({ verified: 0, updated: 0 })
    } finally {
      setIsVerifying(false)
    }
  }

  if (outreachLogs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">No messages sent yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Launch the campaign to start sending outreach
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters + Verify */}
      <div className="flex gap-4 items-center flex-wrap">
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Channels</SelectItem>
            <SelectItem value="EMAIL">Email Only</SelectItem>
            <SelectItem value="SMS">SMS Only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="OPENED">Opened</SelectItem>
            <SelectItem value="CLICKED">Clicked</SelectItem>
            <SelectItem value="RESPONDED">Responded</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-3">
          {verifyResult && (
            <p className="text-sm text-muted-foreground">
              {verifyResult.updated > 0
                ? `Updated ${verifyResult.updated} of ${verifyResult.verified} emails`
                : `All ${verifyResult.verified} emails already up to date`}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleVerify}
            disabled={isVerifying}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isVerifying ? 'animate-spin' : ''}`} />
            {isVerifying ? 'Verifying…' : 'Verify Send Status'}
          </Button>
        </div>
      </div>

      {/* Grouped messages */}
      {Object.entries(grouped).map(([date, messages]) => (
        <div key={date} className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">{date}</h3>
          <div className="space-y-2">
            {messages.map(msg => (
              <MessageCard key={msg.id} message={msg} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
