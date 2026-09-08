/**
 * Day 31 — Receptionist Sensitive Data Filter Service
 * Redacts payment card details, passwords, and access tokens from conversation transcripts.
 */

import { Injectable } from '@nestjs/common';
import { SENSITIVE_DATA_PATTERNS } from '../receptionist.constants';

@Injectable()
export class SensitiveDataFilterService {
  /**
   * Sanitizes input text by masking detected sensitive patterns.
   */
  sanitize(text: string): { sanitizedText: string; hadSensitiveData: boolean } {
    let sanitizedText = text;
    let hadSensitiveData = false;

    for (const pattern of SENSITIVE_DATA_PATTERNS) {
      if (pattern.test(sanitizedText)) {
        hadSensitiveData = true;
        sanitizedText = sanitizedText.replace(pattern, '[REDACTED_SENSITIVE_INFO]');
      }
    }

    return { sanitizedText, hadSensitiveData };
  }
}
