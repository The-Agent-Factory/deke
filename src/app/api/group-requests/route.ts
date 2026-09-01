import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-error'
import {
  createGroupRequestSchema,
  groupRequestFiltersSchema,
  type CreateGroupRequestInput
} from '@/lib/validations/group-request'
import { sendSignupNotification } from '@/lib/notifications/signup-notification'
import { logSpam } from '@/lib/spam-logger'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { checkEmailQuality } from '@/lib/validations/email-quality'

// POST /api/group-requests - Create a new group request
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const body = (await request.json()) as Record<string, unknown>

    // ── Layer 1: Rate limit ────────────────────────────────────────
    const rl = checkRateLimit(ip)
    if (rl.limited) {
      logSpam('RATE_LIMIT', 'exceeded 5 req/hour', String(body.email ?? ''), ip)
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // ── Layer 2: Email quality ─────────────────────────────────────
    const emailCheck = checkEmailQuality(String(body.email ?? ''))
    if (emailCheck.blocked) {
      logSpam('EMAIL_QUALITY', emailCheck.reason ?? 'blocked', String(body.email ?? ''), ip)
      return NextResponse.json(
        { success: true },
        { status: 200 }
      )
    }

    // ── Layer 3: Zod validation ────────────────────────────────────
    // Validate input
    const validatedData: CreateGroupRequestInput = createGroupRequestSchema.parse(body)

    // Create new group request
    const groupRequest = await prisma.groupRequest.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        location: validatedData.location,
        age: validatedData.age ?? null,
        experience: validatedData.experience,
        commitment: validatedData.commitment,
        genres: validatedData.genres,
        performanceInterest: validatedData.performanceInterest,
        message: validatedData.message ?? null,
        status: 'PENDING',
      }
    })

    // Send admin notification (fire-and-forget)
    const extras: Record<string, string> = {
      'Experience': validatedData.experience,
      'Commitment': validatedData.commitment,
    }
    if (validatedData.genres.length > 0) extras['Genres'] = validatedData.genres.join(', ')
    if (validatedData.performanceInterest) extras['Performance'] = 'Interested'

    sendSignupNotification({
      type: 'group-request',
      name: validatedData.name,
      email: validatedData.email,
      location: validatedData.location,
      message: validatedData.message,
      extras,
    }).catch(err => console.error('Group request notification failed:', err))

    return NextResponse.json(groupRequest, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

// GET /api/group-requests - List group requests with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filters = groupRequestFiltersSchema.parse({
      status: searchParams.get('status') || undefined,
      location: searchParams.get('location') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    })

    const where: Record<string, unknown> = {}
    if (filters.status) where.status = filters.status
    if (filters.location) where.location = { contains: filters.location, mode: 'insensitive' }

    const limit = filters.limit ?? 50
    const offset = filters.offset ?? 0

    const [requests, total] = await Promise.all([
      prisma.groupRequest.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.groupRequest.count({ where })
    ])

    return NextResponse.json({
      requests,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + requests.length < total
      }
    })
  } catch (error) {
    return handleApiError(error)
  }
}
