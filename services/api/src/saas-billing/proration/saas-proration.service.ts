import { Injectable } from '@nestjs/common';
import { SaasProrationResult } from '@fitcore/types';
import { MoneyUtil } from '../../payments/utils/money.util';

export interface ProrationInput {
  currentPlanCode: string;
  targetPlanCode: string;
  currentBasePriceMinor: number;
  targetBasePriceMinor: number;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  effectiveDate?: Date;
}

@Injectable()
export class SaasProrationService {
  /**
   * Deterministically calculates proration for mid-cycle plan upgrades and changes.
   * Uses minor units (minor cents) exclusively to avoid floating-point errors.
   */
  calculateProration(input: ProrationInput): SaasProrationResult {
    const now = input.effectiveDate || new Date();
    const periodStartMs = input.currentPeriodStart.getTime();
    const periodEndMs = input.currentPeriodEnd.getTime();
    const nowMs = Math.min(Math.max(now.getTime(), periodStartMs), periodEndMs);

    const totalMs = Math.max(1, periodEndMs - periodStartMs);
    const remainingMs = Math.max(0, periodEndMs - nowMs);

    const totalDays = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.max(0, Math.round(remainingMs / (1000 * 60 * 60 * 24)));

    // Ratio remaining = remainingMs / totalMs
    // Unearned amount from current plan = currentBasePriceMinor * (remainingMs / totalMs)
    const unearnedCurrentMinor = Math.round(
      (input.currentBasePriceMinor * remainingMs) / totalMs,
    );

    // Prorated charge for new plan = targetBasePriceMinor * (remainingMs / totalMs)
    const chargeNewMinor = Math.round(
      (input.targetBasePriceMinor * remainingMs) / totalMs,
    );

    const netAdjustmentMinor = MoneyUtil.subtract(chargeNewMinor, unearnedCurrentMinor);

    return {
      currentPlanCode: input.currentPlanCode,
      targetPlanCode: input.targetPlanCode,
      currency: input.currency,
      daysRemainingInPeriod: remainingDays,
      totalDaysInPeriod: totalDays,
      unearnedCurrentMinor,
      chargeNewMinor,
      netAdjustmentMinor,
      immediatePaymentRequired: netAdjustmentMinor > 0,
    };
  }
}
