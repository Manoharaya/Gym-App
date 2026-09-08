import { Injectable, Logger } from '@nestjs/common';
import type { NutritionAIContext } from './nutrition-context.types';

export type ContextClassification =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'PERSONAL'
  | 'SENSITIVE'
  | 'RESTRICTED';

export interface FieldSensitivityClassification {
  field: string;
  classification: ContextClassification;
  allowedInCoachContext: boolean;
}

export const NUTRITION_SENSITIVITY_REGISTRY: FieldSensitivityClassification[] = [
  { field: 'identity.memberId', classification: 'INTERNAL', allowedInCoachContext: true },
  { field: 'profile.allergies', classification: 'SENSITIVE', allowedInCoachContext: true },
  { field: 'profile.dietaryPattern', classification: 'PERSONAL', allowedInCoachContext: true },
  { field: 'targets', classification: 'PERSONAL', allowedInCoachContext: true },
  { field: 'foodLogs', classification: 'PERSONAL', allowedInCoachContext: true },
  { field: 'mealPlan', classification: 'PERSONAL', allowedInCoachContext: true },
  { field: 'parqAnswers', classification: 'RESTRICTED', allowedInCoachContext: false },
  { field: 'medicalDocuments', classification: 'RESTRICTED', allowedInCoachContext: false },
  { field: 'trainerPrivateNotes', classification: 'RESTRICTED', allowedInCoachContext: false },
  { field: 'diagnoses', classification: 'RESTRICTED', allowedInCoachContext: false },
  { field: 'medications', classification: 'RESTRICTED', allowedInCoachContext: false },
  { field: 'paymentData', classification: 'RESTRICTED', allowedInCoachContext: false },
  { field: 'credentials', classification: 'RESTRICTED', allowedInCoachContext: false },
];

@Injectable()
export class NutritionContextPolicy {
  private readonly logger = new Logger(NutritionContextPolicy.name);

  private readonly FORBIDDEN_KEYS = new Set([
    'parq',
    'parqresponses',
    'medical',
    'medicalclearance',
    'medicalconditions',
    'healthconditions',
    'doctorclearance',
    'privatenotes',
    'confidentialnotes',
    'diagnoses',
    'medications',
    'password',
    'passwordhash',
    'token',
    'jwt',
    'secret',
    'creditcard',
    'bankaccount',
    'paymentmethod',
    'stripe',
  ]);

  /**
   * Sanitizes the constructed context object, ensuring no restricted health or private data leaks.
   */
  sanitizeContext(context: NutritionAIContext): NutritionAIContext {
    return this.cleanObject(context) as NutritionAIContext;
  }

  private cleanObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.cleanObject(item));
    }

    if (typeof obj === 'object') {
      const cleaned: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (this.FORBIDDEN_KEYS.has(lowerKey)) {
          this.logger.debug(`[NutritionContextPolicy] Redacted blacklisted key: ${key}`);
          continue;
        }
        cleaned[key] = this.cleanObject(value);
      }
      return cleaned;
    }

    return obj;
  }
}
