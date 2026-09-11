/**
 * FitCore — Day 48: Integration Credential Service
 *
 * Provides cryptographic security for integration secrets (API keys, OAuth tokens,
 * webhook secrets, device tokens) using AES-256-GCM authenticated encryption.
 *
 * Strict rules:
 * - Never log plaintext secrets
 * - Never return secrets in API responses
 * - Never include secrets in AI context
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class IntegrationCredentialService {
  private readonly logger = new Logger(IntegrationCredentialService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const rawKey =
      this.configService.get<string>('INTEGRATION_ENCRYPTION_KEY') ||
      this.configService.get<string>('JWT_SECRET') ||
      'fitcore-default-integration-dev-encryption-key-32-chars-long!!';

    // Hash into 32-byte key for AES-256
    this.encryptionKey = crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Encrypts a credentials object or string into a secure serialized payload:
   * iv:authTag:encryptedData (hex encoded)
   */
  encrypt(data: Record<string, any> | string): string {
    if (!data) return '';
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts a serialized payload back into object or string.
   */
  decrypt<T = Record<string, any>>(encryptedPayload?: string | null): T | null {
    if (!encryptedPayload) return null;

    try {
      const parts = encryptedPayload.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted payload format');
      }

      const [ivHex, authTagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      try {
        return JSON.parse(decrypted) as T;
      } catch {
        return decrypted as unknown as T;
      }
    } catch (err: any) {
      this.logger.error(`Decryption failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Mask sensitive keys so they are safe for logging or debugging.
   */
  mask(val?: string | null): string {
    if (!val) return '***';
    if (val.length <= 8) return '****';
    return `${val.slice(0, 3)}****${val.slice(-3)}`;
  }
}
