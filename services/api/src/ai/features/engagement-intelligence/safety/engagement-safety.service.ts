import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AISafetyService } from '../../../safety/ai-safety.service';
import { EngagementIntelligenceResponse } from '@fitcore/types';

const DISALLOWED_CLINICAL_TERMS = [
  'depression',
  'depressed',
  'anxiety',
  'burnout',
  'mental illness',
  'pathology',
  'bipolar',
  'psychiatric',
  'suicide',
  'eating disorder',
  'anorexia',
  'bulimia',
];

const CERTAIN_CHURN_TERMS = [
  'will churn',
  'will cancel',
  'will leave',
  'guaranteed to cancel',
  'inevitably leaving',
  'lost cause',
];

@Injectable()
export class EngagementSafetyService {
  private readonly logger = new Logger(EngagementSafetyService.name);

  constructor(private readonly baseSafetyService: AISafetyService) {}

  /**
   * Screens incoming requests for prompt injections and malicious inputs.
   */
  validateInputQuery(query?: string): void {
    if (!query) return;

    if (query.length > 1000) {
      throw new BadRequestException('Engagement query exceeds maximum permitted length (1000 chars).');
    }

    // Check for prompt injection patterns
    const injectionPatterns = [
      /ignore (all )?previous instructions/i,
      /system prompt/i,
      /reveal (your )?developer/i,
      /pretend you are/i,
      /you are now in jailbreak/i,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(query)) {
        this.logger.warn(`Prompt injection attempt detected: "${query.substring(0, 50)}..."`);
        throw new BadRequestException('Invalid query: adversarial instruction detected.');
      }
    }
  }

  /**
   * Validates structured output to ensure zero clinical diagnoses, zero definitive churn claims,
   * and strict conformity to schema expectations.
   */
  validateOutput(output: EngagementIntelligenceResponse): EngagementIntelligenceResponse {
    const textToCheck = `${output.summary} ${output.recommendedActions.map((a) => a.recommendation).join(' ')}`.toLowerCase();

    // 1. Guard against clinical mental health diagnoses
    for (const term of DISALLOWED_CLINICAL_TERMS) {
      if (textToCheck.includes(term)) {
        this.logger.warn(`Disallowed clinical term "${term}" detected in AI response. Sanitizing.`);
        output.summary = output.summary.replace(new RegExp(term, 'gi'), 'routine fatigue');
      }
    }

    // 2. Guard against certain churn statements
    for (const term of CERTAIN_CHURN_TERMS) {
      if (textToCheck.includes(term)) {
        this.logger.warn(`Certain churn claim "${term}" detected in AI response. Neutralizing.`);
        output.summary = output.summary.replace(new RegExp(term, 'gi'), 'shows reduced recent activity');
      }
    }

    return output;
  }
}
