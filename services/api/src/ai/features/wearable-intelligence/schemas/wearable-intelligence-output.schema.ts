export const WEARABLE_INTELLIGENCE_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description: 'Concise, calm summary of the member recent recovery and activity patterns.',
    },
    dataHighlights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          metric: { type: 'string' },
          value: { type: 'string' },
          comparison: { type: 'string' },
          trend: { type: 'string' },
        },
        required: ['metric'],
      },
      description: 'Key measured metrics compared against baseline or recent trends.',
    },
    recoveryInterpretation: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['LOW', 'MODERATE', 'GOOD', 'INSUFFICIENT_DATA'],
        },
        explanation: { type: 'string' },
      },
      required: ['category', 'explanation'],
      description: 'Non-clinical qualitative recovery assessment.',
    },
    trainingGuidance: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['TRAIN', 'RECOVER', 'REDUCE_INTENSITY', 'HYDRATE', 'SLEEP', 'CONSISTENCY', 'CHECK_IN'],
          },
          recommendation: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['type', 'recommendation', 'reason'],
      },
      description: 'Actionable, non-medical training and wellness guidance.',
    },
    caution: {
      type: 'string',
      description: 'Optional non-alarming caution or non-medical disclaimer.',
    },
    escalation: {
      type: 'object',
      properties: {
        required: { type: 'boolean' },
        message: { type: 'string' },
      },
      required: ['required'],
    },
    sourceSummary: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of wearable telemetry data sources used in this synthesis.',
    },
    confidence: {
      type: 'string',
      enum: ['HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT_DATA'],
    },
  },
  required: ['summary', 'dataHighlights', 'recoveryInterpretation', 'trainingGuidance', 'sourceSummary', 'confidence'],
};
