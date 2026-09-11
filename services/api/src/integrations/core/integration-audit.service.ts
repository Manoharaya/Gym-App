/**
 * FitCore — Day 48: Integration Audit Service
 *
 * Implements strict security audit trails for integration lifecycle,
 * webhooks, sync operations, and credential rotations.
 *
 * Rule: Plaintext secrets are strictly filtered and NEVER audited.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IntegrationAuditAction } from '@fitcore/types';

@Injectable()
export class IntegrationAuditService {
  private readonly logger = new Logger(IntegrationAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    organisationId: string;
    connectionId?: string | null;
    userId?: string | null;
    action: IntegrationAuditAction;
    resource?: string;
    resourceId: string;
    status?: 'SUCCESS' | 'FAILED';
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      // Filter out any potential credential fields
      const sanitizedMetadata = this.sanitizeMetadata(params.metadata);

      await this.prisma.integrationAuditLog.create({
        data: {
          organisationId: params.organisationId === 'SYSTEM' ? null : params.organisationId,
          connectionId: params.connectionId,
          userId: params.userId,
          action: params.action,
          resource: params.resource || 'IntegrationConnection',
          resourceId: params.resourceId,
          status: params.status || 'SUCCESS',
          metadata: sanitizedMetadata,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record integration audit log: ${err.message}`);
    }
  }

  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;
    const clean: Record<string, any> = {};
    const secretKeys = ['password', 'secret', 'token', 'key', 'credential', 'auth', 'private'];

    for (const [key, val] of Object.entries(metadata)) {
      const lower = key.toLowerCase();
      if (secretKeys.some((s) => lower.includes(s))) {
        clean[key] = '[REDACTED]';
      } else if (typeof val === 'object' && val !== null) {
        clean[key] = this.sanitizeMetadata(val);
      } else {
        clean[key] = val;
      }
    }
    return clean;
  }
}
