"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  Zap,
  Calendar,
  Users,
  CalendarDays,
  Briefcase,
  DollarSign,
  Package,
  Plane,
  GitBranch,
  BarChart3,
  Target,
  Newspaper,
  Megaphone,
  GraduationCap,
  LogOut,
} from "lucide-react";

const iconMap = {
  Zap,
  Calendar,
  Users,
  CalendarDays,
  Briefcase,
  DollarSign,
  Package,
  Plane,
  GitBranch,
  BarChart3,
  Target,
  Newspaper,
  Megaphone,
  GraduationCap,
} as const;

type BadgeCounts = Record<string, number>;

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof iconMap;
  badgeKey?: string;
};

function InsightButton({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const Icon = iconMap[item.icon];

  return (
    <Link
      href={item.href}
      className={`
        relative flex h-10 w-10 items-center justify-center rounded-lg
        transition-all duration-200
        ${
          isActive
            ? "bg-[#1c1c1f] text-[#C05A3C]"
            : "text-[#888888] hover:bg-[#1a1a1c] hover:text-[#CCCCCC]"
        }
      `}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      aria-label={item.label}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.2 : 1.6} />

      {showTooltip && (
        <span
          className="absolute left-full ml-3 whitespace-nowrap rounded-md bg-[#1c1c1f] px-2.5 py-1.5 text-[11px] font-medium tracking-[1px] text-[#CCCCCC] shadow-lg"
          style={{ fontFamily: "var(--font-heading, 'Space Grotesk'), sans-serif" }}
        >
          {item.label}
        </span>
      )}
    </Link>
  );
}

export function DashboardSidebar({
  primaryNav,
  insightNav,
  badgeCounts,
  userName,
}: {
  primaryNav: NavItem[];
  insightNav: NavItem[];
  badgeCounts: BadgeCounts;
  userName?: string;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[260px] bg-[#111113] lg:flex lg:flex-col">
        {/* Logo area */}
        <div className="px-7 pt-8 pb-6">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex flex-col items-start">
              <span
                className="text-[20px] font-bold tracking-[3px] text-[#F5F3EF]"
                style={{ fontFamily: "var(--font-heading, 'Space Grotesk'), sans-serif" }}
              >
                DEKE
              </span>
              <div className="mt-1.5 h-[3px] w-8 rounded-full bg-[#C05A3C] transition-all duration-300 group-hover:w-12" />
            </div>
          </Link>
        </div>

        {/* Primary navigation */}
        <nav className="px-4 pt-2">
          <ul className="space-y-1">
            {primaryNav.map((item) => {
              const Icon = iconMap[item.icon];
              const active = isActive(item.href);
              const badgeCount = item.badgeKey ? (badgeCounts[item.badgeKey] || 0) : 0;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      relative flex items-center gap-3 rounded-md px-3 py-2.5
                      transition-all duration-200 ease-out
                      ${
                        active
                          ? "bg-[#1c1c1f] text-[#F5F3EF]"
                          : "text-[#999999] hover:bg-[#1a1a1c] hover:text-[#E0E0E0]"
                      }
                    `}
                    style={{ fontFamily: "var(--font-heading, 'Space Grotesk'), sans-serif" }}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#C05A3C]" />
                    )}

                    <Icon
                      className={`h-[18px] w-[18px] shrink-0 ${
                        active ? "text-[#C05A3C]" : ""
                      }`}
                      strokeWidth={active ? 2.2 : 1.8}
                    />

                    <span className="text-[12px] font-medium tracking-[1.5px]">
                      {item.label}
                    </span>

                    {badgeCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#C05A3C] px-1.5 text-[10px] font-semibold text-white">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Divider */}
        <div className="mx-7 my-5 h-px bg-[#222224]" />

        {/* Insight icon grid */}
        <div className="px-5">
          <div className="grid grid-cols-3 gap-1.5 justify-items-center">
            {insightNav.map((item) => (
              <InsightButton
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
              />
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer: user info + sign out */}
        <div className="border-t border-[#222224] px-4 py-4">
          {userName && (
            <p
              className="mb-2 truncate px-3 text-[11px] tracking-[1px] text-[#888]"
              style={{ fontFamily: "var(--font-heading, 'Space Grotesk'), sans-serif" }}
            >
              {userName}
            </p>
          )}
          <button
            onClick={async () => { await signOut({ redirect: false }); window.location.href = "/login"; }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-[#777779] transition-colors hover:bg-[#1a1a1c] hover:text-[#CCCCCC]"
            style={{ fontFamily: "var(--font-heading, 'Space Grotesk'), sans-serif" }}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
            <span className="text-[12px] font-medium tracking-[1.5px]">SIGN OUT</span>
          </button>
        </div>
      </aside>

      {/* Mobile bottom navigation - primary items only */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#222224] bg-[#111113] lg:hidden">
        <ul className="flex items-center justify-around px-2 py-2">
          {primaryNav.map((item) => {
            const Icon = iconMap[item.icon];
            const active = isActive(item.href);
            const badgeCount = item.badgeKey ? (badgeCounts[item.badgeKey] || 0) : 0;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    relative flex flex-col items-center gap-1 rounded-lg px-3 py-1.5
                    transition-colors duration-200
                    ${
                      active
                        ? "text-[#C05A3C]"
                        : "text-[#999999] hover:text-[#CCCCCC]"
                    }
                  `}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                  <span
                    className="text-[9px] font-medium tracking-[0.5px]"
                    style={{ fontFamily: "var(--font-heading, 'Space Grotesk'), sans-serif" }}
                  >
                    {item.label}
                  </span>

                  {active && (
                    <span className="absolute -top-0.5 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-[#C05A3C]" />
                  )}

                  {badgeCount > 0 && (
                    <span className="absolute -right-0.5 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#C05A3C] px-1 text-[9px] font-semibold text-white">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
