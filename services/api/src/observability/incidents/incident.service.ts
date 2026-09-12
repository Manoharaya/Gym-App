import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateIncidentDto, UpdateIncidentDto } from '../dto/observability.dto';

@Injectable()
export class IncidentService {
  private readonly logger = new Logger(IncidentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Declares a new platform operational incident.
   */
  async createIncident(dto: CreateIncidentDto, actorUserId?: string) {
    const incNumber = `INC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    return this.prisma.$transaction(async (tx) => {
      const incident = await tx.observabilityIncident.create({
        data: {
          incidentNumber: incNumber,
          title: dto.title,
          description: dto.description,
          severity: dto.severity || 'MEDIUM',
          status: 'OPEN',
          affectedServices: dto.affectedServices || [],
        },
      });

      // Record initial event
      const initialEvent = await tx.observabilityIncidentEvent.create({
        data: {
          incidentId: incident.id,
          status: 'OPEN',
          message: `Incident declared: ${dto.title}`,
          actorUserId,
        },
      });

      // Link any specified alerts
      if (dto.linkedAlertIds && dto.linkedAlertIds.length > 0) {
        await tx.observabilityAlert.updateMany({
          where: { id: { in: dto.linkedAlertIds } },
          data: { incidentId: incident.id, status: 'INVESTIGATING' },
        });
      }

      return {
        ...incident,
        events: [initialEvent],
        alerts: [],
      };
    });
  }

  /**
   * Updates an ongoing incident and adds a timeline progress event.
   */
  async updateIncident(incidentId: string, dto: UpdateIncidentDto, actorUserId?: string) {
    const existing = await this.prisma.observabilityIncident.findUnique({
      where: { id: incidentId },
    });

    if (!existing) {
      throw new NotFoundException(`Incident ${incidentId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const isMitigated = dto.status === 'MITIGATED';
      const isResolved = dto.status === 'RESOLVED' || dto.status === 'CLOSED';

      if (dto.eventMessage || dto.status) {
        await tx.observabilityIncidentEvent.create({
          data: {
            incidentId,
            status: dto.status || existing.status,
            message: dto.eventMessage || `Status transitioned to ${dto.status || existing.status}`,
            actorUserId,
          },
        });
      }

      const updated = await tx.observabilityIncident.update({
        where: { id: incidentId },
        data: {
          ...(dto.status ? { status: dto.status } : {}),
          ...(dto.mitigationNotes ? { mitigationNotes: dto.mitigationNotes } : {}),
          ...(isMitigated ? { mitigatedAt: new Date() } : {}),
          ...(isResolved ? { resolvedAt: new Date() } : {}),
        },
        include: { events: { orderBy: { createdAt: 'asc' } }, alerts: true },
      });

      return updated;
    });
  }

  /**
   * Lists operational incidents.
   */
  async listIncidents(status?: string) {
    const where: any = {};
    if (status) where.status = status;

    return this.prisma.observabilityIncident.findMany({
      where,
      orderBy: { detectedAt: 'desc' },
      include: { events: { orderBy: { createdAt: 'desc' } }, alerts: true },
    });
  }

  /**
   * Retrieves single incident details.
   */
  async getIncident(id: string) {
    const incident = await this.prisma.observabilityIncident.findUnique({
      where: { id },
      include: { events: { orderBy: { createdAt: 'asc' } }, alerts: true },
    });

    if (!incident) {
      throw new NotFoundException(`Incident ${id} not found`);
    }

    return incident;
  }
}
