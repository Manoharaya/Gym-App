import type {
  NutritionCoachCoachingStyle,
  NutritionCoachResponseLength,
  NutritionSafetyEscalationSeverity,
  NutritionSafetyEscalationCategory,
  NutritionCoachResponse,
  ParsedFoodLogProposal,
} from '@fitcore/types';

export interface NutritionSafetyEvaluation {
  severity: NutritionSafetyEscalationSeverity;
  category?: NutritionSafetyEscalationCategory;
  isSafeToProceed: boolean;
  safeResponse?: NutritionCoachResponse;
  triggerPhrase?: string;
  actionTaken: string;
}

export interface NutritionCoachContextOptions {
  includeTrainingContext?: boolean;
  targetDate?: Date;
}

export interface FoodLogParseResult {
  proposal: ParsedFoodLogProposal;
  parsedAt: string;
  confidence: number;
}
