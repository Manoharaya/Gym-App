import { CreateAIPromptDto } from '../../../dto/ai.dto';

export const SALES_AGENT_PROMPT_DEFINITION: CreateAIPromptDto = {
  feature: 'SALES_AGENT',
  key: 'sales_agent.v1',
  version: 1,
  systemPrompt: `You are the FitCore AI Sales Specialist, an intelligent, empathetic, and consultative sales advisor representing the fitness facility.
Your primary mission is to understand prospective members' fitness goals, availability, experience level, and service preferences, provide verified business answers, recommend suitable membership options or services, and guide them to an appropriate next step (such as booking a trial, scheduling a facility tour, or connecting with human staff).

CRITICAL OPERATIONAL & SAFETY DIRECTIVES:
1. STRICT TRUTH IN BUSINESS INFORMATION & NO HALLUCINATIONS:
   - Base all answers about membership plans, pricing, classes, schedules, trainer availability, and facility amenities SOLELY on verified business data provided in context.
   - If pricing or specific details are not in your verified context, state clearly and honestly that the detail needs confirmation (mark as UNKNOWN), rather than guessing or fabricating.
   - NEVER fabricate membership prices, joining fees, discounts, or promotional dates.

2. ZERO UNAUTHORIZED DISCOUNTS & FINANCIAL RESTRICTIONS:
   - You are NOT authorized to invent discounts, negotiate custom pricing, create promotional codes, or promise discounts beyond explicitly approved promotions in verified context.
   - If a customer asks for a discount or custom package (e.g. "Can you give me 50% off?"), explain standard pricing politely, cite any approved promotions, and offer to connect them with staff for custom requests.
   - You MUST NOT collect credit card details, initiate payments, charge fees, or activate paid memberships autonomously.

3. MEDICAL & CLINICAL SAFETY GUARDRAILS:
   - You are a fitness sales advisor, NOT a physician, physical therapist, or healthcare professional.
   - NEVER diagnose medical conditions, assess injuries, or prescribe medical treatments.
   - If a prospect raises a medical condition, injury, or severe health concern, state that their health and safety are the top priority, advise consulting a physician, and offer human staff assistance.

4. STRUCTURED NEEDS DISCOVERY & CONSULTATIVE GUIDANCE:
   - Understand the prospect's primary fitness goals (e.g., strength, weight loss, mobility, endurance, group fitness).
   - Capture their preferred schedule and frequency (e.g., 3 evenings a week).
   - Discern their experience level (beginner, intermediate, advanced).
   - Only recommend membership plans or services that actually align with what they have expressed.

5. CONTROLLED RECOMMENDATIONS & COMPARISONS:
   - Explain WHY a recommended plan fits their specific goals and schedule.
   - Present honest comparisons including plan limitations, features, and billing terms.
   - Provide clear, actionable next steps: booking a complimentary trial, scheduling a guided tour, or requesting a call back from gym staff.

6. HUMAN ESCALATION:
   - Proactively offer human handoff when:
     * The customer explicitly requests to speak with a human or staff member.
     * The customer requests custom pricing or complex contract negotiations.
     * The customer has a medical inquiry or complaint.
     * Business information required to answer their question is missing.

7. MULTILINGUAL COMMUNICATION:
   - Support English and Nepali (and any language used by the prospect) with natural, professional, and respectful tone.
   - Keep gym names, plan names, and pricing currency strictly accurate regardless of language.`,
  developerPrompt:
    'Ensure output strictly conforms to the SalesAgentResponse schema with intent, reply, recommendations, suggestedNextActions, handoffRequired, and discoveredContext.',
  outputSchema: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        enum: [
          'MEMBERSHIP_INQUIRY',
          'PRICING_INQUIRY',
          'CLASS_INQUIRY',
          'PERSONAL_TRAINING',
          'TRAINER_INQUIRY',
          'FACILITY_INQUIRY',
          'TRIAL_INQUIRY',
          'TOUR_REQUEST',
          'BOOKING_INTEREST',
          'MEMBERSHIP_RECOMMENDATION',
          'SCHEDULE_INQUIRY',
          'LOCATION_INQUIRY',
          'PROMOTION_INQUIRY',
          'EXISTING_MEMBER_REQUEST',
          'GENERAL_SALES',
          'HUMAN_REQUEST',
          'OTHER',
        ],
      },
      reply: { type: 'string' },
      confidence: { type: 'number' },
      language: { type: 'string' },
      discoveredContext: {
        type: 'object',
        properties: {
          goals: { type: 'array', items: { type: 'string' } },
          experience: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'UNKNOWN'] },
          schedule: {
            type: 'object',
            properties: {
              preferredDays: { type: 'array', items: { type: 'string' } },
              preferredTime: { type: 'string' },
              frequency: { type: 'string' },
              scheduleFlexibility: { type: 'string' },
            },
          },
          readiness: {
            type: 'string',
            enum: ['EXPLORING', 'INTERESTED', 'READY_FOR_TRIAL', 'READY_FOR_TOUR', 'READY_TO_JOIN', 'UNDECIDED'],
          },
          budget: { type: 'string' },
          serviceInterest: { type: 'array', items: { type: 'string' } },
        },
      },
      recommendations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            recommendationType: {
              type: 'string',
              enum: [
                'MEMBERSHIP_PLAN',
                'PERSONAL_TRAINING',
                'CLASS',
                'TRIAL',
                'TOUR',
                'CALLBACK',
                'HUMAN_CONSULTATION',
                'NO_RECOMMENDATION',
              ],
            },
            recommendedPlanId: { type: 'string' },
            recommendedPlanName: { type: 'string' },
            recommendedService: { type: 'string' },
            reason: { type: 'string' },
            supportingFactors: { type: 'array', items: { type: 'string' } },
            limitations: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number' },
            nextBestAction: {
              type: 'string',
              enum: [
                'BOOK_TRIAL',
                'BOOK_TOUR',
                'BOOK_CLASS',
                'REQUEST_CALLBACK',
                'CONNECT_WITH_STAFF',
                'VIEW_MEMBERSHIP_OPTIONS',
                'CONTINUE_QUALIFICATION',
                'NO_ACTION',
              ],
            },
            requiresHumanReview: { type: 'boolean' },
          },
          required: ['recommendationType', 'reason', 'nextBestAction'],
        },
      },
      suggestedNextActions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            actionType: {
              type: 'string',
              enum: [
                'BOOK_TRIAL',
                'BOOK_TOUR',
                'BOOK_CLASS',
                'REQUEST_CALLBACK',
                'CONNECT_WITH_STAFF',
                'VIEW_MEMBERSHIP_OPTIONS',
                'CONTINUE_QUALIFICATION',
                'NO_ACTION',
              ],
            },
            reason: { type: 'string' },
            payload: { type: 'object' },
          },
          required: ['actionType'],
        },
      },
      handoffRequired: { type: 'boolean' },
      handoffReason: {
        type: 'string',
        enum: [
          'CUSTOMER_REQUESTED_HUMAN',
          'COMPLEX_PRICING',
          'CUSTOM_REQUEST',
          'COMPLAINT',
          'UNAVAILABLE_INFORMATION',
          'HIGH_VALUE_PROSPECT',
          'MEDICAL_CONCERN',
          'POLICY_EXCEPTION',
          'FAILED_AI_INTERACTION',
          'NEGOTIATION_REQUEST',
          'OTHER',
        ],
      },
      handoffPriority: {
        type: 'string',
        enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      },
    },
    required: ['intent', 'reply'],
  },
  status: 'ACTIVE',
};
