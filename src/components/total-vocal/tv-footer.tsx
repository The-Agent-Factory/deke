import Link from "next/link";

const SKOOL_URL = "https://www.skool.com/deke";

const EXPLORE = [
  { label: "What's Inside", href: "#inside" },
  { label: "Who It's For", href: "#who" },
  { label: "About Deke", href: "#about" },
  { label: "FAQ", href: "#faq" },
];

export function TvFooter() {
  return (
    <footer className="bg-primary text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <p className="font-display text-xl font-bold">Total Vocal</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">
              {"The global a cappella community, led by Deke Sharon. Find your voice — and sing with the world."}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-white/50">
              Explore
            </p>
            <ul className="mt-4 space-y-2.5">
              {EXPLORE.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-white/70 transition-colors hover:text-accent"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-white/50">
              Connect
            </p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href={SKOOL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/70 transition-colors hover:text-accent"
                >
                  Join on Skool
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.dekesharon.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/70 transition-colors hover:text-accent"
                >
                  dekesharon.com
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Deke Sharon. All rights reserved.</p>
          <p>A sibling of dekesharon.com</p>
        </div>
      </div>
    </footer>
  );
}
