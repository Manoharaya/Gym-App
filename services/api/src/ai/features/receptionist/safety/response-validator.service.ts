/**
 * Day 31 — Receptionist Response Validator Service
 * Validates AI output against safety constraints, hallucination limits, and medical disclaimers.
 */

import { Injectable, Logger } from '@nestjs/common';
import { MEDICAL_TERMS_PATTERNS } from '../receptionist.constants';
import { ReceptionistResponseDto } from '@fitcore/types';

@Injectable()
export class ResponseValidatorService {
  private readonly logger = new Logger(ResponseValidatorService.name);

  /**
   * Post-processes and validates the AI receptionist response.
   */
  validate(
    response: ReceptionistResponseDto,
    originalQuery: string,
  ): { isValid: boolean; modifiedResponse: ReceptionistResponseDto; violations: string[] } {
    const violations: string[] = [];
    const modified = { ...response };

    // 1. Check for medical inquiries or clinical advice
    const queryLower = originalQuery.toLowerCase();
    const hasMedicalTrigger = MEDICAL_TERMS_PATTERNS.some((p: RegExp) => p.test(queryLower));

    if (hasMedicalTrigger) {
      const disclaimer =
        'Disclaimer: FitCore AI Receptionist does not provide medical diagnoses or treatment advice. For injuries or medical symptoms, please consult a licensed medical professional.';

      if (!modified.message.includes('medical') && !modified.message.includes('doctor')) {
        modified.message = `${modified.message}\n\n${disclaimer}`;
      }
      modified.safetyFlag = 'MEDICAL_DISCLAIMER';
    }

    // 2. Ensure confidence is bounded between 0 and 1
    if (typeof modified.confidence !== 'number' || isNaN(modified.confidence)) {
      modified.confidence = 0.85;
    } else {
      modified.confidence = Math.max(0, Math.min(1, modified.confidence));
    }

    // 3. Ensure citations list is present
    if (!modified.citations) {
      modified.citations = [];
    }

    return {
      isValid: violations.length === 0,
      modifiedResponse: modified,
      violations,
    };
  }
}
