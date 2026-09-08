import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RetentionIntelligenceResponse, RetentionInterventionType } from '@fitcore/types';

const PROHIBITED_DIAGNOSTIC_TERMS = [
  'depressed',
  'depression',
  'anxiety',
  'anxious',
  'mental health disorder',
  'bipolar',
  'eating disorder',
  'anorexia',
  'bulimia',
  'schizophrenia',
  'ptsd',
  'ocd',
  'adhd',
  'diagnosed with',
  'clinical depression',
  'medical condition',
  'psychological disorder',
];

const PROHIBITED_COMMERCIAL_TERMS = [
  'discount',
  '% off',
  'free membership',
  'waive fee',
  'price cut',
  'special price',
  'refund',
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore previous instructions/i,
  /ignore all prior prompts/i,
  /system prompt/i,
  /developer mode/i,
  /you are now an unfiltered/i,
  /reveal your instructions/i,
  /jailbreak/i,
];

const VALID_INTERVENTIONS: Set<RetentionInterventionType> = new Set([
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
]);

@Injectable()
export class RetentionSafetyService {
  private readonly logger = new Logger(RetentionSafetyService.name);

  /**
   * Validates user-supplied text for prompt injection attempts.
   */
  validateInputText(text?: string): void {
    if (!text) return;

    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        this.logger.warn(`Prompt injection pattern detected in retention input: "${text.substring(0, 50)}..."`);
        throw new BadRequestException('Invalid input: prompt injection or forbidden control sequences detected.');
      }
    }
  }

  /**
   * Validates and sanitizes AI retention response before returning or persisting.
   */
  validateAndSanitizeOutput(output: RetentionIntelligenceResponse): RetentionIntelligenceResponse {
    // 1. Check for clinical/psychological diagnostic terms
    const textToCheck = `${output.summary} ${output.suggestedStaffNote || ''} ${output.recommendedInterventions.map((i) => i.reason).join(' ')}`.toLowerCase();

    for (const term of PROHIBITED_DIAGNOSTIC_TERMS) {
      if (textToCheck.includes(term)) {
        this.logger.warn(`Prohibited diagnostic term '${term}' detected in retention output. Sanitizing.`);
        output.summary = output.summary.replace(new RegExp(term, 'gi'), 'observed activity changes');
        if (output.suggestedStaffNote) {
          output.suggestedStaffNote = output.suggestedStaffNote.replace(new RegExp(term, 'gi'), 'routine adjustments');
        }
      }
    }

    // 2. Check for unauthorized discount/pricing assertions
    for (const term of PROHIBITED_COMMERCIAL_TERMS) {
      if (textToCheck.includes(term)) {
        this.logger.warn(`Prohibited discount term '${term}' detected in retention output. Sanitizing.`);
        output.recommendedInterventions = output.recommendedInterventions.map((intervention) => {
          if (intervention.type === 'MEMBERSHIP_CONVERSATION') {
            return {
              ...intervention,
              reason: 'Membership renewal date is approaching; check in regarding satisfaction with current plan options.',
            };
          }
          return intervention;
        });
      }
    }

    // 3. Ensure intervention types are strictly within approved taxonomy
    output.recommendedInterventions = output.recommendedInterventions.filter((intervention) => {
      if (!VALID_INTERVENTIONS.has(intervention.type)) {
        this.logger.warn(`Unapproved intervention type '${intervention.type}' discarded.`);
        return false;
      }
      return true;
    });

    if (output.recommendedInterventions.length === 0) {
      output.recommendedInterventions.push({
        type: 'GENERAL_SUPPORT',
        priority: 'LOW',
        reason: 'Maintain standard periodic gym support and check-in cadence.',
      });
    }

    return output;
  }
}
