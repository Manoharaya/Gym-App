/**
 * Day 31 — Receptionist Prompt Injection Service
 * Detects adversarial jailbreaks, system prompt extraction attempts, and roleplay exploits.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PROMPT_INJECTION_PATTERNS } from '../receptionist.constants';

@Injectable()
export class PromptInjectionService {
  private readonly logger = new Logger(PromptInjectionService.name);

  /**
   * Evaluates input string against adversarial prompt injection signatures.
   */
  evaluate(input: string): { isMalicious: boolean; detectedPattern?: string } {
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        this.logger.warn(`[INJECTION DETECTED] Match on pattern: ${pattern}`);
        return {
          isMalicious: true,
          detectedPattern: pattern.source,
        };
      }
    }

    return { isMalicious: false };
  }
}
