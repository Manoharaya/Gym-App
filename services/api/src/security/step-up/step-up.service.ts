import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { MfaService } from '../mfa/mfa.service';
import { StepUpAction } from '@fitcore/types';

export interface StepUpChallengeResponse {
  challengeToken: string; // Plaintext token returned ONCE to client
  action: StepUpAction;
  expiresAt: Date;
}

/**
 * StepUpService
 *
 * Provides short-lived, single-use, session-bound and action-bound challenges
 * required to execute sensitive enterprise or account actions.
 * Never trusts frontend flags like mfaVerified=true.
 */
@Injectable()
export class StepUpService {
  private readonly logger = new Logger(StepUpService.name);
  private readonly challengeExpiryMinutes = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mfaService: MfaService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a short-lived step-up challenge for a specific sensitive action.
   */
  async createChallenge(
    userId: string,
    action: StepUpAction,
    sessionId?: string,
  ): Promise<StepUpChallengeResponse> {
    const rawToken = `fc_stepup_${crypto.randomBytes(24).toString('hex')}`;
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.challengeExpiryMinutes * 60 * 1000);

    await this.prisma.securityActionChallenge.create({
      data: {
        userId,
        sessionId,
        action,
        tokenHash,
        status: 'PENDING',
        expiresAt,
      },
    });

    return {
      challengeToken: rawToken,
      action,
      expiresAt,
    };
  }

  /**
   * Verifies the step-up challenge using primary password or MFA code.
   */
  async verifyChallenge(
    userId: string,
    rawToken: string,
    verification: { password?: string; mfaCode?: string },
  ): Promise<boolean> {
    const tokenHash = this.hashToken(rawToken);
    const challenge = await this.prisma.securityActionChallenge.findUnique({
      where: { tokenHash },
    });

    if (!challenge) {
      throw new UnauthorizedException('Step-up challenge not recognized');
    }

    if (challenge.userId !== userId) {
      throw new UnauthorizedException('Challenge does not belong to current user');
    }

    if (challenge.status !== 'PENDING') {
      throw new BadRequestException(`Challenge is already ${challenge.status.toLowerCase()}`);
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      await this.prisma.securityActionChallenge.update({
        where: { id: challenge.id },
        data: { status: 'EXPIRED' },
      });
      throw new UnauthorizedException('Step-up challenge has expired');
    }

    let isVerified = false;

    // Verify via MFA code if provided
    if (verification.mfaCode) {
      try {
        const result = await this.mfaService.verifyMfaChallenge(userId, verification.mfaCode);
        isVerified = result.success;
      } catch {
        isVerified = false;
      }
    }

    // Verify via Password confirmation if MFA not provided or user has no MFA
    if (!isVerified && verification.password) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (user) {
        isVerified = await bcrypt.compare(verification.password, user.passwordHash);
      }
    }

    if (!isVerified) {
      throw new UnauthorizedException('Step-up verification failed: invalid credentials or code');
    }

    await this.prisma.securityActionChallenge.update({
      where: { id: challenge.id },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });

    return true;
  }

  /**
   * Consumes a verified step-up challenge before completing the sensitive action.
   * Single-use only; immediately marks as CONSUMED.
   */
  async consumeChallenge(
    userId: string,
    rawToken: string,
    expectedAction: StepUpAction,
  ): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const challenge = await this.prisma.securityActionChallenge.findUnique({
      where: { tokenHash },
    });

    if (!challenge) {
      throw new UnauthorizedException('Invalid or missing step-up token');
    }

    if (challenge.userId !== userId) {
      throw new UnauthorizedException('Step-up token belongs to another user');
    }

    if (challenge.action !== expectedAction) {
      throw new BadRequestException(`Step-up token was issued for ${challenge.action}, not ${expectedAction}`);
    }

    if (challenge.status !== 'VERIFIED') {
      throw new UnauthorizedException(`Step-up challenge is not verified (status: ${challenge.status})`);
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      await this.prisma.securityActionChallenge.update({
        where: { id: challenge.id },
        data: { status: 'EXPIRED' },
      });
      throw new UnauthorizedException('Step-up challenge has expired');
    }

    // Single-use atomic consumption
    await this.prisma.securityActionChallenge.update({
      where: { id: challenge.id },
      data: {
        status: 'CONSUMED',
        consumedAt: new Date(),
      },
    });
  }
}
