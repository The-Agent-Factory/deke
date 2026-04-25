import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, ApiError } from "@/lib/api-error";
import { sendBookingNotification } from "@/lib/notifications/booking-notification";

// Map project type from form to service type
const projectTypeToServiceType: Record<string, string> = {
  "tv-film": "ARRANGEMENT",
  "workshop": "WORKSHOP",
  "university": "WORKSHOP",
  "corporate": "SPEAKING",
  "coaching": "GROUP_COACHING",
  "arrangement": "ARRANGEMENT",
  "production": "ARRANGEMENT",
  "other": "CONSULTATION",
};

// Landing page booking request schema
const BookingRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  organization: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  projectType: z.string().min(1, "Project type is required"),
  eventDate: z.string().optional().nullable(),
  budget: z.string().optional().nullable(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = BookingRequestSchema.safeParse(body);
    if (!result.success) {
      return ApiError.badRequest(result.error.issues[0].message);
    }

    const { name, email, organization, phone, projectType, eventDate, budget, message } = result.data;

    // Split name into first and last
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(" ") || "";

    // Map project type to service type
    const serviceType = projectTypeToServiceType[projectType] || "CONSULTATION";

    // Step 1: Find or create Lead
    let lead = await prisma.lead.findUnique({
      where: { email },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          firstName,
          lastName,
          email,
          organization: organization || null,
          phone: phone || null,
          source: "website_booking_request",
          status: "NEW",
        },
      });
    } else {
      // Update lead info with any new data
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          firstName,
          lastName,
          organization: organization || lead.organization,
          phone: phone || lead.phone,
        },
      });
    }

    // Step 2: Create Inquiry with full details
    const inquiryMessage = [
      `Project Type: ${projectType}`,
      budget ? `Budget Range: ${budget}` : null,
      eventDate ? `Event Date: ${eventDate}` : null,
      "",
      "Message:",
      message,
    ].filter(Boolean).join("\n");

    const inquiry = await prisma.inquiry.create({
      data: {
        leadId: lead.id,
        serviceType,
        status: "PENDING",
        message: inquiryMessage,
      },
    });

    // Step 2.5: Find or create Contact for booking
    let contact = await prisma.contact.findUnique({
      where: { email },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          firstName,
          lastName,
          email,
          organization: organization || null,
          phone: phone || null,
          source: "website_booking_request",
          leadId: lead.id,
        },
      });
    }

    // Mark lead as CONVERTED
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'CONVERTED', convertedAt: new Date() },
    });

    // Step 3: Create Booking Request (pending status)
    // Parse eventDate safely — it's a free-text field so only use it if it's a valid date
    let parsedDate: Date | null = null;
    if (eventDate) {
      const d = new Date(eventDate);
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    }

    const booking = await prisma.booking.create({
      data: {
        contactId: contact.id,
        inquiryId: inquiry.id,
        serviceType,
        status: "PENDING",
        startDate: parsedDate,
        paymentStatus: "UNPAID",
        clientNotes: message,
        internalNotes: [budget ? `Budget: ${budget}` : null, eventDate && !parsedDate ? `Preferred dates: ${eventDate}` : null].filter(Boolean).join('\n') || null,
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            organization: true,
          },
        },
        inquiry: true,
      },
    });

    try {
      await sendBookingNotification({
        bookingId: booking.id,
        contactName: booking.contact ? `${booking.contact.firstName} ${booking.contact.lastName}` : 'Unknown Contact',
        contactEmail: booking.contact?.email ?? '',
        contactPhone: booking.contact?.phone ?? null,
        organization: booking.contact?.organization ?? null,
        serviceType: booking.serviceType,
        startDate: booking.startDate,
        location: null,
        amount: null,
        clientNotes: booking.clientNotes,
      });
    } catch (err) {
      console.error("[BOOKING-REQUEST] Resend notification threw:", err);
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for your booking request! We'll be in touch within 24 business hours.",
      bookingId: booking.id,
      inquiryId: inquiry.id,
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
