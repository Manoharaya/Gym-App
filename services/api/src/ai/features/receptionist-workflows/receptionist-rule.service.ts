/**
 * Day 35 — Receptionist Business Rule Service
 * Deterministic business rules governing operational decisions.
 * Enforces safety: Critical decisions must never depend purely on LLM instructions.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ReceptionistWorkflowContext } from '@fitcore/types';
import { RECEPTIONIST_WORKFLOW_DEFAULTS } from './receptionist-workflow.constants';

export interface BusinessRuleEvaluationResult {
  allowed: boolean;
  requiresHumanHandoff: boolean;
  requiresVerification: boolean;
  requiresConfirmation: boolean;
  ruleName?: string;
  reason?: string;
}

@Injectable()
export class ReceptionistRuleService {
  private readonly logger = new Logger(ReceptionistRuleService.name);

  /**
   * Evaluates operational business rules for a proposed action or intent.
   */
  evaluateBusinessRules(
    context: ReceptionistWorkflowContext,
    action: {
      type: string; // 'PRICING_DISCOUNT', 'COMPLAINT', 'ACCOUNT_LOOKUP', 'BOOKING_MUTATION', 'MARKETING_SEND'
      parameters?: Record<string, any>;
    },
  ): BusinessRuleEvaluationResult {
    const { identityState } = context;

    // Rule 1: Require human for pricing exceptions and discounts
    if (action.type === 'PRICING_DISCOUNT' || action.type === 'CUSTOM_RATE') {
      return {
        allowed: false,
        requiresHumanHandoff: true,
        requiresVerification: false,
        requiresConfirmation: false,
        ruleName: 'HUMAN_REQUIRED_FOR_PRICING_EXCEPTIONS',
        reason: 'Custom pricing and discounts require staff authorization.',
      };
    }

    // Rule 2: Require human for customer complaints
    if (action.type === 'COMPLAINT') {
      return {
        allowed: false,
        requiresHumanHandoff: true,
        requiresVerification: false,
        requiresConfirmation: false,
        ruleName: 'HUMAN_REQUIRED_FOR_COMPLAINTS',
        reason: 'Customer complaints must be handled directly by outlet management.',
      };
    }

    // Rule 3: Require verification for member account information
    if (action.type === 'ACCOUNT_LOOKUP' || action.type === 'PAYMENT_DETAILS') {
      const isVerified = identityState === 'VERIFIED_MEMBER';
      if (!isVerified) {
        return {
          allowed: false,
          requiresHumanHandoff: false,
          requiresVerification: true,
          requiresConfirmation: false,
          ruleName: 'VERIFICATION_REQUIRED_FOR_MEMBER_DATA',
          reason: 'Accessing private member records requires verified identity.',
        };
      }
    }

    // Rule 4: Require explicit confirmation for booking mutations (creation, cancellation, reschedule)
    if (['CREATE_BOOKING', 'CANCEL_BOOKING', 'RESCHEDULE_BOOKING'].includes(action.type)) {
      const hasConfirmed = action.parameters?.confirmed === true;
      if (!hasConfirmed) {
        return {
          allowed: false,
          requiresHumanHandoff: false,
          requiresVerification: false,
          requiresConfirmation: true,
          ruleName: 'EXPLICIT_CONFIRMATION_REQUIRED_FOR_BOOKING',
          reason: 'Class booking changes require explicit customer confirmation.',
        };
      }
    }

    // Rule 5: Require consent before marketing communication
    if (action.type === 'MARKETING_SEND') {
      const hasConsent = action.parameters?.consentStatus === 'GRANTED';
      if (!hasConsent) {
        return {
          allowed: false,
          requiresHumanHandoff: false,
          requiresVerification: false,
          requiresConfirmation: false,
          ruleName: 'CONSENT_REQUIRED_FOR_MARKETING',
          reason: 'Outbound marketing messages require prior customer consent.',
        };
      }
    }

    return {
      allowed: true,
      requiresHumanHandoff: false,
      requiresVerification: false,
      requiresConfirmation: false,
    };
  }
}
