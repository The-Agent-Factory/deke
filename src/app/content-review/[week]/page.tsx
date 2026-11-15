import type { Metadata } from 'next'
import { WEEK_RE, getReview, tokensMatch } from '@/lib/content-review'
import { newsletterSender, renderOneVoiceHtml } from '@/lib/newsletter/one-voice'
import { ReviewForm } from './review-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Next week on your channels',
  robots: { index: false, follow: false },
}

export default async function ContentReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ week: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const { week } = await params
  const { t } = await searchParams
  const review = WEEK_RE.test(week) ? await getReview(week) : null

  if (!review || !t || !tokensMatch(t, review.token)) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">This link is not valid</h1>
        <p className="mt-3 text-neutral-600">Ask Denis to send the latest review link.</p>
      </main>
    )
  }

  const isDry = week.startsWith('dry-')
  const monday = new Date(`${week.replace('dry-', '')}T12:00:00`)
  const label = monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const deadline = new Date(review.deadline).toLocaleString('en-US', {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Toronto',
    timeZoneName: 'short',
  })

  // One Voice issues are shown exactly as readers will see them (test mode shows a missing address).
  const postalAddress = newsletterSender().postalAddress
  const newsletterHtml: Record<string, string> = {}
  for (const item of review.items) {
    if (item.lane === 'newsletter' && item.newsletter) {
      newsletterHtml[item.id] = renderOneVoiceHtml(item.newsletter, { kind: 'test', postalAddress })
    }
  }
  const hasNewsletter = Object.keys(newsletterHtml).length > 0
  const onlyNewsletter = hasNewsletter && review.items.every((i) => i.lane === 'newsletter')

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      {isDry ? (
        <p className="mb-6 rounded-md border border-amber-400 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          DRY RUN. This is a test of the review page. Your answers are recorded for the test only, and nothing is posted.
        </p>
      ) : null}
      <p className="text-sm font-semibold uppercase tracking-wider text-amber-700">
        {onlyNewsletter ? 'One Voice . your newsletter' : `Total Vocal . week of ${label}`}
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-balance">
        {onlyNewsletter ? 'Your newsletter is ready to read' : 'Next week on your channels'}
      </h1>
      {onlyNewsletter ? (
        <p className="mt-3 text-neutral-700">
          Here is the next issue of One Voice, built from your own words. Read it, then tap Approve to send it or
          Hold to keep it back. It only goes out if you tap Approve.
        </p>
      ) : (
        <>
          <p className="mt-3 text-neutral-700">
            Here is everything planned for next week, all built from your own videos and words. Tap Approve or Skip
            on each one, then press Send. Anything you skip never posts.
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            If there is no answer by {deadline}, everything here goes out as planned
            {hasNewsletter ? ', except the newsletter: it only goes out if you tap Approve on it' : ''}.
          </p>
        </>
      )}
      <ReviewForm
        week={week}
        token={t}
        newsletterHtml={newsletterHtml}
        items={review.items}
        initialDecisions={review.decisions}
        initialNote={review.note}
        submittedAt={review.submittedAt}
      />
    </main>
  )
}
