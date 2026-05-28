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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/* ------------------------------------------------------------------ */
/* Types & seed data                                                   */
/* ------------------------------------------------------------------ */

type Phase = "Pre-launch" | "Launch" | "Scale" | "Ops";
type ColumnId = "backlog" | "todo" | "in_progress" | "review" | "done";

type Task = {
  id: string;
  title: string;
  phase: Phase;
  column: ColumnId;
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

const STORAGE_KEY = "deke-skool-kanban-v1";

const SEED_TASKS: Task[] = [
  // Pre-launch
  { id: "t1", title: "Create Skool group(s) + brand them", phase: "Pre-launch", column: "in_progress" },
  { id: "t2", title: "Write classroom course outline", phase: "Pre-launch", column: "in_progress" },
  { id: "t3", title: "Record flagship course: Arranging in 10 Steps", phase: "Pre-launch", column: "todo" },
  { id: "t4", title: "Record flagship course: Blend & Tuning", phase: "Pre-launch", column: "todo" },
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
  }

  function addTask(column: ColumnId) {
    const title = newTitle.trim();
    if (!title) return;
    setTasks((prev) => [
      ...prev,
      { id: `t${Date.now()}`, title, phase: newPhase, column },
    ]);
    setNewTitle("");
    setAddingTo(null);
  }

  function resetBoard() {
    setTasks(SEED_TASKS);
  }

  const completed = tasks.filter((t) => t.column === "done").length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

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
              The A Cappella Academy — build, launch, and operate the membership community.
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

      {/* Strategy resources */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ResourceCard
          href="/skool/deke-skool-strategy.html"
          icon={<FileText className="h-5 w-5 text-[#0066FF]" />}
          tint="#0066FF"
          title="Strategy & Operations Analysis"
          desc="The full proposal: tiers, content cadence, monetization, launch plan, ops & risks. Print / PDF ready."
        />
        <ResourceCard
          href="/skool/deke-skool-planner.html"
          icon={<SlidersHorizontal className="h-5 w-5 text-[#9B5DE5]" />}
          tint="#9B5DE5"
          title="Interactive Revenue Planner"
          desc="Toggle community options and drag pricing to watch MRR / ARR update live against the $25k goal."
        />
      </div>

      {/* Revenue snapshot */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<DollarSign className="h-5 w-5" />} tint="#0066FF" value="$25,476" label="Target MRR" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} tint="#9B5DE5" value="$305,712" label="Target ARR" />
        <StatCard icon={<Users className="h-5 w-5" />} tint="#FF6B6B" value="508" label="Paying members" />
        <StatCard icon={<GraduationCap className="h-5 w-5" />} tint="#13988e" value={`${progress}%`} label="Launch tasks done" />
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
          <span className="text-xs text-[#aaa]">Saved to this browser · drag cards between columns</span>
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
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label="Delete task"
                        >
                          <X className="h-3.5 w-3.5 text-[#bbb] hover:text-[#C05A3C]" />
                        </button>
                      </div>
                      <span
                        className={`mt-2 inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${PHASE_STYLES[task.phase]}`}
                      >
                        {task.phase}
                      </span>
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
                          }
                        }}
                        placeholder="Task title…"
                        rows={2}
                        className="w-full resize-none rounded border border-[#E8E4DD] p-1.5 text-[13px] text-[#1a1a1a] outline-none focus:border-[#C05A3C]"
                      />
                      <div className="mt-2 flex items-center gap-2">
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
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

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
