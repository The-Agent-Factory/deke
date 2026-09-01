<<<<<<< HEAD
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, ApiError } from "@/lib/api-error";
import { sendSignupNotification } from "@/lib/notifications/signup-notification";
import { sendCloudflareNotification } from "@/lib/notifications/cloudflare-notify";
import { logSpam } from "@/lib/spam-logger";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { checkEmailQuality } from "@/lib/validations/email-quality";

const ContactFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const body = (await request.json()) as Record<string, unknown>;

    // ── Layer 1: Rate limit ────────────────────────────────────────
    const rl = checkRateLimit(ip);
    if (rl.limited) {
      logSpam("RATE_LIMIT", "exceeded 5 req/hour", String(body.email ?? ""), ip);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // ── Layer 2: Email quality ─────────────────────────────────────
    const emailCheck = checkEmailQuality(String(body.email ?? ""));
    if (emailCheck.blocked) {
      logSpam("EMAIL_QUALITY", emailCheck.reason ?? "blocked", String(body.email ?? ""), ip);
      return NextResponse.json(
        { success: true, message: "Thank you for your message. We'll be in touch soon!" },
        { status: 200 }
      );
    }

    // ── Layer 3: Zod validation ────────────────────────────────────
    const result = ContactFormSchema.safeParse(body);
    if (!result.success) {
      return ApiError.badRequest(result.error.issues[0].message);
    }

    const { firstName, lastName, email, subject, message } = result.data;

    // Find or create lead
    let lead = await prisma.lead.findUnique({
      where: { email },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          firstName,
          lastName,
          email,
          source: "website_contact",
          status: "NEW",
        },
      });
    }

    // Create an inquiry linked to the lead
    const inquiry = await prisma.inquiry.create({
      data: {
        leadId: lead.id,
        serviceType: "CONSULTATION",
        status: "PENDING",
        message: `Subject: ${subject}\n\n${message}`,
      },
    });

    // Send notifications — await both so they complete before the response
    const [resendResult, cfResult] = await Promise.allSettled([
      sendSignupNotification({
        type: 'contact',
        name: `${firstName} ${lastName}`,
        email,
        message: `Subject: ${subject}\n\n${message}`,
      }),
      sendCloudflareNotification({
        type: 'contact',
        name: `${firstName} ${lastName}`,
        email,
        message: `Subject: ${subject}\n\n${message}`,
      }),
    ]);

    if (resendResult.status === 'rejected') {
      console.error("[CONTACT] Resend notification threw:", resendResult.reason);
    }
    if (cfResult.status === 'rejected') {
      console.error("[CONTACT] Cloudflare notification threw:", cfResult.reason);
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for your message. We'll be in touch soon!",
      id: inquiry.id,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
=======
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, ApiError } from "@/lib/api-error";
import { sendSignupNotification } from "@/lib/notifications/signup-notification";

const ContactFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const result = ContactFormSchema.safeParse(body);
    if (!result.success) {
      return ApiError.badRequest(result.error.issues[0].message);
    }

    const { firstName, lastName, email, subject, message } = result.data;

    // Find or create lead
    let lead = await prisma.lead.findUnique({
      where: { email },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          firstName,
          lastName,
          email,
          source: "website_contact",
          status: "NEW",
        },
      });
    }

    // Create an inquiry linked to the lead
    const inquiry = await prisma.inquiry.create({
      data: {
        leadId: lead.id,
        serviceType: "CONSULTATION",
        status: "PENDING",
        message: `Subject: ${subject}\n\n${message}`,
      },
    });

    try {
      await sendSignupNotification({
        type: 'contact',
        name: `${firstName} ${lastName}`,
        email,
        message: `Subject: ${subject}\n\n${message}`,
      });
    } catch (err) {
      console.error("[CONTACT] Resend notification threw:", err);
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for your message. We'll be in touch soon!",
      id: inquiry.id,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
>>>>>>> origin/main
