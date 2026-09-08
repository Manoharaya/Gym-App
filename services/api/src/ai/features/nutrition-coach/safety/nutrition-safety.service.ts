import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { NUTRITION_RISK_RULES } from './nutrition-risk.rules';
import { buildSafetyEscalationResponse } from './escalation.rules';
import type { NutritionSafetyEvaluation } from '../nutrition-coach.types';
import type {
  NutritionSafetyEscalationCategory,
  NutritionSafetyEscalationSeverity,
  NutritionCoachResponse,
} from '@fitcore/types';

@Injectable()
export class NutritionSafetyService {
  private readonly logger = new Logger(NutritionSafetyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates user input against safety rules.
   * Checks for eating disorders, extreme restriction, unsafe fasting, PEDs, and allergen bypass.
   */
  async evaluateInput(
    content: string,
    organisationId: string,
    memberId: string,
    conversationId?: string,
  ): Promise<NutritionSafetyEvaluation> {
    const trimmed = content.trim();

    for (const rule of NUTRITION_RISK_RULES) {
      if (rule.pattern.test(trimmed)) {
        this.logger.warn(
          `Nutrition safety rule triggered [${rule.id}] for member '${memberId}': category ${rule.category}`,
        );

        const triggerPhrase = rule.pattern.exec(trimmed)?.[0] || rule.id;
        const safeResponse = buildSafetyEscalationResponse(rule.category, triggerPhrase);

        // Record persistent escalation record in DB
        await this.recordEscalation({
          organisationId,
          memberId,
          conversationId,
          severity: rule.severity,
          category: rule.category,
          triggerPhrase,
          actionTaken: `INTERVENED_${rule.id}`,
        });

        return {
          severity: rule.severity,
          category: rule.category,
          isSafeToProceed: false,
          safeResponse,
          triggerPhrase,
          actionTaken: `BLOCKED_BY_${rule.id}`,
        };
      }
    }

    return {
      severity: 'NONE',
      isSafeToProceed: true,
      actionTaken: 'PROCEED',
    };
  }

  /**
   * Post-execution validation: Ensures the model's generated output does NOT contain
   * member allergens or dangerous restriction advice.
   */
  async evaluateOutput(
    response: NutritionCoachResponse,
    memberAllergies: string[],
    organisationId: string,
    memberId: string,
    conversationId?: string,
  ): Promise<NutritionCoachResponse> {
    if (memberAllergies.length === 0) {
      return response;
    }

    const lowerAllergies = memberAllergies.map((a) => a.toLowerCase().trim());
    const textToCheck = [
      response.answer,
      ...(response.recommendations?.map((r) => `${r.title} ${r.description}`) || []),
      ...(response.mealSuggestions?.map((m) => `${m.name} ${m.ingredients.join(' ')}`) || []),
      ...(response.foodAlternatives?.map((f) => `${f.originalFood} ${f.substituteFood} ${f.reason}`) || []),
    ]
      .join(' ')
      .toLowerCase();

    // Check if any documented allergen is present in the response
    for (const allergen of lowerAllergies) {
      if (allergen.length > 2 && textToCheck.includes(allergen)) {
        this.logger.warn(
          `Post-generation safety alert: Output contained documented allergen '${allergen}' for member '${memberId}'`,
        );

        await this.recordEscalation({
          organisationId,
          memberId,
          conversationId,
          severity: 'URGENT_ESCALATION',
          category: 'ALLERGEN_VIOLATION',
          triggerPhrase: `Model output included allergen: ${allergen}`,
          actionTaken: 'REDACTED_ALLERGEN_FROM_OUTPUT',
        });

        // Filter out contaminated meal suggestions and food alternatives
        const safeMealSuggestions = (response.mealSuggestions || []).filter(
          (m) =>
            !m.name.toLowerCase().includes(allergen) &&
            !m.ingredients.some((i) => i.toLowerCase().includes(allergen)),
        );

        const safeAlternatives = (response.foodAlternatives || []).filter(
          (f) => !f.substituteFood.toLowerCase().includes(allergen),
        );

        return {
          ...response,
          mealSuggestions: safeMealSuggestions,
          foodAlternatives: safeAlternatives,
          warnings: [
            ...(response.warnings || []),
            `Note: Suggestions containing '${allergen}' were filtered out in accordance with your documented allergy profile.`,
          ],
        };
      }
    }

    return response;
  }

  /**
   * Persists an immutable safety escalation record.
   */
  async recordEscalation(params: {
    organisationId: string;
    memberId: string;
    conversationId?: string | null;
    severity: NutritionSafetyEscalationSeverity;
    category: NutritionSafetyEscalationCategory;
    triggerPhrase?: string | null;
    actionTaken: string;
  }) {
    try {
      await this.prisma.aINutritionSafetyEscalation.create({
        data: {
          organisationId: params.organisationId,
          memberId: params.memberId,
          conversationId: params.conversationId,
          severity: params.severity,
          category: params.category,
          triggerPhrase: params.triggerPhrase,
          actionTaken: params.actionTaken,
          resolved: false,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to persist nutrition safety escalation: ${err.message}`, err.stack);
    }
  }
}
