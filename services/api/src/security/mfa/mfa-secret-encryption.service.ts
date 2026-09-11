import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * MfaSecretEncryptionService
 *
 * Implements authenticated encryption using AES-256-GCM.
 * Encrypts TOTP secrets and MFA references at rest in PostgreSQL.
 * Strictly avoids logging secret values or leaking plaintext in errors.
 */
@Injectable()
export class MfaSecretEncryptionService {
  private readonly logger = new Logger(MfaSecretEncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const masterSecret =
      this.configService.get<string>('MFA_ENCRYPTION_KEY') ||
      this.configService.get<string>('JWT_SECRET') ||
      'fitcore-production-mfa-encryption-master-secret-key-32b!';

    // Ensure exact 32-byte key for AES-256
    this.key = crypto.createHash('sha256').update(masterSecret).digest();
  }

  /**
   * Encrypts plaintext MFA secret using AES-256-GCM with a random 16-byte IV.
   * Format: ivHex:authTagHex:encryptedHex
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return '';
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch {
      this.logger.error('Failed to encrypt MFA secret');
      throw new Error('MFA_ENCRYPTION_FAILED');
    }
  }

  /**
   * Decrypts ciphertext using AES-256-GCM, verifying the auth tag.
   */
  decrypt(ciphertext: string): string {
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
    } catch {
      this.logger.error('Failed to decrypt MFA secret');
      throw new Error('MFA_DECRYPTION_FAILED');
    }
  }
}
