import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { SALES_INTELLIGENCE_AUDIT_ACTIONS } from '../domain/sales-intelligence.constants';
import { SalesDrillDownOpportunityDto } from '@fitcore/types';

@Injectable()
export class SalesExportService {
  private readonly logger = new Logger(SalesExportService.name);

  constructor(private readonly auditService: AuditService) {}

  /**
   * Masks email address to prevent PII exposure in reports.
   * e.g. john.doe@example.com -> j***e@example.com
   */
  maskEmail(email?: string): string {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return '***';
    const name = parts[0];
    const maskedName = name.length > 2
      ? `${name[0]}***${name[name.length - 1]}`
      : `${name[0]}***`;
    return `${maskedName}@${parts[1]}`;
  }

  /**
   * Masks phone number to protect prospect privacy.
   * e.g. +61412345678 -> +61 *** *** 678
   */
  maskPhone(phone?: string): string {
    if (!phone) return '';
    if (phone.length <= 4) return '***';
    const visible = phone.slice(-4);
    return `***-***-${visible}`;
  }

  /**
   * Generates sanitized CSV string from opportunity drill-down records.
   */
  generateOpportunityCsv(
    opportunities: SalesDrillDownOpportunityDto[],
    maskPii: boolean = true,
  ): string {
    const headers = [
      'Opportunity ID',
      'Lead Name',
      'Lead Email',
      'Lead Phone',
      'Stage',
      'Owner Staff',
      'Outlet',
      'Estimated Value ($)',
      'Lead Source',
      'Created At',
      'Last Activity',
      'Converted At',
      'Lost At',
      'Loss Reason',
    ];

    const rows = opportunities.map((opp) => {
      const email = maskPii ? this.maskEmail(opp.leadEmail) : opp.leadEmail || '';
      const phone = maskPii ? this.maskPhone(opp.leadPhone) : opp.leadPhone || '';

      return [
        opp.id,
        this.escapeCsv(opp.leadName),
        this.escapeCsv(email),
        this.escapeCsv(phone),
        opp.currentStage,
        this.escapeCsv(opp.ownerStaffName || 'Unassigned'),
        this.escapeCsv(opp.outletName || ''),
        opp.estimatedValue.toFixed(2),
        opp.source || '',
        opp.createdAt,
        opp.lastActivityAt,
        opp.convertedAt || '',
        opp.lostAt || '',
        opp.lossReason || '',
      ];
    });

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Escapes fields with commas, quotes, or newlines according to RFC 4180.
   */
  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Emits audit log record for sales export event.
   */
  async logExport(params: {
    organisationId: string;
    outletId?: string;
    userId?: string;
    recordCount: number;
    exportFormat: string;
  }): Promise<void> {
    try {
      await this.auditService.log({
        action: SALES_INTELLIGENCE_AUDIT_ACTIONS.SALES_EXPORT_CREATED,
        resource: 'SalesExport',
        organisationId: params.organisationId !== 'all' ? params.organisationId : undefined,
        outletId: params.outletId,
        metadata: {
          recordCount: params.recordCount,
          exportFormat: params.exportFormat,
          requestedByUserId: params.userId,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to write export audit log: ${err.message}`);
    }
  }
}
