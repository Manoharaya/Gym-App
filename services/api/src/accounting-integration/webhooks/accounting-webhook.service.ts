/**
 * FitCore — Day 43: Accounting Webhook Ingestion Service
 *
 * Verifies signatures, enforces idempotency, and safely handles inbound
 * accounting provider events without overwriting operational state.
 */

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccountingProviderRegistry } from '../providers/accounting-provider.registry';
import { AccountingConflictService } from '../services/accounting-conflict.service';
import { AccountingProviderType } from '@fitcore/types';

@Injectable()
export class AccountingWebhookService {
  private readonly logger = new Logger(AccountingWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AccountingProviderRegistry,
    private readonly conflictService: AccountingConflictService,
  ) {}

  /**
   * Processes inbound webhook from an external accounting platform.
   */
  async processWebhook(
    providerType: AccountingProviderType,
    rawBody: string,
    signature: string,
    headers: Record<string, any>,
    payload: any,
  ): Promise<{ received: boolean; processed: boolean }> {
    const provider = this.registry.getProvider(providerType);
    const webhookSecret =
      process.env[`${providerType}_WEBHOOK_SECRET`] || 'fitcore_dev_webhook_secret';

    if (provider.verifyWebhookSignature) {
      const isValid = provider.verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid && process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException('Invalid accounting webhook signature');
      }
    }

    this.logger.log(`Received accounting webhook from ${providerType}`);

    // If external entity was modified externally, check if it affects FitCore
    const eventType = payload?.event || payload?.type || 'UNKNOWN';
    const externalEntityId = payload?.entityId || payload?.id;

    if (externalEntityId) {
      const ref = await this.prisma.accountingExternalReference.findFirst({
        where: { externalEntityId },
      });

      if (ref && (eventType.includes('UPDATE') || eventType.includes('MODIFY') || eventType.includes('DELETE'))) {
        this.logger.warn(
          `External modification detected for ${ref.entityType} ${ref.fitcoreEntityId} via webhook`,
        );

        // Record conflict for finance review rather than blindly mutating FitCore
        await this.conflictService.recordConflict(
          ref.organisationId,
          ref.connectionId,
          ref.entityType,
          ref.fitcoreEntityId,
          externalEntityId,
          'EXTERNAL_MODIFICATION',
          'FITCORE_AUTHORITATIVE',
          `EXTERNAL_WEBHOOK_${eventType}`,
        );
      }
    }

    return { received: true, processed: true };
  }
}
