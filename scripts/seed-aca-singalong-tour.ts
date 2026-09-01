/**
 * Seed the Aca-Singalong Ontario tour (October 2026) into public Bookings.
 *
 * Replaces the vague "Pitch Perfect Singalongs / All Across Ontario" placeholder
 * with the 16 individual published tour dates.
 *
 * Idempotent: re-running updates existing rows instead of duplicating them.
 * Run:  npx tsx scripts/seed-aca-singalong-tour.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

// Contact that owns the Ontario tour (Sing! Toronto), reused from the placeholder.
const TOUR_CONTACT_ID = 'cmn4zo8wg000b1dpnhd1n9qw8'
const PLACEHOLDER_ID = 'cmnf6o3rb000915s960hflydd'

/** Ontario is UTC-4 in October (EDT), so local 19:30 == 23:30 UTC. */
function eastern(day: number, hour: number, minute: number): Date {
  return new Date(Date.UTC(2026, 9, day, hour + 4, minute))
}

interface TourDate {
  day: number
  hour: number
  minute: number
  venue: string
  city: string
  hall?: string
  ticketUrl?: string
  note?: string
}

const TOUR: TourDate[] = [
  { day: 6,  hour: 19, minute: 30, venue: 'Capitol Centre',                          city: 'North Bay',     hall: 'Betty Speers Theatre', ticketUrl: 'https://capitolcentre.org/all-events/theatre-events/sing-pitch-perfect-with-deke-sharon-and-spluesh' },
  { day: 7,  hour: 19, minute: 30, venue: 'Orillia Opera House',                     city: 'Orillia',                                     ticketUrl: 'https://secure1.tixhub.com/orillia-oh/online/b_otix.asp?cboPerformances=6363&cboEvent=2561&width=' },
  { day: 8,  hour: 19, minute: 30, venue: 'Burlington Performing Arts Centre',       city: 'Burlington',                                  ticketUrl: 'https://burlingtonpac.ca/event/sing-pitch-perfect/' },
  { day: 9,  hour: 20, minute: 0,  venue: 'Chrysler Theatre',                        city: 'Windsor',                                     ticketUrl: 'https://ci.ovationtix.com/36274/production/1269631?performanceId=11792969' },
  { day: 13, hour: 19, minute: 30, venue: 'Ancaster Memorial Arts Centre',           city: 'Ancaster',      hall: 'Peller Hall',          ticketUrl: 'https://www.memorialarts.ca/event-calendar' },
  { day: 14, hour: 19, minute: 30, venue: 'FirstOntario Performing Arts Centre',     city: 'St. Catharines', hall: 'Partridge Hall',      ticketUrl: 'https://www.firstontariopac.ca/Online/default.asp' },
  { day: 15, hour: 20, minute: 0,  venue: 'Oakville Centre for the Performing Arts', city: 'Oakville',                                    ticketUrl: 'https://www.oakvillecentre.ca/whats-on/upcoming-events/sing-pitch-perfect-with-deke-sharon-splush/' },
  { day: 16, hour: 19, minute: 30, venue: 'Rose Theatre',                            city: 'Brampton',                                    ticketUrl: 'https://tickets.brampton.ca/Online/default.asp' },
  { day: 17, hour: 19, minute: 30, venue: 'Kingston Grand Theatre',                  city: 'Kingston',                                    ticketUrl: 'https://www.kingstongrand.ca/events/sing-pitch-perfect-with-deke-sharon-splush' },
  { day: 18, hour: 15, minute: 0,  venue: 'Shenkman Arts Centre',                    city: 'Ottawa',                                      ticketUrl: 'https://shenkmanarts.ca/en/sing-pitch-perfect' },
  { day: 22, hour: 19, minute: 30, venue: 'FirstOntario Arts Centre Milton',         city: 'Milton',        hall: 'Mattamy Theatre',      ticketUrl: 'https://www.firstontarioartscentremilton.ca/en/shows-and-events/sing-pitch-perfect-with-deke-sharon-and-splush.aspx' },
  // Markham + Mississauga: source list repeated the Milton URL. Left without a link
  // rather than pointing ticket buyers at the wrong box office.
  { day: 23, hour: 20, minute: 0,  venue: 'Flato Markham Theatre',                   city: 'Markham' },
  { day: 24, hour: 20, minute: 0,  venue: 'Living Arts Centre',                      city: 'Mississauga' },
  { day: 25, hour: 19, minute: 30, venue: 'River Run Centre',                        city: 'Guelph',                                      ticketUrl: 'https://riverrun.ca/whats-on/sing-pitch-perfect/' },
  { day: 26, hour: 10, minute: 30, venue: 'Centre in the Square',                    city: 'Kitchener',     note: 'School shows at 10:30 am and 12:30 pm. Not on sale to the general public.' },
  { day: 29, hour: 20, minute: 0,  venue: 'Richmond Hill Centre for the Performing Arts', city: 'Richmond Hill',                          ticketUrl: 'https://www.rhcentre.ca/Online/default.asp' },
]

function titleFor(d: TourDate) {
  return `Sing Pitch Perfect with Deke Sharon and SPLUSH - ${d.city}`
}

function descriptionFor(d: TourDate) {
  if (d.note) return d.note
  const time = new Date(Date.UTC(2026, 9, d.day, d.hour, d.minute))
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
    .toLowerCase()
  return d.hall
    ? `${time} show at ${d.venue}, ${d.hall}.`
    : `${time} show at ${d.venue}.`
}

async function main() {
  const contact = await prisma.contact.findUnique({ where: { id: TOUR_CONTACT_ID } })
  if (!contact) throw new Error(`Tour contact ${TOUR_CONTACT_ID} not found. Aborting.`)

  let created = 0
  let updated = 0

  for (const d of TOUR) {
    const startDate = eastern(d.day, d.hour, d.minute)
    const publicTitle = titleFor(d)

    const data = {
      contactId: TOUR_CONTACT_ID,
      serviceType: 'SINGALONG',
      status: 'CONFIRMED',
      startDate,
      endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000),
      timezone: 'America/Toronto',
      location: `${d.venue}, ${d.city}, ON`,
      organization: d.venue,
      isPublic: true,
      publicTitle,
      publicDescription: descriptionFor(d),
      ticketUrl: d.ticketUrl ?? null,
      internalNotes: 'Aca-Singalong Ontario tour, October 2026.',
    }

    const existing = await prisma.booking.findFirst({
      where: { publicTitle, startDate },
      select: { id: true },
    })

    if (existing) {
      await prisma.booking.update({ where: { id: existing.id }, data })
      updated++
      console.log(`updated  Oct ${d.day}  ${d.city}`)
    } else {
      await prisma.booking.create({ data })
      created++
      console.log(`created  Oct ${d.day}  ${d.city}`)
    }
  }

  // Retire the vague catch-all placeholder now that real dates exist.
  const placeholder = await prisma.booking.findUnique({ where: { id: PLACEHOLDER_ID } })
  if (placeholder) {
    await prisma.booking.delete({ where: { id: PLACEHOLDER_ID } })
    console.log(`\nremoved placeholder: "${placeholder.publicTitle}"`)
  }

  console.log(`\nDone. created=${created} updated=${updated}`)
  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
