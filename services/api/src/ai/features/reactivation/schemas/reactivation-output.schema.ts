import { REACTIVATION_STRATEGIES } from '@fitcore/types';

export const REACTIVATION_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description: 'Executive explanation for authorized gym staff detailing why reactivation is relevant, past routine, and recovery opportunity.',
    },
    reactivation: {
      type: 'object',
      properties: {
        eligible: { type: 'boolean' },
        status: {
          type: 'string',
          enum: [
            'NO_ACTION',
            'FOLLOW_UP_RECOMMENDED',
            'FOLLOW_UP_IN_PROGRESS',
            'REENGAGED',
            'DISMISSED',
            'EXPIRED',
          ],
        },
        recoveryState: {
          type: 'string',
          enum: [
            'NO_RECOVERY_SIGNAL',
            'EARLY_REENGAGEMENT',
            'PARTIAL_REENGAGEMENT',
            'STABLE_REENGAGEMENT',
            'REENGAGED',
          ],
        },
        confidence: {
          type: 'string',
          enum: ['HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT_DATA'],
        },
      },
      required: ['eligible', 'status', 'recoveryState', 'confidence'],
    },
    inactivity: {
      type: 'object',
      properties: {
        observation: { type: 'string' },
        timeframe: { type: 'string' },
        evidence: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['observation', 'evidence'],
    },
    primaryFactors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          observation: { type: 'string' },
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
    recommendedStrategies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [...REACTIVATION_STRATEGIES],
          },
          priority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH'],
          },
          reason: { type: 'string' },
          suggestedStaffMessage: { type: 'string' },
          suggestedNextStep: { type: 'string' },
        },
        required: ['type', 'priority', 'reason'],
      },
    },
    suggestedStaffMessage: {
      type: 'string',
      description: 'Draft outreach message for staff to personalize and send manually. Non-autonomous draft only.',
    },
    suggestedNextStep: {
      type: 'string',
      description: 'Immediate operational next step for staff to consider.',
    },
  },
  required: [
    'summary',
    'reactivation',
    'inactivity',
    'primaryFactors',
    'positiveSignals',
    'recommendedStrategies',
    'suggestedNextStep',
  ],
};
