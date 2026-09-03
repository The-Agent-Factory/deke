/**
 * Seed the Command Center with the real, current backlog.
 *
 * Idempotent: every card carries a deterministic marker in its body, so
 * re-running updates rather than duplicating. Safe to run repeatedly.
 *
 *   npx tsx scripts/seed-command-center.ts
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) {
  console.error('FATAL: DIRECT_URL or DATABASE_URL must be set')
  process.exit(1)
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

type Seed = {
  key: string
  title: string
  body?: string
  lane: string
  kind: string
  owner: string | null
  priority?: string
  dueAt?: string // YYYY-MM-DD
}

const MARK = 'seed:'

/**
 * The backlog, drawn from PLAN.md, the tour data already in Booking, and the
 * open commitments in the project docs. Deliberately no invented facts: every
 * card here traces to something already recorded.
 */
const SEEDS: Seed[] = [
  // --- blocked and time-critical ---
  {
    key: 'upload-tom',
    title: 'Upload the Tom Kerley interview to YouTube',
    body: 'Final branded cut is built and audio-processed. Needs a manual YouTube Studio upload, then paste the URL back so the Skool post can go out.',
    lane: 'TODAY',
    kind: 'CONTENT',
    owner: 'Denis',
    priority: 'HIGH',
  },
  {
    key: 'upload-alan',
    title: 'Upload the Alan interview to YouTube',
    body: 'Final branded cut is ready. First name only in every title and caption: the surname has never been confirmed.',
    lane: 'TODAY',
    kind: 'CONTENT',
    owner: 'Denis',
    priority: 'HIGH',
  },
  {
    key: 'skool-remeasure',
    title: 'Re-measure Skool members after 30 days of tagged posts',
    body: 'Baseline was taken 2026-08-24. If the number has not moved, the call-to-action copy is wrong and needs rewriting.',
    lane: 'WAITING',
    kind: 'CONTENT',
    owner: 'Denis',
    dueAt: '2026-09-28',
  },
  {
    key: 'deke-x-reauth',
    title: 'Reconnect the X account for posting',
    body: 'The X channel is disabled after repeated errors in August. Posts to X will keep failing until it is re-authorised.',
    lane: 'TODAY',
    kind: 'ADMIN',
    owner: 'Denis',
    priority: 'HIGH',
  },

  // --- the October tour ---
  {
    key: 'tour-prep',
    title: 'Prep pack for the October Ontario tour',
    body: 'Sixteen confirmed dates from Oct 6 to Oct 29 across Ontario. Needs a travel plan, a shared run sheet, and confirmation of what to film at each stop.',
    lane: 'TODAY',
    kind: 'GIG',
    owner: 'Denis',
    priority: 'HIGH',
    dueAt: '2026-09-25',
  },
  {
    key: 'tour-capture',
    title: 'Agree what gets filmed on tour',
    body: 'Sixteen shows is the largest content opportunity of the year. Decide the shot list before the first date so nothing is missed.',
    lane: 'TODAY',
    kind: 'CONTENT',
    owner: 'Deke',
    dueAt: '2026-10-01',
  },
  {
    key: 'tour-kitchener',
    title: 'Confirm the Kitchener school shows',
    body: 'Oct 26, two shows at 10:30 am and 12:30 pm. These are school performances and are not on sale to the general public, so they need separate handling.',
    lane: 'WAITING',
    kind: 'GIG',
    owner: 'Denis',
    dueAt: '2026-10-20',
  },

  // --- Ottawa in November ---
  {
    key: 'ottawa-venue',
    title: 'Lock the Ottawa concert venue',
    body: 'Main public concert is Fri Nov 28. Top choice is the National Arts Centre Azrieli Studio. Nothing can be promoted until the room is booked.',
    lane: 'TODAY',
    kind: 'GIG',
    owner: 'Denis',
    priority: 'HIGH',
    dueAt: '2026-09-15',
  },
  {
    key: 'ottawa-outreach',
    title: 'Send the Ottawa outreach emails',
    body: 'Letters and the choir database are written and ready. Around twenty Ottawa groups and schools to contact for the November concert.',
    lane: 'TODAY',
    kind: 'ADMIN',
    owner: 'Denis',
    dueAt: '2026-09-12',
  },
  {
    key: 'ottawa-tickets',
    title: 'Set up ticketing for the Ottawa concert',
    body: 'Depends on the venue being confirmed first.',
    lane: 'WAITING',
    kind: 'ADMIN',
    owner: 'Denis',
    dueAt: '2026-10-15',
  },
  {
    key: 'ottawa-songs',
    title: 'Choose the common songs for the Ottawa concert',
    body: 'Participating groups need the song list early enough to learn the parts. Learning tracks come after this.',
    lane: 'TODAY',
    kind: 'GIG',
    owner: 'Deke',
    dueAt: '2026-09-20',
  },

  // --- December ---
  {
    key: 'acatex-prep',
    title: 'Prep for AcaTex at Rockwall High School',
    body: 'Dec 4 to Dec 6 near Dallas. Two days of concerts and workshops.',
    lane: 'WAITING',
    kind: 'GIG',
    owner: 'Deke',
    dueAt: '2026-11-20',
  },

  // --- recurring commitments ---
  {
    key: 'newsletter-launch',
    title: 'Launch the newsletter',
    body: 'The framework and the six-issue calendar are written. Blocked on picking a platform and writing issue one. Lead magnet is a free arrangement plus a director cheat sheet.',
    lane: 'TODAY',
    kind: 'CONTENT',
    owner: 'Denis',
  },
  {
    key: 'directors-tier',
    title: 'Launch the a cappella directors tier',
    body: 'Locked at forty-nine dollars a month with a monthly live event and a members-only library. Always write "a cappella directors", never "choir directors".',
    lane: 'DOING',
    kind: 'ADMIN',
    owner: 'Denis',
  },
  {
    key: 'alan-followup',
    title: 'Record the Alan follow-up on starting a group from scratch',
    body: 'First producer session on Riverside. Needs a dry run before the session.',
    lane: 'WAITING',
    kind: 'CONTENT',
    owner: 'Denis',
  },
  {
    key: 'counterpoint-dryrun',
    title: 'Dry run before the first CounterPoint episode',
    body: 'The media board is host-only on non-Business Riverside plans. The dry run decides whether Deke triggers clips himself or Denis joins as a muted second host.',
    lane: 'WAITING',
    kind: 'CONTENT',
    owner: 'Denis',
  },
  {
    key: 'summer-break-episode',
    title: 'Record the episode on coming back from summer break',
    body: 'Deke committed to this one and called it timely. Aimed at directors.',
    lane: 'TODAY',
    kind: 'CONTENT',
    owner: 'Deke',
  },
  {
    key: 'deke-capture-homework',
    title: 'Set up the episode ideas folder and capture habit',
    body: 'Four things: an episode ideas folder, context intros for the two interviews, a five to ten minute promo ramble, and the walking musings habit for shorts.',
    lane: 'WAITING',
    kind: 'CONTENT',
    owner: 'Deke',
  },
  {
    key: 'social-restart',
    title: 'Restart the social posting queue',
    body: 'The channels have been quiet since mid-August. The agreed floor is three reels and two text posts a week.',
    lane: 'TODAY',
    kind: 'CONTENT',
    owner: 'Denis',
    priority: 'HIGH',
  },
  {
    key: 'growth-brief-fix',
    title: 'Fix the daily growth brief',
    body: 'It has been reporting the same stale number for weeks because the Skool site is blocked in the cloud sandbox. Needs the domain allowed in the environment settings.',
    lane: 'TODAY',
    kind: 'ADMIN',
    owner: 'Denis',
  },

  // --- open questions worth keeping visible ---
  {
    key: 'ask-festival-name',
    title: 'Ask Deke the name of the festival at the end of the trip',
    body: 'It was dictated as something that sounded like "pink town" and has never been verified. Do not print it anywhere until he confirms.',
    lane: 'WAITING',
    kind: 'FOLLOWUP',
    owner: 'Denis',
  },
  {
    key: 'ask-giveaway',
    title: 'Ask Deke to confirm the giveaway prize',
    body: 'Signed book mailed, or a free thirty minute coaching session. The copy is written both ways and held until he picks.',
    lane: 'WAITING',
    kind: 'FOLLOWUP',
    owner: 'Denis',
  },
  {
    key: 'ask-beatboxer-ok',
    title: 'Get explicit approval for the beatboxer reel',
    body: 'The performer appears to be a minor, so this one needs a clear yes before it can go anywhere.',
    lane: 'WAITING',
    kind: 'FOLLOWUP',
    owner: 'Denis',
  },
]

async function main() {
  console.log(`Seeding ${SEEDS.length} Command Center cards...`)

  let created = 0
  let updated = 0

  for (const seed of SEEDS) {
    const marker = `${MARK}${seed.key}`
    const body = seed.body ? `${seed.body}\n\n[${marker}]` : `[${marker}]`

    const existing = await prisma.activity.findFirst({
      where: { body: { contains: marker } },
    })

    const data = {
      title: seed.title,
      body,
      kind: seed.kind,
      owner: seed.owner,
      priority: seed.priority ?? 'NORMAL',
      dueAt: seed.dueAt ? new Date(`${seed.dueAt}T12:00:00Z`) : null,
      source: 'auto',
    }

    if (existing) {
      // Never yank a card back out of the lane a human moved it to.
      await prisma.activity.update({ where: { id: existing.id }, data })
      updated++
    } else {
      await prisma.activity.create({
        data: {
          ...data,
          lane: seed.lane,
          notes: {
            create: {
              author: 'system',
              kind: 'intake',
              body: 'Added from the existing project backlog.',
            },
          },
        },
      })
      created++
    }
  }

  const total = await prisma.activity.count({ where: { archivedAt: null } })
  console.log(`Done. Created ${created}, updated ${updated}. Board now holds ${total} cards.`)
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
