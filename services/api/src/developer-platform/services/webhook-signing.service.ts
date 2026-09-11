/**
 * FitCore — Day 49: Webhook Payload Cryptographic Signing Service
 */

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { DeveloperSecurityService } from './developer-security.service';

@Injectable()
export class WebhookSigningService {
  constructor(private readonly security: DeveloperSecurityService) {}

  /**
   * Signs a webhook payload with timestamp and HMAC-SHA256 signature.
   * Returns: { signatureHeader, timestamp }
   */
  signPayload(
    payload: Record<string, any>,
    secret: string,
    customTimestamp?: number,
  ): { signatureHeader: string; timestamp: number } {
    const timestamp = customTimestamp ?? Math.floor(Date.now() / 1000);
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const signedPayload = `${timestamp}.${serialized}`;

    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    const signatureHeader = `t=${timestamp},v1=${signature}`;
    return { signatureHeader, timestamp };
  }

  /**
   * Verifies an incoming webhook signature against drift and tampering.
   */
  verifySignature(
    payload: Record<string, any> | string,
    header: string,
    secret: string,
    toleranceSeconds = 300,
  ): boolean {
    if (!header) return false;

    // Parse header: t=12345678,v1=abcdef...
    const parts = header.split(',');
    let timestampStr = '';
    let v1Sig = '';

    for (const p of parts) {
      const [k, v] = p.split('=');
      if (k === 't') timestampStr = v;
      if (k === 'v1') v1Sig = v;
    }

    if (!timestampStr || !v1Sig) return false;

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;

    // Check drift tolerance
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
      return false;
    }

    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedPayload = `${timestamp}.${serialized}`;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(expectedPayload)
      .digest('hex');

    return this.security.timingSafeEqual(v1Sig, expectedSig);
  }
}
