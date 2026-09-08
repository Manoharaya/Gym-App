/**
 * Day 31 — Receptionist Safety Service
 * Unified safety gateway evaluating input queries and output responses.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PromptInjectionService } from './prompt-injection.service';
import { SensitiveDataFilterService } from './sensitive-data-filter.service';
import { ResponseValidatorService } from './response-validator.service';
import { SafetyCheckResult } from '../receptionist.types';
import { ReceptionistResponseDto } from '@fitcore/types';

@Injectable()
export class ReceptionistSafetyService {
  private readonly logger = new Logger(ReceptionistSafetyService.name);

  constructor(
    private readonly promptInjectionService: PromptInjectionService,
    private readonly sensitiveDataFilter: SensitiveDataFilterService,
    private readonly responseValidator: ResponseValidatorService,
  ) {}

  /**
   * Pre-execution safety evaluation on incoming customer text.
   */
  evaluateInput(text: string): SafetyCheckResult {
    // 1. Redact sensitive credentials/cards
    const { sanitizedText } = this.sensitiveDataFilter.sanitize(text);

    // 2. Check for adversarial prompt injection
    const injectionCheck = this.promptInjectionService.evaluate(sanitizedText);
    if (injectionCheck.isMalicious) {
      return {
        isSafe: false,
        safetyFlag: 'PROMPT_INJECTION_DETECTED',
        sanitizedInput: sanitizedText,
        reason: 'Adversarial prompt injection signature detected.',
        remedyAction: 'BLOCK',
      };
    }

    return {
      isSafe: true,
      sanitizedInput: sanitizedText,
      remedyAction: 'PROCEED',
    };
  }

  /**
   * Post-execution validation on AI generated response.
   */
  validateResponse(response: ReceptionistResponseDto, originalQuery: string) {
    return this.responseValidator.validate(response, originalQuery);
  }
}
