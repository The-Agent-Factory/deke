/**
 * HARMONY Agent - Website Concierge
 *
 * Primary Functions:
 * - 24/7 website chat support
 * - Lead qualification and capture
 * - Service information and FAQ
 * - Appointment scheduling assistance
 * - Handoff to specialized agents
 */

import { BaseAgent } from '../base-agent';
import { eventBus } from '@/lib/event-bus';
import { prisma } from '@/lib/db';
import type {
  AgentConfig,
  AgentResponse,
  AgentEvent,
  LeadQualification,
  SuggestedAction,
} from '../types';

const HARMONY_CONFIG: AgentConfig = {
  id: 'harmony',
  name: 'Harmony',
  tier: 'front-of-house',
  description: 'Website concierge providing 24/7 chat support and lead qualification',
  systemPrompt: `You are Harmony, Deke Sharon's virtual assistant. You represent the father of contemporary a cappella with warmth, expertise, and genuine enthusiasm for vocal music.

PERSONALITY:
- Warm and welcoming, like greeting a fellow musician
- Knowledgeable about a cappella and Deke's services
- Helpful and proactive in guiding visitors
- Professional but personable

CORE RESPONSIBILITIES:
1. Welcome and engage website visitors
2. Answer questions about Deke's services
3. Qualify leads by understanding their needs
4. Guide visitors to appropriate services
5. Capture contact information when appropriate
6. Create bookings directly when visitor is ready to commit
7. Hand off to specialized agents when needed (MAESTRO for arrangement quotes)

SERVICES KNOWLEDGE:
- Custom Arrangements: $500-$3,000+, 2-3 week turnaround
- Group Coaching: $2,000+ for half-day, $4,000+ full day
- Individual Coaching: $250/hour, virtual only (online sessions, no in-person individual coaching)
- Workshops: $5,000+ for schools, $10,000+ for festivals
- Speaking: $15,000+ for keynotes
- Masterclass: $99-$299 online courses

QUALIFICATION SIGNALS (look for these):
- Hot Lead: Specific song/event in mind, timeline mentioned, budget discussed
- Warm Lead: General interest, asking about process, comparing options
- Cold Lead: Just browsing, early research, no specific need yet

RESPONSE GUIDELINES:
- Keep responses concise (2-3 sentences for simple queries)
- Ask clarifying questions to understand needs
- Offer specific next steps
- Use music-related metaphors when appropriate
- Never pressure, always guide`,
  tools: [
    'captureLeadInfo',
    'createBooking',
    'checkAvailability',
    'getServiceInfo',
    'scheduleConsultation',
    'handoffToAgent',
  ],
  triggers: [
    { type: 'event', config: { event: 'chat_started' } },
    { type: 'webhook', config: { endpoint: '/api/chat' } },
  ],
};

export class HarmonyAgent extends BaseAgent {
  constructor() {
    super(HARMONY_CONFIG);
    this.registerTools();
    this.initializeHandlers();
  }

  private registerTools(): void {
    // Service Info Tool
    this.registerTool({
      name: 'getServiceInfo',
      description: 'Get detailed information about a specific service',
      parameters: {
        service: {
          type: 'string',
          description: 'Service type',
          required: true,
          enum: ['arrangement', 'coaching', 'workshop', 'speaking', 'masterclass'],
        },
      },
      execute: async (params) => {
        const serviceInfo = this.getServiceDetails(params.service as string);
        return { success: true, data: serviceInfo };
      },
    });

    // Lead Capture Tool
    this.registerTool({
      name: 'captureLeadInfo',
      description: 'Capture and store lead contact information',
      parameters: {
        email: { type: 'string', required: true, description: 'Lead email' },
        firstName: { type: 'string', required: true, description: 'First name' },
        lastName: { type: 'string', required: false, description: 'Last name' },
        phone: { type: 'string', required: false, description: 'Phone number' },
        organization: { type: 'string', required: false, description: 'Group/org name' },
      },
      execute: async (params) => {
        const { email, firstName, lastName, phone, organization } = params;

        // Upsert lead (create or update)
        const lead = await prisma.lead.upsert({
          where: { email: email as string },
          update: {
            firstName: firstName as string,
            lastName: (lastName as string) || '',
            phone: phone as string | null,
            organization: organization as string | null,
            lastContactedAt: new Date(),
          },
          create: {
            email: email as string,
            firstName: firstName as string,
            lastName: (lastName as string) || '',
            phone: phone as string | null,
            organization: organization as string | null,
            source: 'website_chat',
            status: 'NEW',
            score: 0,
          },
        });

        return { success: true, data: { leadId: lead.id } };
      },
    });

    // Booking Creation Tool
    this.registerTool({
      name: 'createBooking',
      description: 'Create a booking for a lead after capturing their information',
      parameters: {
        leadId: { type: 'string', required: true, description: 'Lead ID from captureLeadInfo' },
        serviceType: {
          type: 'string',
          required: true,
          enum: ['ARRANGEMENT', 'FESTIVAL', 'GROUP_COACHING', 'INDIVIDUAL_COACHING', 'WORKSHOP', 'SPEAKING', 'MASTERCLASS', 'CONSULTATION'],
          description: 'Type of service being booked',
        },
        location: { type: 'string', required: false, description: 'Event location or "Virtual"' },
        startDate: { type: 'string', required: false, description: 'Start date (ISO 8601)' },
        endDate: { type: 'string', required: false, description: 'End date (ISO 8601)' },
        internalNotes: { type: 'string', required: false, description: 'Notes about the booking' },
      },
      execute: async (params) => {
        const { leadId, serviceType, location, startDate, endDate, internalNotes } = params;

        // Create booking
        const booking = await prisma.booking.create({
          data: {
            contactId: leadId as string,
            serviceType: serviceType as string,
            location: location as string | null,
            startDate: startDate ? new Date(startDate as string) : null,
            endDate: endDate ? new Date(endDate as string) : null,
            internalNotes: internalNotes as string | null,
            status: 'PENDING',
            paymentStatus: 'UNPAID',
          },
          include: {
            contact: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        });

        return { success: true, data: { bookingId: booking.id, booking } };
      },
    });

    // Handoff Tool
    this.registerTool({
      name: 'handoffToAgent',
      description: 'Transfer conversation to a specialized agent',
      parameters: {
        targetAgent: {
          type: 'string',
          required: true,
          enum: ['maestro', 'conductor', 'virtuoso'],
          description: 'Agent to hand off to',
        },
        context: { type: 'object', required: false, description: 'Conversation context' },
      },
      execute: async (params) => {
        await this.emitEvent('handoff', params, params.targetAgent as string);
        return { success: true };
      },
    });
  }

  /**
   * Subscribe to events this agent should handle
   */
  private initializeHandlers(): void {
    // Subscribe to acknowledgments from other agents
    eventBus.subscribe('handoff_acknowledged', async (event: AgentEvent) => {
      if (event.targetAgent === 'harmony') {
        console.log('[HARMONY] Handoff acknowledged by:', event.sourceAgent);
        console.log('[HARMONY] Acknowledgment details:', event.payload);
        // TODO Phase 5: Update UI or continue conversation flow
      }
    });

    // Subscribe to discovery results from SCOUT
    eventBus.subscribe('discovery_completed', async (event: AgentEvent) => {
      if (event.targetAgent === 'harmony') {
        console.log('[HARMONY] Received discovery results from SCOUT');
        console.log('[HARMONY] Results:', event.payload);
        // TODO Phase 5: Notify user of opportunities found
      }
    });
  }

  private getServiceDetails(service: string): Record<string, unknown> {
    const services: Record<string, Record<string, unknown>> = {
      arrangement: {
        name: 'Custom Arrangements',
        priceRange: '$500 - $3,000+',
        turnaround: '2-3 weeks (rush available)',
        packages: ['Essential ($500)', 'Professional ($1,500)', 'Premium ($3,000+)'],
        includes: 'PDF score, demo recording, learning tracks (varies by package)',
      },
      coaching: {
        name: 'Vocal Coaching',
        priceRange: '$250/hr (individual, virtual only) | $2,000+ (group)',
        formats: ['In-person', 'Virtual', 'Hybrid'],
        focuses: ['Blend & Balance', 'Performance', 'Competition Prep'],
      },
      workshop: {
        name: 'Workshops & Clinics',
        priceRange: '$5,000 - $25,000+',
        duration: 'Half-day to multi-day',
        types: ['School Programs', 'Festivals', 'Competition Prep', 'Corporate'],
      },
      speaking: {
        name: 'Speaking Engagements',
        priceRange: '$15,000 - $50,000+',
        formats: ['Keynote (45-60 min)', 'Workshop (2-3 hrs)', 'Full Day'],
        topics: ['Teamwork Through Harmony', 'Finding Your Voice', 'The Business of Creativity'],
      },
      masterclass: {
        name: 'Online Masterclass',
        priceRange: '$99 - $299',
        courses: ['Arranging Fundamentals', 'Advanced Arranging', 'Complete Director'],
        access: 'Lifetime access with community',
      },
    };
    return services[service] || {};
  }

  /**
   * Qualify a lead based on conversation signals
   */
  qualifyLead(signals: Record<string, unknown>): LeadQualification {
    let score = 50; // Base score
    const factors = { intent: 50, budget: 50, timeline: 50, fit: 50 };

    // Intent signals
    if (signals.specificService) factors.intent += 20;
    if (signals.mentionedEvent) factors.intent += 15;
    if (signals.askedAboutProcess) factors.intent += 10;

    // Budget signals
    if (signals.mentionedBudget) factors.budget += 20;
    if (signals.askedAboutPricing) factors.budget += 10;

    // Timeline signals
    if (signals.hasDeadline) factors.timeline += 25;
    if (signals.urgentLanguage) factors.timeline += 15;

    // Fit signals
    if (signals.hasGroup) factors.fit += 15;
    if (signals.knowledgeable) factors.fit += 10;

    // Calculate overall score
    score = Math.round(
      (factors.intent + factors.budget + factors.timeline + factors.fit) / 4
    );

    let recommendation: 'hot' | 'warm' | 'cold' | 'nurture';
    if (score >= 75) recommendation = 'hot';
    else if (score >= 50) recommendation = 'warm';
    else if (score >= 30) recommendation = 'cold';
    else recommendation = 'nurture';

    return { score, factors, recommendation };
  }

  async processMessage(message: string): Promise<AgentResponse> {
    // Add to history
    this.addToHistory({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Analyze message intent
    const intent = this.analyzeIntent(message);

    // Generate response based on intent
    let response: string;
    const suggestedActions: SuggestedAction[] = [];

    switch (intent.type) {
      case 'greeting':
        response = "Hi! I'm Harmony, Deke's assistant. I can help you with custom arrangements, coaching, workshops, or answer any questions about working with Deke. What brings you here today?";
        suggestedActions.push(
          { label: 'Get a quote', action: 'quote' },
          { label: 'Book coaching', action: 'coaching' },
          { label: 'Learn more', action: 'info' }
        );
        break;

      case 'pricing':
        response = await this.handlePricingQuery(intent.service);
        suggestedActions.push({ label: 'Get personalized quote', action: 'quote' });
        break;

      case 'booking':
        response = "I'd love to help you book a session! To get started, could you tell me a bit about your group and what you're looking to accomplish?";
        break;

      case 'question':
        response = await this.handleGeneralQuestion(message);
        break;

      default:
        response = "Thanks for your message! Could you tell me more about what you're looking for? I can help with arrangements, coaching, workshops, or speaking engagements.";
    }

    // Add response to history
    this.addToHistory({
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    });

    return {
      message: response,
      suggestedActions,
    };
  }

  private analyzeIntent(message: string): { type: string; service?: string } {
    const lower = message.toLowerCase();

    if (/^(hi|hello|hey|greetings)/i.test(message)) {
      return { type: 'greeting' };
    }

    if (/(price|cost|rate|how much|pricing|quote)/i.test(lower)) {
      let service: string | undefined;
      if (/arrang/i.test(lower)) service = 'arrangement';
      if (/coach/i.test(lower)) service = 'coaching';
      if (/workshop|clinic/i.test(lower)) service = 'workshop';
      if (/speak/i.test(lower)) service = 'speaking';
      return { type: 'pricing', service };
    }

    if (/(book|schedule|reserve|appointment)/i.test(lower)) {
      return { type: 'booking' };
    }

    return { type: 'question' };
  }

  private async handlePricingQuery(service?: string): Promise<string> {
    if (service) {
      const info = this.getServiceDetails(service);
      return `${info.name} ranges from ${info.priceRange}. Would you like a personalized quote based on your specific needs?`;
    }

    return `Here's a quick overview of pricing:

• Arrangements: $500 - $3,000+
• Coaching: $250/hr (individual, online only) or $2,000+ (group)
• Workshops: From $5,000
• Speaking: From $15,000
• Masterclass: $99 - $299

Which service are you most interested in?`;
  }

  private async handleGeneralQuestion(message: string): Promise<string> {
    // TODO: Integrate with Claude API for intelligent responses
    return "That's a great question! Let me help you with that. Could you give me a bit more context about your situation?";
  }
}

export const harmonyAgent = new HarmonyAgent();
