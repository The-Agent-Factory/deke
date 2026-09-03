/**
 * The skill catalogue: what a card button can actually run.
 *
 * `label` is what Deke reads. It says what happens in plain language, never a
 * skill name. `danger` marks anything that reaches the outside world, which the
 * UI renders as a two-step confirm and the API refuses without confirmation.
 */

export type SkillDef = {
  id: string
  label: string
  description: string
  danger: boolean
  kinds: string[] // which card kinds offer this action ('*' = all)
}

export const SKILLS: SkillDef[] = [
  {
    id: 'dropbox-check',
    label: 'Check for new footage',
    description: "Look in Deke's Dropbox for anything new and report what landed.",
    danger: false,
    kinds: ['*'],
  },
  {
    id: 'channel-pulse',
    label: 'How are the channels doing?',
    description: 'Pull the latest follower and view numbers across TikTok, Instagram and YouTube.',
    danger: false,
    kinds: ['*'],
  },
  {
    id: 'content-pipeline',
    label: 'Turn footage into content',
    description: 'Run the full video pipeline on the newest file. Stops at every approval gate.',
    danger: false,
    kinds: ['CONTENT'],
  },
  {
    id: 'deke-video',
    label: 'Build a branded video',
    description: 'Produce a branded cut with captions and bookends.',
    danger: false,
    kinds: ['CONTENT'],
  },
  {
    id: 'postiz-dry-run',
    label: 'Check the posts before sending',
    description: 'Validate a scheduled batch of posts without sending anything.',
    danger: false,
    kinds: ['CONTENT'],
  },
  {
    id: 'postiz-publish',
    label: 'Schedule the posts for real',
    description: 'Send the batch to the social calendar. Requires a clean dry run first.',
    danger: true,
    kinds: ['CONTENT'],
  },
]

export const SKILL_IDS = SKILLS.map((s) => s.id)

export function getSkill(id: string): SkillDef | undefined {
  return SKILLS.find((s) => s.id === id)
}

export function skillsForKind(kind: string): SkillDef[] {
  return SKILLS.filter((s) => s.kinds.includes(kind) || s.kinds.includes('*'))
}
