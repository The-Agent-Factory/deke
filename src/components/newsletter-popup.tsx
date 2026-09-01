"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Music, Loader2, CheckCircle } from "lucide-react";
import { TurnstileWidget } from "@/components/turnstile";

const STORAGE_KEY = "deke-newsletter-popup-dismissed";
const NOTIFICATION_KEY = "deke-notification-dismissed";
const DELAY_MS = 3000;

// Don't show on pages that already have newsletter signup
const SUPPRESSED_ROUTES = ["/news", "/services", "/find-group"];

export function NewsletterPopup() {
  const pathname = usePathname();
  const isSuppressed = SUPPRESSED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [turnstileToken, setTurnstileToken] = useState("");
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSuppressed) return;

    try {
      // Don't show if already dismissed or if notification popup was already shown
      if (localStorage.getItem(STORAGE_KEY)) return;
      if (localStorage.getItem(NOTIFICATION_KEY)) return;
    } catch {
      return;
    }

    const timer = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, [isSuppressed]);

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "loading") return;

    setStatus("loading");

    try {
      const res = await fetch("/api/newsletter-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "newsletter-popup",
          website: honeypotRef.current?.value ?? "",
          turnstileToken,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      setStatus("success");
      try {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
      } catch {
        // ignore
      }

      setTimeout(() => setVisible(false), 2500);
    } catch {
      setStatus("error");
    }
  };

  if (isSuppressed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 right-6 z-50 w-[340px] max-w-[calc(100vw-3rem)]"
        >
          <div className="relative bg-[#0D1117] border border-[#1E2A38] rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
            {/* Gold accent line at top */}
            <div className="h-0.5 bg-gradient-to-r from-transparent via-[hsl(42,60%,50%)] to-transparent" />

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 text-[#4A5A6A] hover:text-white transition-colors rounded-full hover:bg-white/5"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-5 pt-5 pb-5">
              {status === "success" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-2"
                >
                  <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-white text-sm font-medium">
                    You&apos;re in tune!
                  </p>
                  <p className="text-[#7A8A9A] text-xs mt-1">
                    First issue coming soon.
                  </p>
                </motion.div>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(42,60%,50%)]/10">
                      <Music
                        className="h-3.5 w-3.5 text-[hsl(42,60%,50%)]"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-white text-sm font-semibold tracking-tight">
                      The Arrangement
                    </p>
                  </div>

                  <p className="text-[#9BA8B8] text-[13px] leading-relaxed mb-4">
                    Stay in tune with Deke Sharon&apos;s monthly letter on the
                    craft, stories, and future of a cappella.
                  </p>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-2">
                    {/* Honeypot — invisible to humans, bots auto-fill it */}
                    <div style={{ display: "none" }} aria-hidden="true">
                      <input
                        type="text"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        ref={honeypotRef}
                      />
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        placeholder="Your email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (status === "error") setStatus("idle");
                        }}
                        disabled={status === "loading"}
                        className="flex-1 h-9 px-3 text-sm bg-[#141C26] border border-[#1E2A38] rounded-lg text-white placeholder:text-[#3A4A5A] outline-none focus:border-[hsl(42,60%,50%)]/40 focus:ring-1 focus:ring-[hsl(42,60%,50%)]/20 transition-colors disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={status === "loading"}
                        className="h-9 px-4 bg-[hsl(42,60%,50%)] hover:bg-[hsl(42,60%,55%)] text-[#0D1117] text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                      >
                        {status === "loading" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Subscribe"
                        )}
                      </button>
                    </div>

                    <TurnstileWidget
                      onVerify={setTurnstileToken}
                      className="mt-2"
                    />
                  </form>

                  {status === "error" && (
                    <p className="text-red-400 text-xs mt-2">
                      Something went wrong. Please try again.
                    </p>
                  )}

                  <p className="text-[#3A4A5A] text-[11px] mt-3">
                    Free. Monthly. No spam.
                  </p>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
