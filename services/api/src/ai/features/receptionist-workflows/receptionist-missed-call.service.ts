/**
 * Day 35 — Receptionist Missed Call Service
 * Handles missed and abandoned call events, safe lead/member association,
 * consent-guarded follow-up workflows, and prevents unsolicited marketing to unknown callers.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../audit/audit.service';
import { ReceptionistCallbackService } from './receptionist-callback.service';
import { ReceptionistFollowUpService } from './receptionist-followup.service';
import { ReceptionistEventService } from './receptionist-event.service';
import { RECEPTIONIST_AUDIT_ACTIONS } from './receptionist-workflow.constants';

export interface HandleMissedCallParams {
  organisationId: string;
  outletId?: string | null;
  callerPhone?: string | null;
  voiceSessionId?: string;
  reason?: string;
  userId?: string;
}

@Injectable()
export class ReceptionistMissedCallService {
  private readonly logger = new Logger(ReceptionistMissedCallService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly callbackService: ReceptionistCallbackService,
    private readonly followUpService: ReceptionistFollowUpService,
    private readonly eventService: ReceptionistEventService,
  ) {}

  /**
   * Processes a missed call event.
   * Invariant: Never automatically dispatches marketing messages to unknown callers without consent.
   */
  async handleMissedCall(params: HandleMissedCallParams) {
    const { organisationId, outletId, callerPhone, voiceSessionId, reason = 'NO_ANSWER', userId } = params;

    this.logger.log(`Processing missed call for phone ${callerPhone || 'UNKNOWN'} in org ${organisationId}`);

    let memberId: string | null = null;
    let leadId: string | null = null;
    let hasMarketingConsent = false;

    // 1. Safe phone-based identification
    if (callerPhone) {
      const member = await this.prisma.memberProfile.findFirst({
        where: {
          organisationId,
          user: { phone: callerPhone },
        },
      });

      if (member) {
        memberId = member.id;
        hasMarketingConsent = true; // Known active member
      } else {
        const lead = await this.prisma.lead.findFirst({
          where: {
            organisationId,
            phone: callerPhone,
          },
        });

        if (lead) {
          leadId = lead.id;
          hasMarketingConsent = lead.consentStatus === 'GRANTED';
        }
      }
    }

    // 2. Create follow-up task for staff
    const followUpTask = await this.followUpService.createFollowUpTask({
      organisationId,
      outletId,
      memberId,
      leadId,
      priority: 'NORMAL',
      reason: `Missed Call: ${callerPhone || 'Unknown Caller'} (${reason})`,
      notes: `Inbound call was unanswered. Safe contact identified: ${memberId ? 'MEMBER' : leadId ? 'LEAD' : 'UNKNOWN'}. Consent for automated marketing: ${hasMarketingConsent ? 'YES' : 'NO'}`,
    });

    // 3. Register callback request if caller is known
    let callbackRequest;
    if (callerPhone) {
      callbackRequest = await this.callbackService.createCallbackRequest({
        organisationId,
        outletId,
        memberId,
        leadId,
        phoneNumber: callerPhone,
        reason: `Missed call callback: ${reason}`,
        preferredChannel: 'PHONE',
      });
    }

    // 4. Emit reliable Day 30 automation event
    await this.eventService.emitReceptionistEvent({
      organisationId,
      outletId,
      eventType: 'RECEPTIONIST_MISSED_CALL',
      memberId: memberId || 'UNKNOWN',
      payload: {
        callerPhone,
        memberId,
        leadId,
        hasMarketingConsent,
        voiceSessionId,
        taskId: followUpTask.id,
        callbackId: callbackRequest?.id,
      },
      idempotencyKey: `missed-call:${voiceSessionId || callerPhone || Date.now()}`,
    });

    // 5. Audit log
    await this.audit.log({
      userId,
      organisationId,
      outletId: outletId || undefined,
      action: RECEPTIONIST_AUDIT_ACTIONS.MISSED_CALL_RECORDED,
      resource: 'VoiceSession',
      resourceId: voiceSessionId,
      metadata: { callerPhone, memberId, leadId, hasMarketingConsent },
    });

    return {
      handled: true,
      memberId,
      leadId,
      hasMarketingConsent,
      taskId: followUpTask.id,
      callbackId: callbackRequest?.id,
    };
  }

  /**
   * Processes an abandoned call event.
   */
  async handleAbandonedCall(params: {
    organisationId: string;
    outletId?: string | null;
    voiceSessionId: string;
    callerPhone?: string | null;
    durationSeconds?: number;
  }) {
    const { organisationId, outletId, voiceSessionId, callerPhone, durationSeconds } = params;

    this.logger.log(`Call abandoned after ${durationSeconds || 0}s for session ${voiceSessionId}`);

    // Emit event for Day 30 consumption
    await this.eventService.emitReceptionistEvent({
      organisationId,
      outletId,
      eventType: 'RECEPTIONIST_INTERACTION_ABANDONED',
      memberId: 'UNKNOWN',
      payload: {
        voiceSessionId,
        callerPhone,
        durationSeconds,
      },
      idempotencyKey: `abandoned-call:${voiceSessionId}`,
    });
  }
}
