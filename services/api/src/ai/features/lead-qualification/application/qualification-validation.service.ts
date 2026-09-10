/**
 * FitCore Qualification Validation Service (Day 38)
 *
 * Validates qualification data against domain taxonomies.
 * Enforces medical safety and financial ethics boundaries.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  MEDICAL_SAFETY_KEYWORDS,
  CLINICAL_SAFETY_DISCLAIMER,
} from '../domain/lead-qualification.constants';
import { ExtractedQualificationDto } from '@fitcore/types';

export interface ValidationResult {
  isValid: boolean;
  requiresHumanReview: boolean;
  detectedSafetyCautions: string[];
  clinicalDisclaimer?: string;
  sanitizedData: Partial<ExtractedQualificationDto>;
}

@Injectable()
export class QualificationValidationService {
  private readonly logger = new Logger(QualificationValidationService.name);

  /**
   * Validates and sanitizes qualification payload, screening for medical & financial boundaries.
   */
  validateAndSanitize(
    data: Partial<ExtractedQualificationDto>,
    rawTranscript: string = '',
  ): ValidationResult {
    const safetyCautions: string[] = [];
    let requiresHumanReview = false;
    let clinicalDisclaimer: string | undefined = undefined;

    const combinedText = `${rawTranscript} ${(data.constraints || []).join(' ')} ${(data.secondaryGoals || []).join(' ')} ${data.primaryGoal || ''}`.toLowerCase();

    // 1. Screen for Medical & Clinical boundary
    for (const keyword of MEDICAL_SAFETY_KEYWORDS) {
      if (combinedText.includes(keyword.toLowerCase())) {
        safetyCautions.push(`Medical keyword detected: "${keyword}". Requires human staff review.`);
        requiresHumanReview = true;
        clinicalDisclaimer = CLINICAL_SAFETY_DISCLAIMER;
      }
    }

    // 2. Financial ethics check: ensure no credit or income claims
    const sanitizedConstraints = [...(data.constraints || [])];
    if (requiresHumanReview && !sanitizedConstraints.some((c) => c.toLowerCase().includes('medical review'))) {
      sanitizedConstraints.push('Physical/medical constraint noted — requires human staff clearance before training.');
    }

    const sanitizedData: Partial<ExtractedQualificationDto> = {
      ...data,
      constraints: sanitizedConstraints,
      confidence: typeof data.confidence === 'number' ? Math.min(1.0, Math.max(0.0, data.confidence)) : 0.8,
    };

    return {
      isValid: true,
      requiresHumanReview,
      detectedSafetyCautions: safetyCautions,
      clinicalDisclaimer,
      sanitizedData,
    };
  }
}
