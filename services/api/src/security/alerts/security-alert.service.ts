import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SecuritySeverity, SecurityAlertStatus } from '@fitcore/types';

export interface CreateSecurityAlertInput {
  organisationId: string;
  severity: SecuritySeverity;
  type: string;
  description: string;
  relatedUserId?: string | null;
  relatedSessionId?: string | null;
  relatedDeviceId?: string | null;
  metadata?: Record<string, any> | null;
}

export interface SecurityAlertFilter {
  organisationId: string;
  status?: SecurityAlertStatus;
  severity?: SecuritySeverity;
  page?: number;
  limit?: number;
}

/**
 * SecurityAlertService
 *
 * Manages security alerts, investigation workflows, and resolution states.
 */
@Injectable()
export class SecurityAlertService {
  private readonly logger = new Logger(SecurityAlertService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a security alert.
   */
  async createAlert(input: CreateSecurityAlertInput): Promise<string> {
    const alert = await this.prisma.securityAlert.create({
      data: {
        organisationId: input.organisationId,
        severity: input.severity,
        type: input.type,
        description: input.description,
        relatedUserId: input.relatedUserId,
        relatedSessionId: input.relatedSessionId,
        relatedDeviceId: input.relatedDeviceId,
        status: 'OPEN',
        metadata: input.metadata as any,
      },
    });

    this.logger.warn(
      `[SECURITY ALERT CREATED] ${alert.id} (${input.severity} - ${input.type}) for organisation ${input.organisationId}`,
    );

    return alert.id;
  }

  /**
   * Lists alerts for an organisation with filtering.
   */
  async getAlerts(filter: SecurityAlertFilter) {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      organisationId: filter.organisationId,
    };

    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.severity) {
      where.severity = filter.severity;
    }

    const [items, total] = await Promise.all([
      this.prisma.securityAlert.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.securityAlert.count({ where }),
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
   * Acknowledges an open alert.
   */
  async acknowledgeAlert(alertId: string, assignedToUserId?: string): Promise<void> {
    const alert = await this.prisma.securityAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException('Security alert not found');
    }

    await this.prisma.securityAlert.update({
      where: { id: alertId },
      data: {
        status: 'ACKNOWLEDGED',
        assignedTo: assignedToUserId || alert.assignedTo,
      },
    });
  }

  /**
   * Resolves an alert with resolution notes.
   */
  async resolveAlert(
    alertId: string,
    resolvedByUserId: string,
    resolutionNotes?: string,
  ): Promise<void> {
    const alert = await this.prisma.securityAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException('Security alert not found');
    }

    const existingMeta = (alert.metadata as Record<string, any>) || {};

    await this.prisma.securityAlert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: resolvedByUserId,
        metadata: {
          ...existingMeta,
          resolutionNotes: resolutionNotes || 'Resolved by administrator',
        },
      },
    });

    this.logger.log(`Security alert ${alertId} marked as RESOLVED by ${resolvedByUserId}`);
  }
}
