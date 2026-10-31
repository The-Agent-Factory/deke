import { NextRequest, NextResponse } from 'next/server'
import {
  WEEK_RE,
  engineAuthorized,
  getReview,
  newToken,
  saveReview,
  type Review,
  type ReviewItem,
} from '@/lib/content-review'

/**
 * Engine-only endpoints (Bearer ENGINE_REVIEW_SECRET).
 *
 * POST /api/content-review   { week, deadline, items[] }  -> { url }
 *   Creates or replaces next week's plan. Refuses to replace a plan Deke has
 *   already answered unless force:true.
 * GET  /api/content-review?week=YYYY-MM-DD                -> { decisions, note, submittedAt }
 */

export async function POST(request: NextRequest) {
  if (!engineAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = (await request.json().catch(() => null)) as
    | { week?: string; deadline?: string; items?: ReviewItem[]; force?: boolean }
    | null
  if (!body || !body.week || !WEEK_RE.test(body.week) || !Array.isArray(body.items) || !body.deadline) {
    return NextResponse.json({ error: 'week (YYYY-MM-DD), deadline and items[] are required' }, { status: 400 })
  }
  if (body.items.length === 0 || body.items.length > 30) {
    return NextResponse.json({ error: 'items must hold 1 to 30 posts' }, { status: 400 })
  }
  const existing = await getReview(body.week)
  if (existing?.submittedAt && !body.force) {
    return NextResponse.json({ error: 'Deke already answered this week; pass force:true to replace' }, { status: 409 })
  }
  const review: Review = {
    week: body.week,
    token: existing?.token ?? newToken(),
    items: body.items,
    deadline: body.deadline,
    createdAt: new Date().toISOString(),
    decisions: null,
    note: null,
    submittedAt: null,
  }
  await saveReview(review)
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://dekesharon.com'
  return NextResponse.json({ url: `${base}/content-review/${review.week}?t=${review.token}` })
}

export async function GET(request: NextRequest) {
  if (!engineAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const week = request.nextUrl.searchParams.get('week') ?? ''
  if (!WEEK_RE.test(week)) {
    return NextResponse.json({ error: 'week=YYYY-MM-DD is required' }, { status: 400 })
  }
  const review = await getReview(week)
  if (!review) return NextResponse.json({ error: 'No plan for that week' }, { status: 404 })
  return NextResponse.json({ decisions: review.decisions, note: review.note, submittedAt: review.submittedAt })
}
