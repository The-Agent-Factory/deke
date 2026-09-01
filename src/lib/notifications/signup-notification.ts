import { Resend } from 'resend'

const NOTIFICATION_EMAILS = (process.env.BOOKING_NOTIFICATION_EMAILS || 'deke@dekesharon.com,denis@theagentfactory.ai')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean)

export interface SignupNotificationData {
  type: 'contact' | 'notification-popup' | 'group-request' | 'newsletter-popup'
  name: string
  email: string
  location?: string | null
  message?: string | null
  /** Extra key-value details to display */
  extras?: Record<string, string>
}

interface NotificationResult {
  success: boolean
  adminEmailId?: string
  error?: string
}

const TYPE_CONFIG: Record<SignupNotificationData['type'], { emoji: string; label: string; dashboardPath: string }> = {
  'contact': {
    emoji: '📬',
    label: 'Contact Form Submission',
    dashboardPath: '/dashboard',
  },
  'notification-popup': {
    emoji: '🔔',
    label: 'Stay Informed Signup',
    dashboardPath: '/dashboard',
  },
  'group-request': {
    emoji: '🎤',
    label: 'Find a Group Request',
    dashboardPath: '/dashboard/groups',
  },
  'newsletter-popup': {
    emoji: '🎵',
    label: 'Newsletter Signup',
    dashboardPath: '/dashboard',
  },
}

function generateAdminEmailHtml(data: SignupNotificationData): string {
  const config = TYPE_CONFIG[data.type]

  const extraRows = data.extras
    ? Object.entries(data.extras)
        .map(
          ([label, value]) => `
      <tr>
        <td style="padding: 8px 0; color: #666; width: 140px;"><strong>${label}:</strong></td>
        <td style="padding: 8px 0;">${value}</td>
      </tr>`
        )
        .join('')
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.label}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">${config.emoji} ${config.label}</h1>
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
      ${data.location ? `
      <tr>
        <td style="padding: 8px 0; color: #666;"><strong>Location:</strong></td>
        <td style="padding: 8px 0;">${data.location}</td>
      </tr>
      ` : ''}
      ${extraRows}
    </table>

    ${data.message ? `
    <h2 style="color: #1a1a2e; margin-top: 30px; border-bottom: 2px solid #c9a227; padding-bottom: 10px;">Message</h2>
    <div style="background: #fff; border-left: 4px solid #c9a227; padding: 15px; margin: 10px 0; border-radius: 0 5px 5px 0;">
      <p style="margin: 0; white-space: pre-wrap;">${data.message}</p>
    </div>
    ` : ''}

    <div style="margin-top: 30px; padding: 20px; background: #1a1a2e; border-radius: 8px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://dekesharon.com'}${config.dashboardPath}"
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

/**
 * Send admin notification email when someone signs up via any channel.
 * Does NOT send a client confirmation — that's handled per-route where needed.
 */
export async function sendSignupNotification(
  data: SignupNotificationData
): Promise<NotificationResult> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  console.log(`[NOTIFICATION:RESEND:SIGNUP] Starting (${data.type})...`, { name: data.name, email: data.email, to: NOTIFICATION_EMAILS })

  if (!apiKey || !fromEmail) {
    console.error('[NOTIFICATION:RESEND:SIGNUP] NOT CONFIGURED — missing:', [!apiKey && 'RESEND_API_KEY', !fromEmail && 'RESEND_FROM_EMAIL'].filter(Boolean).join(', '))
    return { success: false, error: 'Email service not configured' }
  }

  const resend = new Resend(apiKey)
  const config = TYPE_CONFIG[data.type]

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: NOTIFICATION_EMAILS,
      replyTo: data.email,
      subject: `${config.emoji} ${config.label}: ${data.name} — ${data.email}`,
      html: generateAdminEmailHtml(data),
      tags: [
        { name: 'type', value: `signup_${data.type}` },
      ],
    })

    if (result.error) {
      console.error(`[NOTIFICATION:RESEND:SIGNUP] ${data.type} failed:`, result.error)
      return { success: false, error: result.error.message }
    }

    console.log(`[NOTIFICATION:RESEND:SIGNUP] ${data.type} sent to ${NOTIFICATION_EMAILS.join(', ')}: ${result.data?.id}`)
    return { success: true, adminEmailId: result.data?.id }
  } catch (error) {
    console.error(`[NOTIFICATION:RESEND:SIGNUP] ${data.type} error:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending notification',
    }
  }
}
