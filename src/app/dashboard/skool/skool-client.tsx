"use client";

import { useEffect, useState } from "react";
import {
  GraduationCap,
  FileText,
  SlidersHorizontal,
  ExternalLink,
  Plus,
  X,
  RotateCcw,
  DollarSign,
  Users,
  TrendingUp,
  Pencil,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/* ------------------------------------------------------------------ */
/* Types & seed data                                                   */
/* ------------------------------------------------------------------ */

type Phase = "Pre-launch" | "Launch" | "Scale" | "Ops";
type ColumnId = "backlog" | "todo" | "in_progress" | "review" | "done";
type Assignee = "Denis" | "Deke" | null;

type Task = {
  id: string;
  title: string;
  phase: Phase;
  column: ColumnId;
  assignee?: Assignee;
  due?: string | null; // ISO date (yyyy-mm-dd)
};

const COLUMNS: { id: ColumnId; label: string; dot: string }[] = [
  { id: "backlog", label: "Backlog", dot: "#9CA3AF" },
  { id: "todo", label: "To Do", dot: "#0066FF" },
  { id: "in_progress", label: "In Progress", dot: "#F59E0B" },
  { id: "review", label: "Review", dot: "#9B5DE5" },
  { id: "done", label: "Done", dot: "#10B981" },
];

const PHASE_STYLES: Record<Phase, string> = {
  "Pre-launch": "bg-sky-100 text-sky-800 border-sky-200",
  Launch: "bg-amber-100 text-amber-800 border-amber-200",
  Scale: "bg-violet-100 text-violet-800 border-violet-200",
  Ops: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

// Who can own a card. `null` = unassigned. This is high-level PM only —
// everything is actually executed by Claude Code; the assignee just signals
// who owns / reviews the work.
const ASSIGNEES: Assignee[] = ["Denis", "Deke"];

const ASSIGNEE_STYLES: Record<"Denis" | "Deke", { badge: string; dot: string }> = {
  Denis: { badge: "bg-indigo-100 text-indigo-800 border-indigo-200", dot: "#6366F1" },
  Deke: { badge: "bg-rose-100 text-rose-800 border-rose-200", dot: "#C05A3C" },
};

function initials(name: "Denis" | "Deke") {
  return name.slice(0, 2).toUpperCase();
}

// Format an ISO date (yyyy-mm-dd) for display, parsed as a local date so it
// doesn't drift a day from UTC.
function formatDue(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// True when the due date is strictly before today (local midnight).
function isOverdue(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const due = new Date(y, (m ?? 1) - 1, d ?? 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

const STORAGE_KEY = "deke-skool-kanban-v1";
const BACKUP_KEY = "deke-skool-kanban-v1-backup";

const SEED_TASKS: Task[] = [
  // Pre-launch
  { id: "t1", title: "Create Skool group(s) + brand them", phase: "Pre-launch", column: "in_progress", assignee: "Denis", due: "2026-06-05" },
  { id: "t2", title: "Write classroom course outline", phase: "Pre-launch", column: "in_progress", assignee: "Deke", due: "2026-06-10" },
  { id: "t3", title: "Record flagship course: Arranging in 10 Steps", phase: "Pre-launch", column: "todo", assignee: "Deke", due: "2026-06-20" },
  { id: "t4", title: "Record flagship course: Blend & Tuning", phase: "Pre-launch", column: "todo", assignee: "Deke" },
  { id: "t5", title: "Record flagship course: Performance & Stage Presence", phase: "Pre-launch", column: "backlog" },
  { id: "t6", title: "Set up Stripe + tier pricing ($29 / $99 / $497)", phase: "Pre-launch", column: "todo" },
  { id: "t7", title: "Build free group + founding-member waitlist", phase: "Pre-launch", column: "todo" },
  { id: "t8", title: "Email platform integration + onboarding sequence", phase: "Pre-launch", column: "backlog" },
  { id: "t9", title: "Draft community guidelines", phase: "Pre-launch", column: "backlog" },
  { id: "t10", title: "Warm email list & socials with teasers", phase: "Pre-launch", column: "todo" },
  { id: "t11", title: "Produce guest-interview trailers", phase: "Pre-launch", column: "backlog" },
  // Launch
  { id: "t12", title: "Founding-member promo email to 25k+ list", phase: "Launch", column: "backlog" },
  { id: "t13", title: "Host free live kickoff event (convert on the call)", phase: "Launch", column: "backlog" },
  { id: "t14", title: "Open VIP cohort — hard cap 15–25 seats", phase: "Launch", column: "backlog" },
  { id: "t15", title: "Publish first weekly live class", phase: "Launch", column: "backlog" },
  // Scale
  { id: "t16", title: "Set up content repurposing workflow (live → library → clips)", phase: "Scale", column: "backlog" },
  { id: "t17", title: "Book first 3 guest interviews", phase: "Scale", column: "backlog" },
  { id: "t18", title: "Launch annual plan option (≈2 months free)", phase: "Scale", column: "backlog" },
  { id: "t19", title: "Set up referral / member-get-member program", phase: "Scale", column: "backlog" },
  // Ops
  { id: "t20", title: "Weekly metrics review: MRR · churn · conversion · VIP fill", phase: "Ops", column: "backlog" },
];

const PHASES: Phase[] = ["Pre-launch", "Launch", "Scale", "Ops"];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function SkoolClient() {
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [loaded, setLoaded] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<ColumnId | null>(null);
  const [addingTo, setAddingTo] = useState<ColumnId | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPhase, setNewPhase] = useState<Phase>("Pre-launch");
  const [newAssignee, setNewAssignee] = useState<Assignee>(null);
  const [newDue, setNewDue] = useState("");
  const [backup, setBackup] = useState<Task[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Hydrate once from localStorage after mount. Done in an effect (not a lazy
  // initializer) so server and first client render both match SEED_TASKS and
  // avoid a hydration mismatch.
  useEffect(() => {
    let stored: Task[] | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw) as Task[];
    } catch {
      /* ignore malformed storage */
    }
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from persisted state
      setTasks(stored);
    }
    // Surface a recoverable backup (e.g. from a reset before a refresh).
    try {
      const rawBackup = localStorage.getItem(BACKUP_KEY);
      if (rawBackup) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from persisted state
        setBackup(JSON.parse(rawBackup) as Task[]);
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  // Persist whenever tasks change (after initial load)
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      /* storage unavailable — keep working in-memory */
    }
  }, [tasks, loaded]);

  function moveTask(id: string, column: ColumnId) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, column } : t)));
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setEditingId((cur) => (cur === id ? null : cur));
  }

  function updateTask(id: string, patch: Partial<Task>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function addTask(column: ColumnId) {
    const title = newTitle.trim();
    if (!title) return;
    setTasks((prev) => [
      ...prev,
      {
        id: `t${Date.now()}`,
        title,
        phase: newPhase,
        column,
        assignee: newAssignee,
        due: newDue || null,
      },
    ]);
    setNewTitle("");
    setNewAssignee(null);
    setNewDue("");
    setAddingTo(null);
  }

  function resetBoard() {
    const confirmed = window.confirm(
      "Reset the board to the default launch plan?\n\nThis clears your current cards. A backup is saved automatically, so you can Undo right after."
    );
    if (!confirmed) return;
    // Stash the current board so a reset is always recoverable, even after refresh.
    setBackup(tasks);
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(tasks));
    } catch {
      /* storage unavailable — in-memory backup still allows immediate undo */
    }
    setTasks(SEED_TASKS);
  }

  function undoReset() {
    let restore: Task[] | null = backup;
    if (!restore) {
      try {
        const raw = localStorage.getItem(BACKUP_KEY);
        if (raw) restore = JSON.parse(raw) as Task[];
      } catch {
        /* ignore */
      }
    }
    if (restore) setTasks(restore);
    setBackup(null);
    try {
      localStorage.removeItem(BACKUP_KEY);
    } catch {
      /* ignore */
    }
  }

  const completed = tasks.filter((t) => t.column === "done").length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const editingTask = tasks.find((t) => t.id === editingId) ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#C05A3C]/10">
            <GraduationCap className="h-6 w-6 text-[#C05A3C]" />
          </div>
          <div>
            <h1
              className="text-2xl font-bold text-[#1a1a1a]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Skool Project
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[#888]">
              Deke A Cappella — build, launch, and operate the membership community.
              Target: $25,000/month across three tiers.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="border-[#E8E4DD]"
          onClick={resetBoard}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset board
        </Button>
      </div>

      {/* Undo-after-reset banner — keeps an accidental reset fully recoverable */}
      {backup && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">
            Board was reset to the default plan. Your previous board is backed up.
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 bg-amber-600 px-3 text-xs text-white hover:bg-amber-700"
              onClick={undoReset}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Undo reset
            </Button>
            <button
              onClick={() => {
                setBackup(null);
                try {
                  localStorage.removeItem(BACKUP_KEY);
                } catch {
                  /* ignore */
                }
              }}
              className="text-xs font-medium text-amber-700 hover:text-amber-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Strategy resources */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ResourceCard
          href="/skool/deke-skool-launch-brief.html"
          icon={<FileText className="h-5 w-5 text-[#C05A3C]" />}
          tint="#C05A3C"
          title="Launch Brief — Start This Week"
          desc="The meeting one-pager + this-week launch pack: $10k/mo math, the email, posts & run of show. Print / PDF ready."
        />
        <ResourceCard
          href="/skool/deke-skool-build.html"
          icon={<GraduationCap className="h-5 w-5 text-[#1B1B33]" />}
          tint="#1B1B33"
          title="Community Build Overview"
          desc="The visual walkthrough to show Deke: groups, tiers, classroom, levels & launch — his brand front and center."
        />
        <ResourceCard
          href="/skool/deke-skool-strategy.html"
          icon={<FileText className="h-5 w-5 text-[#3E8E6E]" />}
          tint="#3E8E6E"
          title="Strategy & Operations Analysis"
          desc="The full proposal: tiers, content cadence, monetization, launch plan, ops & risks. Print / PDF ready."
        />
        <ResourceCard
          href="/skool/deke-skool-planner.html"
          icon={<SlidersHorizontal className="h-5 w-5 text-[#D9A23F]" />}
          tint="#D9A23F"
          title="Interactive Revenue Planner"
          desc="Toggle community options and drag pricing to watch MRR / ARR update live against the $25k goal."
        />
      </div>

      {/* Revenue snapshot */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<DollarSign className="h-5 w-5" />} tint="#C05A3C" value="$25,476" label="Target MRR" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} tint="#D9A23F" value="$305,712" label="Target ARR" />
        <StatCard icon={<Users className="h-5 w-5" />} tint="#1B1B33" value="508" label="Paying members" />
        <StatCard icon={<GraduationCap className="h-5 w-5" />} tint="#3E8E6E" value={`${progress}%`} label="Launch tasks done" />
      </div>

      {/* Kanban */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2
            className="text-sm font-bold uppercase tracking-[1.5px] text-[#1a1a1a]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Launch Board
          </h2>
          <span className="text-xs text-[#aaa]">Saved to this browser · drag to move · hover a card to edit</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.column === col.id);
            return (
              <div
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(col.id);
                }}
                onDragLeave={() => setDragOver((c) => (c === col.id ? null : c))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId) moveTask(dragId, col.id);
                  setDragId(null);
                  setDragOver(null);
                }}
                className={`flex flex-col rounded-xl border bg-[#FAFAF8] p-3 transition-colors ${
                  dragOver === col.id ? "border-[#C05A3C] bg-[#C05A3C]/5" : "border-[#E8E4DD]"
                }`}
              >
                {/* Column header */}
                <div className="mb-2 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.dot }} />
                    <span
                      className="text-xs font-bold uppercase tracking-[1px] text-[#555]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {col.label}
                    </span>
                  </div>
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#E8E4DD] px-1.5 text-[10px] font-semibold text-[#666]">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-1 flex-col gap-2">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setDragOver(null);
                      }}
                      className={`group cursor-grab rounded-lg border border-[#E8E4DD] bg-white p-3 shadow-soft transition-all hover:border-[#C05A3C]/40 active:cursor-grabbing ${
                        dragId === task.id ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-medium leading-snug text-[#1a1a1a]">
                          {task.title}
                        </p>
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => setEditingId(task.id)}
                            aria-label="Edit task"
                          >
                            <Pencil className="h-3.5 w-3.5 text-[#bbb] hover:text-[#C05A3C]" />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            aria-label="Delete task"
                          >
                            <X className="h-3.5 w-3.5 text-[#bbb] hover:text-[#C05A3C]" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${PHASE_STYLES[task.phase]}`}
                        >
                          {task.phase}
                        </span>
                        {task.assignee && (
                          <span
                            className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${ASSIGNEE_STYLES[task.assignee].badge}`}
                          >
                            <span
                              className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7px] font-bold text-white"
                              style={{ backgroundColor: ASSIGNEE_STYLES[task.assignee].dot }}
                            >
                              {initials(task.assignee)}
                            </span>
                            {task.assignee}
                          </span>
                        )}
                        {task.due && (
                          <span
                            className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                              isOverdue(task.due) && task.column !== "done"
                                ? "border-red-200 bg-red-100 text-red-700"
                                : "border-[#E8E4DD] bg-[#F5F3EF] text-[#777]"
                            }`}
                          >
                            <Calendar className="h-2.5 w-2.5" />
                            {formatDue(task.due)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add card */}
                  {addingTo === col.id ? (
                    <div className="rounded-lg border border-[#C05A3C]/40 bg-white p-2">
                      <textarea
                        autoFocus
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            addTask(col.id);
                          }
                          if (e.key === "Escape") {
                            setAddingTo(null);
                            setNewTitle("");
                            setNewAssignee(null);
                            setNewDue("");
                          }
                        }}
                        placeholder="Task title…"
                        rows={2}
                        className="w-full resize-none rounded border border-[#E8E4DD] p-1.5 text-[13px] text-[#1a1a1a] outline-none focus:border-[#C05A3C]"
                      />
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <select
                          value={newPhase}
                          onChange={(e) => setNewPhase(e.target.value as Phase)}
                          className="rounded border border-[#E8E4DD] px-1.5 py-1 text-[11px] text-[#555] outline-none"
                        >
                          {PHASES.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                        <select
                          value={newAssignee ?? ""}
                          onChange={(e) =>
                            setNewAssignee((e.target.value || null) as Assignee)
                          }
                          className="rounded border border-[#E8E4DD] px-1.5 py-1 text-[11px] text-[#555] outline-none"
                        >
                          <option value="">Unassigned</option>
                          {ASSIGNEES.map((a) => (
                            <option key={a} value={a ?? ""}>
                              {a}
                            </option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={newDue}
                          onChange={(e) => setNewDue(e.target.value)}
                          className="col-span-2 rounded border border-[#E8E4DD] px-1.5 py-1 text-[11px] text-[#555] outline-none"
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs text-white hover:opacity-90"
                          style={{ backgroundColor: "#C05A3C" }}
                          onClick={() => addTask(col.id)}
                        >
                          Add
                        </Button>
                        <button
                          onClick={() => {
                            setAddingTo(null);
                            setNewTitle("");
                            setNewAssignee(null);
                            setNewDue("");
                          }}
                          className="text-[11px] text-[#999] hover:text-[#555]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAddingTo(col.id);
                        setNewTitle("");
                        setNewAssignee(null);
                        setNewDue("");
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-dashed border-[#D8D4CD] px-3 py-2 text-[12px] font-medium text-[#999] transition-colors hover:border-[#C05A3C]/50 hover:text-[#C05A3C]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add card
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editingTask && (
        <EditModal
          task={editingTask}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            updateTask(editingTask.id, patch);
            setEditingId(null);
          }}
          onDelete={() => deleteTask(editingTask.id)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function EditModal({
  task,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task;
  onClose: () => void;
  onSave: (patch: Partial<Task>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [phase, setPhase] = useState<Phase>(task.phase);
  const [column, setColumn] = useState<ColumnId>(task.column);
  const [assignee, setAssignee] = useState<Assignee>(task.assignee ?? null);
  const [due, setDue] = useState(task.due ?? "");

  // Close on Escape for quick keyboard dismissal.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSave({ title: trimmed, phase, column, assignee, due: due || null });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#E8E4DD] bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3
            className="text-base font-bold text-[#1a1a1a]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Edit card
          </h3>
          <button onClick={onClose} aria-label="Close">
            <X className="h-4 w-4 text-[#bbb] hover:text-[#C05A3C]" />
          </button>
        </div>

        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#888]">
          Title
        </label>
        <textarea
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          rows={2}
          className="mb-4 w-full resize-none rounded-lg border border-[#E8E4DD] p-2 text-sm text-[#1a1a1a] outline-none focus:border-[#C05A3C]"
        />

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#888]">
              Column
            </label>
            <select
              value={column}
              onChange={(e) => setColumn(e.target.value as ColumnId)}
              className="w-full rounded-lg border border-[#E8E4DD] px-2 py-1.5 text-sm text-[#555] outline-none focus:border-[#C05A3C]"
            >
              {COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#888]">
              Phase
            </label>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value as Phase)}
              className="w-full rounded-lg border border-[#E8E4DD] px-2 py-1.5 text-sm text-[#555] outline-none focus:border-[#C05A3C]"
            >
              {PHASES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#888]">
              Assignee
            </label>
            <select
              value={assignee ?? ""}
              onChange={(e) => setAssignee((e.target.value || null) as Assignee)}
              className="w-full rounded-lg border border-[#E8E4DD] px-2 py-1.5 text-sm text-[#555] outline-none focus:border-[#C05A3C]"
            >
              <option value="">Unassigned</option>
              {ASSIGNEES.map((a) => (
                <option key={a} value={a ?? ""}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#888]">
              Due date
            </label>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="w-full rounded-lg border border-[#E8E4DD] px-2 py-1.5 text-sm text-[#555] outline-none focus:border-[#C05A3C]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={onDelete}
            className="text-xs font-medium text-[#C05A3C] hover:underline"
          >
            Delete card
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-sm font-medium text-[#999] hover:text-[#555]"
            >
              Cancel
            </button>
            <Button
              size="sm"
              className="text-white hover:opacity-90"
              style={{ backgroundColor: "#C05A3C" }}
              onClick={save}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResourceCard({
  href,
  icon,
  title,
  desc,
  tint,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  tint: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      <Card className="border-[#E8E4DD] bg-white">
        <CardContent className="flex items-start gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${tint}1a` }}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-[#1a1a1a]">{title}</p>
              <ExternalLink className="h-3.5 w-3.5 text-[#bbb]" />
            </div>
            <p className="mt-1 text-sm text-[#888]">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

function StatCard({
  icon,
  value,
  label,
  tint,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tint: string;
}) {
  return (
    <Card className="border-[#E8E4DD] bg-white">
      <CardContent className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${tint}1a`, color: tint }}
        >
          {icon}
        </div>
        <div>
          <p className="text-xl font-bold text-[#1a1a1a]">{value}</p>
          <p className="text-xs font-medium text-[#888]">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
