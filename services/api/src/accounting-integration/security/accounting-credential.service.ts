/**
 * FitCore — Day 43: Accounting Credential Service
 *
 * Implements authenticated encryption using AES-256-GCM to protect
 * OAuth access and refresh tokens at rest.
 * Strictly prevents token values from being logged or exposed.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class AccountingCredentialService {
  private readonly logger = new Logger(AccountingCredentialService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const secret =
      process.env.ACCOUNTING_ENCRYPTION_KEY ||
      process.env.JWT_SECRET ||
      'fitcore-production-accounting-encryption-master-key-32b!';
    this.key = crypto.createHash('sha256').update(secret).digest();
  }

  /**
   * Encrypts plaintext token using AES-256-GCM with a random 16-byte IV.
   * Format: ivHex:authTagHex:encryptedHex
   */
  encryptToken(plaintext: string): string {
    if (!plaintext) return '';
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (err: any) {
      this.logger.error('Token encryption failure occurred');
      throw new Error('TOKEN_ENCRYPTION_FAILED');
    }
  }

  /**
   * Decrypts ciphertext token using AES-256-GCM verifying the auth tag.
   */
  decryptToken(ciphertext: string): string {
    if (!ciphertext) return '';
    try {
      const parts = ciphertext.split(':');
      if (parts.length !== 3) {
        throw new Error('MALFORMED_CIPHERTEXT');
      }

      const [ivHex, authTagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err: any) {
      this.logger.error('Token decryption failure occurred');
      throw new Error('TOKEN_DECRYPTION_FAILED');
    }
  }
}
