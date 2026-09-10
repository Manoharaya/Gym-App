/**
 * Day 34 — Voice Handoff Service
 * Live call transfer orchestration and graceful failed transfer fallback.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TelephonyProvider } from './providers/telephony.provider';
import { VoiceHandoffReason } from '@fitcore/types';

export interface VoiceHandoffResult {
  transferred: boolean;
  transferredTo?: string;
  fallbackOffered: boolean;
  message: string;
  reason: VoiceHandoffReason;
}

@Injectable()
export class VoiceHandoffService {
  private readonly logger = new Logger(VoiceHandoffService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Orchestrates a live staff handoff transfer.
   * If a valid staff/reception phone number is configured, initiates PSTN/SIP transfer.
   * If not available or transfer fails, gracefully offers a message/callback fallback.
   */
  async executeHandoff(params: {
    sessionId: string;
    organisationId: string;
    telephonyProvider: TelephonyProvider;
    reason?: VoiceHandoffReason;
    notes?: string;
  }): Promise<VoiceHandoffResult> {
    const { sessionId, organisationId, telephonyProvider, reason = 'CUSTOMER_REQUESTED', notes } = params;

    const session = await this.prisma.voiceSession.findUnique({
      where: { id: sessionId },
      include: {
        voicePhoneNumber: true,
        outlet: true,
        conversation: true,
      },
    });

    if (!session) {
      return {
        transferred: false,
        fallbackOffered: true,
        message: 'Session not found. I am unable to connect you right now.',
        reason,
      };
    }

    const targetNumber =
      session.voicePhoneNumber?.humanHandoffNumber ||
      session.voicePhoneNumber?.fallbackNumber;

    if (targetNumber) {
      try {
        const transferResult = await telephonyProvider.transferCall(session.callId, targetNumber);

        if (transferResult.success) {
          await this.prisma.voiceSession.update({
            where: { id: session.id },
            data: {
              status: 'TRANSFERRED',
              handoffReason: reason,
              handoffStaffNotes: notes || `Handoff initiated. Reason: ${reason}`,
              outcome: 'STAFF_HANDOFF',
            },
          });

          this.logger.log(
            `[VoiceHandoff] Call ${session.callId} successfully transferred to ${targetNumber} (reason: ${reason})`,
          );

          return {
            transferred: true,
            transferredTo: targetNumber,
            fallbackOffered: false,
            message: `Connecting you with our reception team now. Please hold.`,
            reason,
          };
        }
      } catch (err: any) {
        this.logger.warn(`[VoiceHandoff] Live transfer failed for call ${session.callId}: ${err.message}`);
      }
    }

    // Failed Handoff / No staff available fallback
    await this.prisma.voiceSession.update({
      where: { id: session.id },
      data: {
        handoffReason: reason,
        handoffStaffNotes: notes || `Handoff requested but no staff line available. Fallback offered.`,
      },
    });

    const isNepali = session.language === 'ne';
    const fallbackMessage = isNepali
      ? 'माफ गर्नुहोस्, म अहिले कसैसँग जोड्न सक्दिन। के म तपाईंको सन्देश लिन वा कल-ब्याकको व्यवस्था गर्न सक्छु?'
      : `I'm unable to connect you to a team member right now. Would you like me to take a message or arrange a callback?`;

    return {
      transferred: false,
      fallbackOffered: true,
      message: fallbackMessage,
      reason,
    };
  }
}
