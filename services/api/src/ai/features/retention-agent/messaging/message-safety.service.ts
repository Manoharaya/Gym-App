import { Injectable, Logger } from '@nestjs/common';
import { RetentionMessageSafetyCheckResult } from '../retention-agent.types';

@Injectable()
export class MessageSafetyService {
  private readonly logger = new Logger(MessageSafetyService.name);

  // Prohibited guilt, shame, and manipulative patterns
  private readonly manipulativePatterns = [
    /\b(why haven'?t you been|you haven'?t been coming|why did you stop|slacking|lazy|unmotivated|disappointing|disappointed)\b/i,
    /\b(losing all your gains|wasting your money|waste of time|regret|guilt)\b/i,
  ];

  // Prohibited internal retention & churn terminology
  private readonly churnTerminologyPatterns = [
    /\b(churn|churning|cancel(ling)?\s+your\s+membership|retention risk|high risk|likely to leave|at risk of cancelling)\b/i,
    /\b(algorithm|ai detected|predict(ed|ing)? that you will leave)\b/i,
  ];

  // Prohibited medical / psychological diagnostic claims
  private readonly medicalDiagnosticPatterns = [
    /\b(diagnos(e|is|ed)|depression|depressed|anxiety|anxious|mental illness|medical condition|pathology|syndrome)\b/i,
    /\b(injury treatment|cure|rehab prescription|physiotherapy diagnosis)\b/i,
  ];

  // Prohibited financial pressure / unauthorized discounts
  private readonly financialPressurePatterns = [
    /\b(special secret discount|free month if you come back today|waive your fees|refund)\b/i,
    /\b(penalt(y|ies)|charge you extra|cancel fee)\b/i,
  ];

  /**
   * Evaluates text safety for retention outreach messages.
   * Ensures zero shame, guilt, medical diagnosis, internal churn jargon, or financial pressure.
   */
  validateMessageSafety(text: string): RetentionMessageSafetyCheckResult {
    const violations: string[] = [];

    if (!text || text.trim().length === 0) {
      return { isSafe: false, violations: ['Message content cannot be empty'], sanitizedText: '' };
    }

    // 1. Check manipulative / shaming language
    for (const pattern of this.manipulativePatterns) {
      if (pattern.test(text)) {
        violations.push('Message contains guilt, shame, or accusatory phrasing.');
        break;
      }
    }

    // 2. Check internal churn/retention exposure
    for (const pattern of this.churnTerminologyPatterns) {
      if (pattern.test(text)) {
        violations.push('Message exposes internal retention risk scores, AI predictions, or churn terminology.');
        break;
      }
    }

    // 3. Check medical / psychological diagnoses
    for (const pattern of this.medicalDiagnosticPatterns) {
      if (pattern.test(text)) {
        violations.push('Message contains medical or psychological diagnostic claims.');
        break;
      }
    }

    // 4. Check financial pressure / unauthorized discounts
    for (const pattern of this.financialPressurePatterns) {
      if (pattern.test(text)) {
        violations.push('Message contains unauthorized financial pressure or promises of unapproved discounts.');
        break;
      }
    }

    // Strip any HTML tags or script injection
    const sanitizedText = text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();

    return {
      isSafe: violations.length === 0,
      violations,
      sanitizedText,
    };
  }
}
