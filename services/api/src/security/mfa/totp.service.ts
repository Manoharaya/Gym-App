import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Base32 RFC 4648 Alphabet
 */
const RFC4648_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * TotpService
 *
 * Implements RFC 6238 Time-Based One-Time Password (TOTP) algorithm
 * using standard Node.js crypto (HMAC-SHA1, 30s step, 6 digits).
 * Supports clock drift tolerance (±1 step window).
 * Never logs secrets.
 */
@Injectable()
export class TotpService {
  private readonly stepSeconds = 30;
  private readonly digits = 6;

  /**
   * Generates a random Base32 secret string (20 bytes = 160 bits, standard for TOTP).
   */
  generateSecret(): string {
    const buffer = crypto.randomBytes(20);
    return this.encodeBase32(buffer);
  }

  /**
   * Generates standard `otpauth://` provisioning URI for authenticator apps.
   */
  generateKeyUri(accountName: string, issuer: string, secret: string): string {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedAccount = encodeURIComponent(accountName);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${this.digits}&period=${this.stepSeconds}`;
  }

  /**
   * Computes the TOTP code for a specific timestamp (in milliseconds).
   */
  generateCode(secret: string, timestampMs: number = Date.now()): string {
    const counter = Math.floor(timestampMs / 1000 / this.stepSeconds);
    return this.generateHotp(secret, counter);
  }

  /**
   * Verifies a user-entered TOTP code against the secret.
   * Tolerates a window of ±1 step (i.e. -30s, current, +30s) to absorb clock skew.
   */
  verifyCode(
    secret: string,
    userCode: string,
    options?: { window?: number; timestampMs?: number },
  ): boolean {
    if (!secret || !userCode) return false;
    const cleanCode = userCode.trim().replace(/\s+/g, '');
    if (cleanCode.length !== this.digits) return false;

    const window = options?.window ?? 1; // ±1 step = ±30s
    const nowMs = options?.timestampMs ?? Date.now();
    const currentCounter = Math.floor(nowMs / 1000 / this.stepSeconds);

    for (let i = -window; i <= window; i++) {
      const expectedCode = this.generateHotp(secret, currentCounter + i);
      if (crypto.timingSafeEqual(Buffer.from(cleanCode), Buffer.from(expectedCode))) {
        return true;
      }
    }

    return false;
  }

  /**
   * RFC 4226 HOTP core algorithm
   */
  private generateHotp(secret: string, counter: number): string {
    const key = this.decodeBase32(secret);

    // 8-byte big-endian counter
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter), 0);

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(counterBuffer);
    const digest = hmac.digest();

    // Dynamic truncation
    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const otp = binary % 10 ** this.digits;
    return otp.toString().padStart(this.digits, '0');
  }

  /**
   * Encodes a Buffer to Base32 string (without padding)
   */
  private encodeBase32(buffer: Buffer): string {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        output += RFC4648_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += RFC4648_ALPHABET[(value << (5 - bits)) & 31];
    }

    return output;
  }

  /**
   * Decodes a Base32 string to Buffer
   */
  private decodeBase32(base32Str: string): Buffer {
    const cleaned = base32Str.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < cleaned.length; i++) {
      const idx = RFC4648_ALPHABET.indexOf(cleaned[i]);
      if (idx === -1) continue;

      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }
}
