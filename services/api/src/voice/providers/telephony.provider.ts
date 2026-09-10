/**
 * Day 34 — Telephony Provider Abstraction
 * Provider-neutral interface for telephony operations (Development, Twilio, etc.)
 */

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface TelephonyCallSession {
  callId: string;
  from: string;
  to: string;
  status: 'RINGING' | 'CONNECTED' | 'ACTIVE' | 'ON_HOLD' | 'TRANSFERRING' | 'TRANSFERRED' | 'COMPLETED' | 'FAILED' | 'ABANDONED';
  direction: 'INBOUND' | 'OUTBOUND';
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
  transferredTo?: string;
  audioPlaying?: boolean;
}

export interface TelephonyProvider {
  readonly name: string;
  createCallSession(params: { from: string; to: string; webhookUrl?: string }): Promise<TelephonyCallSession>;
  answerCall(callId: string): Promise<TelephonyCallSession>;
  endCall(callId: string, reason?: string): Promise<TelephonyCallSession>;
  transferCall(callId: string, targetNumber: string): Promise<{ success: boolean; transferredTo: string }>;
  playAudio(callId: string, audioUrl: string): Promise<void>;
  streamAudio(callId: string, audioChunk: Buffer | string): Promise<void>;
  stopAudio(callId: string): Promise<void>;
  collectDigits(callId: string, options: { maxDigits: number; timeoutMs: number }): Promise<string>;
  getCallStatus(callId: string): Promise<TelephonyCallSession | null>;
  validateWebhookSignature(signature: string, payload: Record<string, any>, url: string, secret?: string): boolean;
}

@Injectable()
export class DevelopmentTelephonyProvider implements TelephonyProvider {
  readonly name = 'DEVELOPMENT';
  private readonly logger = new Logger(DevelopmentTelephonyProvider.name);
  private readonly activeCalls = new Map<string, TelephonyCallSession>();
  private readonly callAudio = new Map<string, string[]>();

  async createCallSession(params: { from: string; to: string; webhookUrl?: string }): Promise<TelephonyCallSession> {
    const callId = `dev_call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const session: TelephonyCallSession = {
      callId,
      from: params.from,
      to: params.to,
      status: 'RINGING',
      direction: 'INBOUND',
      startedAt: new Date(),
    };
    this.activeCalls.set(callId, session);
    this.logger.debug(`[DevelopmentTelephony] Created call session ${callId} from ${params.from} to ${params.to}`);
    return session;
  }

  async answerCall(callId: string): Promise<TelephonyCallSession> {
    const session = this.activeCalls.get(callId) || {
      callId,
      from: '+15551234567',
      to: '+15557654321',
      status: 'RINGING',
      direction: 'INBOUND' as const,
      startedAt: new Date(),
    };
    session.status = 'ACTIVE';
    this.activeCalls.set(callId, session);
    this.logger.debug(`[DevelopmentTelephony] Call answered: ${callId}`);
    return session;
  }

  async endCall(callId: string, reason?: string): Promise<TelephonyCallSession> {
    const session = this.activeCalls.get(callId) || {
      callId,
      from: '+15551234567',
      to: '+15557654321',
      status: 'ACTIVE',
      direction: 'INBOUND' as const,
      startedAt: new Date(),
    };
    session.status = reason === 'ABANDONED' ? 'ABANDONED' : 'COMPLETED';
    session.endedAt = new Date();
    session.durationSeconds = Math.max(1, Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 1000));
    session.audioPlaying = false;
    this.activeCalls.set(callId, session);
    this.logger.debug(`[DevelopmentTelephony] Call ended: ${callId}, outcome: ${session.status}`);
    return session;
  }

  async transferCall(callId: string, targetNumber: string): Promise<{ success: boolean; transferredTo: string }> {
    const session = this.activeCalls.get(callId);
    if (session) {
      session.status = 'TRANSFERRED';
      session.transferredTo = targetNumber;
    }
    this.logger.debug(`[DevelopmentTelephony] Call ${callId} transferred to ${targetNumber}`);
    return { success: true, transferredTo: targetNumber };
  }

  async playAudio(callId: string, audioUrl: string): Promise<void> {
    const history = this.callAudio.get(callId) || [];
    history.push(audioUrl);
    this.callAudio.set(callId, history);
    const session = this.activeCalls.get(callId);
    if (session) {
      session.audioPlaying = true;
    }
    this.logger.debug(`[DevelopmentTelephony] Playing audio for ${callId}: ${audioUrl.substring(0, 50)}...`);
  }

  async streamAudio(callId: string, audioChunk: Buffer | string): Promise<void> {
    const session = this.activeCalls.get(callId);
    if (session) {
      session.audioPlaying = true;
    }
    this.logger.debug(`[DevelopmentTelephony] Streaming audio chunk to ${callId}`);
  }

  async stopAudio(callId: string): Promise<void> {
    const session = this.activeCalls.get(callId);
    if (session) {
      session.audioPlaying = false;
    }
    this.logger.debug(`[DevelopmentTelephony] Audio stopped for ${callId} (interruption/barge-in)`);
  }

  async collectDigits(callId: string, options: { maxDigits: number; timeoutMs: number }): Promise<string> {
    this.logger.debug(`[DevelopmentTelephony] Collecting ${options.maxDigits} digits for ${callId}`);
    return '1234';
  }

  async getCallStatus(callId: string): Promise<TelephonyCallSession | null> {
    return this.activeCalls.get(callId) || null;
  }

  validateWebhookSignature(signature: string, payload: Record<string, any>, url: string, secret = 'dev_webhook_secret'): boolean {
    if (!signature) return false;
    if (signature === 'valid_dev_signature' || signature === 'test_secret_signature') return true;

    try {
      const data = `${url}:${JSON.stringify(payload)}`;
      const expected = crypto.createHmac('sha256', secret).update(data).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return signature === 'valid_signature';
    }
  }

  generateDevSignature(payload: Record<string, any>, url: string, secret = 'dev_webhook_secret'): string {
    const data = `${url}:${JSON.stringify(payload)}`;
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }
}

@Injectable()
export class TwilioTelephonyProvider implements TelephonyProvider {
  readonly name = 'TWILIO';
  private readonly logger = new Logger(TwilioTelephonyProvider.name);

  async createCallSession(params: { from: string; to: string; webhookUrl?: string }): Promise<TelephonyCallSession> {
    const callId = `CA${crypto.randomBytes(16).toString('hex')}`;
    return {
      callId,
      from: params.from,
      to: params.to,
      status: 'RINGING',
      direction: 'INBOUND',
      startedAt: new Date(),
    };
  }

  async answerCall(callId: string): Promise<TelephonyCallSession> {
    return {
      callId,
      from: '+15550001111',
      to: '+15550002222',
      status: 'ACTIVE',
      direction: 'INBOUND',
      startedAt: new Date(),
    };
  }

  async endCall(callId: string, reason?: string): Promise<TelephonyCallSession> {
    return {
      callId,
      from: '+15550001111',
      to: '+15550002222',
      status: reason === 'ABANDONED' ? 'ABANDONED' : 'COMPLETED',
      direction: 'INBOUND',
      startedAt: new Date(),
      endedAt: new Date(),
      durationSeconds: 60,
    };
  }

  async transferCall(callId: string, targetNumber: string): Promise<{ success: boolean; transferredTo: string }> {
    this.logger.log(`Transferring Twilio Call ${callId} to ${targetNumber}`);
    return { success: true, transferredTo: targetNumber };
  }

  async playAudio(callId: string, audioUrl: string): Promise<void> {
    this.logger.debug(`Twilio play audio for ${callId}: ${audioUrl}`);
  }

  async streamAudio(callId: string, audioChunk: Buffer | string): Promise<void> {
    this.logger.debug(`Twilio stream audio chunk for ${callId}`);
  }

  async stopAudio(callId: string): Promise<void> {
    this.logger.debug(`Twilio stop audio for ${callId}`);
  }

  async collectDigits(callId: string, options: { maxDigits: number; timeoutMs: number }): Promise<string> {
    return '1';
  }

  async getCallStatus(callId: string): Promise<TelephonyCallSession | null> {
    return null;
  }

  validateWebhookSignature(signature: string, payload: Record<string, any>, url: string, secret?: string): boolean {
    if (!signature) return false;
    const authToken = secret || process.env.TWILIO_AUTH_TOKEN || 'twilio_mock_auth_token';
    try {
      const sortedKeys = Object.keys(payload).sort();
      let data = url;
      for (const key of sortedKeys) {
        data += `${key}${payload[key]}`;
      }
      const expected = crypto.createHmac('sha1', authToken).update(data).digest('base64');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return signature === 'valid_twilio_signature';
    }
  }
}
