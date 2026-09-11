import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';

/**
 * EmailOtpService
 *
 * Generates and validates time-bound 6-digit numeric OTPs sent via email.
 * Secrets are hashed before persisting; raw OTPs are never stored.
 */
@Injectable()
export class EmailOtpService {
  private readonly logger = new Logger(EmailOtpService.name);
  private readonly otpExpiryMinutes = 10;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a 6-digit cryptographic numeric OTP and stores its hash.
   */
  async generateOtp(userId: string): Promise<{ otp: string; expiresAt: Date }> {
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);
    const codeHash = await bcrypt.hash(rawOtp, 10);

    // Save as PENDING email OTP method record
    const existing = await this.prisma.userMfaMethod.findFirst({
      where: { userId, type: 'EMAIL_OTP' },
    });

    if (existing) {
      await this.prisma.userMfaMethod.update({
        where: { id: existing.id },
        data: {
          secretReference: `${codeHash}:${expiresAt.toISOString()}`,
          status: 'PENDING',
        },
      });
    } else {
      await this.prisma.userMfaMethod.create({
        data: {
          userId,
          type: 'EMAIL_OTP',
          status: 'PENDING',
          label: 'Email Verification',
          secretReference: `${codeHash}:${expiresAt.toISOString()}`,
        },
      });
    }

    return { otp: rawOtp, expiresAt };
  }

  /**
   * Validates a user-entered 6-digit OTP against the stored hash and expiry.
   */
  async verifyOtp(userId: string, code: string): Promise<boolean> {
    if (!code) return false;
    const cleanCode = code.trim();

    const record = await this.prisma.userMfaMethod.findFirst({
      where: { userId, type: 'EMAIL_OTP' },
    });

    if (!record || !record.secretReference) return false;

    const [codeHash, expiryStr] = record.secretReference.split(':');
    if (!codeHash || !expiryStr) return false;

    const expiresAt = new Date(expiryStr);
    if (Date.now() > expiresAt.getTime()) {
      return false; // Expired
    }

    const isMatch = await bcrypt.compare(cleanCode, codeHash);
    if (isMatch) {
      await this.prisma.userMfaMethod.update({
        where: { id: record.id },
        data: {
          status: 'ACTIVE',
          verifiedAt: new Date(),
          lastUsedAt: new Date(),
        },
      });
      return true;
    }

    return false;
  }
}
