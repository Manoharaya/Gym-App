import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { FinancialAnalyticsService } from './financial-analytics.service';
import { ResolvedFinancialScope } from '../domain/financial-intelligence.permissions';
import { FinancialFilterDto } from '../dto/financial-filter.dto';
import { FINANCIAL_AUDIT_ACTIONS } from '../domain/financial-intelligence.constants';

@Injectable()
export class FinancialExportService {
  private readonly logger = new Logger(FinancialExportService.name);

  constructor(
    private readonly analyticsService: FinancialAnalyticsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generates sanitized CSV export for transactions with PII masking and audit logging.
   */
  async exportTransactionsCsv(
    scope: ResolvedFinancialScope,
    filters: FinancialFilterDto,
    userId?: string,
  ): Promise<string> {
    const { data: rows } = await this.analyticsService.getTransactionsDrillDown(scope, {
      ...filters,
      limit: 1000,
    });

    const headers = [
      'Transaction ID',
      'Date',
      'Amount',
      'Currency',
      'Status',
      'Type',
      'Payment Method',
      'Customer Email',
      'Invoice Number',
      'Plan Name',
      'Outlet',
      'Source',
    ];

    const lines = [headers.join(',')];

    for (const r of rows) {
      const maskedEmail = this.maskEmail(r.memberEmail);

      const row = [
        this.escapeCsv(r.id),
        this.escapeCsv(r.transactionDate),
        r.amount.toFixed(2),
        this.escapeCsv(r.currency),
        this.escapeCsv(r.status),
        this.escapeCsv(r.type),
        this.escapeCsv(r.paymentMethodType),
        this.escapeCsv(maskedEmail),
        this.escapeCsv(r.invoiceNumber || ''),
        this.escapeCsv(r.planName || ''),
        this.escapeCsv(r.outletName || 'Unattributed'),
        this.escapeCsv(r.source),
      ];
      lines.push(row.join(','));
    }

    // Audit Logging
    await this.auditService.log({
      organisationId: scope.organisationId,
      outletId: scope.outletId,
      userId,
      action: FINANCIAL_AUDIT_ACTIONS.EXPORT_CREATED,
      resource: 'financial_transactions',
      metadata: {
        rowCount: rows.length,
        timeRange: filters.timeRange,
        currency: filters.currency,
      },
    });

    return lines.join('\n');
  }

  private maskEmail(email?: string): string {
    if (!email || !email.includes('@')) return '***@example.com';
    const [name, domain] = email.split('@');
    if (name.length <= 2) return `${name[0]}***@${domain}`;
    return `${name[0]}***${name[name.length - 1]}@${domain}`;
  }

  private escapeCsv(val?: string | null): string {
    if (!val) return '';
    const clean = String(val).replace(/"/g, '""');
    if (clean.includes(',') || clean.includes('\n') || clean.includes('"')) {
      return `"${clean}"`;
    }
    return clean;
  }
}
