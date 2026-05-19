import { Resend } from 'resend'

const ADMIN_EMAIL = 'denis@theagentfactory.ai'

export interface SubscriberNotificationData {
  id: string
  firstName: string
  email: string
  location: string
  groupName?: string | null
  newsletterOptIn: boolean
}

interface NotificationResult {
  success: boolean
  adminEmailId?: string
  subscriberEmailId?: string
  error?: string
}

/**
 * Generate admin notification email for a new subscriber
 */
function generateAdminEmailHtml(data: SubscriberNotificationData): string {
  const timestamp = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Subscriber</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">🎵 New Subscriber</h1>
    <p style="color: #c9a227; margin: 10px 0 0 0; font-size: 14px;">Deke Sharon Website</p>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; border-top: none;">
    <h2 style="color: #1a1a2e; margin-top: 0; border-bottom: 2px solid #c9a227; padding-bottom: 10px;">Subscriber Details</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #666; width: 140px;"><strong>Name:</strong></td>
        <td style="padding: 8px 0;">${data.firstName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td>
        <td style="padding: 8px 0;"><a href="mailto:${data.email}" style="color: #c9a227;">${data.email}</a></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Location:</strong></td>
        <td style="padding: 8px 0;">${data.location}</td>
      </tr>
      ${data.groupName ? `
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Group Name:</strong></td>
        <td style="padding: 8px 0;">${data.groupName}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Newsletter:</strong></td>
        <td style="padding: 8px 0;">${data.newsletterOptIn ? 'Yes' : 'No'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Signed Up:</strong></td>
        <td style="padding: 8px 0;">${timestamp}</td>
      </tr>
    </table>

    <div style="margin-top: 30px; padding: 20px; background: #1a1a2e; border-radius: 8px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://dekesharon.com'}/dashboard"
         style="display: inline-block; background: #c9a227; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        View in Dashboard
      </a>
    </div>
  </div>

  <div style="background: #1a1a2e; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
    <p style="color: #888; margin: 0; font-size: 12px;">
      Subscriber ID: ${data.id}<br>
      This is an automated notification from your website.
    </p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Generate subscriber confirmation email HTML
 */
function generateSubscriberEmailHtml(data: SubscriberNotificationData): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dekesharon.com'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on Deke's radar</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">You're on the list!</h1>
    <p style="color: #c9a227; margin: 10px 0 0 0; font-size: 16px;">Deke Sharon</p>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; border-top: none;">
    <p style="font-size: 16px; margin-top: 0;">Hi ${data.firstName},</p>

    <p>You're on the list! When Deke is heading to ${data.location}, you'll be one of the first to know.</p>

    <p>Whether it's a workshop, a rehearsal drop-in, or a special event — we'll reach out with details as soon as dates are confirmed.</p>

    <p>In the meantime, feel free to explore what Deke offers:</p>

    <div style="margin-top: 20px; text-align: center;">
      <a href="${baseUrl}"
         style="display: inline-block; background: #c9a227; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Explore dekesharon.com
      </a>
    </div>

    <p style="margin-top: 25px; color: #666;">— The Deke Sharon Team</p>
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
 * Send notification emails when a new subscriber signs up.
 * - Admin alert to denis@theagentfactory.ai
 * - Confirmation email to the subscriber
 */
export async function sendSubscriberNotification(
  data: SubscriberNotificationData
): Promise<NotificationResult> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !fromEmail) {
    console.warn('Email notifications not configured - RESEND_API_KEY or RESEND_FROM_EMAIL missing')
    return { success: false, error: 'Email service not configured' }
  }

  const resend = new Resend(apiKey)
  const results: NotificationResult = { success: true }

  try {
    // Send admin notification
    const adminResult = await resend.emails.send({
      from: fromEmail,
      to: ADMIN_EMAIL,
      subject: `🎵 New Subscriber: ${data.firstName} from ${data.location}`,
      html: generateAdminEmailHtml(data),
      tags: [
        { name: 'type', value: 'subscriber_notification' },
      ],
    })

    if (adminResult.error) {
      console.error('Failed to send subscriber admin notification:', adminResult.error)
      results.error = adminResult.error.message
      results.success = false
    } else {
      results.adminEmailId = adminResult.data?.id
      console.log(`Subscriber admin notification sent to ${ADMIN_EMAIL}: ${results.adminEmailId}`)
    }

    // Send subscriber confirmation
    const subscriberResult = await resend.emails.send({
      from: fromEmail,
      to: data.email,
      subject: `You're on Deke's radar 🎵`,
      html: generateSubscriberEmailHtml(data),
      tags: [
        { name: 'type', value: 'subscriber_confirmation' },
      ],
    })

    if (subscriberResult.error) {
      console.error('Failed to send subscriber confirmation:', subscriberResult.error)
      if (!results.error) {
        results.error = `Subscriber email failed: ${subscriberResult.error.message}`
      }
    } else {
      results.subscriberEmailId = subscriberResult.data?.id
      console.log(`Subscriber confirmation sent to ${data.email}: ${results.subscriberEmailId}`)
    }

    return results
  } catch (error) {
    console.error('Subscriber notification error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending notifications',
    }
  }
}
