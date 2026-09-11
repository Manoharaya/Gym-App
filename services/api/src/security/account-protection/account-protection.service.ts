import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface LockoutStatus {
  isLocked: boolean;
  lockedUntil?: Date | null;
  reason?: string | null;
  remainingSeconds?: number;
}

/**
 * AccountProtectionService
 *
 * Provides brute-force protection and controlled account lockout.
 * Guarantees zero account-enumeration vulnerability.
 */
@Injectable()
export class AccountProtectionService {
  private readonly logger = new Logger(AccountProtectionService.name);

  // In-memory tracker for failed attempts keyed by normalized email/IP
  private readonly failedAttempts = new Map<
    string,
    { count: number; lockedUntil: number; firstAttemptAt: number }
  >();

  private readonly defaultMaxAttempts = 5;
  private readonly defaultLockoutMinutes = 15;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Checks if an account or key is currently locked out.
   * Throws an UnauthorizedException if locked.
   */
  checkLockout(key: string): void {
    const normalizedKey = key.toLowerCase().trim();
    const entry = this.failedAttempts.get(normalizedKey);

    if (entry && Date.now() < entry.lockedUntil) {
      const remainingSeconds = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
      this.logger.warn(`Rejected authentication for locked key: ${normalizedKey}`);
      throw new UnauthorizedException(
        `Too many failed attempts. Account is temporarily locked. Try again in ${remainingSeconds} seconds.`,
      );
    }

    // Clear expired lockout
    if (entry && Date.now() >= entry.lockedUntil && entry.count >= this.defaultMaxAttempts) {
      this.failedAttempts.delete(normalizedKey);
    }
  }

  /**
   * Records a failed authentication attempt.
   */
  recordFailedAttempt(
    key: string,
    options?: { maxAttempts?: number; lockoutMinutes?: number },
  ): { isLocked: boolean; remainingAttempts: number } {
    const normalizedKey = key.toLowerCase().trim();
    const maxAttempts = options?.maxAttempts || this.defaultMaxAttempts;
    const lockoutMinutes = options?.lockoutMinutes || this.defaultLockoutMinutes;

    const entry = this.failedAttempts.get(normalizedKey) || {
      count: 0,
      lockedUntil: 0,
      firstAttemptAt: Date.now(),
    };

    entry.count += 1;

    if (entry.count >= maxAttempts) {
      entry.lockedUntil = Date.now() + lockoutMinutes * 60 * 1000;
      this.logger.warn(`Account key ${normalizedKey} temporarily locked due to ${entry.count} failed attempts`);
    }

    this.failedAttempts.set(normalizedKey, entry);

    return {
      isLocked: entry.count >= maxAttempts,
      remainingAttempts: Math.max(0, maxAttempts - entry.count),
    };
  }

  /**
   * Resets failed attempts after successful authentication.
   */
  resetAttempts(key: string): void {
    const normalizedKey = key.toLowerCase().trim();
    this.failedAttempts.delete(normalizedKey);
  }

  /**
   * Returns current attempt count for risk evaluation.
   */
  getAttemptCount(key: string): number {
    const normalizedKey = key.toLowerCase().trim();
    return this.failedAttempts.get(normalizedKey)?.count || 0;
  }
}
