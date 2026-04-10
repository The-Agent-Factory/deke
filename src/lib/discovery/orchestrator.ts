/**
 * Discovery Orchestrator
 *
 * Coordinates all discovery sources, deduplication, scoring, and database insertion.
 * This is the main entry point for the lead discovery process.
 */

import { prisma } from '@/lib/db'
import { eventBus } from '@/lib/event-bus'
import { discoverPastClients } from './past-clients'
import { discoverDormantLeads } from './dormant-leads'
import { discoverSimilarOrgs } from './similar-orgs'
import { discoverAIResearch, type AIResearchDiagnostics } from './ai-research'
import { discoverWithFirecrawl } from './firecrawl-research'
import { discoverWithPerplexity } from './perplexity-research'
import { calculateScore, calculateScoreStats } from './scorer'
import { deduplicate, getDeduplicationStats } from './deduplicator'
import { classifyOrganization } from './org-classifier'
import { filterBySeasonality, getSeasonForDate } from './seasons'
import { getRecommendations, buildRecommendationReason } from '@/lib/recommendations/engine'
import { calculateRecommendationBonus } from '@/lib/recommendations/scorer'

// Minimum score thresholds for quality gate
const COLD_SCORE_THRESHOLD = 25
const WARM_SCORE_THRESHOLD = 25

export interface SourceDiagnostic {
  source: string
  count: number
  durationMs: number
  error?: string
  details?: AIResearchDiagnostics
}

export interface DiscoveryResult {
  total: number
  filteredOut: number
  bySource: {
    PAST_CLIENT: number
    DORMANT: number
    SIMILAR_ORG: number
    AI_RESEARCH: number
  }
  avgScore: number
  scoreStats: ReturnType<typeof calculateScoreStats>
  deduplicationStats: ReturnType<typeof getDeduplicationStats>
  duration: number
  warnings: string[]
  diagnostics: SourceDiagnostic[]
  errors: string[]
}

/**
 * Discover leads for a campaign
 *
 * Runs all discovery sources in parallel, deduplicates, scores, and inserts into database.
 *
 * @param campaignId - The campaign ID to discover leads for
 * @returns Discovery statistics
 * @throws Error if campaign not found or discovery fails
 */
export async function discoverLeads(campaignId: string): Promise<DiscoveryResult> {
  const startTime = Date.now()

  const warnings: string[] = []

  // Fetch campaign details (include booking.contact for similar-orgs classification fallback)
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      booking: {
        include: {
          contact: {
            select: { organization: true },
          },
        },
      },
    },
    // Also get targetOrgTypes for prospect mode
  })

  if (!campaign) {
    throw new Error('Campaign not found')
  }

  console.log('[Discovery:Orchestrator] Campaign details', {
    id: campaign.id,
    name: campaign.name,
    lat: campaign.latitude,
    lng: campaign.longitude,
    radius: campaign.radius,
    hasBooking: !!campaign.booking,
    bookingLocation: campaign.booking?.location,
    bookingContactOrg: campaign.booking?.contact?.organization,
  })

  // Pre-flight validation
  if (!campaign.latitude || !campaign.longitude) {
    warnings.push('Campaign has no coordinates — all geo-based sources will return empty')
  } else if (
    campaign.latitude < -90 || campaign.latitude > 90 ||
    campaign.longitude < -180 || campaign.longitude > 180
  ) {
    warnings.push(`Campaign has invalid coordinates (${campaign.latitude}, ${campaign.longitude})`)
  }

  if (!campaign.radius || campaign.radius <= 0) {
    warnings.push('Campaign has no radius set — geo-based sources will return empty')
  }

  if (!campaign.booking && !campaign.targetOrgTypes) {
    warnings.push('Campaign has no linked booking or target org types — Similar Orgs source will be skipped')
  }

  // Check how many leads in DB have coordinates vs total
  const [totalLeads, leadsWithCoords] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { latitude: { not: null }, longitude: { not: null } } }),
  ])
  console.log(`[Discovery:Orchestrator] Lead coverage: ${leadsWithCoords}/${totalLeads} leads have coordinates`)
  if (totalLeads > 0 && leadsWithCoords < totalLeads) {
    warnings.push(`${totalLeads - leadsWithCoords} of ${totalLeads} leads have no coordinates — run backfill at /api/admin/leads/backfill-coords`)
  }

  // Check Firecrawl API key
  if (!process.env.FIRECRAWL_API_KEY) {
    warnings.push('FIRECRAWL_API_KEY not configured — AI Research source will be skipped')
  }

  // Check Perplexity API key
  if (!process.env.PERPLEXITY_API_KEY) {
    warnings.push('PERPLEXITY_API_KEY not configured — Perplexity discovery will be skipped')
  }

  // Run all discovery sources in parallel, each wrapped in individual try/catch
  const sourceDiagnostics: SourceDiagnostic[] = []
  const sourceErrors: string[] = []

  const runSource = async <T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T | null> => {
    const sourceStart = Date.now()
    try {
      const result = await fn()
      const durationMs = Date.now() - sourceStart
      const count = Array.isArray(result) ? result.length : 0
      sourceDiagnostics.push({ source: name, count, durationMs })
      return result
    } catch (error) {
      const durationMs = Date.now() - sourceStart
      const errMsg = error instanceof Error ? error.message : String(error)
      sourceDiagnostics.push({ source: name, count: 0, durationMs, error: errMsg })
      sourceErrors.push(`${name}: ${errMsg}`)
      console.error(`[Discovery:Orchestrator] ${name} FAILED (${durationMs}ms):`, errMsg)
      return null
    }
  }

  // AI Research needs special handling for its richer result type
  let aiResearchDiagnostics: AIResearchDiagnostics | undefined
  let perplexityDiagnostics: AIResearchDiagnostics | undefined

  const [pastClientsResult, dormantResult, similarResult, aiResearchResult, perplexityResult] = await Promise.all([
    runSource('Past Clients', () => discoverPastClients(campaign)),
    runSource('Dormant Leads', () => discoverDormantLeads(campaign)),
    runSource('Similar Orgs', () => discoverSimilarOrgs(campaign)),
    runSource('AI Research', async () => {
      // Prefer Firecrawl over Google Places (better extraction, no billing setup)
      const useFirecrawl = !!process.env.FIRECRAWL_API_KEY
      let result: { leads: any[]; diagnostics: AIResearchDiagnostics }

      if (useFirecrawl) {
        console.log('[Discovery:Orchestrator] Using Firecrawl for AI Research (FIRECRAWL_API_KEY set)')
        result = await discoverWithFirecrawl(campaign)
      } else {
        console.log('[Discovery:Orchestrator] Using Google Places for AI Research (no FIRECRAWL_API_KEY)')
        result = await discoverAIResearch(campaign)
      }

      aiResearchDiagnostics = result.diagnostics
      // Surface AI Research errors as warnings
      if (result.diagnostics.errors.length > 0) {
        for (const err of result.diagnostics.errors) {
          warnings.push(`AI Research: ${err}`)
        }
      }
      return result.leads
    }),
    runSource('Perplexity Research', async () => {
      if (!process.env.PERPLEXITY_API_KEY) {
        return []
      }
      console.log('[Discovery:Orchestrator] Running Perplexity discovery (PERPLEXITY_API_KEY set)')
      const result = await discoverWithPerplexity(campaign)

      perplexityDiagnostics = result.diagnostics
      if (result.diagnostics.errors.length > 0) {
        for (const err of result.diagnostics.errors) {
          warnings.push(`Perplexity: ${err}`)
        }
      }
      return result.leads
    }),
  ])

  // Attach AI Research detailed diagnostics after runSource has pushed its entry
  if (aiResearchDiagnostics) {
    const aiDiag = sourceDiagnostics.find(d => d.source === 'AI Research')
    if (aiDiag) {
      aiDiag.details = aiResearchDiagnostics
    }
  }
  if (perplexityDiagnostics) {
    const pDiag = sourceDiagnostics.find(d => d.source === 'Perplexity Research')
    if (pDiag) {
      pDiag.details = perplexityDiagnostics
    }
  }

  const pastClients = pastClientsResult || []
  const dormant = dormantResult || []
  const similar = similarResult || []
  const aiResearch = aiResearchResult || []
  const perplexity = perplexityResult || []

  console.log('[Discovery:Orchestrator] Source results', {
    pastClients: pastClients.length,
    dormant: dormant.length,
    similar: similar.length,
    aiResearch: aiResearch.length,
    perplexity: perplexity.length,
  })

  // Track counts by source before deduplication
  // Perplexity leads are tagged AI_RESEARCH for compatibility with existing schema
  const bySource = {
    PAST_CLIENT: pastClients.length,
    DORMANT: dormant.length,
    SIMILAR_ORG: similar.length,
    AI_RESEARCH: aiResearch.length + perplexity.length,
  }

  // Merge all leads (Perplexity + Firecrawl both contribute to AI_RESEARCH)
  const rawLeads = [...pastClients, ...dormant, ...similar, ...aiResearch, ...perplexity]

  // Filter out orgs that are NOT Deke's market.
  // Deke's market: college a cappella, community a cappella, barbershop/SA/HI,
  // contemporary choruses, festivals. NOT: classical-only choirs, K-12 school
  // music departments, orchestras, bands, opera companies.
  const allLeads = rawLeads.filter((lead: any) => {
    const org = (lead.organization || '').toLowerCase()

    // Hard reject: non-vocal music (orchestras, bands, opera)
    const nonVocalPatterns = [
      'symphony', 'philharmonic', 'orchestra', 'opera company',
      'marching band', 'drum corps', 'jazz band', 'concert band',
    ]
    if (nonVocalPatterns.some(p => org.includes(p))) {
      console.log(`[Discovery:Orchestrator] Filtered non-vocal: "${lead.organization}"`)
      return false
    }

    // Hard reject: K-12 school programs (not college)
    const k12Patterns = [
      'high school', 'middle school', 'elementary school',
      'school district', 'grade school', 'junior high',
    ]
    if (k12Patterns.some(p => org.includes(p))) {
      console.log(`[Discovery:Orchestrator] Filtered K-12: "${lead.organization}"`)
      return false
    }

    // Soft reject: classical-only choral orgs (unless they also do contemporary)
    const classicalPatterns = ['choral society', 'choral international', 'bach', 'handel society', 'early music', 'madrigal']
    const contemporarySignals = ['a cappella', 'pop', 'rock', 'jazz', 'barbershop', 'contemporary', 'gospel', 'show']
    const isClassical = classicalPatterns.some(p => org.includes(p))
    const hasContemporary = contemporarySignals.some(p => org.includes(p))
    if (isClassical && !hasContemporary) {
      console.log(`[Discovery:Orchestrator] Filtered classical-only: "${lead.organization}"`)
      return false
    }

    return true
  })

  if (rawLeads.length > allLeads.length) {
    const filtered = rawLeads.length - allLeads.length
    console.log(`[Discovery:Orchestrator] Org type filter removed ${filtered} college/classical leads`)
    warnings.push(`${filtered} leads filtered out (college/university or classical)`)
  }

  // Seasonal filter — skip groups whose org type is currently off-season
  // (e.g. collegiate groups in summer). Campaigns can opt out via
  // includeOffSeason to build pipeline ahead of an upcoming active season.
  const currentSeason = getSeasonForDate(new Date())
  const seasonResult = await filterBySeasonality(allLeads as Array<{ organization: string | null; activeSeasons?: string | null }>, {
    includeOffSeason: campaign.includeOffSeason,
  })
  const inSeasonLeads = seasonResult.kept as typeof allLeads
  const offSeasonCount = seasonResult.skipped.length
  if (offSeasonCount > 0) {
    console.log(
      `[Discovery:Orchestrator] Seasonal filter removed ${offSeasonCount} off-season leads (current season: ${currentSeason})`
    )
    warnings.push(
      `${offSeasonCount} leads filtered out as off-season in ${currentSeason} (set Campaign.includeOffSeason to override)`
    )
    if (process.env.NODE_ENV !== 'production') {
      for (const { lead, reason } of seasonResult.skipped.slice(0, 10)) {
        console.log(`[Discovery:Orchestrator] Off-season: "${lead.organization ?? ''}" — ${reason}`)
      }
    }
  }

  const originalCount = inSeasonLeads.length

  // Deduplicate by email (keeping highest score per email)
  const deduped = deduplicate(inSeasonLeads as any[])

  // Calculate deduplication statistics
  const deduplicationStats = getDeduplicationStats(originalCount, deduped.length)

  // Phase 3: Add recommendations to leads
  // Fetch full lead data with bookings for recommendation matching
  const leadsWithRecommendations = await Promise.all(
    deduped.map(async (lead) => {
      // Fetch full lead data including bookings
      const fullLead = await prisma.lead.findUnique({
        where: { id: lead.id },
        include: {
          contacts: {
            select: {
              bookings: {
                select: { serviceType: true },
                where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
              },
            },
          },
        },
      })

      if (!fullLead) {
        return { ...lead, recommendations: [], recommendationBonus: 0 }
      }

      // Flatten bookings from contacts for the recommendation engine
      const leadWithBookings = {
        ...fullLead,
        bookings: fullLead.contacts.flatMap(c => c.bookings),
      }

      // Classify organization type
      const orgType = classifyOrganization(fullLead.organization || '')

      // Get service recommendations
      const recommendations = await getRecommendations({
        lead: leadWithBookings,
        organizationType: orgType,
        campaignBooking: campaign.booking,
      })

      // Calculate recommendation score bonus
      const recommendationBonus = calculateRecommendationBonus(recommendations)

      return {
        ...lead,
        recommendations,
        recommendationBonus,
      }
    })
  )

  // Score all leads (now includes recommendation bonus)
  const scored = leadsWithRecommendations.map((lead) => ({
    ...lead,
    score: calculateScore(lead, campaign) + (lead.recommendationBonus || 0),
  }))

  // Quality gate: reject low-score leads, but KEEP leads with website/phone even without email
  const qualityFiltered = scored.filter((lead) => {
    const hasPlaceholderEmail = (lead as any).email?.includes('@placeholder.local')
    const needsEnrichment = (lead as any).needsEnrichment
    const hasWebsite = !!(lead as any).website
    const hasPhone = !!(lead as any).phone

    // If no email AND no website AND no phone → truly useless, reject
    if (hasPlaceholderEmail && !hasWebsite && !hasPhone) return false

    // Enforce minimum score by source
    const threshold = lead.source === 'AI_RESEARCH' ? COLD_SCORE_THRESHOLD : WARM_SCORE_THRESHOLD
    return lead.score >= threshold
  })

  const filteredOutCount = scored.length - qualityFiltered.length
  if (filteredOutCount > 0) {
    console.log(`[Discovery:Orchestrator] Quality gate filtered out ${filteredOutCount} leads (score threshold or placeholder email)`)
    warnings.push(`${filteredOutCount} leads filtered out by quality gate (score < ${COLD_SCORE_THRESHOLD} for cold / ${WARM_SCORE_THRESHOLD} for warm, or placeholder email)`)
  }

  // Calculate score statistics (on filtered leads)
  const scores = qualityFiltered.map((lead) => lead.score)
  const scoreStats = calculateScoreStats(scores)
  const avgScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0

  // Insert CampaignLead records in database
  // For SQLite compatibility, filter out existing campaign-lead pairs before inserting
  if (qualityFiltered.length > 0) {
    // Get existing campaign-lead pairs to avoid duplicates
    const existingPairs = await prisma.campaignLead.findMany({
      where: {
        campaignId: campaign.id,
        leadId: { in: qualityFiltered.map((lead) => lead.id) },
      },
      select: {
        leadId: true,
      },
    })

    const existingLeadIds = new Set(existingPairs.map((pair) => pair.leadId))

    // Filter out leads that are already in the campaign
    const newLeads = qualityFiltered.filter((lead) => !existingLeadIds.has(lead.id))

    // Insert only new leads
    if (newLeads.length > 0) {
      await prisma.campaignLead.createMany({
        data: newLeads.map((lead) => ({
          campaignId: campaign.id,
          leadId: lead.id,
          score: lead.score,
          distance: lead.distance ?? null, // null for leads without coordinates
          source: lead.source,
          status: 'PENDING',
          // Phase 3: Store recommendations
          recommendedServices: lead.recommendations && lead.recommendations.length > 0
            ? JSON.stringify(lead.recommendations.map((r: any) => r.serviceType))
            : null,
          recommendationReason: lead.recommendations && lead.recommendations.length > 0
            ? buildRecommendationReason(lead.recommendations)
            : null,
          recommendationScore: lead.recommendationBonus || null,
        })),
      })
    }
  }

  const duration = Date.now() - startTime

  if (warnings.length > 0) {
    console.warn('[Discovery:Orchestrator] Warnings:', warnings)
  }

  console.log(`[Discovery:Orchestrator] Complete: ${qualityFiltered.length} leads in ${duration}ms (${filteredOutCount} filtered out)`)

  // Emit discovery_completed event to trigger CURATOR quality evaluation
  try {
    await eventBus.emit({
      eventId: crypto.randomUUID(),
      sourceAgent: 'scout',
      eventType: 'discovery_completed',
      payload: {
        campaignId: campaign.id,
        totalLeads: qualityFiltered.length,
        filteredOut: filteredOutCount,
        avgScore: Math.round(avgScore * 10) / 10,
      },
      timestamp: new Date(),
    })
  } catch (eventError) {
    console.error('[Discovery:Orchestrator] Failed to emit discovery_completed event:', eventError)
  }

  return {
    total: qualityFiltered.length,
    filteredOut: filteredOutCount,
    bySource,
    avgScore: Math.round(avgScore * 10) / 10, // Round to 1 decimal
    scoreStats,
    deduplicationStats,
    duration,
    warnings,
    diagnostics: sourceDiagnostics,
    errors: sourceErrors,
  }
}

/**
 * Clear all discovered leads for a campaign
 *
 * Useful for re-running discovery with updated parameters.
 *
 * @param campaignId - The campaign ID to clear leads for
 * @returns Number of leads removed
 */
export async function clearDiscoveredLeads(campaignId: string): Promise<number> {
  const result = await prisma.campaignLead.deleteMany({
    where: { campaignId },
  })

  return result.count
}

/**
 * Get discovery statistics for a campaign
 *
 * @param campaignId - The campaign ID
 * @returns Current statistics for discovered leads
 */
export async function getDiscoveryStats(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      leads: {
        include: {
          lead: true,
        },
      },
    },
  })

  if (!campaign) {
    throw new Error('Campaign not found')
  }

  const leads = campaign.leads

  const bySource = {
    PAST_CLIENT: leads.filter((l) => l.source === 'PAST_CLIENT').length,
    DORMANT: leads.filter((l) => l.source === 'DORMANT').length,
    SIMILAR_ORG: leads.filter((l) => l.source === 'SIMILAR_ORG').length,
    AI_RESEARCH: leads.filter((l) => l.source === 'AI_RESEARCH').length,
  }

  const byStatus = {
    PENDING: leads.filter((l) => l.status === 'PENDING').length,
    CONTACTED: leads.filter((l) => l.status === 'CONTACTED').length,
    OPENED: leads.filter((l) => l.status === 'OPENED').length,
    CLICKED: leads.filter((l) => l.status === 'CLICKED').length,
    RESPONDED: leads.filter((l) => l.status === 'RESPONDED').length,
    BOOKED: leads.filter((l) => l.status === 'BOOKED').length,
    DECLINED: leads.filter((l) => l.status === 'DECLINED').length,
    REMOVED: leads.filter((l) => l.status === 'REMOVED').length,
  }

  const scores = leads.map((l) => l.score)
  const scoreStats = calculateScoreStats(scores)
  const avgScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0

  return {
    total: leads.length,
    bySource,
    byStatus,
    avgScore: Math.round(avgScore * 10) / 10,
    scoreStats,
  }
}
