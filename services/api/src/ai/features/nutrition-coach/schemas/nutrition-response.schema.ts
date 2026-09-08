export const NUTRITION_COACH_RESPONSE_SCHEMA: Record<string, any> = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    responseType: {
      type: 'string',
      enum: ['EXPLANATION', 'SUGGESTION', 'SUMMARY', 'SAFETY_INTERVENTION', 'EDUCATIONAL'],
    },
    confidence: {
      type: 'string',
      enum: ['HIGH', 'MEDIUM', 'LOW'],
    },
    groundedSources: {
      type: 'array',
      items: { type: 'string' },
    },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              'MEAL_SUGGESTION',
              'FOOD_ALTERNATIVE',
              'HYDRATION',
              'MEAL_TIMING',
              'CONSISTENCY',
              'TARGET_EDUCATION',
              'LOGGING_GUIDANCE',
              'TRAINING_NUTRITION',
              'GENERAL_EDUCATION',
            ],
          },
          title: { type: 'string' },
          description: { type: 'string' },
          rationale: { type: 'string' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
        },
        required: ['type', 'title', 'description'],
      },
    },
    mealSuggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          ingredients: { type: 'array', items: { type: 'string' } },
          estimatedCalories: { type: 'number' },
          estimatedProtein: { type: 'number' },
          estimatedCarbs: { type: 'number' },
          estimatedFat: { type: 'number' },
          whyItFits: { type: 'string' },
          allergySafetyNote: { type: 'string' },
          isAiSuggestion: { type: 'boolean' },
        },
        required: ['name', 'ingredients', 'whyItFits', 'isAiSuggestion'],
      },
    },
    foodAlternatives: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          originalFood: { type: 'string' },
          substituteFood: { type: 'string' },
          reason: { type: 'string' },
          nutritionalComparison: { type: 'string' },
          confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
          allergyWarning: { type: 'string' },
        },
        required: ['originalFood', 'substituteFood', 'reason', 'confidence'],
      },
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
    },
    followUpQuestions: {
      type: 'array',
      items: { type: 'string' },
    },
    requiresProfessionalReview: { type: 'boolean' },
  },
  required: ['answer', 'responseType', 'confidence', 'requiresProfessionalReview'],
};

export const PARSED_FOOD_LOG_PROPOSAL_SCHEMA: Record<string, any> = {
  type: 'object',
  properties: {
    mealType: { type: 'string' },
    consumedAt: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          foodName: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: 'string' },
          mealType: { type: 'string' },
          foodId: { type: 'string' },
          calories: { type: 'number' },
          protein: { type: 'number' },
          carbohydrates: { type: 'number' },
          fat: { type: 'number' },
          fiber: { type: 'number' },
          confidence: { type: 'number' },
        },
        required: ['foodName', 'quantity', 'unit', 'calories', 'protein', 'carbohydrates', 'fat'],
      },
    },
    totalCalories: { type: 'number' },
    totalProtein: { type: 'number' },
    totalCarbohydrates: { type: 'number' },
    totalFat: { type: 'number' },
    requiresConfirmation: { type: 'boolean' },
    warning: { type: 'string' },
  },
  required: ['mealType', 'items', 'totalCalories', 'totalProtein', 'totalCarbohydrates', 'totalFat', 'requiresConfirmation'],
};
