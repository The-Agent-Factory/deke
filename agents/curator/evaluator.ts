/**
 * CURATOR Lead Quality Evaluator
 *
 * Uses Claude Haiku to batch-evaluate lead relevance to Deke Sharon's services.
 * Returns structured quality scores and reasoning for each lead.
 */

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const QUALITY_THRESHOLD = 50
const BATCH_SIZE = 15

export interface LeadForEvaluation {
  id: string
  campaignLeadId: string
  firstName: string
  lastName: string
  email: string
  organization: string | null
  source: string
  score: number
  contactTitle: string | null
  website: string | null
  editorialSummary: string | null
  googleRating: number | null
}

interface CampaignContext {
  name: string
  baseLocation: string
  radius: number
  targetOrgTypes: string | null
}

export interface QualityResult {
  campaignLeadId: string
  qualityScore: number
  qualityPassed: boolean
  qualityReason: string
}

const SYSTEM_PROMPT = `You are a lead quality evaluator for Deke Sharon, the "Father of Contemporary A Cappella."

Deke's services:
- A cappella workshops & clinics for choirs, schools, and festivals
- Vocal group coaching (in-person and virtual)
- Individual vocal coaching
- Custom vocal arrangements ($500-$3,000+)
- Keynote speaking on music, teamwork, and creativity
- Masterclasses for music educators

EVALUATE each lead on whether they would genuinely benefit from and potentially purchase Deke's services.

HIGH QUALITY leads (score 70-100):
- Choirs, choruses, a cappella groups, vocal ensembles
- Music schools, conservatories, university music departments
- Choral festivals, music conferences, arts organizations
- Sweet Adelines, Barbershop Harmony Society, CASA chapters
- School music programs (high school, college)
- Decision-makers with relevant titles (Music Director, Choir Director, etc.)

MEDIUM QUALITY leads (score 40-69):
- General performing arts organizations
- Churches with active music programs
- Community music organizations
- Generic contact info but relevant organization

LOW QUALITY leads (score 0-39):
- Non-music businesses that happen to have "music" in the name
- Record stores, instrument shops, music equipment retailers
- Barbershops (haircuts, not singing)
- Organizations with no clear connection to vocal music
- Leads with placeholder/fake contact info
- Generic community centers without music focus

You MUST respond with valid JSON only. No markdown, no explanation outside the JSON.`

function buildUserPrompt(
  leads: LeadForEvaluation[],
  campaign: CampaignContext
): string {
  const leadsData = leads.map((l) => ({
    campaignLeadId: l.campaignLeadId,
    name: `${l.firstName} ${l.lastName}`,
    email: l.email,
    organization: l.organization,
    source: l.source,
    discoveryScore: l.score,
    contactTitle: l.contactTitle,
    website: l.website,
    description: l.editorialSummary,
    googleRating: l.googleRating,
  }))

  return `Campaign: "${campaign.name}" targeting ${campaign.baseLocation} (${campaign.radius} mile radius)
${campaign.targetOrgTypes ? `Target org types: ${campaign.targetOrgTypes}` : ''}

Evaluate these ${leads.length} leads. For each, provide:
- qualityScore (0-100)
- qualityPassed (true if score >= ${QUALITY_THRESHOLD})
- qualityReason (one sentence explaining the score)

Respond with JSON: { "leads": [{ "campaignLeadId": "...", "qualityScore": N, "qualityPassed": bool, "qualityReason": "..." }] }

Leads to evaluate:
${JSON.stringify(leadsData, null, 2)}`
}

/**
 * Evaluate a batch of leads using Claude Haiku
 */
export async function evaluateLeadBatch(
  leads: LeadForEvaluation[],
  campaign: CampaignContext
): Promise<QualityResult[]> {
  if (leads.length === 0) return []

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildUserPrompt(leads, campaign) },
      ],
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text : ''

    const parsed = JSON.parse(text) as { leads: QualityResult[] }

    // Validate and normalize results
    return parsed.leads.map((result) => ({
      campaignLeadId: result.campaignLeadId,
      qualityScore: Math.min(100, Math.max(0, result.qualityScore || 0)),
      qualityPassed: result.qualityScore >= QUALITY_THRESHOLD,
      qualityReason: result.qualityReason || 'No reason provided',
    }))
  } catch (error) {
    console.error('[CURATOR:Evaluator] Batch evaluation failed:', error)
    // On failure, don't block — return null results so leads aren't gated
    return leads.map((lead) => ({
      campaignLeadId: lead.campaignLeadId,
      qualityScore: 0,
      qualityPassed: false,
      qualityReason: 'Evaluation failed — manual review required',
    }))
  }
}

/**
 * Split leads into batches for evaluation
 */
export function batchLeads<T>(leads: T[]): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    batches.push(leads.slice(i, i + BATCH_SIZE))
  }
  return batches
}
