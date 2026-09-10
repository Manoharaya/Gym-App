/**
 * FitCore — Day 42: Dunning Step Scheduler Background Job
 *
 * Scans pending dunning steps that have reached their scheduled execution time.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BillingCommunicationService } from '../services/billing-communication.service';

@Injectable()
export class DunningStepJob {
  private readonly logger = new Logger(DunningStepJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: BillingCommunicationService,
  ) {}

  /**
   * Processes pending dunning steps whose scheduledAt timestamp has elapsed.
   */
  async runDunningStepTick(batchSize: number = 50): Promise<{ processedCount: number }> {
    const now = new Date();

    const pendingSteps = await this.prisma.dunningStep.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: now },
      },
      include: {
        dunningCase: {
          include: {
            billingCycle: true,
          },
        },
      },
      take: batchSize,
    });

    let processedCount = 0;

    for (const step of pendingSteps) {
      const dCase = step.dunningCase;
      if (!dCase || dCase.status === 'RESOLVED' || dCase.status === 'PAYMENT_RECOVERED') {
        await this.prisma.dunningStep.update({
          where: { id: step.id },
          data: { status: 'SKIPPED' },
        });
        continue;
      }

      try {
        if (step.actionType === 'EMAIL_REMINDER' || step.actionType === 'SMS_REMINDER') {
          await this.communicationService.sendPaymentFailedReminder(
            dCase.organisationId,
            dCase.memberProfileId,
            dCase.invoiceId,
            dCase.billingCycle.amountMinor,
            dCase.billingCycle.currency,
            dCase.nextActionAt,
            dCase.status === 'CUSTOMER_ACTION_REQUIRED',
          );
        }

        await this.prisma.dunningStep.update({
          where: { id: step.id },
          data: {
            status: 'EXECUTED',
            executedAt: new Date(),
          },
        });

        processedCount++;
      } catch (err: any) {
        this.logger.error(`[Job:DunningStep] Failed executing step ${step.id}: ${err.message}`);
        await this.prisma.dunningStep.update({
          where: { id: step.id },
          data: { status: 'FAILED' },
        });
      }
    }

    return { processedCount };
  }
}
