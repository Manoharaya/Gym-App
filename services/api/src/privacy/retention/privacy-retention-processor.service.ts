import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PrivacyRetentionHoldService } from './privacy-retention-hold.service';

export interface RetentionJobResult {
  executionId: string;
  policyId: string;
  category: string;
  status: 'COMPLETED' | 'PARTIAL_FAILURE' | 'FAILED';
  itemsEvaluated: number;
  itemsActioned: number;
  itemsRetained: number;
  itemsFailed: number;
  summary: string;
}

@Injectable()
export class PrivacyRetentionProcessorService {
  private readonly logger = new Logger(PrivacyRetentionProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly holdService: PrivacyRetentionHoldService,
  ) {}

  /**
   * Runs retention evaluation across all enabled policies for an organisation.
   */
  async runRetentionCycle(organisationId: string): Promise<RetentionJobResult[]> {
    this.logger.log(`Starting scheduled retention cycle for org ${organisationId}`);

    const policies = await this.prisma.privacyRetentionPolicy.findMany({
      where: {
        organisationId,
        enabled: true,
      },
    });

    const results: RetentionJobResult[] = [];

    for (const policy of policies) {
      const result = await this.processPolicy(policy);
      results.push(result);
    }

    return results;
  }

  /**
   * Processes a single retention policy with safety hold checks.
   */
  async processPolicy(policy: any): Promise<RetentionJobResult> {
    const execution = await this.prisma.privacyRetentionExecution.create({
      data: {
        policyId: policy.id,
        status: 'RUNNING',
      },
    });

    let itemsEvaluated = 0;
    let itemsActioned = 0;
    let itemsRetained = 0;
    let itemsFailed = 0;

    try {
      const cutoffDate = new Date(
        Date.now() - policy.retentionPeriodDays * 24 * 60 * 60 * 1000,
      );

      // Check if there is an active organisation-wide hold for this category
      const orgHasHold = await this.holdService.hasActiveHold(
        policy.organisationId,
        policy.dataCategory,
      );

      if (orgHasHold) {
        this.logger.warn(
          `Retention action skipped for category '${policy.dataCategory}' due to active organisation legal hold`,
        );
        itemsRetained += 1;

        await this.prisma.privacyRetentionExecution.update({
          where: { id: execution.id },
          data: {
            status: 'COMPLETED',
            itemsEvaluated: 1,
            itemsRetained: 1,
            completedAt: new Date(),
            errorSummary: 'Active legal hold prevented retention deletion',
          },
        });

        return {
          executionId: execution.id,
          policyId: policy.id,
          category: policy.dataCategory,
          status: 'COMPLETED',
          itemsEvaluated: 1,
          itemsActioned: 0,
          itemsRetained: 1,
          itemsFailed: 0,
          summary: 'Active legal hold prevented retention deletion',
        };
      }

      // Execute category-specific action
      if (policy.dataCategory === 'AI_INTERACTION') {
        const expired = await this.prisma.aIRequest.findMany({
          where: { createdAt: { lt: cutoffDate } },
          select: { id: true, memberId: true },
          take: 100,
        });

        itemsEvaluated = expired.length;

        for (const req of expired) {
          const isMemberHeld = req.memberId
            ? await this.holdService.hasActiveHold(
                policy.organisationId,
                'AI_INTERACTION',
                req.memberId,
              )
            : false;

          if (isMemberHeld) {
            itemsRetained++;
          } else {
            await this.prisma.aIRequest.delete({ where: { id: req.id } });
            itemsActioned++;
          }
        }
      } else if (policy.dataCategory === 'COMMUNICATION') {
        const expired = await this.prisma.communication.findMany({
          where: { createdAt: { lt: cutoffDate } },
          select: { id: true, recipientMemberId: true },
          take: 100,
        });

        itemsEvaluated = expired.length;

        for (const comm of expired) {
          const isMemberHeld = comm.recipientMemberId
            ? await this.holdService.hasActiveHold(
                policy.organisationId,
                'COMMUNICATION',
                comm.recipientMemberId,
              )
            : false;

          if (isMemberHeld) {
            itemsRetained++;
          } else {
            await this.prisma.communication.delete({ where: { id: comm.id } });
            itemsActioned++;
          }
        }
      } else if (policy.dataCategory === 'WEARABLE') {
        const expired = await this.prisma.healthDataRecord.findMany({
          where: { recordedAt: { lt: cutoffDate } },
          select: { id: true, memberId: true },
          take: 100,
        });

        itemsEvaluated = expired.length;

        for (const rec of expired) {
          const isMemberHeld = await this.holdService.hasActiveHold(
            policy.organisationId,
            'WEARABLE',
            rec.memberId,
          );

          if (isMemberHeld) {
            itemsRetained++;
          } else {
            await this.prisma.healthDataRecord.delete({ where: { id: rec.id } });
            itemsActioned++;
          }
        }
      } else {
        // For statutory categories like FINANCIAL or HEALTH, retain with policy record
        itemsEvaluated = 1;
        itemsRetained = 1;
      }

      await this.prisma.privacyRetentionExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          itemsEvaluated,
          itemsActioned,
          itemsRetained,
          itemsFailed,
          completedAt: new Date(),
        },
      });

      return {
        executionId: execution.id,
        policyId: policy.id,
        category: policy.dataCategory,
        status: 'COMPLETED',
        itemsEvaluated,
        itemsActioned,
        itemsRetained,
        itemsFailed,
        summary: `Evaluated ${itemsEvaluated}, actioned ${itemsActioned}, retained ${itemsRetained}`,
      };
    } catch (err: any) {
      this.logger.error(`Retention processing failed for policy ${policy.id}: ${err.message}`);
      await this.prisma.privacyRetentionExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          itemsEvaluated,
          itemsActioned,
          itemsRetained,
          itemsFailed: itemsFailed + 1,
          errorSummary: err.message,
          completedAt: new Date(),
        },
      });

      return {
        executionId: execution.id,
        policyId: policy.id,
        category: policy.dataCategory,
        status: 'FAILED',
        itemsEvaluated,
        itemsActioned,
        itemsRetained,
        itemsFailed: itemsFailed + 1,
        summary: `Failure: ${err.message}`,
      };
    }
  }
}
