import { Resend } from 'resend'

const NOTIFICATION_EMAILS = (process.env.BOOKING_NOTIFICATION_EMAILS || 'deke@dekesharon.com,denis@theagentfactory.ai')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean)

export interface GroupRequestNotificationData {
  name: string
  email: string
  location: string
  age?: number | null
  experience: string
  commitment: string
  genres: string[]
  performanceInterest: boolean
  message?: string | null
}

interface NotificationResult {
  success: boolean
  adminEmailId?: string
  clientEmailId?: string
  error?: string
}

function getExperienceLabel(exp: string): string {
  const labels: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    professional: 'Professional',
  }
  return labels[exp] || exp
}

function getCommitmentLabel(c: string): string {
  const labels: Record<string, string> = {
    casual: 'Casual (once a month or less)',
    regular: 'Regular (weekly)',
    intensive: 'Intensive (multiple times/week)',
    flexible: 'Flexible',
  }
  return labels[c] || c
}

function generateAdminEmailHtml(data: GroupRequestNotificationData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Find a Group Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">🎤 Find a Singing Group Request</h1>
    <p style="color: #c9a227; margin: 10px 0 0 0; font-size: 14px;">Deke Sharon Website</p>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; border-top: none;">
    <h2 style="color: #1a1a2e; margin-top: 0; border-bottom: 2px solid #c9a227; padding-bottom: 10px;">Contact Information</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #666; width: 140px;"><strong>Name:</strong></td>
        <td style="padding: 8px 0;">${data.name}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td>
        <td style="padding: 8px 0;"><a href="mailto:${data.email}" style="color: #c9a227;">${data.email}</a></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Location:</strong></td>
        <td style="padding: 8px 0;">${data.location}</td>
      </tr>
      ${data.age ? `
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Age:</strong></td>
        <td style="padding: 8px 0;">${data.age}</td>
      </tr>
      ` : ''}
    </table>

    <h2 style="color: #1a1a2e; margin-top: 30px; border-bottom: 2px solid #c9a227; padding-bottom: 10px;">Preferences</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #666; width: 140px;"><strong>Experience:</strong></td>
        <td style="padding: 8px 0;"><span style="background: #c9a227; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 14px;">${getExperienceLabel(data.experience)}</span></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Commitment:</strong></td>
        <td style="padding: 8px 0;">${getCommitmentLabel(data.commitment)}</td>
      </tr>
      ${data.genres.length > 0 ? `
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Genres:</strong></td>
        <td style="padding: 8px 0;">${data.genres.join(', ')}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Performance:</strong></td>
        <td style="padding: 8px 0;">${data.performanceInterest ? 'Interested in performing' : 'Not interested in performing'}</td>
      </tr>
    </table>

    ${data.message ? `
    <h2 style="color: #1a1a2e; margin-top: 30px; border-bottom: 2px solid #c9a227; padding-bottom: 10px;">Message</h2>
    <div style="background: #fff; border-left: 4px solid #c9a227; padding: 15px; margin: 10px 0; border-radius: 0 5px 5px 0;">
      <p style="margin: 0; white-space: pre-wrap;">${data.message}</p>
    </div>
    ` : ''}

    <div style="margin-top: 30px; padding: 20px; background: #1a1a2e; border-radius: 8px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://dekesharon.com'}/dashboard/groups"
         style="display: inline-block; background: #c9a227; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        View in Dashboard
      </a>
    </div>
  </div>

  <div style="background: #1a1a2e; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
    <p style="color: #888; margin: 0; font-size: 12px;">
      This is an automated notification from your website.
    </p>
  </div>
</body>
</html>
  `.trim()
}

function generateClientEmailHtml(data: GroupRequestNotificationData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Group Request Received</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">We're On It!</h1>
    <p style="color: #c9a227; margin: 10px 0 0 0; font-size: 16px;">Deke Sharon</p>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; border-top: none;">
    <p style="font-size: 16px; margin-top: 0;">Hi ${data.name.split(' ')[0]},</p>

    <p>Thank you for reaching out! We've received your request to find a singing group near <strong>${data.location}</strong> and we're looking into it.</p>

    <div style="background: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #1a1a2e; margin-top: 0; margin-bottom: 15px;">Your Preferences</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;"><strong>Experience:</strong></td>
          <td style="padding: 8px 0;">${getExperienceLabel(data.experience)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;"><strong>Commitment:</strong></td>
          <td style="padding: 8px 0;">${getCommitmentLabel(data.commitment)}</td>
        </tr>
        ${data.genres.length > 0 ? `
        <tr>
          <td style="padding: 8px 0; color: #666;"><strong>Genres:</strong></td>
          <td style="padding: 8px 0;">${data.genres.join(', ')}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <h3 style="color: #1a1a2e;">What Happens Next?</h3>
    <ol style="padding-left: 20px;">
      <li style="margin-bottom: 10px;">We'll review your preferences and location</li>
      <li style="margin-bottom: 10px;">We'll search our network for groups that match</li>
      <li style="margin-bottom: 10px;">You'll hear back from us within 1-2 weeks with potential matches</li>
    </ol>

    <p>If you have any questions, feel free to reply to this email.</p>

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
      Producer &bull; Arranger &bull; Vocal Coach
    </p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Send notification emails when someone submits a Find a Group request
 */
export async function sendGroupRequestNotification(
  data: GroupRequestNotificationData
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
    // Send admin/owner notification
    const adminResult = await resend.emails.send({
      from: fromEmail,
      to: NOTIFICATION_EMAILS,
      subject: `🎤 Find a Group Request: ${data.name} in ${data.location}`,
      html: generateAdminEmailHtml(data),
      tags: [
        { name: 'type', value: 'group_request_notification' },
      ],
    })

    if (adminResult.error) {
      console.error('Failed to send group request admin notification:', adminResult.error)
      results.error = adminResult.error.message
      results.success = false
    } else {
      results.adminEmailId = adminResult.data?.id
      console.log(`Group request notification sent to ${NOTIFICATION_EMAILS.join(', ')}: ${results.adminEmailId}`)
    }

    // Send client confirmation
    const clientResult = await resend.emails.send({
      from: fromEmail,
      to: data.email,
      subject: `We received your singing group request - Deke Sharon`,
      html: generateClientEmailHtml(data),
      tags: [
        { name: 'type', value: 'group_request_confirmation' },
      ],
    })

    if (clientResult.error) {
      console.error('Failed to send group request client confirmation:', clientResult.error)
      if (!results.error) {
        results.error = `Client email failed: ${clientResult.error.message}`
      }
    } else {
      results.clientEmailId = clientResult.data?.id
      console.log(`Group request client confirmation sent: ${results.clientEmailId}`)
    }

    return results
  } catch (error) {
    console.error('Group request notification error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending notifications',
    }
  }
}
