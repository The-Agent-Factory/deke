"use client";

import { useCallback, useMemo, useState } from "react";
import { SKILLS, skillsForKind, type SkillDef } from "@/lib/skills/catalog";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ActivityDTO = {
  id: string;
  title: string;
  body: string | null;
  lane: string;
  kind: string;
  owner: string | null;
  priority: string;
  dueAt: string | null;
  source: string;
  sortIndex: number;
  lastNote: string | null;
  lastJobStatus: string | null;
  lastJobSkill: string | null;
};

export type UpcomingDTO = {
  id: string;
  title: string;
  location: string | null;
  startDate: string | null;
  status: string;
};

type LaneDef = { id: string; label: string; hint: string; dot: string };

/* ------------------------------------------------------------------ */
/* Vocabulary — plain language, never system words                     */
/* ------------------------------------------------------------------ */

const LANES: LaneDef[] = [
  { id: "INBOX", label: "New", hint: "Just came in", dot: "#9B5DE5" },
  { id: "TODAY", label: "Today", hint: "Doing this now", dot: "#0066FF" },
  { id: "DOING", label: "In progress", hint: "Underway", dot: "#F59E0B" },
  { id: "WAITING", label: "Waiting", hint: "On someone else", dot: "#9CA3AF" },
  { id: "DONE", label: "Done", hint: "Finished", dot: "#10B981" },
];

const KIND_LABELS: Record<string, string> = {
  GIG: "Show",
  CONTENT: "Content",
  ADMIN: "Admin",
  IDEA: "Idea",
  FOLLOWUP: "Follow up",
};

const KIND_STYLES: Record<string, string> = {
  GIG: "bg-amber-100 text-amber-900 border-amber-200",
  CONTENT: "bg-violet-100 text-violet-900 border-violet-200",
  ADMIN: "bg-slate-100 text-slate-800 border-slate-200",
  IDEA: "bg-sky-100 text-sky-900 border-sky-200",
  FOLLOWUP: "bg-rose-100 text-rose-900 border-rose-200",
};

const OWNER_STYLES: Record<string, string> = {
  Denis: "bg-indigo-100 text-indigo-900 border-indigo-200",
  Deke: "bg-rose-100 text-rose-900 border-rose-200",
};

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "Text",
  email: "Email",
  web: "Typed",
  auto: "Automatic",
};

/* ------------------------------------------------------------------ */
/* Date helpers                                                        */
/* ------------------------------------------------------------------ */

function formatDue(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatWhen(iso: string | null): string {
  if (!iso) return "Date to be set";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function isOverdue(iso: string): boolean {
  const due = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function CommandClient({
  initialActivities,
  upcoming,
  pendingInquiries,
  queuedJobs,
}: {
  initialActivities: ActivityDTO[];
  upcoming: UpcomingDTO[];
  pendingInquiries: number;
  queuedJobs: number;
}) {
  const [activities, setActivities] = useState<ActivityDTO[]>(initialActivities);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [confirmSkill, setConfirmSkill] = useState<{
    activityId: string;
    skill: SkillDef;
  } | null>(null);

  const byLane = useMemo(() => {
    const map: Record<string, ActivityDTO[]> = {};
    for (const lane of LANES) map[lane.id] = [];
    for (const a of activities) {
      (map[a.lane] ??= []).push(a);
    }
    return map;
  }, [activities]);

  const flash = useCallback((tone: "ok" | "bad", text: string) => {
    setBanner({ tone, text });
    window.setTimeout(() => setBanner(null), 5000);
  }, []);

  /* ---------------- card moves ---------------- */

  const moveCard = useCallback(
    async (id: string, lane: string) => {
      const before = activities;
      // Optimistic: the board must feel instant, but revert loudly on failure.
      setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, lane } : a)));

      try {
        const res = await fetch(`/api/activities/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lane }),
        });
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
      } catch (err) {
        setActivities(before);
        flash("bad", err instanceof Error ? err.message : "Could not save that move.");
      }
    },
    [activities, flash],
  );

  const archiveCard = useCallback(
    async (id: string) => {
      const before = activities;
      setActivities((prev) => prev.filter((a) => a.id !== id));
      setOpenCard(null);
      try {
        const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`Remove failed (${res.status})`);
      } catch (err) {
        setActivities(before);
        flash("bad", err instanceof Error ? err.message : "Could not remove that card.");
      }
    },
    [activities, flash],
  );

  /* ---------------- add a card ---------------- */

  const addCard = useCallback(async () => {
    const text = composer.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: text, lane: "INBOX", smart: true }),
      });
      if (!res.ok) throw new Error(`Could not add that (${res.status})`);
      const { activity } = await res.json();
      setActivities((prev) => [
        {
          id: activity.id,
          title: activity.title,
          body: activity.body,
          lane: activity.lane,
          kind: activity.kind,
          owner: activity.owner,
          priority: activity.priority,
          dueAt: activity.dueAt,
          source: activity.source,
          sortIndex: activity.sortIndex,
          lastNote: `Typed: "${text.slice(0, 120)}"`,
          lastJobStatus: null,
          lastJobSkill: null,
        },
        ...prev,
      ]);
      setComposer("");
      flash("ok", "Added.");
    } catch (err) {
      flash("bad", err instanceof Error ? err.message : "Could not add that.");
    } finally {
      setBusy(false);
    }
  }, [composer, busy, flash]);

  /* ---------------- run a skill ---------------- */

  const runSkill = useCallback(
    async (activityId: string, skill: SkillDef, confirmed: boolean) => {
      if (skill.danger && !confirmed) {
        setConfirmSkill({ activityId, skill });
        return;
      }
      setConfirmSkill(null);
      setBusy(true);
      try {
        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skill: skill.id, activityId, confirm: confirmed }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Could not start that (${res.status})`);
        }
        setActivities((prev) =>
          prev.map((a) =>
            a.id === activityId ? { ...a, lastJobStatus: "QUEUED", lastJobSkill: skill.id } : a,
          ),
        );
        flash("ok", `Queued: ${skill.label}. It runs on the studio machine.`);
      } catch (err) {
        flash("bad", err instanceof Error ? err.message : "Could not start that.");
      } finally {
        setBusy(false);
      }
    },
    [flash],
  );

  /* ---------------- render ---------------- */

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Command Center
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Everything on the go, in one place. Text or email it in, or type it below.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <StatPill label="New" value={byLane.INBOX?.length ?? 0} tone="violet" />
          <StatPill label="Inquiries waiting" value={pendingInquiries} tone="amber" />
          <StatPill label="Jobs running" value={queuedJobs} tone="blue" />
        </div>
      </header>

      {banner && (
        <div
          role="status"
          className={`rounded-lg border px-4 py-2 text-sm ${
            banner.tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {banner.text}
        </div>
      )}

      {upcoming.length > 0 && (
        <section aria-label="Coming up">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Coming up
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {upcoming.map((u) => {
              const days = daysUntil(u.startDate);
              return (
                <div
                  key={u.id}
                  className="min-w-[230px] shrink-0 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      {formatWhen(u.startDate)}
                    </span>
                    {days !== null && days >= 0 && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          days <= 7
                            ? "bg-amber-100 text-amber-900"
                            : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-medium leading-snug text-neutral-900">
                    {u.title}
                  </p>
                  {u.location && (
                    <p className="mt-0.5 truncate text-xs text-neutral-500">{u.location}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <label htmlFor="composer" className="text-sm font-medium text-neutral-800">
          What needs doing?
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="composer"
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addCard();
            }}
            placeholder="remind me to send the Kingston contract before Friday"
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2.5 text-base outline-none focus:border-neutral-900"
          />
          <button
            type="button"
            onClick={addCard}
            disabled={busy || !composer.trim()}
            className="rounded-lg bg-neutral-900 px-5 py-2.5 text-base font-medium text-white disabled:opacity-40"
          >
            Add
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Type it the way you would say it. It gets sorted, assigned and dated for you.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {LANES.map((lane) => {
          const cards = byLane[lane.id] ?? [];
          return (
            <div
              key={lane.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(lane.id);
              }}
              onDragLeave={() => setDragOver((cur) => (cur === lane.id ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                if (dragId) moveCard(dragId, lane.id);
                setDragId(null);
              }}
              className={`rounded-xl border p-3 transition-colors ${
                dragOver === lane.id
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200 bg-neutral-50/50"
              }`}
            >
              <div className="mb-3 flex items-baseline gap-2">
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: lane.dot }}
                />
                <h3 className="text-sm font-semibold text-neutral-900">{lane.label}</h3>
                <span className="text-xs text-neutral-400">{cards.length}</span>
              </div>
              <p className="-mt-2 mb-3 text-[11px] text-neutral-500">{lane.hint}</p>

              <div className="space-y-2">
                {cards.length === 0 && (
                  <p className="rounded-lg border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
                    Nothing here
                  </p>
                )}

                {cards.map((card) => {
                  const expanded = openCard === card.id;
                  const actions = skillsForKind(card.kind);
                  return (
                    <article
                      key={card.id}
                      draggable
                      onDragStart={() => setDragId(card.id)}
                      onDragEnd={() => setDragId(null)}
                      className={`cursor-grab rounded-lg border bg-white p-3 shadow-sm transition-shadow active:cursor-grabbing ${
                        dragId === card.id ? "opacity-50" : "hover:shadow-md"
                      } ${card.priority === "HIGH" ? "border-rose-300" : "border-neutral-200"}`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenCard(expanded ? null : card.id)}
                        className="w-full text-left"
                      >
                        <p className="text-sm font-medium leading-snug text-neutral-900">
                          {card.title}
                        </p>
                      </button>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                            KIND_STYLES[card.kind] ?? KIND_STYLES.ADMIN
                          }`}
                        >
                          {KIND_LABELS[card.kind] ?? card.kind}
                        </span>
                        {card.owner && (
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                              OWNER_STYLES[card.owner] ?? ""
                            }`}
                          >
                            {card.owner}
                          </span>
                        )}
                        {card.dueAt && (
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                              isOverdue(card.dueAt)
                                ? "border-rose-200 bg-rose-100 text-rose-900"
                                : "border-neutral-200 bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            {formatDue(card.dueAt)}
                          </span>
                        )}
                        {card.source !== "web" && (
                          <span className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] text-neutral-500">
                            {SOURCE_LABELS[card.source] ?? card.source}
                          </span>
                        )}
                        {card.lastJobStatus && (
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                              card.lastJobStatus === "FAILED"
                                ? "border-rose-200 bg-rose-100 text-rose-900"
                                : card.lastJobStatus === "DONE"
                                  ? "border-emerald-200 bg-emerald-100 text-emerald-900"
                                  : "border-blue-200 bg-blue-100 text-blue-900"
                            }`}
                          >
                            {card.lastJobStatus === "DONE"
                              ? "Job finished"
                              : card.lastJobStatus === "FAILED"
                                ? "Job failed"
                                : "Job running"}
                          </span>
                        )}
                      </div>

                      {expanded && (
                        <div className="mt-3 space-y-3 border-t border-neutral-100 pt-3">
                          {card.body && (
                            <p className="whitespace-pre-wrap text-xs leading-relaxed text-neutral-600">
                              {card.body}
                            </p>
                          )}
                          {card.lastNote && (
                            <p className="text-[11px] italic text-neutral-500">{card.lastNote}</p>
                          )}

                          <div>
                            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                              Do it for me
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {actions.map((skill) => (
                                <button
                                  key={skill.id}
                                  type="button"
                                  disabled={busy}
                                  onClick={() => runSkill(card.id, skill, false)}
                                  title={skill.description}
                                  className={`rounded-md border px-2 py-1 text-[11px] font-medium disabled:opacity-40 ${
                                    skill.danger
                                      ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                                      : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                                  }`}
                                >
                                  {skill.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {LANES.filter((l) => l.id !== card.lane).map((l) => (
                              <button
                                key={l.id}
                                type="button"
                                onClick={() => moveCard(card.id, l.id)}
                                className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50"
                              >
                                {"→"} {l.label}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => archiveCard(card.id)}
                              className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-500 hover:bg-rose-50 hover:text-rose-700"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {confirmSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-neutral-900">{confirmSkill.skill.label}?</h3>
            <p className="mt-2 text-sm text-neutral-600">{confirmSkill.skill.description}</p>
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              This one goes out to the public. Nothing else on this board does.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmSkill(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => runSkill(confirmSkill.activityId, confirmSkill.skill, true)}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white"
              >
                Yes, do it
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="pt-2 text-xs text-neutral-400">
        {SKILLS.length} automated actions available. Drag a card between columns to move it.
      </footer>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "violet" | "amber" | "blue";
}) {
  const tones = {
    violet: "border-violet-200 bg-violet-50 text-violet-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
  };
  return (
    <span className={`rounded-full border px-3 py-1.5 font-medium ${tones[tone]}`}>
      {label}: {value}
    </span>
  );
}
