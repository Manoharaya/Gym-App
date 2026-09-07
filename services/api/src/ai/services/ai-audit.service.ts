import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AIAuditEventType, AIFeature } from '@fitcore/types';

export interface AuditEventOptions {
  organisationId: string;
  outletId?: string | null;
  userId: string;
  feature: AIFeature;
  requestId?: string | null;
  eventType: AIAuditEventType;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  metadata?: Record<string, any>;
}

@Injectable()
export class AIAuditService {
  private readonly logger = new Logger(AIAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an immutable AI audit event.
   * Strips any raw prompts or credentials before storing.
   */
  async recordAuditEvent(options: AuditEventOptions) {
    try {
      const sanitizedMetadata = this.sanitizeMetadata(options.metadata);

      return await this.prisma.aIAuditEvent.create({
        data: {
          organisationId: options.organisationId,
          outletId: options.outletId,
          userId: options.userId,
          feature: options.feature,
          requestId: options.requestId,
          eventType: options.eventType,
          result: options.result,
          metadata: sanitizedMetadata,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record AI audit event: ${err.message}`, err.stack);
    }
  }

  async listAuditEvents(organisationId: string, limit: number = 50) {
    return this.prisma.aIAuditEvent.findMany({
      where: { organisationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;
    const sanitized = { ...metadata };
    delete sanitized.prompt;
    delete sanitized.rawPrompt;
    delete sanitized.content;
    delete sanitized.apiKey;
    return sanitized;
  }
}
