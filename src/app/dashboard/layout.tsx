import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { SessionProvider } from "next-auth/react";
import { DashboardSidebar } from "./sidebar";

async function getNewGroupRequestCount(): Promise<number> {
  try {
    const count = await prisma.inquiry.count({
      where: {
        OR: [
          { lead: { source: "find-group-form" } },
          { serviceType: "CONSULTATION" },
          { message: { contains: "group", mode: "insensitive" } },
          { message: { contains: "sing", mode: "insensitive" } },
        ],
        status: { in: ["NEW", "PENDING"] },
      },
    });
    return count;
  } catch {
    return 0;
  }
}

async function getPendingInquiryCount(): Promise<number> {
  try {
    return await prisma.inquiry.count({
      where: { status: "PENDING" },
    });
  } catch {
    return 0;
  }
}

const primaryNav = [
  { href: "/dashboard", label: "TODAY", icon: "Zap" as const, badgeKey: "today" as const },
  { href: "/dashboard/bookings", label: "BOOKINGS", icon: "Calendar" as const },
  { href: "/dashboard/campaigns", label: "CAMPAIGNS", icon: "Megaphone" as const },
  { href: "/dashboard/leads", label: "LEADS", icon: "Target" as const, badgeKey: "leads" as const },
  { href: "/dashboard/contacts", label: "CONTACTS", icon: "Users" as const },
  { href: "/dashboard/calendar", label: "CALENDAR", icon: "CalendarDays" as const },
  { href: "/dashboard/skool", label: "SKOOL", icon: "GraduationCap" as const },
];

const insightNav: typeof primaryNav = [];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, newRequestCount, pendingInquiryCount] = await Promise.all([
    auth(),
    getNewGroupRequestCount(),
    getPendingInquiryCount(),
  ]);

  const userName = session?.user?.name || session?.user?.email || "Admin";

  const badgeCounts = {
    leads: newRequestCount,
    today: pendingInquiryCount,
  };

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen bg-[#FAFAF8]">
        <DashboardSidebar
          primaryNav={primaryNav}
          insightNav={insightNav}
          badgeCounts={badgeCounts}
          userName={userName}
        />

        <main className="lg:pl-[260px] pb-20 lg:pb-0">
          <div className="mx-auto max-w-7xl p-6 md:p-8">{children}</div>
        </main>
      </div>
    </SessionProvider>
  );
}
