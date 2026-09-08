/**
 * Day 31 — Receptionist Escalation Service
 * Determines escalation urgency and routing logic for human staff handoffs.
 */

import { Injectable } from '@nestjs/common';
import { HandoffReason } from '@fitcore/types';

@Injectable()
export class EscalationService {
  /**
   * Calculates priority level based on handoff reason and context.
   */
  calculatePriority(reason: HandoffReason, context?: { isComplaint?: boolean; turnsCount?: number }): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch (reason) {
      case 'COMPLAINT':
        return 'HIGH';
      case 'SENSITIVE_REQUEST':
        return 'HIGH';
      case 'REPEATED_MISUNDERSTANDING':
        return 'MEDIUM';
      case 'CUSTOMER_REQUESTED':
        return 'MEDIUM';
      case 'UNKNOWN_INFORMATION':
        return 'LOW';
      case 'LOW_CONFIDENCE':
        return 'LOW';
      case 'POLICY_EXCEPTION':
        return 'HIGH';
      case 'TOOL_FAILURE':
        return 'MEDIUM';
      default:
        return 'MEDIUM';
    }
  }
}
