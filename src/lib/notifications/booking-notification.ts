import { Resend } from 'resend'

// Notification recipients (comma-separated emails via env, with sensible defaults)
const NOTIFICATION_EMAILS = (process.env.BOOKING_NOTIFICATION_EMAILS || 'deke@dekesharon.com,denis@theagentfactory.ai')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean)

export interface BookingNotificationData {
  bookingId: string
  contactName: string
  contactEmail: string
  contactPhone?: string | null
  organization?: string | null
  serviceType: string
  startDate?: Date | null
  endDate?: Date | null
  location?: string | null
  amount?: number | null
  clientNotes?: string | null
}

interface NotificationResult {
  success: boolean
  adminEmailId?: string
  clientEmailId?: string
  error?: string
}

/**
 * Get formatted service type label
 */
function getServiceTypeLabel(serviceType: string): string {
  const labels: Record<string, string> = {
    ARRANGEMENT: 'Vocal Arrangement',
    GROUP_COACHING: 'Group Coaching',
    INDIVIDUAL_COACHING: 'Individual Coaching',
    WORKSHOP: 'Workshop',
    SPEAKING: 'Speaking Engagement',
    MASTERCLASS: 'Masterclass',
    CONSULTATION: 'Consultation',
  }
  return labels[serviceType] || serviceType
}

/**
 * Format date for display
 */
function formatDate(date: Date | null | undefined): string {
  if (!date) return 'Not specified'
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number | null | undefined): string {
  if (!amount) return 'Not specified'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * Generate admin notification email HTML
 */
function generateAdminEmailHtml(data: BookingNotificationData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Booking Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">🎵 New Booking Request</h1>
    <p style="color: #c9a227; margin: 10px 0 0 0; font-size: 14px;">Deke Sharon Website</p>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; border-top: none;">
    <h2 style="color: #1a1a2e; margin-top: 0; border-bottom: 2px solid #c9a227; padding-bottom: 10px;">Contact Information</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #666; width: 140px;"><strong>Name:</strong></td>
        <td style="padding: 8px 0;">${data.contactName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td>
        <td style="padding: 8px 0;"><a href="mailto:${data.contactEmail}" style="color: #c9a227;">${data.contactEmail}</a></td>
      </tr>
      ${data.contactPhone ? `
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Phone:</strong></td>
        <td style="padding: 8px 0;"><a href="tel:${data.contactPhone}" style="color: #c9a227;">${data.contactPhone}</a></td>
      </tr>
      ` : ''}
      ${data.organization ? `
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Organization:</strong></td>
        <td style="padding: 8px 0;">${data.organization}</td>
      </tr>
      ` : ''}
    </table>

    <h2 style="color: #1a1a2e; margin-top: 30px; border-bottom: 2px solid #c9a227; padding-bottom: 10px;">Booking Details</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #666; width: 140px;"><strong>Service Type:</strong></td>
        <td style="padding: 8px 0;"><span style="background: #c9a227; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 14px;">${getServiceTypeLabel(data.serviceType)}</span></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Start Date:</strong></td>
        <td style="padding: 8px 0;">${formatDate(data.startDate)}</td>
      </tr>
      ${data.endDate ? `
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>End Date:</strong></td>
        <td style="padding: 8px 0;">${formatDate(data.endDate)}</td>
      </tr>
      ` : ''}
      ${data.location ? `
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Location:</strong></td>
        <td style="padding: 8px 0;">${data.location}</td>
      </tr>
      ` : ''}
      ${data.amount ? `
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Budget:</strong></td>
        <td style="padding: 8px 0; font-weight: bold; color: #28a745;">${formatCurrency(data.amount)}</td>
      </tr>
      ` : ''}
    </table>

    ${data.clientNotes ? `
    <h2 style="color: #1a1a2e; margin-top: 30px; border-bottom: 2px solid #c9a227; padding-bottom: 10px;">Client Notes</h2>
    <div style="background: #fff; border-left: 4px solid #c9a227; padding: 15px; margin: 10px 0; border-radius: 0 5px 5px 0;">
      <p style="margin: 0; white-space: pre-wrap;">${data.clientNotes}</p>
    </div>
    ` : ''}

    <div style="margin-top: 30px; padding: 20px; background: #1a1a2e; border-radius: 8px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://dekesharon.com'}/dashboard/bookings"
         style="display: inline-block; background: #c9a227; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        View in Dashboard
      </a>
    </div>
  </div>

  <div style="background: #1a1a2e; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
    <p style="color: #888; margin: 0; font-size: 12px;">
      Booking ID: ${data.bookingId}<br>
      This is an automated notification from your website.
    </p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Generate client confirmation email HTML
 */
function generateClientEmailHtml(data: BookingNotificationData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Request Received</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">Thank You for Your Booking Request!</h1>
    <p style="color: #c9a227; margin: 10px 0 0 0; font-size: 16px;">Deke Sharon</p>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; border-top: none;">
    <p style="font-size: 16px; margin-top: 0;">Dear ${data.contactName.split(' ')[0]},</p>

    <p>Thank you for your interest in working with Deke Sharon! Your booking request has been received and is being reviewed.</p>

    <div style="background: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #1a1a2e; margin-top: 0; margin-bottom: 15px;">Your Request Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;"><strong>Service:</strong></td>
          <td style="padding: 8px 0;">${getServiceTypeLabel(data.serviceType)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;"><strong>Date:</strong></td>
          <td style="padding: 8px 0;">${formatDate(data.startDate)}</td>
        </tr>
        ${data.location ? `
        <tr>
          <td style="padding: 8px 0; color: #666;"><strong>Location:</strong></td>
          <td style="padding: 8px 0;">${data.location}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <h3 style="color: #1a1a2e;">What Happens Next?</h3>
    <ol style="padding-left: 20px;">
      <li style="margin-bottom: 10px;">Our team will review your request within 24-48 hours</li>
      <li style="margin-bottom: 10px;">We'll reach out to discuss details and availability</li>
      <li style="margin-bottom: 10px;">Once confirmed, you'll receive a formal booking agreement</li>
    </ol>

    <p>If you have any questions in the meantime, feel free to reply to this email or visit our website.</p>

    <div style="margin-top: 30px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://dekesharon.com'}"
         style="display: inline-block; background: #c9a227; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Visit Website
      </a>
    </div>
  </div>

  <div style="background: #1a1a2e; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
    <p style="color: #c9a227; margin: 0 0 10px 0; font-weight: bold;">Deke Sharon</p>
    <p style="color: #888; margin: 0; font-size: 12px;">
      "The Father of Contemporary A Cappella"<br>
      Producer • Arranger • Vocal Coach
    </p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Send booking notification emails
 * - Notification to all recipients in BOOKING_NOTIFICATION_EMAILS (defaults to deke@ + denis@)
 * - Confirmation email to the client
 */
export async function sendBookingNotification(
  data: BookingNotificationData
): Promise<NotificationResult> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  console.log('[NOTIFICATION:RESEND:BOOKING] Starting...', { bookingId: data.bookingId, serviceType: data.serviceType, to: NOTIFICATION_EMAILS, clientEmail: data.contactEmail })

  if (!apiKey || !fromEmail) {
    console.error('[NOTIFICATION:RESEND:BOOKING] NOT CONFIGURED — missing:', [!apiKey && 'RESEND_API_KEY', !fromEmail && 'RESEND_FROM_EMAIL'].filter(Boolean).join(', '))
    return {
      success: false,
      error: 'Email service not configured',
    }
  }

  const resend = new Resend(apiKey)
  const results: NotificationResult = { success: true }

  try {
    // Send admin/owner notifications
    const adminResult = await resend.emails.send({
      from: fromEmail,
      to: NOTIFICATION_EMAILS,
      replyTo: data.contactEmail,
      subject: `🎵 New Booking Request: ${getServiceTypeLabel(data.serviceType)} - ${data.contactName}`,
      html: generateAdminEmailHtml(data),
      tags: [
        { name: 'type', value: 'booking_notification' },
        { name: 'bookingId', value: data.bookingId },
      ],
    })

    if (adminResult.error) {
      console.error('[NOTIFICATION:RESEND:BOOKING] Admin email failed:', adminResult.error)
      results.error = adminResult.error.message
      results.success = false
    } else {
      results.adminEmailId = adminResult.data?.id
      console.log(`[NOTIFICATION:RESEND:BOOKING] Admin email sent to ${NOTIFICATION_EMAILS.join(', ')}: ${results.adminEmailId}`)
    }

    // Send client confirmation
    const clientResult = await resend.emails.send({
      from: fromEmail,
      to: data.contactEmail,
      subject: `Thank you for your booking request - Deke Sharon`,
      html: generateClientEmailHtml(data),
      tags: [
        { name: 'type', value: 'booking_confirmation' },
        { name: 'bookingId', value: data.bookingId },
      ],
    })

    if (clientResult.error) {
      console.error('[NOTIFICATION:RESEND:BOOKING] Client confirmation failed:', clientResult.error)
      // Don't fail the whole thing if only client email fails
      if (!results.error) {
        results.error = `Client email failed: ${clientResult.error.message}`
      }
    } else {
      results.clientEmailId = clientResult.data?.id
      console.log(`[NOTIFICATION:RESEND:BOOKING] Client confirmation sent: ${results.clientEmailId}`)
    }

    return results
  } catch (error) {
    console.error('[NOTIFICATION:RESEND:BOOKING] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending notifications',
    }
  }
}
