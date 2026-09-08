/**
 * JSON Schema for validating AI Retention Intelligence output.
 * Matches Section 19 of Day 26 specification.
 */

export const RETENTION_INTELLIGENCE_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description: 'Grounded, professional summary of member retention risk and behavioral changes.',
    },
    risk: {
      type: 'object',
      properties: {
        level: {
          type: 'string',
          enum: ['INSUFFICIENT_DATA', 'LOW', 'MODERATE', 'ELEVATED', 'HIGH'],
        },
        trend: {
          type: 'string',
          enum: ['IMPROVING', 'STABLE', 'WORSENING', 'INSUFFICIENT_DATA'],
        },
      },
      required: ['level', 'trend'],
    },
    primaryFactors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          observation: { type: 'string' },
          timeframe: { type: 'string' },
          evidence: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['type', 'observation', 'evidence'],
      },
    },
    positiveSignals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          observation: { type: 'string' },
        },
        required: ['type', 'observation'],
      },
    },
    recommendedInterventions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
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
          },
          priority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH'],
          },
          reason: { type: 'string' },
        },
        required: ['type', 'priority', 'reason'],
      },
    },
    suggestedStaffNote: {
      type: 'string',
      description: 'Concise draft note for gym staff or trainer. Must not be automatically saved.',
    },
    confidence: {
      type: 'string',
      enum: ['HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT_DATA'],
    },
  },
  required: [
    'summary',
    'risk',
    'primaryFactors',
    'positiveSignals',
    'recommendedInterventions',
    'confidence',
  ],
};
