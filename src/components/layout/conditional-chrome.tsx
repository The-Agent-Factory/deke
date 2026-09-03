"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Surfaces that should NOT render the global Deke Sharon site chrome
 * (header, footer, newsletter + notification popups, chat widget).
 *
 * Two kinds live here:
 *  - Sibling-brand landing pages that ship their own nav and footer
 *    (/total-vocal).
 *  - Private, signed-in surfaces. The dashboard has its own sidebar layout,
 *    and the marketing popups are aimed at visitors, so firing them at the
 *    operator covers the board and asks a logged-in admin to subscribe to a
 *    newsletter.
 */
const STANDALONE_PREFIXES = ["/total-vocal", "/dashboard", "/login"];

export function ConditionalChrome({
  header,
  footer,
  widgets,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  widgets: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const standalone = STANDALONE_PREFIXES.some((p) => pathname?.startsWith(p));

  if (standalone) {
    return (
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
    );
  }

  return (
    <>
      {header}
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      {footer}
      {widgets}
    </>
  );
}
