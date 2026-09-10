/**
 * FitCore — Day 43: Accounting Synchronization Service
 *
 * Coordinates asynchronous and on-demand synchronization of contacts,
 * invoices, payments, and refunds to external accounting platforms.
 * Enforces strict idempotency and distributed locking.
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { RedisService } from '../../redis/redis.service';
import { AccountingConnectionService } from './accounting-connection.service';
import { AccountingNormalizerService } from './accounting-normalizer.service';
import { AccountingErrorNormalizer } from '../domain/accounting-errors';
import {
  AccountingSyncJobDto,
  AccountingSyncRecordDto,
  AccountingSyncType,
  AccountingSyncPreviewDto,
} from '@fitcore/types';
import {
  ACCOUNTING_DEFAULTS,
  ACCOUNTING_AUDIT_ACTIONS,
} from '../domain/accounting.constants';

@Injectable()
export class AccountingSyncService {
  private readonly logger = new Logger(AccountingSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly redisService: RedisService,
    private readonly connectionService: AccountingConnectionService,
    private readonly normalizer: AccountingNormalizerService,
  ) {}

  /**
   * Previews pending entities prior to initial or full sync.
   */
  async getSyncPreview(organisationId: string): Promise<AccountingSyncPreviewDto> {
    const invoicesCount = await this.prisma.invoice.count({
      where: { organisationId, status: { in: ['OPEN', 'PAID', 'PARTIALLY_PAID', 'OVERDUE'] } },
    });

    const paymentsCount = await this.prisma.paymentTransaction.count({
      where: { organisationId, status: 'SUCCEEDED' },
    });

    const refundsCount = await this.prisma.paymentRefund.count({
      where: { organisationId, status: 'SUCCEEDED' },
    });

    const contactsCount = await this.prisma.memberProfile.count({
      where: { organisationId, status: 'ACTIVE' },
    });

    const mappingsCount = await this.prisma.accountingMapping.count({
      where: { organisationId, status: 'ACTIVE' },
    });

    const warnings: string[] = [];
    if (mappingsCount === 0) {
      warnings.push('No active revenue or payment account mappings configured');
    }

    return {
      organisationId,
      pendingInvoices: invoicesCount,
      pendingPayments: paymentsCount,
      pendingRefunds: refundsCount,
      pendingContacts: contactsCount,
      totalEntitiesToSync: invoicesCount + paymentsCount + refundsCount + contactsCount,
      missingMappingsCount: mappingsCount === 0 ? 1 : 0,
      hasRequiredMappings: mappingsCount > 0,
      warnings,
    };
  }

  /**
   * Triggers a synchronization job with distributed locking.
   */
  async triggerSync(
    organisationId: string,
    syncType: AccountingSyncType = 'INCREMENTAL_SYNC',
    triggeredBy?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AccountingSyncJobDto> {
    const lockKey = `accounting:sync:lock:${organisationId}`;
    const acquired = await this.redisService.get(lockKey);

    if (acquired) {
      throw new BadRequestException('A synchronization job is already running for this organisation.');
    }

    // Acquire lock for 5 minutes
    await this.redisService.set(lockKey, 'locked', ACCOUNTING_DEFAULTS.SYNC_LOCK_TTL_SECONDS);

    try {
      const { connection, provider, accessToken } =
        await this.connectionService.getValidAccessToken(organisationId);

      const job = await this.prisma.accountingSyncJob.create({
        data: {
          organisationId,
          connectionId: connection.id,
          syncType,
          status: 'RUNNING',
          startedAt: new Date(),
          triggeredBy: triggeredBy || 'SYSTEM',
        },
      });

      // Execute sync asynchronously or inline for bounded batch
      const result = await this.executeSyncJob(
        job.id,
        organisationId,
        connection.id,
        connection.externalOrganisationId || '',
        provider,
        accessToken,
        syncType,
        startDate,
        endDate,
      );

      await this.auditService.log({
        userId: triggeredBy?.startsWith('STAFF_') ? triggeredBy.replace('STAFF_', '') : undefined,
        organisationId,
        action: ACCOUNTING_AUDIT_ACTIONS.SYNC_TRIGGERED,
        resource: 'AccountingSyncJob',
        resourceId: job.id,
        metadata: { syncType, status: result.status },
      });

      return result;
    } finally {
      await this.redisService.del(lockKey);
    }
  }

  /**
   * Internal execution of a sync job.
   */
  private async executeSyncJob(
    jobId: string,
    organisationId: string,
    connectionId: string,
    externalOrgId: string,
    provider: any,
    accessToken: string,
    syncType: AccountingSyncType,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AccountingSyncJobDto> {
    let recordsProcessed = 0;
    let recordsSucceeded = 0;
    let recordsFailed = 0;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    try {
      // 1. Invoices
      const invoiceWhere: any = {
        organisationId,
        status: { in: ['OPEN', 'PAID', 'PARTIALLY_PAID', 'OVERDUE'] },
      };
      if (startDate || endDate) invoiceWhere.issuedAt = dateFilter;

      const invoices = await this.prisma.invoice.findMany({
        where: invoiceWhere,
        take: ACCOUNTING_DEFAULTS.BATCH_SIZE,
        orderBy: { issuedAt: 'asc' },
      });

      for (const inv of invoices) {
        recordsProcessed++;
        try {
          await this.syncSingleInvoice(
            inv.id,
            organisationId,
            connectionId,
            externalOrgId,
            provider,
            accessToken,
            jobId,
          );
          recordsSucceeded++;
        } catch (err: any) {
          recordsFailed++;
          this.logger.error(`Sync failed for invoice ${inv.id}: ${err.message}`);
        }
      }

      // 2. Payments
      const paymentWhere: any = { organisationId, status: 'SUCCEEDED' };
      if (startDate || endDate) paymentWhere.processedAt = dateFilter;

      const payments = await this.prisma.paymentTransaction.findMany({
        where: paymentWhere,
        take: ACCOUNTING_DEFAULTS.BATCH_SIZE,
        orderBy: { processedAt: 'asc' },
      });

      for (const p of payments) {
        recordsProcessed++;
        try {
          await this.syncSinglePayment(
            p.id,
            organisationId,
            connectionId,
            externalOrgId,
            provider,
            accessToken,
            jobId,
          );
          recordsSucceeded++;
        } catch (err: any) {
          recordsFailed++;
          this.logger.error(`Sync failed for payment ${p.id}: ${err.message}`);
        }
      }

      const finalStatus =
        recordsFailed === 0
          ? 'COMPLETED'
          : recordsSucceeded > 0
          ? 'PARTIAL'
          : 'FAILED';

      const updatedJob = await this.prisma.accountingSyncJob.update({
        where: { id: jobId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          recordsProcessed,
          recordsSucceeded,
          recordsFailed,
          errorCount: recordsFailed,
        },
      });

      // Update connection sync timestamps
      await this.prisma.accountingConnection.update({
        where: { id: connectionId },
        data: {
          lastSuccessfulSyncAt: recordsSucceeded > 0 ? new Date() : undefined,
          lastFailedSyncAt: recordsFailed > 0 ? new Date() : undefined,
        },
      });

      return this.mapJobToDto(updatedJob);
    } catch (err: any) {
      const failedJob = await this.prisma.accountingSyncJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: err.message,
          errorCount: recordsFailed + 1,
        },
      });
      return this.mapJobToDto(failedJob);
    }
  }

  /**
   * Synchronizes a single invoice idempotently.
   */
  async syncSingleInvoice(
    invoiceId: string,
    organisationId: string,
    connectionId: string,
    externalOrgId: string,
    provider: any,
    accessToken: string,
    jobId?: string,
  ): Promise<AccountingSyncRecordDto> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organisationId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice '${invoiceId}' not found`);
    }

    // 1. Ensure customer is synced first
    const customerExt = await this.ensureCustomerSynced(
      invoice.memberProfileId,
      organisationId,
      connectionId,
      externalOrgId,
      provider,
      accessToken,
    );

    // 2. Check existing reference
    const existingRef = await this.prisma.accountingExternalReference.findUnique({
      where: {
        connectionId_entityType_fitcoreEntityId: {
          connectionId,
          entityType: 'INVOICE',
          fitcoreEntityId: invoiceId,
        },
      },
    });

    const externalPayload = await this.normalizer.normalizeInvoice(
      organisationId,
      invoiceId,
      customerExt.externalEntityId,
    );

    try {
      const syncResult = await provider.syncInvoice(
        accessToken,
        externalOrgId,
        externalPayload,
        existingRef?.externalEntityId,
      );

      // Save or update reference
      await this.prisma.accountingExternalReference.upsert({
        where: {
          connectionId_entityType_fitcoreEntityId: {
            connectionId,
            entityType: 'INVOICE',
            fitcoreEntityId: invoiceId,
          },
        },
        create: {
          organisationId,
          connectionId,
          entityType: 'INVOICE',
          fitcoreEntityId: invoiceId,
          externalEntityId: syncResult.externalId,
          externalVersion: syncResult.externalVersion,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          metadata: syncResult.metadata,
        },
        update: {
          externalEntityId: syncResult.externalId,
          externalVersion: syncResult.externalVersion,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          metadata: syncResult.metadata,
        },
      });

      // Record sync attempt
      const record = await this.prisma.accountingSyncRecord.create({
        data: {
          syncJobId: jobId || (await this.getOrCreateDefaultJob(organisationId, connectionId)),
          organisationId,
          entityType: 'INVOICE',
          fitcoreEntityId: invoiceId,
          externalEntityId: syncResult.externalId,
          operation: existingRef ? 'UPDATE' : 'CREATE',
          status: 'SYNCED',
          completedAt: new Date(),
        },
      });

      return this.mapRecordToDto(record);
    } catch (err: any) {
      const normalized = AccountingErrorNormalizer.normalize(err);
      const record = await this.prisma.accountingSyncRecord.create({
        data: {
          syncJobId: jobId || (await this.getOrCreateDefaultJob(organisationId, connectionId)),
          organisationId,
          entityType: 'INVOICE',
          fitcoreEntityId: invoiceId,
          operation: existingRef ? 'UPDATE' : 'CREATE',
          status: normalized.isRetryable ? 'RETRYING' : 'FAILED',
          errorCategory: normalized.code,
          errorMessage: normalized.message,
        },
      });
      throw err;
    }
  }

  /**
   * Synchronizes a single payment transaction.
   */
  async syncSinglePayment(
    paymentId: string,
    organisationId: string,
    connectionId: string,
    externalOrgId: string,
    provider: any,
    accessToken: string,
    jobId?: string,
  ): Promise<AccountingSyncRecordDto> {
    const payment = await this.prisma.paymentTransaction.findFirst({
      where: { id: paymentId, organisationId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment '${paymentId}' not found`);
    }

    if (!payment.invoiceId) {
      this.logger.warn(`Payment ${paymentId} has no linked invoice; skipping direct accounting payment sync.`);
      const record = await this.prisma.accountingSyncRecord.create({
        data: {
          syncJobId: jobId || (await this.getOrCreateDefaultJob(organisationId, connectionId)),
          organisationId,
          entityType: 'PAYMENT',
          fitcoreEntityId: paymentId,
          operation: 'SKIP',
          status: 'SKIPPED',
          errorMessage: 'No linked invoice found',
        },
      });
      return this.mapRecordToDto(record);
    }

    // 1. Ensure linked invoice is synced
    let invoiceExt = await this.prisma.accountingExternalReference.findUnique({
      where: {
        connectionId_entityType_fitcoreEntityId: {
          connectionId,
          entityType: 'INVOICE',
          fitcoreEntityId: payment.invoiceId,
        },
      },
    });

    if (!invoiceExt) {
      await this.syncSingleInvoice(
        payment.invoiceId,
        organisationId,
        connectionId,
        externalOrgId,
        provider,
        accessToken,
        jobId,
      );
      invoiceExt = await this.prisma.accountingExternalReference.findUnique({
        where: {
          connectionId_entityType_fitcoreEntityId: {
            connectionId,
            entityType: 'INVOICE',
            fitcoreEntityId: payment.invoiceId,
          },
        },
      });
    }

    // 2. Ensure customer is synced
    const customerExt = await this.ensureCustomerSynced(
      payment.memberProfileId,
      organisationId,
      connectionId,
      externalOrgId,
      provider,
      accessToken,
    );

    const existingRef = await this.prisma.accountingExternalReference.findUnique({
      where: {
        connectionId_entityType_fitcoreEntityId: {
          connectionId,
          entityType: 'PAYMENT',
          fitcoreEntityId: paymentId,
        },
      },
    });

    const paymentPayload = await this.normalizer.normalizePayment(
      organisationId,
      paymentId,
      invoiceExt?.externalEntityId || 'ext_inv_fallback',
      customerExt.externalEntityId,
    );

    try {
      const syncResult = await provider.syncPayment(
        accessToken,
        externalOrgId,
        paymentPayload,
        existingRef?.externalEntityId,
      );

      await this.prisma.accountingExternalReference.upsert({
        where: {
          connectionId_entityType_fitcoreEntityId: {
            connectionId,
            entityType: 'PAYMENT',
            fitcoreEntityId: paymentId,
          },
        },
        create: {
          organisationId,
          connectionId,
          entityType: 'PAYMENT',
          fitcoreEntityId: paymentId,
          externalEntityId: syncResult.externalId,
          externalVersion: syncResult.externalVersion,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          metadata: syncResult.metadata,
        },
        update: {
          externalEntityId: syncResult.externalId,
          externalVersion: syncResult.externalVersion,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          metadata: syncResult.metadata,
        },
      });

      const record = await this.prisma.accountingSyncRecord.create({
        data: {
          syncJobId: jobId || (await this.getOrCreateDefaultJob(organisationId, connectionId)),
          organisationId,
          entityType: 'PAYMENT',
          fitcoreEntityId: paymentId,
          externalEntityId: syncResult.externalId,
          operation: existingRef ? 'UPDATE' : 'CREATE',
          status: 'SYNCED',
          completedAt: new Date(),
        },
      });

      return this.mapRecordToDto(record);
    } catch (err: any) {
      const normalized = AccountingErrorNormalizer.normalize(err);
      const record = await this.prisma.accountingSyncRecord.create({
        data: {
          syncJobId: jobId || (await this.getOrCreateDefaultJob(organisationId, connectionId)),
          organisationId,
          entityType: 'PAYMENT',
          fitcoreEntityId: paymentId,
          operation: existingRef ? 'UPDATE' : 'CREATE',
          status: normalized.isRetryable ? 'RETRYING' : 'FAILED',
          errorCategory: normalized.code,
          errorMessage: normalized.message,
        },
      });
      throw err;
    }
  }

  /**
   * Synchronizes a single refund.
   */
  async syncSingleRefund(
    refundId: string,
    organisationId: string,
    connectionId: string,
    externalOrgId: string,
    provider: any,
    accessToken: string,
    jobId?: string,
  ): Promise<AccountingSyncRecordDto> {
    const refund = await this.prisma.paymentRefund.findFirst({
      where: { id: refundId, organisationId },
      include: { paymentTransaction: true },
    });

    if (!refund) {
      throw new NotFoundException(`Refund '${refundId}' not found`);
    }

    const tx = refund.paymentTransaction;
    if (!tx || !tx.invoiceId) {
      throw new BadRequestException('Refund has no linked invoice');
    }

    const customerExt = await this.ensureCustomerSynced(
      tx.memberProfileId,
      organisationId,
      connectionId,
      externalOrgId,
      provider,
      accessToken,
    );

    const invoiceExt = await this.prisma.accountingExternalReference.findUnique({
      where: {
        connectionId_entityType_fitcoreEntityId: {
          connectionId,
          entityType: 'INVOICE',
          fitcoreEntityId: tx.invoiceId,
        },
      },
    });

    const refundPayload = await this.normalizer.normalizeRefund(
      organisationId,
      refundId,
      invoiceExt?.externalEntityId || 'ext_inv_fallback',
      customerExt.externalEntityId,
    );

    const syncResult = await provider.syncRefund(
      accessToken,
      externalOrgId,
      refundPayload,
    );

    await this.prisma.accountingExternalReference.upsert({
      where: {
        connectionId_entityType_fitcoreEntityId: {
          connectionId,
          entityType: 'REFUND',
          fitcoreEntityId: refundId,
        },
      },
      create: {
        organisationId,
        connectionId,
        entityType: 'REFUND',
        fitcoreEntityId: refundId,
        externalEntityId: syncResult.externalId,
        syncStatus: 'SYNCED',
      },
      update: {
        externalEntityId: syncResult.externalId,
        syncStatus: 'SYNCED',
        lastSyncedAt: new Date(),
      },
    });

    const record = await this.prisma.accountingSyncRecord.create({
      data: {
        syncJobId: jobId || (await this.getOrCreateDefaultJob(organisationId, connectionId)),
        organisationId,
        entityType: 'REFUND',
        fitcoreEntityId: refundId,
        externalEntityId: syncResult.externalId,
        operation: 'CREATE',
        status: 'SYNCED',
        completedAt: new Date(),
      },
    });

    return this.mapRecordToDto(record);
  }

  /**
   * Helper: ensures a customer contact is synchronized to the external provider.
   */
  private async ensureCustomerSynced(
    memberProfileId: string,
    organisationId: string,
    connectionId: string,
    externalOrgId: string,
    provider: any,
    accessToken: string,
  ): Promise<{ externalEntityId: string }> {
    const existing = await this.prisma.accountingExternalReference.findUnique({
      where: {
        connectionId_entityType_fitcoreEntityId: {
          connectionId,
          entityType: 'CONTACT',
          fitcoreEntityId: memberProfileId,
        },
      },
    });

    if (existing) {
      return { externalEntityId: existing.externalEntityId };
    }

    const payload = await this.normalizer.normalizeCustomer(organisationId, memberProfileId);
    const syncRes = await provider.syncCustomer(accessToken, externalOrgId, payload);

    await this.prisma.accountingExternalReference.create({
      data: {
        organisationId,
        connectionId,
        entityType: 'CONTACT',
        fitcoreEntityId: memberProfileId,
        externalEntityId: syncRes.externalId,
        externalVersion: syncRes.externalVersion,
        syncStatus: 'SYNCED',
      },
    });

    return { externalEntityId: syncRes.externalId };
  }

  /**
   * Lists sync jobs for an organisation.
   */
  async listSyncJobs(organisationId: string, limit = 20): Promise<AccountingSyncJobDto[]> {
    const jobs = await this.prisma.accountingSyncJob.findMany({
      where: { organisationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return jobs.map((j) => this.mapJobToDto(j));
  }

  /**
   * Retrieves single sync job by ID.
   */
  async getSyncJobById(organisationId: string, id: string): Promise<AccountingSyncJobDto> {
    const job = await this.prisma.accountingSyncJob.findFirst({
      where: { id, organisationId },
    });
    if (!job) throw new NotFoundException(`Sync job '${id}' not found`);
    return this.mapJobToDto(job);
  }

  /**
   * Lists sync records for an organisation.
   */
  async listSyncRecords(organisationId: string, limit = 50): Promise<AccountingSyncRecordDto[]> {
    const records = await this.prisma.accountingSyncRecord.findMany({
      where: { organisationId },
      orderBy: { lastAttemptedAt: 'desc' },
      take: limit,
    });
    return records.map((r) => this.mapRecordToDto(r));
  }

  private async getOrCreateDefaultJob(organisationId: string, connectionId: string): Promise<string> {
    const job = await this.prisma.accountingSyncJob.create({
      data: {
        organisationId,
        connectionId,
        syncType: 'INCREMENTAL_SYNC',
        status: 'COMPLETED',
        startedAt: new Date(),
        completedAt: new Date(),
        recordsProcessed: 1,
        recordsSucceeded: 1,
      },
    });
    return job.id;
  }

  private mapJobToDto(j: any): AccountingSyncJobDto {
    return {
      id: j.id,
      organisationId: j.organisationId,
      connectionId: j.connectionId,
      syncType: j.syncType,
      status: j.status,
      startedAt: j.startedAt?.toISOString() || null,
      completedAt: j.completedAt?.toISOString() || null,
      recordsProcessed: j.recordsProcessed,
      recordsSucceeded: j.recordsSucceeded,
      recordsFailed: j.recordsFailed,
      errorCount: j.errorCount,
      errorMessage: j.errorMessage,
      triggeredBy: j.triggeredBy,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
    };
  }

  private mapRecordToDto(r: any): AccountingSyncRecordDto {
    return {
      id: r.id,
      syncJobId: r.syncJobId,
      organisationId: r.organisationId,
      entityType: r.entityType,
      fitcoreEntityId: r.fitcoreEntityId,
      externalEntityId: r.externalEntityId,
      operation: r.operation as any,
      status: r.status as any,
      attemptCount: r.attemptCount,
      errorCategory: r.errorCategory,
      errorMessage: r.errorMessage,
      lastAttemptedAt: r.lastAttemptedAt.toISOString(),
      completedAt: r.completedAt?.toISOString() || null,
    };
  }
}
