import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';

export interface GeneratedRecoveryCodes {
  plainCodes: string[]; // Shown ONCE to the user upon enrollment or regeneration
  hashedRecords: Array<{ codeHash: string }>;
}

/**
 * RecoveryCodeService
 *
 * Generates single-use cryptographically secure recovery codes.
 * Codes are formatted (e.g. "ABCD-EFGH") for human readability.
 * Codes are hashed with bcrypt before storing in PostgreSQL.
 * Old codes are invalidated upon regeneration.
 * Never logs plaintext recovery codes.
 */
@Injectable()
export class RecoveryCodeService {
  private readonly logger = new Logger(RecoveryCodeService.name);
  private readonly codeCount = 10;
  private readonly saltRounds = 10;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a batch of 10 cryptographic recovery codes.
   */
  async generateCodes(_userId: string): Promise<GeneratedRecoveryCodes> {
    const plainCodes: string[] = [];
    const hashedRecords: Array<{ codeHash: string }> = [];

    for (let i = 0; i < this.codeCount; i++) {
      // 8 hex chars formatted as XXXX-XXXX
      const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
      const code = `${randomHex.slice(0, 4)}-${randomHex.slice(4, 8)}`;
      plainCodes.push(code);

      const codeHash = await bcrypt.hash(code, this.saltRounds);
      hashedRecords.push({ codeHash });
    }

    return { plainCodes, hashedRecords };
  }

  /**
   * Persists newly generated recovery codes for a user, invalidating any previous codes.
   */
  async saveCodes(userId: string, hashedRecords: Array<{ codeHash: string }>): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Invalidate existing recovery codes
      await tx.userMfaRecoveryCode.updateMany({
        where: { userId, status: 'UNUSED' },
        data: { status: 'REVOKED' },
      });

      // Insert new recovery codes
      await tx.userMfaRecoveryCode.createMany({
        data: hashedRecords.map((r) => ({
          userId,
          codeHash: r.codeHash,
          status: 'UNUSED',
        })),
      });
    });

    this.logger.log(`Generated new MFA recovery codes for user ${userId}`);
  }

  /**
   * Verifies and atomically consumes a single-use recovery code.
   * Returns true if code was valid and consumed, false otherwise.
   */
  async verifyAndConsume(userId: string, rawCode: string): Promise<boolean> {
    if (!rawCode) return false;
    const cleanCode = rawCode.trim().toUpperCase();

    // Fetch all active unused recovery codes for this user
    const unusedCodes = await this.prisma.userMfaRecoveryCode.findMany({
      where: { userId, status: 'UNUSED' },
    });

    for (const record of unusedCodes) {
      const isMatch = await bcrypt.compare(cleanCode, record.codeHash);
      if (isMatch) {
        // Mark as used atomically using updateMany with status check
        const updated = await this.prisma.userMfaRecoveryCode.updateMany({
          where: { id: record.id, status: 'UNUSED' },
          data: { status: 'USED', usedAt: new Date() },
        });

        if (updated.count === 1) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Returns the count of remaining unused recovery codes.
   */
  async getRemainingCount(userId: string): Promise<number> {
    return this.prisma.userMfaRecoveryCode.count({
      where: { userId, status: 'UNUSED' },
    });
  }
}
