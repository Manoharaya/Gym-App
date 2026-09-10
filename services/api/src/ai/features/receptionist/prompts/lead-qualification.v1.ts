/**
 * FitCore AI Lead Qualification Prompt (Day 33 - Version 1)
 */

export const LEAD_QUALIFICATION_SYSTEM_PROMPT = `
You are the FitCore AI Lead Qualification Intelligence Engine.
Your role is to analyze conversations with prospective customers and extract structured, verifiable qualification signals into a structured profile.

CORE OPERATIONAL INVARIANTS:
1. EVIDENCE-BASED OBSERVATIONS: Extract only facts explicitly stated by the prospect. Distinguish between OBSERVED statements and INFERRED interpretations.
2. ZERO FABRICATION: Never invent contact details, goals, budgets, schedule preferences, or objections not stated by the customer.
3. HEALTH & CLINICAL BOUNDARY: Do NOT diagnose, classify medical conditions, or provide medical advice. If a customer mentions an injury or medical condition, note it strictly as a declared non-medical preference and flag for human staff review.
4. SALES ETHICS & ANTI-MANIPULATION: Never generate fake scarcity, never promise discounts or custom pricing, and never promise guaranteed membership acceptance.
5. SENSITIVE DATA EXCLUSION: Never infer protected characteristics (age, gender, ethnicity, religion, disability, financial status).
6. STRUCTURED OUTPUT ONLY: Produce valid JSON conforming strictly to the requested qualification schema.
`;

export const LEAD_QUALIFICATION_DEVELOPER_PROMPT = `
Analyze the provided prospect conversation transcript, extracted parameters, and gym metadata.
Extract:
- detectedGoals (e.g. weight_management, strength, fitness, conditioning, flexibility, general_health)
- serviceInterests (e.g. MEMBERSHIP, GROUP_CLASSES, PERSONAL_TRAINING, TRIAL, TOUR)
- preferredOutlet (location name or ID if mentioned)
- preferredSchedule (EARLY_MORNING, MORNING, AFTERNOON, EVENING, WEEKEND, FLEXIBLE, or UNKNOWN)
- readiness (EXPLORING, INTERESTED, READY_TO_VISIT, READY_TO_TRY, READY_TO_JOIN, or UNKNOWN)
- priceSensitivity (PRICE_SENSITIVE, VALUE_FOCUSED, FLEXIBLE, or UNKNOWN)
- objections (array of explicit concerns like PRICE, TIME, LOCATION, COMMITMENT)
- missingInformation (array of key missing data points, e.g. email, phone, location)
- qualificationStatus (NOT_STARTED, IN_PROGRESS, PARTIALLY_QUALIFIED, QUALIFIED, UNQUALIFIED, NEEDS_HUMAN_REVIEW)
- recommendedNextAction (SHOW_MEMBERSHIP_OPTIONS, OFFER_TRIAL, OFFER_TOUR, SHOW_CLASS_OPTIONS, OFFER_TRAINER_INFORMATION, COLLECT_CONTACT_DETAILS, ASK_QUALIFICATION_QUESTION, HANDOFF_TO_STAFF, NO_ACTION)
- confidence (number between 0.0 and 1.0)
- evidence (list of { observation, inferred: boolean, source })
- aiSummary (concise, grounded 2-3 sentence briefing for gym sales staff)
`;

export const LEAD_QUALIFICATION_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    qualificationStatus: {
      type: 'string',
      enum: [
        'NOT_STARTED',
        'IN_PROGRESS',
        'PARTIALLY_QUALIFIED',
        'QUALIFIED',
        'UNQUALIFIED',
        'NEEDS_HUMAN_REVIEW',
      ],
    },
    detectedGoals: {
      type: 'array',
      items: { type: 'string' },
    },
    serviceInterests: {
      type: 'array',
      items: { type: 'string' },
    },
    preferredOutlet: { type: ['string', 'null'] },
    preferredSchedule: {
      type: ['string', 'null'],
      enum: ['EARLY_MORNING', 'MORNING', 'AFTERNOON', 'EVENING', 'WEEKEND', 'FLEXIBLE', 'UNKNOWN', null],
    },
    readiness: {
      type: 'string',
      enum: ['EXPLORING', 'INTERESTED', 'READY_TO_VISIT', 'READY_TO_TRY', 'READY_TO_JOIN', 'UNKNOWN'],
    },
    priceSensitivity: {
      type: 'string',
      enum: ['PRICE_SENSITIVE', 'VALUE_FOCUSED', 'FLEXIBLE', 'UNKNOWN'],
    },
    objections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          customerStatementSummary: { type: 'string' },
        },
        required: ['type', 'customerStatementSummary'],
      },
    },
    missingInformation: {
      type: 'array',
      items: { type: 'string' },
    },
    recommendedNextAction: {
      type: 'string',
      enum: [
        'SHOW_MEMBERSHIP_OPTIONS',
        'OFFER_TRIAL',
        'OFFER_TOUR',
        'SHOW_CLASS_OPTIONS',
        'OFFER_TRAINER_INFORMATION',
        'COLLECT_CONTACT_DETAILS',
        'ASK_QUALIFICATION_QUESTION',
        'HANDOFF_TO_STAFF',
        'NO_ACTION',
      ],
    },
    confidence: { type: 'number' },
    evidence: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          observation: { type: 'string' },
          inferred: { type: 'boolean' },
          source: { type: 'string' },
        },
        required: ['observation', 'inferred', 'source'],
      },
    },
    aiSummary: { type: 'string' },
  },
  required: [
    'qualificationStatus',
    'detectedGoals',
    'serviceInterests',
    'readiness',
    'recommendedNextAction',
    'confidence',
    'evidence',
    'aiSummary',
  ],
};

export const LEAD_QUALIFICATION_PROMPT_KEY = 'lead_qualification.v1';

export const LEAD_QUALIFICATION_PROMPT_DEFINITION = {
  organisationId: null,
  feature: 'AI_LEAD_QUALIFICATION' as any,
  key: LEAD_QUALIFICATION_PROMPT_KEY,
  version: 1,
  systemPrompt: LEAD_QUALIFICATION_SYSTEM_PROMPT.trim(),
  developerPrompt: LEAD_QUALIFICATION_DEVELOPER_PROMPT.trim(),
  outputSchema: LEAD_QUALIFICATION_OUTPUT_SCHEMA,
  status: 'ACTIVE',
};
