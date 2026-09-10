/**
 * FitCore — Day 42: Overdue Invoice Scanner Background Job
 *
 * Identifies open invoices past their due date, flags them as OVERDUE,
 * and updates dunning or creates staff collection tasks if required.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OverdueInvoiceJob {
  private readonly logger = new Logger(OverdueInvoiceJob.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scans open invoices that have passed their due date and transitions them to OVERDUE.
   */
  async runOverdueInvoiceScan(
    organisationId: string,
    batchSize: number = 100,
  ): Promise<{ markedOverdueCount: number }> {
    const now = new Date();

    const openPastDueInvoices = await this.prisma.invoice.findMany({
      where: {
        organisationId,
        status: 'OPEN',
        dueDate: { lt: now },
      },
      take: batchSize,
    });

    if (openPastDueInvoices.length === 0) {
      return { markedOverdueCount: 0 };
    }

    const ids = openPastDueInvoices.map((i) => i.id);

    const updateResult = await this.prisma.invoice.updateMany({
      where: { id: { in: ids } },
      data: { status: 'OVERDUE' },
    });

    this.logger.log(
      `[Job:OverdueInvoice] Marked ${updateResult.count} invoices as OVERDUE for org '${organisationId}'.`,
    );

    return { markedOverdueCount: updateResult.count };
  }
}
