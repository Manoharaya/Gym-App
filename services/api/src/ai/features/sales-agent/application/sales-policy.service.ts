/**
 * Day 36 — AI Sales Policy Engine
 * Enforces business boundaries, strict truth in pricing, anti-hallucination guardrails,
 * discount prevention, medical triage rejection, and prompt injection defense.
 */

import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SalesHandoffReason } from '@fitcore/types';

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason?: string;
  suggestedEscalation?: {
    reason: SalesHandoffReason;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    guidance: string;
  };
}

@Injectable()
export class SalesPolicyService {
  private readonly logger = new Logger(SalesPolicyService.name);

  // Prompt injection & jailbreak patterns
  private readonly injectionPatterns: RegExp[] = [
    /ignore\s+(all\s+)?(previous\s+)?instructions/i,
    /system\s+prompt/i,
    /hidden\s+instructions/i,
    /developer\s+mode/i,
    /give\s+me\s+(the\s+)?internal\s+pricing/i,
    /reveal\s+(api\s+)?key/i,
    /disregard\s+(your\s+)?rules/i,
    /override\s+(all\s+)?policies/i,
  ];

  // Medical inquiry patterns that mandate safe doctor referral
  private readonly medicalPatterns: RegExp[] = [
    /\b(chest\s+pain|heart\s+attack|angina)\b/i,
    /\b(hernia|torn\s+ligament|fracture|broken\s+bone)\b/i,
    /\b(diagnos(e|is)|prescribe|cure|disease|illness)\b/i,
    /\b(chronic\s+pain|spinal\s+injury|concussion)\b/i,
  ];

  // Discount & negotiation patterns
  private readonly discountPatterns: RegExp[] = [
    /\b(\d+%\s*off|discount|cheaper|bargain|deal|cut\s+price)\b/i,
    /\b(negotiate|lower\s+the\s+rate|special\s+price|give\s+it\s+to\s+me\s+for)\b/i,
  ];

  /**
   * 1. Inspect prospect message for prompt injection or malicious rule-override attempts.
   */
  evaluatePromptSafety(message: string): PolicyEvaluationResult {
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(message)) {
        this.logger.warn(`[SalesPolicy] Detected prompt injection attempt: "${message.substring(0, 50)}..."`);
        return {
          allowed: false,
          reason: 'PROMPT_INJECTION_DETECTED',
          suggestedEscalation: {
            reason: 'FAILED_AI_INTERACTION',
            priority: 'MEDIUM',
            guidance: 'Security filter triggered. Reply with standard business assistance.',
          },
        };
      }
    }

    return { allowed: true };
  }

  /**
   * 2. Inspect message for medical claims or injury questions requiring physician referral.
   */
  evaluateMedicalSafety(message: string): PolicyEvaluationResult {
    for (const pattern of this.medicalPatterns) {
      if (pattern.test(message)) {
        this.logger.log(`[SalesPolicy] Detected medical inquiry requiring safe human referral: "${message.substring(0, 50)}..."`);
        return {
          allowed: false,
          reason: 'MEDICAL_CONCERN_DETECTED',
          suggestedEscalation: {
            reason: 'MEDICAL_CONCERN',
            priority: 'HIGH',
            guidance:
              'Safety directive: Advise consulting a physician and connect prospect with staff for exercise readiness guidance.',
          },
        };
      }
    }

    return { allowed: true };
  }

  /**
   * 3. Evaluate discount requests against policy (disallow unauthorized autonomous discounts).
   */
  evaluateDiscountRequest(message: string): PolicyEvaluationResult {
    for (const pattern of this.discountPatterns) {
      if (pattern.test(message)) {
        this.logger.log(`[SalesPolicy] Detected pricing negotiation request: "${message.substring(0, 50)}..."`);
        return {
          allowed: true, // we allow the message to be processed, but flag discount restriction
          reason: 'DISCOUNT_REQUEST_FLAGGED',
          suggestedEscalation: {
            reason: 'COMPLEX_PRICING',
            priority: 'LOW',
            guidance: 'Inform prospect of standardized pricing and approved trial options.',
          },
        };
      }
    }

    return { allowed: true };
  }

  /**
   * 4. Verify that a price presented by AI strictly matches verified database value.
   */
  verifyPriceAccuracy(claimedPrice: number, verifiedPrice: number): boolean {
    const tolerance = 0.01;
    const isAccurate = Math.abs(claimedPrice - verifiedPrice) < tolerance;
    if (!isAccurate) {
      this.logger.error(`[SalesPolicy] Anti-hallucination violation: Claimed $${claimedPrice} != Verified $${verifiedPrice}`);
    }
    return isAccurate;
  }
}
