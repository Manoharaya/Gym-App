/**
 * Engagement Intelligence Output JSON Schema (Day 25)
 */

export const ENGAGEMENT_INTELLIGENCE_OUTPUT_SCHEMA = {
  type: 'object',
  required: [
    'summary',
    'observedSignals',
    'engagementInterpretation',
    'retentionRisk',
    'recommendedActions',
    'confidence',
  ],
  properties: {
    summary: {
      type: 'string',
      description: 'Concise, data-grounded, non-judgmental narrative of recent member engagement.',
    },
    observedSignals: {
      type: 'array',
      items: {
        type: 'object',
        required: ['category', 'observation'],
        properties: {
          category: { type: 'string' },
          observation: { type: 'string' },
          timeframe: { type: 'string' },
        },
      },
    },
    engagementInterpretation: {
      type: 'object',
      required: ['level', 'trend'],
      properties: {
        level: {
          type: 'string',
          enum: ['VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH', 'INSUFFICIENT_DATA'],
        },
        trend: {
          type: 'string',
          enum: ['IMPROVING', 'STABLE', 'DECLINING', 'INSUFFICIENT_DATA'],
        },
      },
    },
    retentionRisk: {
      type: 'object',
      required: ['level', 'reasons'],
      properties: {
        level: {
          type: 'string',
          enum: ['INSUFFICIENT_DATA', 'LOW', 'MODERATE', 'ELEVATED', 'HIGH'],
        },
        reasons: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    recommendedActions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['type', 'recommendation'],
        properties: {
          type: {
            type: 'string',
            enum: ['CHECK_IN', 'TRAINING', 'GOAL', 'BOOKING', 'RECOVERY', 'SUPPORT', 'REENGAGEMENT'],
          },
          recommendation: { type: 'string' },
        },
      },
    },
    confidence: {
      type: 'string',
      enum: ['HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT_DATA'],
    },
  },
};
