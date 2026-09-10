/**
 * Day 35 — Receptionist Escalation Service
 * Evaluates operational escalation triggers and enforces conversational loop protection.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  EscalationTrigger,
  EscalationAction,
  WorkflowHandoffReason,
} from '@fitcore/types';
import { RECEPTIONIST_WORKFLOW_DEFAULTS } from './receptionist-workflow.constants';

export interface EscalationEvaluationResult {
  shouldEscalate: boolean;
  trigger?: EscalationTrigger;
  action: EscalationAction;
  reason?: WorkflowHandoffReason;
  message?: string;
}

@Injectable()
export class ReceptionistEscalationService {
  private readonly logger = new Logger(ReceptionistEscalationService.name);

  /**
   * Evaluates if a turn should escalate due to safety triggers or loop protection limits.
   */
  evaluateEscalation(context: {
    consecutiveFailures?: number;
    repeatedToolCount?: number;
    turnCount?: number;
    isComplaint?: boolean;
    confidence?: number;
    customerRequestedHuman?: boolean;
    isPolicyException?: boolean;
    isIdentityFailure?: boolean;
    language?: string;
  }): EscalationEvaluationResult {
    const {
      consecutiveFailures = 0,
      repeatedToolCount = 0,
      turnCount = 0,
      isComplaint = false,
      confidence = 1.0,
      customerRequestedHuman = false,
      isPolicyException = false,
      isIdentityFailure = false,
      language = 'en',
    } = context;

    const isNepali = language === 'ne';

    // 1. Customer requested human directly
    if (customerRequestedHuman) {
      return {
        shouldEscalate: true,
        trigger: 'CUSTOMER_REQUEST',
        action: 'STAFF_HANDOFF',
        reason: 'CUSTOMER_REQUESTED',
        message: isNepali
          ? 'अवश्य, म तपाईंलाई हाम्रा कर्मचारीसँग जोड्दैछु।'
          : 'Connecting you with a member of our team.',
      };
    }

    // 2. Complaint detected
    if (isComplaint) {
      return {
        shouldEscalate: true,
        trigger: 'COMPLAINT',
        action: 'STAFF_HANDOFF',
        reason: 'COMPLAINT',
        message: isNepali
          ? 'तपाईंको गुनासोलाई गम्भीरताका साथ लिँदै म व्यवस्थापकलाई जानकारी गराउँदैछु।'
          : 'I understand your concern and am escalating this directly to our management team.',
      };
    }

    // 3. Loop protection: Consecutive tool / execution failures
    const maxFailures = RECEPTIONIST_WORKFLOW_DEFAULTS.LOOP_PROTECTION.maxFailures;
    if (consecutiveFailures >= maxFailures) {
      this.logger.warn(`Loop protection triggered: ${consecutiveFailures} consecutive failures`);
      return {
        shouldEscalate: true,
        trigger: 'REPEATED_FAILURE',
        action: 'STAFF_HANDOFF',
        reason: 'TECHNICAL_FAILURE',
        message: isNepali
          ? 'माफ गर्नुहोस्, बारम्बार समस्या देखिएकोले म तपाईंलाई कर्मचारीसँग जोड्दैछु।'
          : "I'm having trouble completing your request. Let me connect you with a team member who can help.",
      };
    }

    // 4. Loop protection: Repeated tool execution
    const maxToolRepeats = RECEPTIONIST_WORKFLOW_DEFAULTS.LOOP_PROTECTION.maxToolCalls;
    if (repeatedToolCount >= maxToolRepeats) {
      return {
        shouldEscalate: true,
        trigger: 'REPEATED_FAILURE',
        action: 'FOLLOW_UP_TASK',
        reason: 'TOOL_FAILURE',
        message: isNepali
          ? 'हाम्रो प्रणालीमा ढिलाइ भएको छ। म हाम्रा कर्मचारीलाई तपाईंलाई सम्पर्क गर्न लगाउनेछु।'
          : "Our system is taking longer than usual. I've noted your request and asked our team to follow up.",
      };
    }

    // 5. Loop protection: Max turns exceeded
    const maxTurns = RECEPTIONIST_WORKFLOW_DEFAULTS.LOOP_PROTECTION.maxTurns;
    if (turnCount >= maxTurns) {
      return {
        shouldEscalate: true,
        trigger: 'REPEATED_FAILURE',
        action: 'STAFF_HANDOFF',
        reason: 'COMPLEX_REQUEST',
        message: isNepali
          ? 'यस विस्तृत विषयका लागि म तपाईंलाई सिधै हाम्रो कर्मचारीसँग जोड्न चाहन्छु।'
          : "To make sure everything is handled properly, I'd like to transfer you to our staff.",
      };
    }

    // 6. Policy exception
    if (isPolicyException) {
      return {
        shouldEscalate: true,
        trigger: 'POLICY_EXCEPTION',
        action: 'STAFF_HANDOFF',
        reason: 'POLICY_EXCEPTION',
        message: isNepali
          ? 'यो अनुरोधका लागि प्रबन्धकको स्वीकृति आवश्यक पर्छ।'
          : 'This request requires staff approval. Let me connect you with the team.',
      };
    }

    // 7. Identity verification failure
    if (isIdentityFailure) {
      return {
        shouldEscalate: true,
        trigger: 'IDENTITY_FAILURE',
        action: 'STAFF_HANDOFF',
        reason: 'IDENTITY_VERIFICATION',
        message: isNepali
          ? 'सुरक्षाका कारण, खाता विवरणका लागि प्रत्यक्ष पहिचान प्रमाणीकरण आवश्यक छ।'
          : 'For your security, account details require staff identity verification.',
      };
    }

    // 8. Low AI confidence
    if (confidence < 0.4) {
      return {
        shouldEscalate: true,
        trigger: 'LOW_AI_CONFIDENCE',
        action: 'SAFE_RESPONSE',
        reason: 'LOW_CONFIDENCE',
        message: isNepali
          ? 'माफ गर्नुहोस्, मैले राम्रोसँग बुझ्न सकिन। के तपाईं फेरि भन्न सक्नुहुन्छ वा कर्मचारीसँग कुरा गर्न चाहनुहुन्छ?'
          : "I'm not quite sure I understood that correctly. Could you clarify, or would you like to speak to a team member?",
      };
    }

    return {
      shouldEscalate: false,
      action: 'SAFE_RESPONSE',
    };
  }
}
