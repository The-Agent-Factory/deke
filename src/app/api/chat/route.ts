import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import '../../../../agents' // Initialize agent registry

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const WELCOME_MESSAGE = "Hi! I'm Harmony, Deke's virtual assistant. I can help you with arrangements, coaching inquiries, or answer questions about our services. How can I assist you today?"

const HARMONY_SYSTEM_PROMPT = `You are Harmony, Deke Sharon's virtual assistant and booking coordinator.

CRITICAL: You MUST maintain conversation context. Remember what the user said in previous messages and build on it. Never reset to a generic greeting mid-conversation.

YOUR EXPERTISE:
Deke Sharon is the "Father of Contemporary A Cappella" - music director for Pitch Perfect films, arranger/coach for The Sing-Off, and has 40+ years experience. You help people book his services.

SERVICES & PRICING:
- Custom Arrangements: $500-$3,000+ (complexity-based, 2-3 week turnaround)
- Group Coaching: $2,000+ for half-day, $4,000+ full day (in-person or virtual)
- Individual Coaching: $200/hour (virtual or in-person)
- Workshops: $5,000+ for schools, $10,000+ for festivals
- Speaking Engagements: $15,000+ for keynotes
- Online Masterclass: $99-$299 for self-paced courses

CONVERSATION FLOW:
1. LISTEN to what the user wants
2. ASK clarifying questions to understand their needs
3. PROVIDE relevant info and pricing
4. CAPTURE contact details when they're ready to book
5. CONFIRM next steps

BOOKING REQUESTS:
When someone wants to book (coaching, workshop, etc):
1. Ask for their name and email
2. Confirm service type and preferences (date, location, format)
3. Explain: "Great! I'll have someone reach out within 24 hours to confirm availability and finalize details"
4. Capture: name, email, service requested, preferred dates, location

PERSONALITY:
- Warm, professional, genuinely helpful
- Conversational (not robotic)
- Remember context - don't repeat yourself
- If they mentioned something earlier, reference it
- Move the conversation forward naturally

EXAMPLE BOOKING FLOW:
User: "I need coaching for Feb 4 in Ottawa"
You: "Wonderful! Deke offers both group and individual coaching. Which would work better for you? And to get this scheduled, could I get your name and best email?"

User: "Group coaching, I'm Sarah"
You: "Perfect, Sarah! Group coaching is typically $2,000+ for a half-day session. What's your email address so we can send you availability and lock in Feb 4?"

NEVER:
- Reset to generic menu mid-conversation
- Ignore what they just told you
- Ask them to repeat information
- Give generic responses when they're trying to book

ALWAYS:
- Reference previous messages in the conversation
- Move toward capturing contact info for bookings
- Provide specific, helpful responses
- Maintain context throughout the entire chat`

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json()

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: 'Missing message or sessionId' },
        { status: 400 }
      )
    }

    // Get or create chat session
    let session = await prisma.chatSession.findUnique({
      where: { sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20 // Last 20 messages for context
        }
      }
    })

    if (!session) {
      // Create session AND initialize with welcome message in one transaction
      session = await prisma.chatSession.create({
        data: {
          sessionId,
          status: 'ACTIVE',
          source: 'WEBSITE',
          messages: {
            create: {
              role: 'assistant',
              content: WELCOME_MESSAGE,
              agentId: 'harmony'
            }
          }
        },
        include: { messages: true }
      })
    }

    // Build conversation history
    const conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> =
      session.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: HARMONY_SYSTEM_PROMPT,
      messages: [
        ...conversationHistory,
        { role: 'user', content: message }
      ]
    })

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Sorry, I encountered an error.'

    // Save messages to database
    await prisma.chatMessage.createMany({
      data: [
        {
          sessionId: session.id,
          role: 'user',
          content: message,
          agentId: 'harmony'
        },
        {
          sessionId: session.id,
          role: 'assistant',
          content: assistantMessage,
          agentId: 'harmony'
        }
      ]
    })

    // Update session activity
    await prisma.chatSession.update({
      where: { sessionId },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json({
      message: assistantMessage,
      sessionId
    })

  } catch (error) {
    console.error('Chat API error:', error)

    // Return user-friendly error
    return NextResponse.json(
      {
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
