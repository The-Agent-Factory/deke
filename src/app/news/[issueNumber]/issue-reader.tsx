"use client";

import { useState } from "react";
import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

// ─── Types ───────────────────────────────────────────────

interface Comment {
  id: string;
  name: string;
  body: string;
  createdAt: string;
}

interface Issue {
  id: string;
  issueNumber: number;
  title: string;
  subject: string | null;
  storyContent: string | null;
  craftContent: string | null;
  communityContent: string | null;
  noteContent: string | null;
  sentAt: string | null;
  comments: Comment[];
}

interface Props {
  issue: Issue;
  prev: { issueNumber: number; title: string } | null;
  next: { issueNumber: number; title: string } | null;
}

// ─── Section Config ──────────────────────────────────────

// One Voice layout (2026-11-15): opening, the weekly fix, watch + Total Vocal, the question.
const SECTIONS = [
  { key: "storyContent" as const, label: "This week", accent: "#C9943A" },
  { key: "craftContent" as const, label: "Try it this week", accent: "#C9943A" },
  { key: "communityContent" as const, label: "Watch and listen", accent: "#C9943A" },
  { key: "noteContent" as const, label: "Your turn", accent: "#C9943A" },
] as const;

// ─── Content Renderer ────────────────────────────────────

/** Escape everything, then allow only **bold**, [text](https://link) and line breaks. */
function safeInline(p: string): string {
  return p
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener" class="text-[#C9943A] underline">$1</a>',
    )
    .replace(/\n/g, "<br/>");
}

function ContentBlock({ text }: { text: string }) {
  return (
    <div className="space-y-4">
      {text.split(/\n\n+/).map((p, i) => (
        <p
          key={i}
          className="text-[#C8CDD3] text-[16px] leading-[1.85] font-normal"
          dangerouslySetInnerHTML={{ __html: safeInline(p) }}
        />
      ))}
    </div>
  );
}

// ─── Comment Form ────────────────────────────────────────

function CommentForm({ issueId }: { issueId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !body) return;
    setStatus("submitting");
    try {
      const res = await fetch(`/api/newsletters/issues/${issueId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, body }),
      });
      if (res.ok) {
        setStatus("success");
        setName("");
        setEmail("");
        setBody("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-[#141C26] border border-[#C9943A]/20 rounded p-6 text-center">
        <p className="text-[#C9943A] font-medium text-sm">
          Thanks for your comment! It will appear after Deke reviews it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="text"
          required
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 px-4 bg-[#141C26] border border-[#1E2A38] text-white text-sm placeholder:text-[#3A4A5A] outline-none focus:border-[#C9943A]/40 rounded transition-colors"
        />
        <input
          type="email"
          required
          placeholder="Your email (not published)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 px-4 bg-[#141C26] border border-[#1E2A38] text-white text-sm placeholder:text-[#3A4A5A] outline-none focus:border-[#C9943A]/40 rounded transition-colors"
        />
      </div>
      <textarea
        required
        placeholder="Share your thoughts..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        className="w-full px-4 py-3 bg-[#141C26] border border-[#1E2A38] text-white text-sm placeholder:text-[#3A4A5A] outline-none focus:border-[#C9943A]/40 rounded resize-none transition-colors"
      />
      {status === "error" && (
        <p className="text-red-400 text-xs">Something went wrong. Please try again.</p>
      )}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="h-10 px-6 bg-[#C9943A] text-[#0D1117] text-sm font-semibold rounded hover:bg-[#D4A84A] transition-colors disabled:opacity-60"
      >
        {status === "submitting" ? "Posting..." : "Post Comment"}
      </button>
    </form>
  );
}

// ─── Main Component ──────────────────────────────────────

export function IssueReader({ issue, prev, next }: Props) {
  return (
    <div className={`${cormorant.variable} bg-[#0D1117] text-white min-h-screen`}>
      {/* Header */}
      <header className="border-b border-[#1E2A38]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/news"
            className="text-[11px] font-medium tracking-[0.15em] text-[#C9943A] uppercase hover:text-[#D4A84A] transition-colors"
          >
            &larr; All Issues
          </Link>
          <span className="text-[11px] text-[#3A4A5A] tracking-wide">
            One Voice by Deke Sharon
          </span>
        </div>
      </header>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-6 py-16 lg:py-20">
        {/* Issue meta */}
        <div className="mb-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="w-8 h-px bg-[#C9943A]/40" />
            <span className="text-[11px] font-medium tracking-[0.15em] text-[#C9943A] uppercase">
              Issue #{issue.issueNumber}
            </span>
            {issue.sentAt && (
              <>
                <span className="text-[#3A4A5A]">&middot;</span>
                <span className="text-[11px] text-[#3A4A5A]">
                  {new Date(issue.sentAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </>
            )}
            <span className="w-8 h-px bg-[#C9943A]/40" />
          </div>

          <h1 className="font-[family-name:var(--font-cormorant)] text-4xl lg:text-5xl font-semibold leading-[1.15] text-white">
            {issue.subject || issue.title}
          </h1>
        </div>

        {/* Gold divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#C9943A]/40 to-transparent mb-12" />

        {/* Content sections */}
        <div className="space-y-16">
          {SECTIONS.map((sec) => {
            const text = issue[sec.key];
            if (!text?.trim()) return null;
            return (
              <section key={sec.key}>
                <div className="mb-6">
                  <div
                    className="inline-block px-3 py-1.5 border-l-[3px] mb-1"
                    style={{
                      borderColor: sec.accent,
                      backgroundColor: `${sec.accent}10`,
                    }}
                  >
                    <span
                      className="text-[11px] font-semibold tracking-[2px] uppercase"
                      style={{ color: sec.accent }}
                    >
                      {sec.label}
                    </span>
                  </div>
                </div>
                <ContentBlock text={text} />
              </section>
            );
          })}
        </div>

        {/* Sign-off */}
        <div className="mt-16 pt-10 border-t border-[#1E2A38] text-center">
          <div className="inline-block w-10 h-0.5 bg-[#C9943A] rounded mb-4" />
          <p className="font-[family-name:var(--font-cormorant)] text-lg text-[#7A8A9A] italic">
            Keep singing,
          </p>
          <p className="font-[family-name:var(--font-cormorant)] text-xl text-white font-semibold mt-1">
            Deke
          </p>
        </div>

        {/* Prev / Next navigation */}
        {(prev || next) && (
          <nav className="mt-16 pt-8 border-t border-[#1E2A38] grid grid-cols-2 gap-4">
            {prev ? (
              <Link
                href={`/news/${prev.issueNumber}`}
                className="group text-left"
              >
                <span className="text-[10px] text-[#4A5A6A] tracking-wider uppercase">
                  Previous
                </span>
                <p className="text-sm text-[#7A8A9A] group-hover:text-[#C9943A] transition-colors mt-1 line-clamp-1">
                  &larr; {prev.title}
                </p>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                href={`/news/${next.issueNumber}`}
                className="group text-right"
              >
                <span className="text-[10px] text-[#4A5A6A] tracking-wider uppercase">
                  Next
                </span>
                <p className="text-sm text-[#7A8A9A] group-hover:text-[#C9943A] transition-colors mt-1 line-clamp-1">
                  {next.title} &rarr;
                </p>
              </Link>
            ) : (
              <div />
            )}
          </nav>
        )}

        {/* Comments */}
        <div className="mt-16 pt-10 border-t border-[#1E2A38]">
          <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-white mb-8">
            Responses
          </h2>

          {/* Existing comments */}
          {issue.comments.length > 0 && (
            <div className="space-y-6 mb-10">
              {issue.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-[#141C26]/50 border border-[#1E2A38] rounded p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-[#C9943A]/15 flex items-center justify-center text-[#C9943A] text-xs font-semibold">
                      {comment.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{comment.name}</p>
                      <p className="text-[10px] text-[#4A5A6A]">
                        {new Date(comment.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-[#9BA8B8] leading-relaxed whitespace-pre-wrap">
                    {comment.body}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Comment form */}
          <div>
            <h3 className="text-sm font-medium text-[#7A8A9A] mb-4">
              {issue.comments.length > 0 ? "Add your voice" : "Be the first to respond"}
            </h3>
            <CommentForm issueId={issue.id} />
          </div>
        </div>
      </article>

      {/* Footer */}
      <div className="bg-[#070A0F] border-t border-[#1E2A38] py-6">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-between">
          <div>
            <span className="font-[family-name:var(--font-cormorant)] text-base font-semibold text-white">
              One Voice
            </span>
            <span className="text-[#3A4A5A] text-sm ml-2">by Deke Sharon</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#3A4A5A]">
            <Link href="/news" className="hover:text-[#7A8A9A] transition-colors">
              All Issues
            </Link>
            <Link href="/privacy" className="hover:text-[#7A8A9A] transition-colors">
              Privacy
            </Link>
            <Link
              href="/"
              className="text-[#C9943A] hover:text-[#D4A84A] transition-colors"
            >
              dekesharon.com
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
