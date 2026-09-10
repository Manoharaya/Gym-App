/**
 * Day 34 — Voice Session Service
 * Manages deterministic call state machines, conversational turns, barge-in interruptions, and session summaries.
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  VoiceCallStatus,
  VoiceTurnState,
  CallOutcome,
  CallerIdentityState,
  VoiceRecordingPolicy,
} from '@fitcore/types';
import { VOICE_SAFETY_LIMITS } from './voice.constants';

const VALID_STATUS_TRANSITIONS: Record<VoiceCallStatus, VoiceCallStatus[]> = {
  RINGING: ['CONNECTED', 'ACTIVE', 'ABANDONED', 'FAILED'],
  CONNECTED: ['ACTIVE', 'ON_HOLD', 'TRANSFERRING', 'TRANSFERRED', 'COMPLETED', 'FAILED', 'ABANDONED'],
  ACTIVE: ['ON_HOLD', 'TRANSFERRING', 'TRANSFERRED', 'COMPLETED', 'FAILED', 'ABANDONED'],
  ON_HOLD: ['ACTIVE', 'TRANSFERRING', 'TRANSFERRED', 'COMPLETED', 'FAILED', 'ABANDONED'],
  TRANSFERRING: ['TRANSFERRED', 'ACTIVE', 'COMPLETED', 'FAILED'],
  TRANSFERRED: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
  ABANDONED: [],
};

@Injectable()
export class VoiceSessionService {
  private readonly logger = new Logger(VoiceSessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds an existing voice session by callId, or creates a new one idempotently.
   */
  async findOrCreateSession(params: {
    callId: string;
    organisationId: string;
    outletId?: string | null;
    conversationId: string;
    voicePhoneNumberId?: string | null;
    callerPhone?: string | null;
    callerIdentityState?: CallerIdentityState;
    language?: string;
    voiceProfileId?: string | null;
    recordingPolicy?: VoiceRecordingPolicy;
  }) {
    const existing = await this.prisma.voiceSession.findUnique({
      where: { callId: params.callId },
      include: {
        conversation: true,
        voicePhoneNumber: true,
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.voiceSession.create({
      data: {
        callId: params.callId,
        organisationId: params.organisationId,
        outletId: params.outletId || null,
        conversationId: params.conversationId,
        voicePhoneNumberId: params.voicePhoneNumberId || null,
        callerPhone: params.callerPhone || null,
        callerIdentityState: params.callerIdentityState || 'UNKNOWN_CALLER',
        channel: 'VOICE',
        status: 'RINGING',
        turnState: 'WAITING',
        language: params.language || 'en',
        voiceProfileId: params.voiceProfileId || null,
        recordingPolicy: params.recordingPolicy || 'RECORDING_DISABLED',
        recordingConsent: false,
        outcome: 'NO_ACTION',
        metadata: {
          turnCount: 0,
          toolCallsCount: 0,
          interruptionCount: 0,
        },
      },
      include: {
        conversation: true,
        voicePhoneNumber: true,
      },
    });
  }

  /**
   * Transitions session call status according to deterministic state machine.
   */
  async transitionCallStatus(sessionIdOrCallId: string, targetStatus: VoiceCallStatus, reason?: string) {
    const session = await this.prisma.voiceSession.findFirst({
      where: {
        OR: [{ id: sessionIdOrCallId }, { callId: sessionIdOrCallId }],
      },
    });

    if (!session) {
      throw new NotFoundException(`VoiceSession ${sessionIdOrCallId} not found`);
    }

    const currentStatus = session.status as VoiceCallStatus;

    if (currentStatus === targetStatus) {
      return session; // Idempotent no-op
    }

    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(targetStatus)) {
      this.logger.warn(
        `[VoiceSession] Invalid state transition rejected: ${currentStatus} -> ${targetStatus} for session ${session.id}`,
      );
      throw new BadRequestException(
        `Invalid voice call status transition from ${currentStatus} to ${targetStatus}`,
      );
    }

    const now = new Date();
    const updateData: any = {
      status: targetStatus,
    };

    if (targetStatus === 'CONNECTED' && !session.connectedAt) {
      updateData.connectedAt = now;
    }

    if (['COMPLETED', 'FAILED', 'ABANDONED', 'TRANSFERRED'].includes(targetStatus) && !session.endedAt) {
      updateData.endedAt = now;
      const startTime = session.connectedAt || session.startedAt;
      updateData.durationSeconds = Math.max(1, Math.round((now.getTime() - startTime.getTime()) / 1000));

      if (targetStatus === 'ABANDONED') {
        updateData.outcome = 'ABANDONED';
      } else if (targetStatus === 'TRANSFERRED') {
        updateData.outcome = 'STAFF_HANDOFF';
      }
    }

    const updated = await this.prisma.voiceSession.update({
      where: { id: session.id },
      data: updateData,
    });

    this.logger.log(`[VoiceSession] Call ${session.callId} status transitioned: ${currentStatus} -> ${targetStatus}`);
    return updated;
  }

  /**
   * Updates conversational turn state (e.g. LISTENING -> THINKING -> SPEAKING).
   */
  async updateTurnState(sessionId: string, newTurnState: VoiceTurnState) {
    return this.prisma.voiceSession.update({
      where: { id: sessionId },
      data: { turnState: newTurnState },
    });
  }

  /**
   * Handles Barge-In / Interruption:
   * When caller speaks while AI is in SPEAKING state, immediately transition to INTERRUPTED.
   */
  async handleBargeIn(sessionId: string) {
    const session = await this.prisma.voiceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return;

    if (session.turnState === 'SPEAKING') {
      const meta = (session.metadata as any) || {};
      const interruptionCount = (meta.interruptionCount || 0) + 1;

      await this.prisma.voiceSession.update({
        where: { id: sessionId },
        data: {
          turnState: 'INTERRUPTED',
          metadata: {
            ...meta,
            interruptionCount,
          },
        },
      });

      this.logger.log(`[VoiceSession] Barge-in recorded on session ${sessionId}. Interruption #${interruptionCount}`);
    }
  }

  /**
   * Appends a transcript line to the voice session transcript store.
   */
  async recordTranscript(params: {
    voiceSessionId: string;
    organisationId: string;
    speaker: 'CALLER' | 'AI' | 'SYSTEM' | 'STAFF';
    text: string;
    confidence?: number;
    language?: string;
    isFinal?: boolean;
    interrupted?: boolean;
  }) {
    return this.prisma.voiceTranscript.create({
      data: {
        voiceSessionId: params.voiceSessionId,
        organisationId: params.organisationId,
        speaker: params.speaker,
        text: params.text,
        confidence: params.confidence,
        language: params.language || 'en',
        isFinal: params.isFinal ?? true,
        interrupted: params.interrupted ?? false,
      },
    });
  }

  /**
   * Enforces safety limits on call duration and turn counts.
   */
  checkSessionLimits(session: any): { allowed: boolean; reason?: string } {
    const meta = (session.metadata as any) || {};
    const turnCount = meta.turnCount || 0;

    if (turnCount >= VOICE_SAFETY_LIMITS.MAX_TURNS_PER_CALL) {
      return { allowed: false, reason: 'EXCEEDED_MAX_TURNS' };
    }

    if (session.startedAt) {
      const elapsedSeconds = (Date.now() - new Date(session.startedAt).getTime()) / 1000;
      if (elapsedSeconds > VOICE_SAFETY_LIMITS.MAX_CALL_DURATION_SECONDS) {
        return { allowed: false, reason: 'EXCEEDED_MAX_DURATION' };
      }
    }

    return { allowed: true };
  }

  /**
   * Generates a structured call summary and sets authoritative call outcome.
   */
  async generateCallSummary(sessionId: string, outcomeOverride?: CallOutcome) {
    const session = await this.prisma.voiceSession.findUnique({
      where: { id: sessionId },
      include: {
        transcripts: { orderBy: { createdAt: 'asc' } },
        conversation: true,
      },
    });

    if (!session) return;

    const transcriptText = session.transcripts.map((t: any) => `${t.speaker}: ${t.text}`).join('\n');
    let detectedOutcome: CallOutcome = outcomeOverride || (session.outcome as CallOutcome) || 'INFORMATION_PROVIDED';

    if (session.status === 'ABANDONED') {
      detectedOutcome = 'ABANDONED';
    } else if (session.status === 'TRANSFERRED') {
      detectedOutcome = 'STAFF_HANDOFF';
    } else if (transcriptText.toLowerCase().includes('booked into') || transcriptText.toLowerCase().includes('confirmed your booking')) {
      detectedOutcome = 'BOOKING_CREATED';
    } else if (transcriptText.toLowerCase().includes('captured your interest') || transcriptText.toLowerCase().includes('consultation')) {
      detectedOutcome = 'LEAD_CREATED';
    } else if (transcriptText.toLowerCase().includes('cancel')) {
      detectedOutcome = 'BOOKING_CANCELLED';
    }

    const summary = [
      `Call Summary (${session.language.toUpperCase()})`,
      `Duration: ${session.durationSeconds || 0} seconds`,
      `Caller: ${session.callerPhone || 'Unknown'} (${session.callerIdentityState})`,
      `Outcome: ${detectedOutcome}`,
      `Turns: ${(session.metadata as any)?.turnCount || 0}`,
    ].join(' | ');

    return this.prisma.voiceSession.update({
      where: { id: sessionId },
      data: {
        summary,
        outcome: detectedOutcome,
      },
    });
  }
}
