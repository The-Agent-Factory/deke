import Anthropic from '@anthropic-ai/sdk'

/**
 * Shared Anthropic client.
 *
 * Before this existed, src/app/api/chat/route.ts and agents/curator/evaluator.ts
 * each instantiated their own client and hardcoded their own model id, which is
 * how a retired model id survived in two places. One client, one model table.
 */

let client: Anthropic | null = null

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

/** Cheap + fast: triage, classification, short structured extraction. */
export const MODEL_FAST = 'claude-haiku-4-5'

/** Reasoning work: drafting, judgement calls, anything a human will read. */
export const MODEL_SMART = 'claude-sonnet-5'

export function hasAnthropic(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}
