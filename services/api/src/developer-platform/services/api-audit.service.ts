/**
 * FitCore — Day 49: Developer Platform Audit Logging Service
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DeveloperAuditAction, DeveloperAuditLogDto } from '@fitcore/types';

@Injectable()
export class ApiAuditService {
  private readonly logger = new Logger(ApiAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an audit entry with sensitive field redaction
   */
  async log(params: {
    organisationId?: string | null;
    applicationId?: string | null;
    userId?: string | null;
    action: DeveloperAuditAction;
    resource: string;
    resourceId: string;
    status?: 'SUCCESS' | 'FAILED';
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const sanitizedMeta = this.redactSecrets(params.metadata || {});

      await this.prisma.developerAuditLog.create({
        data: {
          organisationId: params.organisationId,
          applicationId: params.applicationId,
          userId: params.userId,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          status: params.status || 'SUCCESS',
          metadata: sanitizedMeta as any,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to write developer audit log: ${err.message}`, err.stack);
    }
  }

  async listLogs(params: {
    organisationId?: string;
    applicationId?: string;
    limit?: number;
  }): Promise<DeveloperAuditLogDto[]> {
    const where: any = {};
    if (params.organisationId) where.organisationId = params.organisationId;
    if (params.applicationId) where.applicationId = params.applicationId;

    const logs = await this.prisma.developerAuditLog.findMany({
      where,
      take: params.limit || 50,
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((l) => ({
      id: l.id,
      organisationId: l.organisationId,
      applicationId: l.applicationId,
      userId: l.userId,
      action: l.action as DeveloperAuditAction,
      resource: l.resource,
      resourceId: l.resourceId,
      status: l.status as any,
      metadata: l.metadata as any,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  private redactSecrets(obj: Record<string, any>): Record<string, any> {
    const sensitiveKeys = [
      'key',
      'plainKey',
      'secret',
      'clientSecret',
      'webhookSecret',
      'password',
      'token',
      'accessToken',
      'refreshToken',
    ];
    const redacted: Record<string, any> = {};

    for (const [k, v] of Object.entries(obj)) {
      if (sensitiveKeys.some((s) => k.toLowerCase().includes(s.toLowerCase()))) {
        redacted[k] = '[REDACTED]';
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        redacted[k] = this.redactSecrets(v);
      } else {
        redacted[k] = v;
      }
    }

    return redacted;
  }
}
