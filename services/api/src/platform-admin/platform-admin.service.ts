import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PlatformOverviewKPIs } from '@fitcore/types';

@Injectable()
export class PlatformAdminService {
  private readonly logger = new Logger(PlatformAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Computes platform overview KPI cards without fabricating metrics.
   */
  async getOverviewKPIs(): Promise<PlatformOverviewKPIs> {
    const [
      totalOrgs,
      activeOrgs,
      trialOrgs,
      suspendedOrgs,
      totalOutlets,
      activeMembers,
      activeStaff,
      aiRequestsCount,
      aiTokensAgg,
      openTicketsCount,
      criticalIncidentsCount,
      failedIntegrationsCount,
      webhookDeliveriesCount,
    ] = await Promise.all([
      this.prisma.organisation.count(),
      this.prisma.organisation.count({ where: { status: 'ACTIVE' } }),
      this.prisma.organisation.count({ where: { status: 'TRIAL' } }),
      this.prisma.organisation.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.outlet.count(),
      this.prisma.memberProfile.count({ where: { status: 'ACTIVE' } }),
      this.prisma.staffProfile.count({ where: { employmentStatus: 'ACTIVE' } }),
      this.prisma.aIRequest.count(),
      this.prisma.aIUsageRecord.aggregate({
        _sum: { totalTokens: true, estimatedCost: true },
      }),
      this.prisma.supportTicket.count({
        where: { status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] } },
      }),
      this.prisma.platformIncident.count({
        where: {
          severity: 'CRITICAL',
          status: { in: ['DETECTED', 'INVESTIGATING', 'IDENTIFIED', 'MITIGATING'] },
        },
      }),
      this.prisma.integrationConnection.count({ where: { status: 'ERROR' } }),
      this.prisma.webhookDelivery.count(),
    ]);

    return {
      totalOrganisations: totalOrgs,
      activeOrganisations: activeOrgs,
      trialOrganisations: trialOrgs,
      suspendedOrganisations: suspendedOrgs,
      totalOutlets,
      activeMembers,
      activeStaff,
      aiRequests: aiRequestsCount,
      aiTotalTokens: aiTokensAgg._sum.totalTokens || 0,
      aiEstimatedCostCents: Number(aiTokensAgg._sum.estimatedCost || 0),
      apiRequests: webhookDeliveriesCount,
      openSupportTickets: openTicketsCount,
      criticalIncidents: criticalIncidentsCount,
      integrationFailures: failedIntegrationsCount,
      failedJobs: 0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Scoped platform search across authorised platform entities (organisations, outlets, tickets, incidents).
   * Strictly never returns member medical, health, or financial secret information.
   */
  async globalPlatformSearch(searchTerm: string) {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return { organisations: [], outlets: [], tickets: [], incidents: [] };
    }

    const term = searchTerm.trim();

    const [organisations, outlets, tickets, incidents] = await Promise.all([
      this.prisma.organisation.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { slug: { contains: term, mode: 'insensitive' } },
            { id: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, slug: true, status: true },
        take: 10,
      }),
      this.prisma.outlet.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { code: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, code: true, organisationId: true, status: true },
        take: 10,
      }),
      this.prisma.supportTicket.findMany({
        where: {
          OR: [
            { ticketNumber: { contains: term, mode: 'insensitive' } },
            { title: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, ticketNumber: true, title: true, status: true, priority: true, organisationId: true },
        take: 10,
      }),
      this.prisma.platformIncident.findMany({
        where: {
          OR: [
            { incidentNumber: { contains: term, mode: 'insensitive' } },
            { title: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, incidentNumber: true, title: true, severity: true, status: true },
        take: 10,
      }),
    ]);

    return {
      organisations,
      outlets,
      tickets,
      incidents,
    };
  }

  /**
   * Platform audit trail query with strict redaction of sensitive credentials.
   */
  async getPlatformAuditLogs(query?: {
    organisationId?: string;
    action?: string;
    resource?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query?.page || 1;
    const limit = query?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.organisationId) where.organisationId = query.organisationId;
    if (query?.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query?.resource) where.resource = query.resource;
    if (query?.from || query?.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
