/**
 * FitCore AI Retention Agent Structured Output JSON Schema (Day 29)
 *
 * Implements Section 16 specification for structured JSON validation.
 */

export const RETENTION_AGENT_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description: 'Objective, non-clinical, evidence-grounded summary of the member engagement state.',
    },
    riskLevel: {
      type: 'string',
      enum: ['INSUFFICIENT_DATA', 'LOW', 'MODERATE', 'ELEVATED', 'HIGH'],
      description: 'Deterministic retention risk level.',
    },
    riskTrend: {
      type: 'string',
      enum: ['IMPROVING', 'STABLE', 'WORSENING', 'INSUFFICIENT_DATA'],
      description: 'Observed risk trajectory.',
    },
    primaryFactors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          observation: { type: 'string' },
          timeframe: { type: 'string' },
          evidence: { type: 'array', items: { type: 'string' } },
        },
        required: ['type', 'severity', 'observation'],
      },
    },
    positiveSignals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          observation: { type: 'string' },
          timeframe: { type: 'string' },
          evidence: { type: 'array', items: { type: 'string' } },
        },
        required: ['type', 'observation'],
      },
    },
    recommendedIntervention: {
      type: 'string',
      enum: [
        'TRAINER_CHECK_IN',
        'GOAL_REVIEW',
        'TRAINING_RESTART',
        'CLASS_RECOMMENDATION',
        'PERSONAL_TRAINING_FOLLOW_UP',
        'RECOVERY_SUPPORT',
        'APP_ENGAGEMENT',
        'NUTRITION_ENGAGEMENT',
        'MEMBERSHIP_CONVERSATION',
        'GENERAL_SUPPORT',
        'NO_ACTION',
        'INSUFFICIENT_DATA',
      ],
      description: 'Least intrusive appropriate intervention from controlled taxonomy.',
    },
    interventionReason: {
      type: 'string',
      description: 'Why this intervention is recommended based on verifiable activity.',
    },
    recommendedChannel: {
      type: 'string',
      enum: ['EMAIL', 'SMS', 'PUSH', 'WHATSAPP', 'IN_APP'],
      description: 'Policy-permitted communication channel.',
    },
    recommendedTiming: {
      type: 'object',
      properties: {
        recommendedAt: { type: 'string' },
        timezone: { type: 'string' },
        reason: { type: 'string' },
        confidence: { type: 'number' },
      },
      required: ['recommendedAt', 'timezone', 'reason'],
    },
    messageDraft: {
      type: 'string',
      description: 'Supportive, natural, non-shaming draft message for staff review and approval.',
    },
    staffNote: {
      type: 'string',
      description: 'Internal guidance note for staff executing the intervention.',
    },
    nextBestAction: {
      type: 'string',
      description: 'Concrete next operational action for the trainer or front desk staff.',
    },
    confidence: {
      type: 'string',
      enum: ['HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT_DATA'],
      description: 'Analytical confidence based on available telemetry.',
    },
    caution: {
      type: 'string',
      description: 'Operational cautions or constraints.',
    },
    sources: {
      type: 'array',
      items: { type: 'string' },
      description: 'Telemetry sources consulted.',
    },
  },
  required: [
    'summary',
    'riskLevel',
    'riskTrend',
    'primaryFactors',
    'positiveSignals',
    'recommendedIntervention',
    'interventionReason',
    'recommendedChannel',
    'recommendedTiming',
    'messageDraft',
    'confidence',
  ],
};
