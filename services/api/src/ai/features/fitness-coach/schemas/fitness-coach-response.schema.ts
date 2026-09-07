/**
 * JSON Schema for FitnessCoachResponse (Slice 10, 11, 31)
 */
export const FITNESS_COACH_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    message: {
      type: 'string',
      description: 'Primary conversational coaching response to the member',
    },
    summary: {
      type: 'string',
      description: 'Brief 1-2 sentence executive summary of the training insight',
    },
    insights: {
      type: 'array',
      description: 'Grounded analytical observations derived from actual member data',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['type', 'title', 'description'],
      },
    },
    recommendations: {
      type: 'array',
      description: 'Actionable, safe fitness recommendations',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          rationale: { type: 'string' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          type: {
            type: 'string',
            enum: [
              'TRAINING',
              'RECOVERY',
              'CONSISTENCY',
              'WORKOUT_EXECUTION',
              'GOAL_SETTING',
              'SCHEDULING',
              'PROGRESS_REVIEW',
              'GENERAL_FITNESS',
            ],
          },
        },
        required: ['title', 'description', 'type'],
      },
    },
    cautions: {
      type: 'array',
      description: 'Important safety boundaries, non-diagnostic disclaimers, or rest notes',
      items: { type: 'string' },
    },
    suggestedActions: {
      type: 'array',
      description: 'Safe in-app navigation actions for the member',
      items: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: [
              'VIEW_WORKOUT',
              'VIEW_PROGRESS',
              'VIEW_GOAL',
              'VIEW_TRAINING_PLAN',
              'VIEW_BOOKING',
              'OPEN_CHALLENGE',
            ],
          },
          label: { type: 'string' },
          parameters: { type: 'object' },
        },
        required: ['action', 'label'],
      },
    },
    followUpQuestion: {
      type: 'string',
      description: 'Optional coaching question to keep member engaged',
    },
  },
  required: ['message'],
};
