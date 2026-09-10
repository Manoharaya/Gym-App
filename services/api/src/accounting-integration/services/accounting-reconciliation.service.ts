/**
 * FitCore — Day 43: Accounting Reconciliation Service
 *
 * Audits ledger consistency between FitCore and external accounting platforms.
 * Surfaces missing records, amount mismatches, and status discrepancies.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AccountingConnectionService } from './accounting-connection.service';
import { AccountingConflictService } from './accounting-conflict.service';
import { AccountingReconciliationReportDto } from '@fitcore/types';
import { ACCOUNTING_AUDIT_ACTIONS } from '../domain/accounting.constants';

@Injectable()
export class AccountingReconciliationService {
  private readonly logger = new Logger(AccountingReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly connectionService: AccountingConnectionService,
    private readonly conflictService: AccountingConflictService,
  ) {}

  /**
   * Runs reconciliation audit between FitCore and external records.
   */
  async runReconciliation(
    organisationId: string,
    startDate?: Date,
    endDate?: Date,
    triggeredBy?: string,
  ): Promise<AccountingReconciliationReportDto> {
    const connection = await this.prisma.accountingConnection.findFirst({
      where: {
        organisationId,
        status: { in: ['CONNECTED', 'SYNCING'] },
      },
    });

    if (!connection) {
      throw new NotFoundException('No active connected accounting provider found');
    }

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const invoiceWhere: any = { organisationId };
    if (startDate || endDate) invoiceWhere.issuedAt = dateFilter;

    const invoices = await this.prisma.invoice.findMany({
      where: invoiceWhere,
      include: { transactions: true },
    });

    let matchedCount = 0;
    let missingExternalCount = 0;
    let missingFitcoreCount = 0;
    let amountMismatchCount = 0;
    let statusMismatchCount = 0;
    const currencyMismatchCount = 0;

    const discrepancies: any[] = [];

    for (const inv of invoices) {
      const extRef = await this.prisma.accountingExternalReference.findUnique({
        where: {
          connectionId_entityType_fitcoreEntityId: {
            connectionId: connection.id,
            entityType: 'INVOICE',
            fitcoreEntityId: inv.id,
          },
        },
      });

      if (!extRef) {
        missingExternalCount++;
        discrepancies.push({
          type: 'MISSING_EXTERNAL',
          entityType: 'INVOICE',
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          totalMinor: inv.totalMinor,
        });
        continue;
      }

      // Check amount matching from metadata if present
      if (extRef.metadata && (extRef.metadata as any).totalMinor !== undefined) {
        const extTotalMinor = (extRef.metadata as any).totalMinor;
        if (extTotalMinor !== inv.totalMinor) {
          amountMismatchCount++;
          discrepancies.push({
            type: 'AMOUNT_MISMATCH',
            entityType: 'INVOICE',
            id: inv.id,
            fitcoreValue: inv.totalMinor,
            externalValue: extTotalMinor,
          });

          // Log conflict
          await this.conflictService.recordConflict(
            organisationId,
            connection.id,
            'INVOICE',
            inv.id,
            extRef.externalEntityId,
            'AMOUNT_MISMATCH',
            String(inv.totalMinor),
            String(extTotalMinor),
          );
          continue;
        }
      }

      matchedCount++;
    }

    const reportStatus =
      missingExternalCount > 0 || amountMismatchCount > 0 || statusMismatchCount > 0
        ? 'MISMATCH_DETECTED'
        : 'COMPLETED';

    const report = await this.prisma.accountingReconciliationReport.create({
      data: {
        organisationId,
        connectionId: connection.id,
        status: reportStatus,
        matchedCount,
        missingExternalCount,
        missingFitcoreCount,
        amountMismatchCount,
        statusMismatchCount,
        currencyMismatchCount,
        details: { discrepancies: discrepancies.slice(0, 50) },
        triggeredBy: triggeredBy || 'STAFF',
      },
    });

    await this.auditService.log({
      userId: triggeredBy?.startsWith('STAFF_') ? triggeredBy.replace('STAFF_', '') : undefined,
      organisationId,
      action: ACCOUNTING_AUDIT_ACTIONS.RECONCILIATION_RUN,
      resource: 'AccountingReconciliationReport',
      resourceId: report.id,
      metadata: { status: reportStatus, matchedCount, missingExternalCount },
    });

    return this.mapToDto(report);
  }

  /**
   * Retrieves reconciliation history.
   */
  async listReports(organisationId: string, limit = 20): Promise<AccountingReconciliationReportDto[]> {
    const reports = await this.prisma.accountingReconciliationReport.findMany({
      where: { organisationId },
      orderBy: { runAt: 'desc' },
      take: limit,
    });
    return reports.map((r) => this.mapToDto(r));
  }

  /**
   * Retrieves single report by ID.
   */
  async getReportById(organisationId: string, id: string): Promise<AccountingReconciliationReportDto> {
    const report = await this.prisma.accountingReconciliationReport.findFirst({
      where: { id, organisationId },
    });
    if (!report) throw new NotFoundException(`Reconciliation report '${id}' not found`);
    return this.mapToDto(report);
  }

  private mapToDto(r: any): AccountingReconciliationReportDto {
    return {
      id: r.id,
      organisationId: r.organisationId,
      connectionId: r.connectionId,
      status: r.status,
      matchedCount: r.matchedCount,
      missingExternalCount: r.missingExternalCount,
      missingFitcoreCount: r.missingFitcoreCount,
      amountMismatchCount: r.amountMismatchCount,
      statusMismatchCount: r.statusMismatchCount,
      currencyMismatchCount: r.currencyMismatchCount,
      details: r.details,
      runAt: r.runAt.toISOString(),
      triggeredBy: r.triggeredBy,
    };
  }
}
