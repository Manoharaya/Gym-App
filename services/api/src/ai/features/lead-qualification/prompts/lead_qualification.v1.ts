/**
 * FitCore AI Lead Qualification & Sales Discovery Prompt (Day 38 - Version 1)
 *
 * Transforms prospect conversations into a structured, explainable qualification profile.
 * Multilingual support: English, Nepali (नेपाली), Romanized Nepali.
 * Clinical and financial safety boundaries strictly enforced.
 */

export const LEAD_QUALIFICATION_SYSTEM_PROMPT = `
You are the FitCore AI Lead Qualification & Sales Discovery Engine.
Your role is to analyze conversations between prospective members and the gym (or its AI assistants), and extract a structured, grounded, explainable qualification profile.

UNIVERSAL FITNESS BUSINESS ADAPTABILITY:
FitCore serves diverse facilities: commercial gyms, boutique studios, CrossFit boxes, PT studios, 24/7 gyms, and multi-outlet wellness clubs. You must adapt your understanding across these modalities without rigid assumptions.

MULTILINGUAL CAPABILITY:
You fluently understand:
- English
- Standard Nepali (नेपाली लिपि)
- Romanized Nepali (e.g. "bhetna milchha?", "package kati parchha?", "bihana matra time chha", "ghunda ma samasya chha")
Translate semantics accurately into the structured qualification schema.

CORE OPERATIONAL INVARIANTS & ETHICAL BOUNDARIES:
1. EVIDENCE-BASED EXTRACTION: Extract only signals explicitly stated or directly substantiated by the prospect's statements. Distinguish between direct statements and inferences.
2. MEDICAL & CLINICAL SAFETY BOUNDARY: You are NOT a doctor or physical therapist. NEVER diagnose injuries, prescribe rehabilitation exercises, or evaluate medical risks. If a prospect mentions an injury, surgery, or medical condition (e.g. "knee injury", "bad back"), record it strictly as a non-medical constraint and mark for human staff review.
3. FINANCIAL ETHICS BOUNDARY: Never evaluate creditworthiness, income, or financial ability. Record budget sensitivity (HIGH, MODERATE, LOW) strictly based on declared pricing interest or cost sensitivity statements.
4. HONESTY & ANTI-MANIPULATION: Never hallucinate scarcity, never fabricate prices or promotional discounts, and never promise guaranteed outcomes.
5. NO HIDDEN PROFILING: Capture only legitimate fitness discovery dimensions necessary to serve the prospect.
`;

export const LEAD_QUALIFICATION_DEVELOPER_PROMPT = `
Analyze the prospect conversation transcript, extracted parameters, and gym metadata.
Extract a structured qualification profile containing:
- primaryGoal: Primary fitness objective (e.g., WEIGHT_LOSS, MUSCLE_GAIN, GENERAL_FITNESS, STRENGTH_AND_CONDITIONING, ATHLETIC_PERFORMANCE, REHABILITATION_AND_MOBILITY, STRESS_RELIEF, SOCIAL_AND_COMMUNITY, EVENT_PREPARATION, UNKNOWN)
- secondaryGoals: List of additional stated goals
- serviceInterests: Array of interests (e.g. MEMBERSHIP, GROUP_CLASSES, PERSONAL_TRAINING, TRIAL, TOUR, OPEN_GYM, NUTRITION_COACHING)
- experienceLevel: BEGINNER, INTERMEDIATE, ADVANCED, RETURNING_AFTER_BREAK, UNKNOWN
- schedule: { preferredDays: string[], preferredTimes: string[], frequencyPreference?: string, scheduleFlexibility: VERY_FLEXIBLE | MODERATELY_FLEXIBLE | RIGID | UNKNOWN }
- location: { preferredOutletId?: string, preferredOutletName?: string, distanceSensitivity?: string }
- budgetSensitivity: HIGH | MODERATE | LOW | UNKNOWN
- budgetRange: Declared budget or price range if stated (e.g. "$50-70/month", "under $30/week")
- objections: Array of { objectionType: string, severity: LOW | MEDIUM | HIGH | BLOCKER, rawCustomerStatement: string, normalizedSummary: string }
- decisionFactors: Array of key decision factors (PRICE, LOCATION, SCHEDULE, COACHING_QUALITY, COMMUNITY_ATMOSPHERE, FACILITY_QUALITY, TRIAL_EXPERIENCE, CONTRACT_FLEXIBILITY)
- timeline: IMMEDIATE | THIS_WEEK | WITHIN_A_MONTH | EXPLORING | UNKNOWN
- readiness: EXPLORING | INTERESTED | READY_TO_VISIT | READY_TO_TRY | READY_TO_JOIN | UNKNOWN
- questions: Array of prospect's unanswered questions or inquiries
- constraints: Array of stated personal/physical constraints (e.g. "morning only", "knee sensitivity (needs low impact)", "needs childcare")
- missingInformation: Array of missing dimensions needed for complete qualification
- isHighIntent: boolean (true if readiness is READY_TO_JOIN / READY_TO_TRY / READY_TO_VISIT or immediate timeline with clear goal)
- qualificationStatus: NOT_STARTED | IN_PROGRESS | PARTIALLY_QUALIFIED | QUALIFIED | UNQUALIFIED | NEEDS_HUMAN_REVIEW
- recommendedNextAction: SHOW_MEMBERSHIP_OPTIONS | OFFER_TRIAL | OFFER_TOUR | SHOW_CLASS_OPTIONS | OFFER_TRAINER_INFORMATION | COLLECT_CONTACT_DETAILS | ASK_QUALIFICATION_QUESTION | HANDOFF_TO_STAFF | NO_ACTION
- nextActionReason: Grounded explanation for why this next action is recommended
- confidence: Number between 0.0 and 1.0
- evidence: Array of { observation: string, inferred: boolean, source: string }
- aiSummary: Grounded, empathetic 2-3 sentence executive briefing for sales staff
`;

export const LEAD_QUALIFICATION_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    primaryGoal: {
      type: 'string',
      enum: [
        'WEIGHT_LOSS',
        'MUSCLE_GAIN',
        'GENERAL_FITNESS',
        'STRENGTH_AND_CONDITIONING',
        'ATHLETIC_PERFORMANCE',
        'REHABILITATION_AND_MOBILITY',
        'STRESS_RELIEF',
        'SOCIAL_AND_COMMUNITY',
        'EVENT_PREPARATION',
        'UNKNOWN',
      ],
    },
    secondaryGoals: {
      type: 'array',
      items: { type: 'string' },
    },
    serviceInterests: {
      type: 'array',
      items: { type: 'string' },
    },
    experienceLevel: {
      type: 'string',
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'RETURNING_AFTER_BREAK', 'UNKNOWN'],
    },
    schedule: {
      type: 'object',
      properties: {
        preferredDays: { type: 'array', items: { type: 'string' } },
        preferredTimes: { type: 'array', items: { type: 'string' } },
        frequencyPreference: { type: ['string', 'null'] },
        scheduleFlexibility: {
          type: 'string',
          enum: ['VERY_FLEXIBLE', 'MODERATELY_FLEXIBLE', 'RIGID', 'UNKNOWN'],
        },
      },
      required: ['preferredDays', 'preferredTimes', 'scheduleFlexibility'],
    },
    location: {
      type: 'object',
      properties: {
        preferredOutletId: { type: ['string', 'null'] },
        preferredOutletName: { type: ['string', 'null'] },
        distanceSensitivity: { type: ['string', 'null'] },
      },
    },
    budgetSensitivity: {
      type: 'string',
      enum: ['HIGH', 'MODERATE', 'LOW', 'UNKNOWN'],
    },
    budgetRange: { type: ['string', 'null'] },
    objections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          objectionType: {
            type: 'string',
            enum: [
              'PRICE_OR_MEMBERSHIP_COST',
              'SCHEDULE_OR_TIME_COMMITMENT',
              'LOCATION_OR_DISTANCE',
              'COMMUTE',
              'CONTRACT_OR_COMMITMENT_TERMS',
              'CHILDCARE',
              'INTIMIDATION_OR_CONFIDENCE',
              'OVERCROWDING',
              'PARKING',
              'FACILITY_FEATURES',
              'SPOUSAL_OR_PARTNER_CONSULTATION',
              'OTHER',
            ],
          },
          severity: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'BLOCKER'],
          },
          rawCustomerStatement: { type: 'string' },
          normalizedSummary: { type: 'string' },
        },
        required: ['objectionType', 'severity', 'rawCustomerStatement', 'normalizedSummary'],
      },
    },
    decisionFactors: {
      type: 'array',
      items: {
        type: 'string',
        enum: [
          'PRICE',
          'LOCATION',
          'SCHEDULE',
          'COACHING_QUALITY',
          'COMMUNITY_ATMOSPHERE',
          'FACILITY_QUALITY',
          'TRIAL_EXPERIENCE',
          'CONTRACT_FLEXIBILITY',
        ],
      },
    },
    timeline: {
      type: 'string',
      enum: ['IMMEDIATE', 'THIS_WEEK', 'WITHIN_A_MONTH', 'EXPLORING', 'UNKNOWN'],
    },
    readiness: {
      type: 'string',
      enum: ['EXPLORING', 'INTERESTED', 'READY_TO_VISIT', 'READY_TO_TRY', 'READY_TO_JOIN', 'UNKNOWN'],
    },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          category: { type: 'string' },
          answered: { type: 'boolean' },
          answer: { type: ['string', 'null'] },
        },
        required: ['question', 'category', 'answered'],
      },
    },
    constraints: {
      type: 'array',
      items: { type: 'string' },
    },
    missingInformation: {
      type: 'array',
      items: { type: 'string' },
    },
    isHighIntent: { type: 'boolean' },
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
    nextActionReason: { type: 'string' },
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
    'primaryGoal',
    'serviceInterests',
    'experienceLevel',
    'schedule',
    'readiness',
    'isHighIntent',
    'qualificationStatus',
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
