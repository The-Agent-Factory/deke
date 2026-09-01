import type { Metadata } from "next";
import { TvNav } from "@/components/total-vocal/tv-nav";
import { TvHero } from "@/components/total-vocal/tv-hero";
import { TvCredentials } from "@/components/total-vocal/tv-credentials";
import { TvPromise } from "@/components/total-vocal/tv-promise";
import { TvWhatsInside } from "@/components/total-vocal/tv-whats-inside";
import { TvWhoItsFor } from "@/components/total-vocal/tv-who-its-for";
import { TvAboutDeke } from "@/components/total-vocal/tv-about-deke";
import { TvTestimonials } from "@/components/total-vocal/tv-testimonials";
import { TvJoin } from "@/components/total-vocal/tv-join";
import { TvFaq } from "@/components/total-vocal/tv-faq";
import { TvFinalCta } from "@/components/total-vocal/tv-final-cta";
import { TvFooter } from "@/components/total-vocal/tv-footer";

export const metadata: Metadata = {
  title: { absolute: "Total Vocal — The A Cappella Community Led by Deke Sharon" },
  description:
    "Join Total Vocal, the global a cappella community led by Deke Sharon — live monthly coaching calls, arranging & technique courses, feedback on your group's sound, and a worldwide community of singers, directors, and arrangers.",
  openGraph: {
    title: "Total Vocal — The A Cappella Community Led by Deke Sharon",
    description:
      "Live coaching with Deke Sharon, arranging courses, group feedback, and a worldwide a cappella community. Find your voice — and sing with the world.",
    type: "website",
  },
};

export default function TotalVocalPage() {
  return (
    <>
      <TvNav />
      <TvHero />
      <TvCredentials />
      <TvPromise />
      <TvWhatsInside />
      <TvWhoItsFor />
      <TvAboutDeke />
      <TvTestimonials />
      <TvJoin />
      <TvFaq />
      <TvFinalCta />
      <TvFooter />
    </>
  );
}
