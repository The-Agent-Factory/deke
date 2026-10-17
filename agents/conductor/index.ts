/**
 * CONDUCTOR Agent - Workshop & Coaching Booking Specialist
 *
 * Handles booking consultations, workshops, and coaching sessions.
 * Checks availability, schedules appointments, and manages calendar
 * coordination with clients.
 */

import { BaseAgent } from '../base-agent';
import { eventBus } from '@/lib/event-bus';
import type { AgentConfig, AgentResponse, AgentEvent } from '../types';

const CONDUCTOR_CONFIG: AgentConfig = {
  id: 'conductor',
  name: 'CONDUCTOR',
  tier: 'sales-booking',
  description: 'Workshop and coaching booking specialist - handles scheduling and availability',
  systemPrompt: `You are CONDUCTOR, Deke Sharon's workshop and coaching booking specialist.

Your expertise includes:
- Workshop booking ($2,000-$10,000 per day)
- Vocal coaching sessions ($250/hr individual, virtual only; $2,000+ group)
- Calendar availability checking
- Consultation scheduling
- Virtual and in-person session coordination

When receiving handoffs from HARMONY:
1. Acknowledge the customer's interest
2. Ask about preferred dates, format (virtual/in-person), and group size
3. Check availability (Phase 5 will integrate with real calendar)
4. Provide available time slots
5. Book consultation and send confirmation

Be warm, professional, and organized. Make the booking process smooth
and ensure customers feel taken care of.`,
  tools: [],
};

export class CONDUCTORAgent extends BaseAgent {
  constructor() {
    super(CONDUCTOR_CONFIG);
    this.initializeHandlers();
  }

  /**
   * Subscribe to events this agent should handle
   */
  private initializeHandlers(): void {
    // Subscribe to handoff events targeted at CONDUCTOR
    eventBus.subscribe('handoff', async (event: AgentEvent) => {
      if (event.targetAgent === 'conductor') {
        await this.handleHandoff(event);
      }
    });
  }

  /**
   * Handle handoff from another agent
   */
  private async handleHandoff(event: AgentEvent): Promise<void> {
    console.log('[CONDUCTOR] Received handoff from:', event.sourceAgent);
    console.log('[CONDUCTOR] Payload:', event.payload);

    // Emit acknowledgment back to source agent
    await this.emitEvent(
      'handoff_acknowledged',
      {
        originalEventId: event.eventId,
        status: 'received',
        message: 'CONDUCTOR is ready to help schedule your session',
        context: event.payload,
      },
      event.sourceAgent
    );

    // TODO Phase 5: Implement full handoff logic
    // - Extract booking requirements from payload
    // - Check calendar availability
    // - Propose available time slots
    // - Send booking confirmation
  }

  /**
   * Process a direct message to CONDUCTOR
   * (Phase 5 will implement full booking logic)
   */
  async processMessage(message: string): Promise<AgentResponse> {
    return {
      message:
        "CONDUCTOR here! I'm ready to help schedule your workshop or coaching session. (Full booking system coming in Phase 5)",
      metadata: {
        status: 'stub',
        agent: 'conductor',
        phase: 'phase4-coordination-only',
      },
    };
  }
}

// Export singleton instance
export const conductorAgent = new CONDUCTORAgent();
