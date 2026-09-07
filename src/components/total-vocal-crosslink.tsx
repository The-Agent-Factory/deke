"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users } from "lucide-react";

/**
 * Catches the near-miss visitor on the high-intent service pages: someone
 * reading /coaching or /workshops who can't afford private coaching or can't
 * fly Deke out is exactly the Total Vocal member. Sits above each page's own
 * dark booking CTA so it reads as the lower-commitment alternative, not a
 * competing ask.
 */
export function TotalVocalCrosslink({
  heading = "Not ready to book in person?",
  body = "Total Vocal is the global community where Deke coaches singers, directors and arrangers every month. Live calls, arranging courses, and feedback on your group's sound.",
}: {
  heading?: string;
  body?: string;
}) {
  return (
    <section className="py-16 md:py-20">
      <div className="container px-4 md:px-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/total-vocal" className="group block">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 rounded-2xl border bg-muted/40 p-8 md:p-10 transition-colors hover:bg-muted/60">
              <div className="flex items-start gap-4 md:gap-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary flex-shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-heading text-xl md:text-2xl font-semibold mb-2">
                    {heading}
                  </h3>
                  <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
                    {body}
                  </p>
                </div>
              </div>
              <Button variant="outline" className="shrink-0">
                Explore Total Vocal
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
