import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SecurityEventType, SecuritySeverity } from '@fitcore/types';

export interface EmitSecurityEventInput {
  organisationId?: string | null;
  userId?: string | null;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  source: string;
  ipAddress?: string | null;
  deviceId?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  metadata?: Record<string, any> | null;
}

export interface SecurityEventFilter {
  organisationId?: string;
  userId?: string;
  eventType?: SecurityEventType;
  severity?: SecuritySeverity;
  source?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * SecurityEventService
 *
 * Emits, sanitizes, and queries security telemetry events.
 * Strictly sanitizes metadata to prevent secret leakage in persistence.
 */
@Injectable()
export class SecurityEventService {
  private readonly logger = new Logger(SecurityEventService.name);

  // Blacklist of fields that must NEVER appear in security event metadata
  private readonly sensitiveFieldKeys = [
    'password',
    'pass',
    'secret',
    'token',
    'refreshtoken',
    'recoverycode',
    'authorization',
    'bearertoken',
    'clientsecret',
    'code',
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a security event with strictly sanitized metadata.
   */
  async recordEvent(input: EmitSecurityEventInput): Promise<string> {
    const sanitizedMetadata = this.sanitizeMetadata(input.metadata);

    const created = await this.prisma.securityEvent.create({
      data: {
        organisationId: input.organisationId,
        userId: input.userId,
        eventType: input.eventType,
        severity: input.severity,
        source: input.source || 'SYSTEM',
        ipAddress: input.ipAddress,
        deviceId: input.deviceId,
        sessionId: input.sessionId,
        requestId: input.requestId,
        correlationId: input.correlationId,
        metadata: sanitizedMetadata as any,
      },
    });

    if (input.severity === 'HIGH' || input.severity === 'CRITICAL') {
      this.logger.warn(
        `[SECURITY ${input.severity}] ${input.eventType} for user: ${input.userId || 'anonymous'}, org: ${input.organisationId || 'none'}`,
      );
    }

    return created.id;
  }

  /**
   * Queries security events with pagination and filters.
   */
  async queryEvents(filter: SecurityEventFilter) {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter.organisationId) {
      where.organisationId = filter.organisationId;
    }
    if (filter.userId) {
      where.userId = filter.userId;
    }
    if (filter.eventType) {
      where.eventType = filter.eventType;
    }
    if (filter.severity) {
      where.severity = filter.severity;
    }
    if (filter.source) {
      where.source = filter.source;
    }
    if (filter.fromDate || filter.toDate) {
      where.createdAt = {};
      if (filter.fromDate) where.createdAt.gte = filter.fromDate;
      if (filter.toDate) where.createdAt.lte = filter.toDate;
    }

    const [items, total] = await Promise.all([
      this.prisma.securityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.securityEvent.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Sanitizes metadata recursively, stripping any field whose key resembles a secret.
   */
  sanitizeMetadata(metadata?: Record<string, any> | null): Record<string, any> | null {
    if (!metadata || typeof metadata !== 'object') return null;

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      const isSensitive = this.sensitiveFieldKeys.some((s) => lowerKey.includes(s));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
