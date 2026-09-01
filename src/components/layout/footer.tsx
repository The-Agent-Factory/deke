"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const footerLinks = {
  services: [
    { label: "Custom Arrangements", href: "/arrangements" },
    { label: "Group Coaching", href: "/coaching" },
    { label: "Workshops & Clinics", href: "/workshops" },
    { label: "Speaking Engagements", href: "/speaking" },
    { label: "Album Production", href: "/masterclass" },
  ],
  resources: [
    { label: "Find a Group", href: "/find-group" },
    { label: "Media", href: "/media" },
    { label: "PP2 Diary", href: "/pitch-perfect-diary" },
    { label: "A Cappella Arranging Course", href: "https://www.acappellaville.com", external: true },
    { label: "Careers in A Cappella Course", href: "https://www.acappellaville.com", external: true },
  ],
  connect: [
    { label: "About Deke", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Media", href: "/media" },
  ],
};

const socialLinks = [
  { label: "Twitter", href: "https://twitter.com/dekesharon", icon: "X" },
  { label: "Instagram", href: "https://instagram.com/dekesharon", icon: "IG" },
  { label: "YouTube", href: "https://youtube.com/dekesharon", icon: "YT" },
  { label: "LinkedIn", href: "https://linkedin.com/in/dekesharon", icon: "in" },
  { label: "IMDb", href: "https://www.imdb.com/name/nm1342220/", icon: "IMDb" },
  { label: "Wikipedia", href: "https://en.wikipedia.org/wiki/Deke_Sharon", icon: "Wiki" },
];

export function Footer() {
  const pathname = usePathname();

  // Landing pages with their own chrome (e.g. Total Vocal) hide the global footer.
  if (pathname?.startsWith("/total-vocal")) {
    return null;
  }

  return (
    <footer className="bg-background border-t border-border">
      <div className="container px-4 md:px-6 py-16 md:py-20">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block mb-6">
              <span className="font-heading text-xl font-semibold">
                Deke Sharon
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
              Music director, arranger, and vocal producer for over 35 years.
              Founder of the Contemporary A Cappella Society, vocal producer for
              Pitch Perfect, and creator of The Sing-Off.
            </p>
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Services Links */}
          <div>
            <h4 className="font-medium text-sm mb-4 text-foreground">
              Services
            </h4>
            <ul className="space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-medium text-sm mb-4 text-foreground">
              Resources
            </h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  {"external" in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Connect Links */}
          <div>
            <h4 className="font-medium text-sm mb-4 text-foreground">
              Connect
            </h4>
            <ul className="space-y-3">
              {footerLinks.connect.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-3">
              <a
                href="mailto:info@dekesharon.com"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                info@dekesharon.com
              </a>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                San Francisco, CA
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-10" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Deke Sharon. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
