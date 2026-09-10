/**
 * FitCore — Day 42: Retry Policy Service
 *
 * Determines retry schedules based on configurable organisation billing policies.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DEFAULT_BILLING_POLICY } from '../domain/recurring-billing.constants';
import { BillingPolicyDto } from '@fitcore/types';

@Injectable()
export class RetryPolicyService {
  private readonly logger = new Logger(RetryPolicyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves or creates default billing policy for an organisation.
   */
  async getPolicy(organisationId: string): Promise<BillingPolicyDto> {
    let policy = await this.prisma.billingPolicy.findUnique({
      where: { organisationId },
    });

    if (!policy) {
      policy = await this.prisma.billingPolicy.create({
        data: {
          organisationId,
          ...DEFAULT_BILLING_POLICY,
        },
      });
    }

    return {
      id: policy.id,
      organisationId: policy.organisationId,
      retryMaxAttempts: policy.retryMaxAttempts,
      retryIntervalsDays: policy.retryIntervalsDays,
      gracePeriodDays: policy.gracePeriodDays,
      gracePeriodAccessAllowed: policy.gracePeriodAccessAllowed,
      dunningAutoEscalateDays: policy.dunningAutoEscalateDays,
      dunningMaxPeriodDays: policy.dunningMaxPeriodDays,
      communicationChannels: policy.communicationChannels,
      metadata: policy.metadata as Record<string, any> | null,
      updatedAt: policy.updatedAt.toISOString(),
    };
  }

  /**
   * Updates an organisation's billing policy.
   */
  async updatePolicy(
    organisationId: string,
    updates: Partial<typeof DEFAULT_BILLING_POLICY>,
  ): Promise<BillingPolicyDto> {
    const policy = await this.prisma.billingPolicy.upsert({
      where: { organisationId },
      create: {
        organisationId,
        ...DEFAULT_BILLING_POLICY,
        ...updates,
      },
      update: updates,
    });

    return {
      id: policy.id,
      organisationId: policy.organisationId,
      retryMaxAttempts: policy.retryMaxAttempts,
      retryIntervalsDays: policy.retryIntervalsDays,
      gracePeriodDays: policy.gracePeriodDays,
      gracePeriodAccessAllowed: policy.gracePeriodAccessAllowed,
      dunningAutoEscalateDays: policy.dunningAutoEscalateDays,
      dunningMaxPeriodDays: policy.dunningMaxPeriodDays,
      communicationChannels: policy.communicationChannels,
      metadata: policy.metadata as Record<string, any> | null,
      updatedAt: policy.updatedAt.toISOString(),
    };
  }

  /**
   * Computes the next retry timestamp.
   * Attempt 1 is initial charge.
   * If attempt 1 fails, next attempt is attempt 2.
   * Interval index = attemptNumber - 1.
   */
  async calculateNextRetryDate(
    organisationId: string,
    attemptNumber: number,
    fromDate: Date = new Date(),
  ): Promise<{ nextRetryAt: Date | null; isExhausted: boolean }> {
    const policy = await this.getPolicy(organisationId);

    if (attemptNumber >= policy.retryMaxAttempts) {
      return { nextRetryAt: null, isExhausted: true };
    }

    // Default intervals: [2, 3, 3]
    // Index for attempt 1 failure -> attempt 2: index 0 (2 days)
    // Index for attempt 2 failure -> attempt 3: index 1 (3 days)
    // Index for attempt 3 failure -> attempt 4: index 2 (3 days)
    const intervalIndex = Math.min(attemptNumber - 1, policy.retryIntervalsDays.length - 1);
    const daysToAdd = policy.retryIntervalsDays[intervalIndex] || 3;

    const nextRetry = new Date(fromDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    return { nextRetryAt: nextRetry, isExhausted: false };
  }
}
