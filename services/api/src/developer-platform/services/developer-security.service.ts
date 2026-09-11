/**
 * FitCore — Day 49: Developer Platform Security & Cryptography Service
 */

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as url from 'url';

@Injectable()
export class DeveloperSecurityService {
  private readonly logger = new Logger(DeveloperSecurityService.name);

  /**
   * Hashes a high-entropy secret (API key, client secret, OAuth token) using SHA-256.
   */
  hashSecret(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Generates a cryptographically random client ID: fc_client_<hex>
   */
  generateClientId(): string {
    return `fc_client_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Generates a cryptographically random client secret: fc_sec_<hex>
   */
  generateClientSecret(): string {
    return `fc_sec_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Generates an API key with recognizable prefix: fc_live_<random> or fc_test_<random>
   */
  generateApiKey(environment: 'PRODUCTION' | 'SANDBOX' | 'DEVELOPMENT'): {
    fullKey: string;
    keyPrefix: string;
    keyHash: string;
  } {
    const envTag = environment === 'PRODUCTION' ? 'live' : 'test';
    const randomBody = crypto.randomBytes(24).toString('hex');
    const fullKey = `fc_${envTag}_${randomBody}`;
    const keyPrefix = `fc_${envTag}_${randomBody.slice(0, 7)}...`;
    const keyHash = this.hashSecret(fullKey);

    return { fullKey, keyPrefix, keyHash };
  }

  /**
   * Generates an OAuth authorization code
   */
  generateAuthCode(): string {
    return `fc_code_${crypto.randomBytes(24).toString('hex')}`;
  }

  /**
   * Generates an OAuth Bearer Access Token
   */
  generateAccessToken(): string {
    return `fc_tok_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Generates an OAuth Refresh Token
   */
  generateRefreshToken(): string {
    return `fc_ref_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Generates a Webhook Signing Secret
   */
  generateWebhookSecret(): string {
    return `whsec_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Timing-safe string comparison
   */
  timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  /**
   * Validates a URL against Server-Side Request Forgery (SSRF) threats.
   * Prohibits localhost, loopback, private IPv4 CIDRs, and AWS metadata endpoints.
   */
  validateUrlSafe(targetUrl: string, allowHttpForLocalTest = false): boolean {
    try {
      const parsed = new url.URL(targetUrl);

      // Must be HTTP or HTTPS
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return false;
      }

      // If production, enforce HTTPS
      if (!allowHttpForLocalTest && parsed.protocol !== 'https:') {
        return false;
      }

      const hostname = parsed.hostname.toLowerCase();

      // Check loopback / localhost
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.endsWith('.localhost')
      ) {
        return false;
      }

      // Check AWS/cloud metadata address
      if (hostname === '169.254.169.254') {
        return false;
      }

      // Check IPv4 octets for private IP ranges (RFC 1918)
      const ipParts = hostname.split('.').map(Number);
      if (ipParts.length === 4 && ipParts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
        const [a, b] = ipParts;
        // 10.0.0.0/8
        if (a === 10) return false;
        // 172.16.0.0/12
        if (a === 172 && b >= 16 && b <= 31) return false;
        // 192.168.0.0/16
        if (a === 192 && b === 168) return false;
        // 127.0.0.0/8 (loopback)
        if (a === 127) return false;
        // 169.254.0.0/16 (link-local)
        if (a === 169 && b === 254) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verifies PKCE S256 code challenge:
   * BASE64URL-ENCODE(SHA256(ASCII(code_verifier))) == code_challenge
   */
  verifyPkceChallenge(verifier: string, challenge: string, method: string = 'S256'): boolean {
    if (method === 'plain') {
      return this.timingSafeEqual(verifier, challenge);
    }
    if (method === 'S256') {
      const hash = crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64url');
      return this.timingSafeEqual(hash, challenge);
    }
    return false;
  }
}
