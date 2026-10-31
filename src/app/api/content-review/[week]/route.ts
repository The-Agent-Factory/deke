import { NextRequest, NextResponse } from 'next/server'
import { WEEK_RE, getReview, saveReview, tokensMatch, type Decision } from '@/lib/content-review'

/**
 * POST /api/content-review/<week>  { token, decisions: { [itemId]: "approve" | "skip" }, note? }
 * Deke's answers from the review page. The private link's token is the only key.
 * He can change his answers until the engine schedules the week.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ week: string }> }) {
  const { week } = await params
  if (!WEEK_RE.test(week)) return NextResponse.json({ error: 'Bad week' }, { status: 400 })

  const body = (await request.json().catch(() => null)) as
    | { token?: string; decisions?: Record<string, string>; note?: string }
    | null
  const review = await getReview(week)
  if (!review || !body?.token || !tokensMatch(body.token, review.token)) {
    return NextResponse.json({ error: 'This link is not valid. Ask Denis for a new one.' }, { status: 403 })
  }

  const ids = new Set(review.items.map((i) => i.id))
  const decisions: Record<string, Decision> = {}
  for (const [id, value] of Object.entries(body.decisions ?? {})) {
    if (ids.has(id) && (value === 'approve' || value === 'skip')) decisions[id] = value
  }
  if (Object.keys(decisions).length !== ids.size) {
    return NextResponse.json({ error: 'Choose Approve or Skip for every post.' }, { status: 400 })
  }

  review.decisions = decisions
  review.note = typeof body.note === 'string' ? body.note.slice(0, 2000) : null
  review.submittedAt = new Date().toISOString()
  await saveReview(review)
  return NextResponse.json({ ok: true, submittedAt: review.submittedAt })
}
