import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { IssueReader } from "./issue-reader";

export const revalidate = 60; // Revalidate every 60s

export async function generateMetadata({
  params,
}: {
  params: Promise<{ issueNumber: string }>;
}) {
  const { issueNumber } = await params;
  const num = parseInt(issueNumber, 10);
  if (isNaN(num)) return { title: "Issue Not Found" };

  const issue = await prisma.newsletterIssue.findUnique({
    where: { issueNumber: num },
    select: { title: true, subject: true },
  });

  if (!issue || issue.title === undefined) return { title: "Issue Not Found" };

  return {
    title: `${issue.subject || issue.title} | One Voice by Deke Sharon`,
    description: issue.subject || issue.title,
  };
}

export default async function IssuePage({
  params,
}: {
  params: Promise<{ issueNumber: string }>;
}) {
  const { issueNumber } = await params;
  const num = parseInt(issueNumber, 10);
  if (isNaN(num)) notFound();

  const issue = await prisma.newsletterIssue.findUnique({
    where: { issueNumber: num },
    select: {
      id: true,
      issueNumber: true,
      title: true,
      subject: true,
      storyContent: true,
      craftContent: true,
      communityContent: true,
      noteContent: true,
      status: true,
      sentAt: true,
      comments: {
        where: { approved: true },
        select: { id: true, name: true, body: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // SENT (old manual sends) or SCHEDULED One Voice broadcasts whose send time has passed.
  const published = { status: { in: ["SENT", "SCHEDULED"] }, sentAt: { lte: new Date() } };
  if (
    !issue ||
    !["SENT", "SCHEDULED"].includes(issue.status) ||
    !issue.sentAt ||
    issue.sentAt.getTime() > Date.now()
  )
    notFound();

  // Get prev/next for navigation
  const [prev, next] = await Promise.all([
    prisma.newsletterIssue.findFirst({
      where: { issueNumber: { lt: num }, ...published },
      orderBy: { issueNumber: "desc" },
      select: { issueNumber: true, subject: true, title: true },
    }),
    prisma.newsletterIssue.findFirst({
      where: { issueNumber: { gt: num }, ...published },
      orderBy: { issueNumber: "asc" },
      select: { issueNumber: true, subject: true, title: true },
    }),
  ]);

  return (
    <IssueReader
      issue={{
        ...issue,
        sentAt: issue.sentAt?.toISOString() ?? null,
        comments: issue.comments.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        })),
      }}
      prev={prev ? { issueNumber: prev.issueNumber, title: prev.subject || prev.title } : null}
      next={next ? { issueNumber: next.issueNumber, title: next.subject || next.title } : null}
    />
  );
}
