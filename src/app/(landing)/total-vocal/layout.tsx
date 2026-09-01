import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Total Vocal — Sing With the World",
  description:
    "The global home for a cappella singers, directors & arrangers, led by Deke Sharon — the arranger behind Pitch Perfect, NBC's The Sing-Off, and Total Vocal at Carnegie Hall. Join the community on Skool.",
  openGraph: {
    title: "Total Vocal — Find Your Voice. Sing With the World.",
    description:
      "The global a cappella community led by Deke Sharon. Live monthly coaching, courses, sheet music, and a worldwide community of singers.",
  },
};

export default function TotalVocalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
