/**
 * FitCore — Day 43: Accounting Export Service
 *
 * Generates RFC 4180 CSV exports for manual accounting fallback and auditing.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ACCOUNTING_AUDIT_ACTIONS } from '../domain/accounting.constants';

@Injectable()
export class AccountingExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generates a sanitized RFC 4180 CSV export of financial records and external IDs.
   */
  async exportFinancialCsv(
    organisationId: string,
    startDate?: Date,
    endDate?: Date,
    userId?: string,
  ): Promise<string> {
    const where: any = { organisationId };
    if (startDate || endDate) {
      where.issuedAt = {};
      if (startDate) where.issuedAt.gte = startDate;
      if (endDate) where.issuedAt.lte = endDate;
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        memberProfile: { include: { user: true } },
        transactions: true,
      },
      orderBy: { issuedAt: 'desc' },
      take: 500,
    });

    const extRefs = await this.prisma.accountingExternalReference.findMany({
      where: { organisationId },
    });

    const extRefMap = new Map<string, string>();
    for (const ref of extRefs) {
      extRefMap.set(`${ref.entityType}:${ref.fitcoreEntityId}`, ref.externalEntityId);
    }

    const headers = [
      'InvoiceNumber',
      'IssueDate',
      'DueDate',
      'Status',
      'Currency',
      'Total',
      'AmountPaid',
      'AmountDue',
      'MemberName',
      'ExternalInvoiceId',
      'SyncStatus',
    ];

    const rows: string[] = [headers.join(',')];

    for (const inv of invoices) {
      const extId = extRefMap.get(`INVOICE:${inv.id}`) || '';
      const maskedName = inv.memberProfile?.user
        ? `${inv.memberProfile.user.firstName?.[0] || '*'}*** ${inv.memberProfile.user.lastName?.[0] || '*'}***`
        : 'Member';

      const row = [
        inv.invoiceNumber,
        inv.issuedAt.toISOString().split('T')[0],
        inv.dueDate.toISOString().split('T')[0],
        inv.status,
        inv.currency,
        (inv.totalMinor / 100).toFixed(2),
        (inv.amountPaidMinor / 100).toFixed(2),
        (inv.amountDueMinor / 100).toFixed(2),
        `"${maskedName}"`,
        extId,
        extId ? 'SYNCED' : 'UNSYNCED',
      ];
      rows.push(row.join(','));
    }

    await this.auditService.log({
      userId,
      organisationId,
      action: ACCOUNTING_AUDIT_ACTIONS.EXPORT_REQUESTED,
      resource: 'AccountingExport',
      metadata: { recordsExported: invoices.length },
    });

    return rows.join('\r\n');
  }
}
