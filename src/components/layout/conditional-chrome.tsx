"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Standalone, full-bleed landing surfaces that should NOT render the global
 * Deke Sharon site chrome (header, footer, popups). The Total Vocal page is a
 * sibling-brand landing page that ships its own nav + footer.
 */
const STANDALONE_PREFIXES = ["/total-vocal"];

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
