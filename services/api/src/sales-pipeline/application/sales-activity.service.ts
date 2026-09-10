import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { LogActivityDto } from '../dto/sales-pipeline.dto';

@Injectable()
export class SalesActivityService {
  private readonly logger = new Logger(SalesActivityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Log a sales activity on an opportunity, refreshing the opportunity's lastActivityAt.
   */
  async logActivity(
    organisationId: string,
    opportunityId: string,
    dto: LogActivityDto,
  ) {
    const opp = await this.prisma.salesOpportunity.findFirst({
      where: { id: opportunityId, organisationId },
    });

    if (!opp) {
      throw new NotFoundException(
        `Sales Opportunity with ID ${opportunityId} not found in this organisation.`,
      );
    }

    const now = new Date();

    const [activity] = await this.prisma.$transaction([
      this.prisma.salesActivity.create({
        data: {
          opportunityId,
          leadId: opp.leadId,
          organisationId,
          outletId: opp.outletId || null,
          type: dto.activityType,
          title: dto.title,
          summary: dto.description || null,
          actorType: (dto.actorType || 'STAFF'),
          actorId: dto.actorId || null,
          sourceReferenceId: dto.communicationLogId || dto.aiConversationId || null,
          occurredAt: now,
          metadata: {
            ...(dto.metadata || {}),
            durationMinutes: dto.durationMinutes,
            communicationLogId: dto.communicationLogId,
            aiConversationId: dto.aiConversationId,
          },
        },
      }),
      this.prisma.salesOpportunity.update({
        where: { id: opportunityId },
        data: { lastActivityAt: now },
      }),
    ]);

    await this.auditService.log({
      organisationId,
      outletId: opp.outletId || undefined,
      action: 'SALES_ACTIVITY_LOGGED',
      resource: 'sales_activity',
      resourceId: activity.id,
      metadata: {
        opportunityId,
        activityType: dto.activityType,
        title: dto.title,
        actorType: dto.actorType || 'STAFF',
      },
    });

    return activity;
  }

  /**
   * List activities for an opportunity in reverse chronological order.
   */
  async listActivities(organisationId: string, opportunityId: string) {
    const opp = await this.prisma.salesOpportunity.findFirst({
      where: { id: opportunityId, organisationId },
    });

    if (!opp) {
      throw new NotFoundException(
        `Sales Opportunity with ID ${opportunityId} not found in this organisation.`,
      );
    }

    return this.prisma.salesActivity.findMany({
      where: { opportunityId },
      orderBy: { occurredAt: 'desc' },
    });
  }
}
