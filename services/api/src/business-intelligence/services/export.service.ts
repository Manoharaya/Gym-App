import { Injectable } from '@nestjs/common';
import { BusinessOverviewDto } from '@fitcore/types';

@Injectable()
export class BusinessExportService {
  /**
   * Generates sanitized RFC 4180 CSV export of executive BI metrics.
   */
  generateCsvExport(overview: BusinessOverviewDto): string {
    const rows: string[][] = [
      ['FITCORE UNIFIED BUSINESS INTELLIGENCE EXPORT'],
      ['Generated At', overview.generatedAt],
      ['Period Start', overview.period.start],
      ['Period End', overview.period.end],
      ['Timezone', overview.period.timezone],
      ['Scope Level', overview.scope.roleScope],
      ['Organisation ID', overview.scope.organisationId],
      ['Outlet ID', overview.scope.outletId || 'All Outlets'],
      ['Overall Business Health', overview.health.overallStatus],
      [''],
      ['EXECUTIVE KPIS'],
      ['Metric Key', 'Metric Label', 'Current Value', 'Previous Value', 'Difference', 'Change %', 'Direction', 'Unit', 'Quality'],
    ];

    for (const [key, kpi] of Object.entries(overview.kpis)) {
      rows.push([
        key,
        kpi.label,
        String(kpi.currentValue),
        kpi.previousValue !== undefined ? String(kpi.previousValue) : 'N/A',
        kpi.absoluteChange !== undefined ? String(kpi.absoluteChange) : 'N/A',
        kpi.percentageChange !== null && kpi.percentageChange !== undefined ? `${kpi.percentageChange}%` : 'N/A',
        kpi.direction,
        kpi.unit,
        kpi.dataQuality,
      ]);
    }

    rows.push(['']);
    rows.push(['MEMBERSHIP SUMMARY']);
    rows.push(['Active Members', String(overview.membership.activeMembers)]);
    rows.push(['New Members', String(overview.membership.newMembers)]);
    rows.push(['Reactivated Members', String(overview.membership.reactivatedMembers)]);
    rows.push(['Cancelled Members', String(overview.membership.cancelledMembers)]);
    rows.push(['Net Member Change', String(overview.membership.netMemberChange)]);
    rows.push(['Growth Rate', overview.membership.growthRate !== null ? `${overview.membership.growthRate}%` : 'N/A']);

    rows.push(['']);
    rows.push(['FINANCIAL SUMMARY']);
    for (const [curr, fin] of Object.entries(overview.finance.currencies)) {
      rows.push([`Currency`, curr]);
      rows.push(['Gross Revenue', `${curr} ${fin.grossRevenue.toFixed(2)}`]);
      rows.push(['Refunds', `${curr} ${fin.refunds.toFixed(2)}`]);
      rows.push(['Net Revenue', `${curr} ${fin.netRevenue.toFixed(2)}`]);
      rows.push(['Payment Success Rate', fin.paymentSuccessRate !== null ? `${fin.paymentSuccessRate}%` : 'N/A']);
      rows.push(['Outstanding Balance', `${curr} ${fin.outstandingBalance.toFixed(2)}`]);
      rows.push(['Overdue Invoices', String(fin.overdueInvoicesCount)]);
    }

    rows.push(['']);
    rows.push(['SALES FUNNEL']);
    overview.sales.funnel.forEach((f) => {
      rows.push([f.stage, String(f.count), f.conversionFromPrevious !== null ? `${f.conversionFromPrevious}%` : 'N/A']);
    });

    return rows.map((r) => r.map((c) => this.sanitizeCell(c)).join(',')).join('\r\n');
  }

  /**
   * Sanitizes cells against CSV injection and escapes quotes and commas.
   */
  private sanitizeCell(value: any): string {
    if (value === null || value === undefined) return '""';
    let str = String(value);

    // Defense against CSV formula injection
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }

    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }
}
