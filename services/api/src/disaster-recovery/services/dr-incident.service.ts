import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DeclareDrIncidentDto, UpdateDrIncidentDto } from '../dto/disaster-recovery.dto';

@Injectable()
export class DrIncidentService {
  private readonly logger = new Logger(DrIncidentService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async generateIncidentNumber(): Promise<string> {
    const count = await this.prisma.disasterRecoveryIncident.count();
    const year = new Date().getFullYear();
    const seq = String(count + 1).padStart(4, '0');
    return `DR-${year}-${seq}`;
  }

  /**
   * Declares a formal Disaster Recovery incident.
   */
  async declareIncident(dto: DeclareDrIncidentDto, actor?: { id: string; email: string }) {
    const incidentNumber = await this.generateIncidentNumber();

    const incident = await this.prisma.disasterRecoveryIncident.create({
      data: {
        incidentNumber,
        title: dto.title,
        severity: dto.severity,
        status: 'DECLARED',
        summary: dto.summary,
        targetRtoMinutes: dto.targetRtoMinutes ?? 60,
        targetRpoMinutes: dto.targetRpoMinutes ?? 15,
        leadResponder: dto.leadResponder || actor?.email || 'SYSTEM',
        metadata: {
          declaredByUserId: actor?.id,
          declaredByUserEmail: actor?.email,
        },
      },
    });

    await this.prisma.disasterRecoveryIncidentEvent.create({
      data: {
        drIncidentId: incident.id,
        action: 'DR_INCIDENT_DECLARED',
        message: `Disaster Recovery incident declared: ${dto.title}`,
        author: actor?.email || 'SYSTEM',
        metadata: { severity: dto.severity },
      },
    });

    this.logger.warn(
      `[DR INCIDENT] Declared incident ${incidentNumber} (${dto.severity}): ${dto.title}`,
    );

    return incident;
  }

  /**
   * Updates DR incident status and appends timeline audit event.
   */
  async updateIncident(
    incidentId: string,
    dto: UpdateDrIncidentDto,
    actor?: { id: string; email: string },
  ) {
    const incident = await this.prisma.disasterRecoveryIncident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new NotFoundException(`DR Incident ${incidentId} not found`);
    }

    const isMitigated = dto.status === 'MITIGATED' && !incident.mitigatedAt;
    const isResolved =
      (dto.status === 'RESOLVED' || dto.status === 'CLOSED') && !incident.resolvedAt;

    const updated = await this.prisma.disasterRecoveryIncident.update({
      where: { id: incidentId },
      data: {
        status: dto.status,
        ...(dto.observedRtoMinutes ? { observedRtoMinutes: dto.observedRtoMinutes } : {}),
        ...(dto.observedRpoMinutes ? { observedRpoMinutes: dto.observedRpoMinutes } : {}),
        ...(isMitigated ? { mitigatedAt: new Date() } : {}),
        ...(isResolved ? { resolvedAt: new Date() } : {}),
      },
    });

    await this.prisma.disasterRecoveryIncidentEvent.create({
      data: {
        drIncidentId: incident.id,
        action: `STATUS_CHANGED_TO_${dto.status}`,
        message: dto.message,
        author: actor?.email || 'SYSTEM',
        metadata: {
          previousStatus: incident.status,
          newStatus: dto.status,
          observedRtoMinutes: dto.observedRtoMinutes,
          observedRpoMinutes: dto.observedRpoMinutes,
        },
      },
    });

    return updated;
  }

  /**
   * Lists DR incidents.
   */
  async listIncidents(status?: string) {
    return this.prisma.disasterRecoveryIncident.findMany({
      where: status ? { status } : {},
      orderBy: { declaredAt: 'desc' },
      include: {
        events: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
    });
  }

  /**
   * Retrieves single DR incident with full event timeline.
   */
  async getIncident(incidentId: string) {
    const incident = await this.prisma.disasterRecoveryIncident.findUnique({
      where: { id: incidentId },
      include: {
        events: { orderBy: { timestamp: 'asc' } },
      },
    });

    if (!incident) {
      throw new NotFoundException(`DR Incident ${incidentId} not found`);
    }

    return incident;
  }
}
