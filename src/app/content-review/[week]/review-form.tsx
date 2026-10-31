'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import type { Decision, ReviewItem } from '@/lib/content-review'

type Props = {
  week: string
  token: string
  items: ReviewItem[]
  initialDecisions: Record<string, Decision> | null
  initialNote: string | null
  submittedAt: string | null
}

export function ReviewForm({ week, token, items, initialDecisions, initialNote, submittedAt }: Props) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>(initialDecisions ?? {})
  const [note, setNote] = useState(initialNote ?? '')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>(submittedAt ? 'sent' : 'idle')
  const [error, setError] = useState('')

  const answered = items.filter((i) => decisions[i.id]).length
  const allAnswered = answered === items.length

  const choose = (id: string, d: Decision) => {
    setDecisions((prev) => ({ ...prev, [id]: d }))
    if (state === 'sent') setState('idle')
  }

  const approveRest = () =>
    setDecisions((prev) => Object.fromEntries(items.map((i) => [i.id, prev[i.id] ?? 'approve'])))

  const send = async () => {
    setState('sending')
    setError('')
    try {
      const res = await fetch(`/api/content-review/${week}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, decisions, note }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `Could not save (${res.status})`)
      setState('sent')
    } catch (e) {
      setState('error')
      setError(e instanceof Error ? e.message : 'Could not save. Try again.')
    }
  }

  return (
    <div className="mt-8 grid gap-6">
      {items.map((item, n) => {
        const d = decisions[item.id]
        return (
          <section
            key={item.id}
            className={`rounded-lg border p-4 ${d === 'skip' ? 'border-neutral-300 bg-neutral-50 opacity-70' : d === 'approve' ? 'border-emerald-300' : 'border-neutral-200'}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {n + 1}. {item.lane === 'reel' ? 'Video' : 'Text post'} . {item.when} . {item.platforms.join(', ')}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{item.title}</h2>
            {item.videoUrl ? (
              <video
                className="mt-3 w-full max-w-xs rounded-md bg-black"
                src={item.videoUrl}
                poster={item.posterUrl}
                controls
                playsInline
                preload="none"
              />
            ) : null}
            <p className="mt-3 whitespace-pre-line text-neutral-800">{item.caption}</p>
            {item.sourceNote ? <p className="mt-2 text-xs text-neutral-500">From: {item.sourceNote}</p> : null}
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => choose(item.id, 'approve')}
                aria-pressed={d === 'approve'}
                className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold ${d === 'approve' ? 'bg-emerald-600 text-white' : 'border border-emerald-600 text-emerald-700'}`}
              >
                <Check className="h-4 w-4" /> Approve
              </button>
              <button
                type="button"
                onClick={() => choose(item.id, 'skip')}
                aria-pressed={d === 'skip'}
                className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold ${d === 'skip' ? 'bg-neutral-700 text-white' : 'border border-neutral-400 text-neutral-700'}`}
              >
                <X className="h-4 w-4" /> Skip
              </button>
            </div>
          </section>
        )
      })}

      <label className="grid gap-2" htmlFor="review-note">
        <span className="text-sm font-semibold">Anything to tell Denis? (optional)</span>
        <textarea
          id="review-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="rounded-md border border-neutral-300 p-3"
          placeholder="More like number 2, please."
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        {!allAnswered ? (
          <button type="button" onClick={approveRest} className="rounded-md border border-neutral-400 px-4 py-2 text-sm font-semibold">
            Approve all the rest
          </button>
        ) : null}
        <button
          type="button"
          onClick={send}
          disabled={!allAnswered || state === 'sending'}
          className="rounded-md bg-amber-600 px-5 py-2.5 font-semibold text-white disabled:opacity-40"
        >
          {state === 'sending' ? 'Sending...' : 'Send my answers'}
        </button>
        <span className="text-sm text-neutral-600">
          {answered} of {items.length} answered
        </span>
      </div>
      {state === 'sent' ? (
        <p className="rounded-md bg-emerald-50 p-3 text-emerald-800">
          Saved. Thank you! You can change your answers here until the week is scheduled.
        </p>
      ) : null}
      {state === 'error' ? <p className="rounded-md bg-red-50 p-3 text-red-700">{error}</p> : null}
    </div>
  )
}
