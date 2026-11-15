import { NextRequest, NextResponse } from 'next/server'
import { engineAuthorized } from '@/lib/content-review'
import { newsletterSender } from '@/lib/newsletter/one-voice'
import { syncOneVoiceSegment } from '@/lib/newsletter/resend-sync'

/**
 * POST /api/newsletters/engine/sync  { dryRun?: boolean }   (Bearer ENGINE_REVIEW_SECRET)
 * Brings the Resend "One Voice" segment in step with the site's subscribers.
 */
export const maxDuration = 300

export async function POST(request: NextRequest) {
  if (!engineAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { segmentId } = newsletterSender()
  if (!segmentId) return NextResponse.json({ error: 'NEWSLETTER_SEGMENT_ID is not set on the site' }, { status: 500 })
  const body = (await request.json().catch(() => ({}))) as { dryRun?: boolean }
  try {
    const result = await syncOneVoiceSegment(segmentId, { dryRun: body.dryRun === true })
    return NextResponse.json({ ok: result.failures.length === 0, dryRun: body.dryRun === true, ...result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 })
  }
}
