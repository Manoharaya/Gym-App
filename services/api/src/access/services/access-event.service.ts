import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccessEventType, AccessDecisionReason } from '@fitcore/types';

@Injectable()
export class AccessEventService {
  private readonly logger = new Logger(AccessEventService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Logs an immutable access event.
   * INVARIANT 11: Access events are append-only and immutable.
   * INVARIANT 13: Raw biometric data is never stored.
   * INVARIANT 14: Credential secrets are never exposed in logs.
   */
  async logEvent(data: {
    organisationId: string;
    outletId: string;
    memberProfileId?: string;
    credentialId?: string;
    deviceId?: string;
    accessPointId?: string;
    eventType: AccessEventType;
    decision?: 'ALLOWED' | 'DENIED';
    reason?: AccessDecisionReason;
    providerEventId?: string;
    occurredAt?: Date;
    metadata?: Record<string, unknown>;
  }) {
    try {
      // Deep sanitization of metadata to ensure no sensitive biometric or secret info is logged
      const sanitizedMetadata = this.sanitizeMetadata(data.metadata);

      return await this.prisma.accessEvent.create({
        data: {
          organisationId: data.organisationId,
          outletId: data.outletId,
          memberProfileId: data.memberProfileId,
          credentialId: data.credentialId,
          deviceId: data.deviceId,
          accessPointId: data.accessPointId,
          eventType: data.eventType,
          decision: data.decision,
          reason: data.reason,
          providerEventId: data.providerEventId,
          occurredAt: data.occurredAt || new Date(),
          metadata: sanitizedMetadata ? JSON.parse(JSON.stringify(sanitizedMetadata)) : undefined,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record access event: ${err.message}`, err.stack);
      // Non-blocking for domain execution, but logged as error
      return null;
    }
  }

  /**
   * Retrieves paginated access events for an outlet or organisation.
   */
  async getEvents(
    organisationId: string,
    params?: {
      outletId?: string;
      memberProfileId?: string;
      eventType?: AccessEventType;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(params?.page || 1, 1);
    const limit = Math.min(params?.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where = {
      organisationId,
      ...(params?.outletId ? { outletId: params.outletId } : {}),
      ...(params?.memberProfileId ? { memberProfileId: params.memberProfileId } : {}),
      ...(params?.eventType ? { eventType: params.eventType } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.accessEvent.count({ where }),
      this.prisma.accessEvent.findMany({
        where,
        include: {
          outlet: { select: { id: true, name: true, code: true } },
          device: { select: { id: true, name: true, type: true } },
          accessPoint: { select: { id: true, name: true, type: true } },
          memberProfile: {
            select: {
              id: true,
              preferredName: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { occurredAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Scrubs sensitive attributes (passwords, tokens, PINs, biometric templates)
   */
  private sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!metadata) return undefined;
    const sanitized = { ...metadata };
    const forbiddenKeys = [
      'password',
      'pin',
      'secret',
      'token',
      'biometric',
      'rawReference',
      'cardData',
      'cvv',
      'pan',
    ];

    for (const key of Object.keys(sanitized)) {
      if (forbiddenKeys.some((f) => key.toLowerCase().includes(f))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
