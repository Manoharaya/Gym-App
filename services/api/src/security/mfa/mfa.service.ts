import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TotpService } from './totp.service';
import { RecoveryCodeService } from './recovery-code.service';
import { MfaSecretEncryptionService } from './mfa-secret-encryption.service';
import { EmailOtpService } from './email-otp.service';

export interface MfaEnrollmentResponse {
  methodId: string;
  type: 'TOTP';
  secret: string; // Plaintext Base32 secret returned ONCE to the user for provisioning
  keyUri: string; // otpauth:// URI
  recoveryCodes: string[]; // 10 recovery codes returned ONCE
}

/**
 * MfaService
 *
 * Core MFA Orchestrator for Day 52:
 * - TOTP enrollment & verification
 * - Single-use recovery code lifecycle
 * - Email OTP fallback
 * - Brute-force verification limits
 * - Secret encryption at rest
 * - Server-side state tracking
 */
@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
  private readonly maxFailedAttempts = 5;
  private readonly lockoutDurationMs = 15 * 60 * 1000; // 15 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly totpService: TotpService,
    private readonly recoveryCodeService: RecoveryCodeService,
    private readonly encryptionService: MfaSecretEncryptionService,
    private readonly emailOtpService: EmailOtpService,
  ) {}

  /**
   * Initiates TOTP enrollment:
   * Generates high-entropy secret, encrypts at rest, generates recovery codes.
   */
  async enrollTotp(
    userId: string,
    label?: string,
  ): Promise<MfaEnrollmentResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const plainSecret = this.totpService.generateSecret();
    const encryptedSecret = this.encryptionService.encrypt(plainSecret);
    const keyUri = this.totpService.generateKeyUri(
      user.email,
      'FitCore',
      plainSecret,
    );

    // Persist or replace pending TOTP method
    const existing = await this.prisma.userMfaMethod.findFirst({
      where: { userId, type: 'TOTP' },
    });

    let methodId: string;
    if (existing) {
      const updated = await this.prisma.userMfaMethod.update({
        where: { id: existing.id },
        data: {
          secretReference: encryptedSecret,
          status: 'PENDING',
          label: label || 'Authenticator App',
          updatedAt: new Date(),
        },
      });
      methodId = updated.id;
    } else {
      const created = await this.prisma.userMfaMethod.create({
        data: {
          userId,
          type: 'TOTP',
          status: 'PENDING',
          label: label || 'Authenticator App',
          secretReference: encryptedSecret,
        },
      });
      methodId = created.id;
    }

    // Generate and store single-use recovery codes
    const { plainCodes, hashedRecords } =
      await this.recoveryCodeService.generateCodes(userId);
    await this.recoveryCodeService.saveCodes(userId, hashedRecords);

    return {
      methodId,
      type: 'TOTP',
      secret: plainSecret,
      keyUri,
      recoveryCodes: plainCodes,
    };
  }

  /**
   * Verifies enrollment code to activate the TOTP method.
   */
  async verifyEnrollment(userId: string, code: string): Promise<boolean> {
    this.checkAttemptLimit(userId);

    const method = await this.prisma.userMfaMethod.findFirst({
      where: { userId, type: 'TOTP', status: 'PENDING' },
    });

    if (!method) {
      throw new BadRequestException('No pending TOTP enrollment found for user');
    }

    const plainSecret = this.encryptionService.decrypt(method.secretReference);
    const isValid = this.totpService.verifyCode(plainSecret, code);

    if (!isValid) {
      this.recordFailedAttempt(userId);
      throw new UnauthorizedException('Invalid verification code');
    }

    this.resetAttempts(userId);

    await this.prisma.userMfaMethod.update({
      where: { id: method.id },
      data: {
        status: 'ACTIVE',
        verifiedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });

    return true;
  }

  /**
   * Verifies an MFA challenge during primary login or step-up authentication.
   * Supports TOTP codes and recovery codes.
   */
  async verifyMfaChallenge(
    userId: string,
    code: string,
    isRecoveryCode = false,
  ): Promise<{ success: boolean; methodUsed: 'TOTP' | 'RECOVERY_CODE' | 'EMAIL_OTP' }> {
    this.checkAttemptLimit(userId);

    if (isRecoveryCode) {
      const consumed = await this.recoveryCodeService.verifyAndConsume(userId, code);
      if (!consumed) {
        this.recordFailedAttempt(userId);
        throw new UnauthorizedException('Invalid or already used recovery code');
      }
      this.resetAttempts(userId);
      return { success: true, methodUsed: 'RECOVERY_CODE' };
    }

    // Check active TOTP method
    const activeTotp = await this.prisma.userMfaMethod.findFirst({
      where: { userId, type: 'TOTP', status: 'ACTIVE' },
    });

    if (activeTotp) {
      const plainSecret = this.encryptionService.decrypt(activeTotp.secretReference);
      const isValid = this.totpService.verifyCode(plainSecret, code);

      if (isValid) {
        this.resetAttempts(userId);
        await this.prisma.userMfaMethod.update({
          where: { id: activeTotp.id },
          data: { lastUsedAt: new Date() },
        });
        return { success: true, methodUsed: 'TOTP' };
      }
    }

    // Check active Email OTP
    const isEmailValid = await this.emailOtpService.verifyOtp(userId, code);
    if (isEmailValid) {
      this.resetAttempts(userId);
      return { success: true, methodUsed: 'EMAIL_OTP' };
    }

    this.recordFailedAttempt(userId);
    throw new UnauthorizedException('Invalid multi-factor authentication code');
  }

  /**
   * Disables MFA for a user (marks methods as DISABLED).
   */
  async disableMfa(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userMfaMethod.updateMany({
        where: { userId, status: 'ACTIVE' },
        data: { status: 'DISABLED' },
      });

      await tx.userMfaRecoveryCode.updateMany({
        where: { userId, status: 'UNUSED' },
        data: { status: 'REVOKED' },
      });
    });

    this.logger.log(`Disabled MFA for user ${userId}`);
  }

  /**
   * Regenerates a new set of recovery codes.
   */
  async regenerateRecoveryCodes(userId: string): Promise<string[]> {
    const activeMfa = await this.prisma.userMfaMethod.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    if (!activeMfa) {
      throw new BadRequestException('MFA is not enabled for this user');
    }

    const { plainCodes, hashedRecords } =
      await this.recoveryCodeService.generateCodes(userId);
    await this.recoveryCodeService.saveCodes(userId, hashedRecords);

    return plainCodes;
  }

  /**
   * Returns user's configured MFA methods and remaining recovery codes count.
   */
  async getUserMfaStatus(userId: string) {
    const methods = await this.prisma.userMfaMethod.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        status: true,
        label: true,
        verifiedAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    const activeMethods = methods.filter((m) => m.status === 'ACTIVE');
    const remainingRecoveryCodes =
      await this.recoveryCodeService.getRemainingCount(userId);

    return {
      isMfaEnabled: activeMethods.length > 0,
      activeMethods,
      allMethods: methods,
      remainingRecoveryCodes,
    };
  }

  // --- Rate Limiting & Brute Force Defense ---

  private checkAttemptLimit(userId: string): void {
    const entry = this.failedAttempts.get(userId);
    if (entry) {
      if (Date.now() < entry.lockedUntil) {
        const remainingSec = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
        throw new UnauthorizedException(
          `Too many failed MFA verification attempts. Please try again in ${remainingSec} seconds.`,
        );
      }
      if (Date.now() >= entry.lockedUntil && entry.count >= this.maxFailedAttempts) {
        this.failedAttempts.delete(userId);
      }
    }
  }

  private recordFailedAttempt(userId: string): void {
    const entry = this.failedAttempts.get(userId) || { count: 0, lockedUntil: 0 };
    entry.count += 1;
    if (entry.count >= this.maxFailedAttempts) {
      entry.lockedUntil = Date.now() + this.lockoutDurationMs;
      this.logger.warn(`User ${userId} locked out of MFA verification due to ${entry.count} failed attempts`);
    }
    this.failedAttempts.set(userId, entry);
  }

  private resetAttempts(userId: string): void {
    this.failedAttempts.delete(userId);
  }
}
