"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Is it for beginners?",
    a: "Absolutely. Whether this is your first time on a riser or your tenth ICCA season, you start where you are. The fundamentals, warm-ups, and a supportive community mean nobody gets left behind on the high harmony.",
  },
  {
    q: "Is it online or in person?",
    a: "The community lives online, so you can take part from anywhere in the world. Live coaching calls, courses, and feedback all happen virtually — with occasional in-person events and the chance to sing Total Vocal at Carnegie Hall.",
  },
  {
    q: "What does it cost?",
    a: "Membership pricing is shown above — edit this placeholder to reflect your real plan (it may even be free to join). Either way, you get the full library, the live calls, and the community from day one.",
  },
  {
    q: "How do the live calls work?",
    a: "Deke hosts live coaching sessions each month where you can workshop arrangements, ask questions, and get real-time feedback on your group’s sound. Can’t make it live? Every call is recorded and added to the library.",
  },
  {
    q: "Can my whole group join?",
    a: "Yes — directors bring their entire ensemble all the time. It’s the fastest way to get everyone speaking the same musical language, sharing charts, and tightening blend before your next performance.",
  },
];

export function TvFaq() {
  return (
    <section id="faq" className="bg-section-alt">
      <div className="mx-auto max-w-3xl px-4 py-20 md:px-6 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center md:mb-12"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            FAQ
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Questions, answered
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion
            type="single"
            collapsible
            defaultValue="item-0"
            className="w-full space-y-3"
          >
            {FAQS.map((f, i) => (
              <AccordionItem
                key={f.q}
                value={`item-${i}`}
                className="rounded-xl border border-border bg-card px-5 transition-all data-[state=open]:border-accent/40 data-[state=open]:shadow-soft"
              >
                <AccordionTrigger className="py-5 text-left text-base font-semibold text-foreground hover:no-underline md:text-lg">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground md:text-base">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
