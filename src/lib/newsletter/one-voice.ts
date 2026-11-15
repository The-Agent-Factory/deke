/**
 * One Voice: Deke Sharon's weekly newsletter (decided by Denis, 2026-11-15).
 *
 * One issue = one OneVoiceDraft. The content engine writes the draft, Deke
 * approves it on his weekly review page, and the engine asks this site to
 * schedule it as a Resend broadcast. This module owns the format rules, the
 * email HTML and text, and the mapping into the /news archive.
 */

export type OneVoiceDraft = {
  issueNumber: number
  subject: string
  previewText: string
  /** 2 or 3 sentences: a moment or a line from Deke. Paragraphs split on blank lines. */
  opening: string
  /** The one practical fix to try at rehearsal this week. */
  tryThis: string
  /** This week's best reel, if there is one. */
  watch?: { title: string; url: string } | null
  /** The one Skool line of the issue. */
  inside: { text: string; linkText: string; url: string }
  /** The question readers are invited to answer by replying. */
  question: string
  /** Where every line came from (shown to Deke on the review page, never emailed). */
  sources?: string[]
}

export type RenderMode =
  | { kind: 'broadcast'; postalAddress: string }
  | { kind: 'test'; postalAddress: string | null }

const EM_DASH = '—'
const SITE = 'https://dekesharon.com'

/** Every rule a draft must pass before it can be shown to Deke, tested or scheduled. */
export function validateDraft(input: unknown): { draft: OneVoiceDraft | null; errors: string[] } {
  const errors: string[] = []
  const d = input as Partial<OneVoiceDraft> | null
  if (!d || typeof d !== 'object') return { draft: null, errors: ['draft must be an object'] }

  const str = (v: unknown, name: string, max: number, min = 1) => {
    if (typeof v !== 'string' || v.trim().length < min) errors.push(`${name} is required`)
    else if (v.length > max) errors.push(`${name} is ${v.length} characters (max ${max})`)
  }
  if (!Number.isInteger(d.issueNumber) || (d.issueNumber as number) < 0) errors.push('issueNumber must be a whole number, 0 or more')
  str(d.subject, 'subject', 70)
  str(d.previewText, 'previewText', 140)
  str(d.opening, 'opening', 900)
  str(d.tryThis, 'tryThis', 2200)
  str(d.question, 'question', 300)
  if (!d.inside || typeof d.inside !== 'object') errors.push('inside is required')
  else {
    str(d.inside.text, 'inside.text', 300)
    str(d.inside.linkText, 'inside.linkText', 60)
    if (typeof d.inside.url !== 'string' || !/^https:\/\/(www\.)?skool\.com\//.test(d.inside.url)) {
      errors.push('inside.url must be an https://skool.com/ link')
    }
  }
  if (d.watch) {
    str(d.watch.title, 'watch.title', 120)
    if (typeof d.watch.url !== 'string' || !d.watch.url.startsWith('https://')) errors.push('watch.url must be an https link')
  }

  const words = [d.opening, d.tryThis].filter((s): s is string => typeof s === 'string').join(' ').split(/\s+/).filter(Boolean).length
  if (words > 650) errors.push(`opening + tryThis is ${words} words (keep it a 3-minute read, max 650)`)

  const all = JSON.stringify(d)
  if (all.includes(EM_DASH)) errors.push('contains an em dash (U+2014); use a period, comma or colon')
  if (/choir director/i.test(all)) errors.push('says "choir director"; Deke\'s rule is "a cappella directors"')
  const bodyText = [d.opening, d.tryThis, d.question, d.watch?.title, d.subject, d.previewText].join(' ')
  if (/skool\.com/i.test(bodyText)) errors.push('Skool may appear only once per issue, in the inside block')

  return { draft: errors.length ? null : (d as OneVoiceDraft), errors }
}

/** Tag links we own so clicks can be counted per issue. */
export function tagLink(url: string, issueNumber: number): string {
  try {
    const u = new URL(url)
    if (!/(^|\.)skool\.com$|(^|\.)dekesharon\.com$/.test(u.hostname)) return url
    u.searchParams.set('utm_source', 'one-voice')
    u.searchParams.set('utm_medium', 'email')
    u.searchParams.set('utm_campaign', `issue-${issueNumber}`)
    return u.toString()
  } catch {
    return url
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Paragraphs with **bold** and [text](https://link) only. Everything else is escaped. */
function inline(s: string, issueNumber: number): string {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, (_m, text: string, url: string) =>
      `<a href="${esc(tagLink(url.replace(/&amp;/g, '&'), issueNumber))}" style="color:#9A6512;text-decoration:underline;">${text}</a>`)
}

function paras(s: string, issueNumber: number, style: string): string {
  return s
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p style="${style}">${inline(p.trim(), issueNumber).replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

function plain(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '$1 ($2)')
}

const C = {
  page: '#F4F1EB',
  card: '#FFFFFF',
  navy: '#151B2B',
  gold: '#E0A83A',
  goldInk: '#9A6512',
  ink: '#1F2433',
  muted: '#6B7080',
  line: '#E6E1D6',
}
const SERIF = "Georgia,'Times New Roman',serif"
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const P = `margin:0 0 16px;font-family:${SERIF};font-size:17px;line-height:1.65;color:${C.ink};`

function label(text: string): string {
  return `<p style="margin:0 0 10px;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.goldInk};">${esc(text)}</p>`
}

export function renderOneVoiceHtml(d: OneVoiceDraft, mode: RenderMode): string {
  const n = d.issueNumber
  const unsubscribe = mode.kind === 'broadcast' ? '{{{RESEND_UNSUBSCRIBE_URL}}}' : `${SITE}/news`
  const address = mode.postalAddress
    ? esc(mode.postalAddress)
    : '<span style="color:#B42318;font-weight:700;">[Postal address missing: required before this can go to subscribers]</span>'
  const testBanner =
    mode.kind === 'test'
      ? `<tr><td style="background:#FFF4D6;padding:10px 24px;font-family:${SANS};font-size:13px;color:#7A4B00;text-align:center;">Test copy for review. Subscribers have not received this.</td></tr>`
      : ''
  const watch = d.watch
    ? `<tr><td style="padding:8px 36px 8px;">${label('Watch')}<p style="${P}"><a href="${esc(tagLink(d.watch.url, n))}" style="color:${C.goldInk};font-weight:600;text-decoration:underline;">${esc(d.watch.title)}</a></p></td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<title>${esc(d.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(d.previewText)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.card};border:1px solid ${C.line};border-radius:6px;overflow:hidden;">
${testBanner}
<tr><td style="background:${C.navy};padding:22px 36px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="vertical-align:middle;padding-right:14px;"><img src="${SITE}/icon-192.png" width="40" height="40" alt="" style="display:block;border-radius:8px;"/></td>
    <td style="vertical-align:middle;">
      <p style="margin:0;font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${C.gold};">One Voice</p>
      <p style="margin:2px 0 0;font-family:${SANS};font-size:13px;color:#C9CEDB;">A weekly letter from Deke Sharon${n > 0 ? ` &middot; No. ${n}` : ''}</p>
    </td>
  </tr></table>
</td></tr>
<tr><td style="padding:32px 36px 4px;">
  <h1 style="margin:0 0 20px;font-family:${SERIF};font-size:28px;line-height:1.25;font-weight:600;color:${C.ink};">${esc(d.subject)}</h1>
  ${paras(d.opening, n, P)}
</td></tr>
<tr><td style="padding:8px 36px 8px;">
  <div style="border-left:3px solid ${C.gold};padding:2px 0 2px 18px;">
    ${label('Try it this week')}
    ${paras(d.tryThis, n, P)}
  </div>
</td></tr>
${watch}
<tr><td style="padding:8px 36px 8px;">
  <div style="background:#FBF6EA;border-radius:6px;padding:18px 20px;">
    ${label('Inside Total Vocal')}
    <p style="margin:0 0 12px;font-family:${SERIF};font-size:17px;line-height:1.6;color:${C.ink};">${inline(d.inside.text, n)}</p>
    <a href="${esc(tagLink(d.inside.url, n))}" style="display:inline-block;background:${C.navy};color:#FFFFFF;font-family:${SANS};font-size:14px;font-weight:600;text-decoration:none;padding:10px 18px;border-radius:5px;">${esc(d.inside.linkText)}</a>
  </div>
</td></tr>
<tr><td style="padding:16px 36px 32px;">
  ${paras(d.question, n, P)}
  <p style="margin:8px 0 0;font-family:${SERIF};font-size:17px;line-height:1.5;color:${C.ink};">Keep singing,<br/><strong>Deke</strong></p>
</td></tr>
<tr><td style="border-top:1px solid ${C.line};padding:20px 36px 26px;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.muted};">
  You are getting One Voice because you signed up at dekesharon.com.
  <a href="${esc(tagLink(`${SITE}/news`, n))}" style="color:${C.muted};">Read past issues</a> &middot;
  <a href="${unsubscribe}" style="color:${C.muted};">Unsubscribe</a><br/>
  Deke Sharon &middot; ${address}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

export function renderOneVoiceText(d: OneVoiceDraft, mode: RenderMode): string {
  const n = d.issueNumber
  const lines = [
    `ONE VOICE: a weekly letter from Deke Sharon${n > 0 ? ` (No. ${n})` : ''}`,
    '',
    d.subject.toUpperCase(),
    '',
    plain(d.opening.trim()),
    '',
    'TRY IT THIS WEEK',
    plain(d.tryThis.trim()),
    '',
  ]
  if (d.watch) lines.push('WATCH', `${d.watch.title}: ${tagLink(d.watch.url, n)}`, '')
  lines.push('INSIDE TOTAL VOCAL', plain(d.inside.text), `${d.inside.linkText}: ${tagLink(d.inside.url, n)}`, '')
  lines.push(plain(d.question.trim()), '', 'Keep singing,', 'Deke', '', '---')
  lines.push('You are getting One Voice because you signed up at dekesharon.com.')
  lines.push(`Unsubscribe: ${mode.kind === 'broadcast' ? '{{{RESEND_UNSUBSCRIBE_URL}}}' : `${SITE}/news`}`)
  lines.push(`Deke Sharon, ${mode.postalAddress ?? '[postal address missing]'}`)
  return lines.join('\n')
}

/** The /news archive keeps the four legacy columns; this maps an issue into them. */
export function toArchiveFields(d: OneVoiceDraft) {
  const community = [
    d.watch ? `**Watch:** [${d.watch.title}](${d.watch.url})` : '',
    `**Inside Total Vocal:** ${d.inside.text} [${d.inside.linkText}](${d.inside.url})`,
  ]
    .filter(Boolean)
    .join('\n\n')
  return {
    title: d.subject,
    subject: d.subject,
    storyContent: d.opening.trim(),
    craftContent: d.tryThis.trim(),
    communityContent: community,
    noteContent: d.question.trim(),
  }
}

export function newsletterSender() {
  return {
    from: process.env.NEWSLETTER_FROM || 'Deke Sharon <news@dekesharon.com>',
    replyTo: process.env.NEWSLETTER_REPLY_TO || 'deke@dekesharon.com',
    postalAddress: process.env.NEWSLETTER_POSTAL_ADDRESS?.trim() || null,
    segmentId: process.env.NEWSLETTER_SEGMENT_ID?.trim() || null,
  }
}
