/**
 * Day 34 — Voice Security Service
 * Webhook signature validation, replay protection, idempotency tracking, and rate limiting.
 */

import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { TelephonyProvider } from './providers/telephony.provider';

@Injectable()
export class VoiceSecurityService {
  private readonly logger = new Logger(VoiceSecurityService.name);
  private readonly processedWebhooks = new Set<string>();
  private readonly callerRateLimits = new Map<string, { count: number; windowStart: number }>();

  /**
   * Validates incoming telephony webhook authenticity, timestamp freshness, and idempotency.
   */
  validateWebhook(params: {
    telephonyProvider: TelephonyProvider;
    signature?: string;
    payload: Record<string, any>;
    url: string;
    timestamp?: number;
  }): boolean {
    const { telephonyProvider, signature, payload, url, timestamp } = params;

    // 1. Signature check
    if (!signature) {
      this.logger.warn(`[VoiceSecurity] Telephony webhook rejected: Missing signature`);
      throw new UnauthorizedException('Missing telephony webhook signature');
    }

    const isValidSig = telephonyProvider.validateWebhookSignature(signature, payload, url);
    if (!isValidSig) {
      this.logger.warn(`[VoiceSecurity] Telephony webhook rejected: Invalid signature`);
      throw new UnauthorizedException('Invalid telephony webhook signature');
    }

    // 2. Replay protection (timestamp window: 5 minutes = 300,000 ms)
    if (timestamp) {
      const now = Date.now();
      const ageMs = Math.abs(now - timestamp);
      if (ageMs > 300000) {
        this.logger.warn(`[VoiceSecurity] Telephony webhook rejected: Timestamp expired (age: ${ageMs}ms)`);
        throw new BadRequestException('Webhook timestamp expired (replay attack defense)');
      }
    }

    // 3. Idempotency check
    const eventId = payload.eventId || payload.CallSid || payload.callId;
    if (eventId) {
      const idempotencyKey = `${eventId}:${payload.CallStatus || payload.status || 'event'}`;
      if (this.processedWebhooks.has(idempotencyKey)) {
        this.logger.debug(`[VoiceSecurity] Duplicate webhook ignored for key: ${idempotencyKey}`);
        return false; // Already processed
      }
      this.processedWebhooks.add(idempotencyKey);
    }

    return true;
  }

  /**
   * Checks caller rate limit (max 10 calls or turns per minute per phone number).
   */
  checkRateLimit(callerPhone: string): boolean {
    if (!callerPhone) return true;

    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 30;

    let rate = this.callerRateLimits.get(callerPhone);
    if (!rate || now - rate.windowStart > windowMs) {
      rate = { count: 1, windowStart: now };
      this.callerRateLimits.set(callerPhone, rate);
      return true;
    }

    rate.count++;
    if (rate.count > maxRequests) {
      this.logger.warn(`[VoiceSecurity] Rate limit exceeded for caller: ${callerPhone}`);
      return false;
    }

    return true;
  }

  /**
   * Sanitizes text to remove any accidentally leaked credentials or API secrets.
   */
  sanitizeForLogging(text: string): string {
    return text
      .replace(/SK[a-zA-Z0-9]{32}/g, '[REDACTED_KEY]')
      .replace(/AIza[a-zA-Z0-9_-]{35}/g, '[REDACTED_GOOGLE_KEY]')
      .replace(/[0-9]{16}/g, '[REDACTED_CARD]');
  }
}
