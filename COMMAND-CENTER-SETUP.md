# Command Center — how to switch it on

Built 2026-09-02. Updated 2026-09-03: **messaging intake is suspended.** The
board takes work from the dashboard composer only. The board itself is live and
working with 23 real cards, and one optional step remains if you want the
"Do it for me" buttons to actually run.

---

## What this is

One page, `/dashboard/command`, where every activity is a card.

- **You type one line into the box at the top.** An agent reads it, works out
  what it is, who owns it, and when it is due, and drops a sorted card on the
  board. Type it the way you would say it; it does the filing.
- **WhatsApp, SMS and email intake are switched off** (your call, 2026-09-03).
  The plumbing is still there and tested, just gated. See "Turning messaging
  back on" at the bottom.
- **The board shows five columns** in plain language: New, Today, In progress,
  Waiting, Done. Drag a card to move it.
- **Each card has "Do it for me" buttons** that run the real automation on your
  machine: check Dropbox, run the content pipeline, dry-run the posts, and so on.
- **A "Coming up" rail** across the top reads the real bookings, so the board can
  never disagree with the calendar.

Nothing publishes itself. The one action that reaches the public asks twice.

---

## Step 1 — Register the runner (optional)

Railway cannot reach your laptop, so the laptop pulls work instead. The runner
polls for queued jobs and executes them via a headless Claude session.

Paste this once in a normal PowerShell window (I am permission-blocked from
registering scheduled tasks):

```powershell
schtasks /create /tn "DekeSkillRunner" /tr "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File C:\Users\lafla\claude_projects\deke\scripts\skill-runner.ps1" /sc minute /mo 5 /f
```

Then apply the battery fix, or it will silently skip runs the way the other
scheduled tasks did:

```powershell
Set-ScheduledTask -TaskName "DekeSkillRunner" -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries)
```

Test it by hand first:

```powershell
pwsh -File C:\Users\lafla\claude_projects\deke\scripts\skill-runner.ps1 -Once
```

Logs land in `scripts\logs\`.

---

## What the buttons actually do

| Button on the card | What runs |
|---|---|
| Check for new footage | `dropbox-ingest.mjs check`, reports only, pulls nothing |
| How are the channels doing? | The channel-pulse skill |
| Turn footage into content | The content-pipeline skill, stops at the first approval gate |
| Build a branded video | The deke-video skill |
| Check the posts before sending | Postiz publisher in dry-run, sends nothing |
| Schedule the posts for real | Postiz publish, **asks for confirmation first** |

The last one is the only action that reaches the public. The interface asks
twice, and the API refuses it outright without an explicit confirmation. The
runner also refuses to publish a batch that has no clean dry run on record.

---

## Where things live

| Piece | Path |
|---|---|
| The board | `src/app/dashboard/command/` |
| Message triage | `src/lib/triage/` |
| Skill catalogue | `src/lib/skills/catalog.ts` |
| Activity API | `src/app/api/activities/` |
| Job queue API | `src/app/api/jobs/` |
| Email intake | `src/app/api/webhooks/inbound-email/route.ts` |
| WhatsApp and SMS intake | `src/app/api/webhooks/twilio/route.ts` |
| The runner | `scripts/skill-runner.ps1` |
| Card seeder | `scripts/seed-command-center.ts` |

Re-running the seeder is safe. It updates existing cards rather than duplicating
them, and it never drags a card back out of the column you moved it to.

---

## Before you deploy

The local repo was 42 commits behind GitLab, so `git pull` first. Nothing has
been committed or deployed. The database changes are already applied to
`deke-production`, and they are additive only, so the running site is unaffected
until you ship the code.

New environment variables to set in Railway:

```
COMMAND_INTAKE_SENDERS    Deke's number and email, comma-separated
COMMAND_INTAKE_SECRET     any long random string, for the email webhook
COMMAND_RUNNER_URL        the public app URL the runner polls
TWILIO_WEBHOOK_URL        the public webhook URL, only if behind a proxy
```

`CRON_SECRET` already exists and guards the runner endpoints too.

---

## One thing I fixed while in there

The public marketing header, footer, newsletter popup and notification popup
were rendering on top of every dashboard page, including the existing ones. A
logged-in admin was being asked to subscribe to a newsletter. The mechanism to
prevent this already existed and simply had not been pointed at the dashboard.
`/dashboard` and `/login` are now excluded.

---

## Turning messaging back on

Nothing was deleted. The Twilio webhook, the signature check, the sender
allow-list and the triage agent are all still in place and still tested. One
flag gates the whole thing, so there is a single place to change your mind:

1. Set `COMMAND_INTAKE_ENABLED="true"` in Railway.
2. Set `COMMAND_INTAKE_SENDERS` to Deke's number, digits only is fine
   (`COMMAND_INTAKE_SENDERS="16175551234"`). Empty still rejects everyone.
3. In the Twilio console, point the WhatsApp sandbox's "when a message comes in"
   at `https://<your-app>/api/webhooks/twilio` (POST).

Until step 1 is done, every inbound message is refused no matter what else is
configured. Verified 2026-09-03: with the flag unset, WhatsApp, SMS and email
addresses are all rejected, and an unsigned webhook call gets a 403 before it
reaches the intake path at all.
