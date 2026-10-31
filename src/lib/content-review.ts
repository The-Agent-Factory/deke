import { randomBytes, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/db'

/**
 * Weekly content review for Deke. The content engine on Denis's machine posts
 * next week's plan here on Saturday; Deke opens a private link and taps
 * Approve or Skip per post; the engine reads his answers back on Sunday.
 *
 * Stored in AgentMemory (agentId "content-review", key = the week's Monday)
 * so no schema change is needed.
 */

const AGENT = 'content-review'

export type ReviewItem = {
  id: string
  lane: 'reel' | 'text'
  when: string // "Tue Nov 10"
  platforms: string[]
  title: string
  caption: string
  videoUrl?: string
  posterUrl?: string
  sourceNote?: string
}

export type Decision = 'approve' | 'skip'

export type Review = {
  week: string
  token: string
  items: ReviewItem[]
  deadline: string // ISO, when silence counts as yes
  createdAt: string
  decisions: Record<string, Decision> | null
  note: string | null
  submittedAt: string | null
}

export const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/

export function newToken(): string {
  return randomBytes(24).toString('base64url')
}

export function tokensMatch(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function engineAuthorized(header: string | null): boolean {
  const secret = process.env.ENGINE_REVIEW_SECRET
  if (!secret || !header) return false
  return tokensMatch(header, `Bearer ${secret}`)
}

export async function getReview(week: string): Promise<Review | null> {
  const row = await prisma.agentMemory.findUnique({
    where: { agentId_key: { agentId: AGENT, key: week } },
  })
  return row ? (JSON.parse(row.value) as Review) : null
}

export async function saveReview(review: Review): Promise<void> {
  const value = JSON.stringify(review)
  await prisma.agentMemory.upsert({
    where: { agentId_key: { agentId: AGENT, key: review.week } },
    create: { agentId: AGENT, key: review.week, memoryType: 'context', value },
    update: { value },
  })
}
