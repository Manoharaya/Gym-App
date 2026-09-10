/**
 * Day 36 — AI Sales Handoff Service
 * Coordinates human staff escalations and receptionist workflow routing.
 * Connects directly to Day 35 ReceptionistFollowUpTask workflow engine.
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditService } from '../../../../audit/audit.service';
import { SalesActionTools } from '../tools/sales-action-tools';
import {
  SalesHandoffDto,
  SalesHandoffReason,
  SalesHandoffPriority,
  SalesHandoffStatus,
} from '@fitcore/types';

@Injectable()
export class SalesHandoffService {
  private readonly logger = new Logger(SalesHandoffService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly actionTools: SalesActionTools,
  ) {}

  /**
   * 1. Create a human handoff request.
   */
  async createHumanHandoff(
    organisationId: string,
    params: {
      conversationId: string;
      leadId: string;
      reason: SalesHandoffReason;
      priority?: SalesHandoffPriority;
      notes?: string;
      customerSummary?: string;
      assignedStaffId?: string;
    },
  ): Promise<SalesHandoffDto> {
    const result = await this.actionTools.requestHumanHandoff(organisationId, params);

    const handoff = await this.prisma.salesHandoff.findUnique({
      where: { id: result.handoffId },
      include: { assignedStaff: true },
    });

    if (!handoff) {
      throw new NotFoundException(`Handoff ${result.handoffId} not found`);
    }

    return {
      id: handoff.id,
      conversationId: handoff.conversationId,
      organisationId: handoff.organisationId,
      outletId: handoff.outletId,
      leadId: handoff.leadId,
      reason: handoff.reason as SalesHandoffReason,
      priority: handoff.priority as SalesHandoffPriority,
      status: handoff.status as SalesHandoffStatus,
      assignedStaffId: handoff.assignedStaffId,
      assignedStaffName: handoff.assignedStaff?.displayName || null,
      notes: handoff.notes,
      customerSummary: handoff.customerSummary,
      resolvedAt: handoff.resolvedAt,
      createdAt: handoff.createdAt,
      updatedAt: handoff.updatedAt,
    };
  }

  /**
   * 2. Assign staff to an existing handoff.
   */
  async assignStaff(
    organisationId: string,
    handoffId: string,
    staffId: string,
  ): Promise<SalesHandoffDto> {
    const handoff = await this.prisma.salesHandoff.findFirst({
      where: { id: handoffId, organisationId },
    });

    if (!handoff) {
      throw new NotFoundException(`Sales handoff ${handoffId} not found`);
    }

    const staff = await this.prisma.staffProfile.findFirst({
      where: { id: staffId, organisationId },
    });

    if (!staff) {
      throw new NotFoundException(`Staff profile ${staffId} not found in organisation`);
    }

    const updated = await this.prisma.salesHandoff.update({
      where: { id: handoffId },
      data: {
        assignedStaffId: staff.id,
        status: 'ASSIGNED',
      },
      include: { assignedStaff: true },
    });

    await this.auditService.log({
      organisationId,
      action: 'SALES_HANDOFF_ASSIGNED',
      resource: 'SalesHandoff',
      resourceId: handoffId,
      metadata: { staffId: staff.id },
    });

    return {
      id: updated.id,
      conversationId: updated.conversationId,
      organisationId: updated.organisationId,
      outletId: updated.outletId,
      leadId: updated.leadId,
      reason: updated.reason as SalesHandoffReason,
      priority: updated.priority as SalesHandoffPriority,
      status: updated.status as SalesHandoffStatus,
      assignedStaffId: updated.assignedStaffId,
      assignedStaffName: updated.assignedStaff?.displayName || null,
      notes: updated.notes,
      customerSummary: updated.customerSummary,
      resolvedAt: updated.resolvedAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * 3. Resolve a handoff.
   */
  async resolveHandoff(
    organisationId: string,
    handoffId: string,
    notes?: string,
  ): Promise<SalesHandoffDto> {
    const handoff = await this.prisma.salesHandoff.findFirst({
      where: { id: handoffId, organisationId },
    });

    if (!handoff) {
      throw new NotFoundException(`Sales handoff ${handoffId} not found`);
    }

    const updated = await this.prisma.salesHandoff.update({
      where: { id: handoffId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        notes: notes ? `${handoff.notes || ''}\nResolution: ${notes}` : handoff.notes,
      },
      include: { assignedStaff: true },
    });

    return {
      id: updated.id,
      conversationId: updated.conversationId,
      organisationId: updated.organisationId,
      outletId: updated.outletId,
      leadId: updated.leadId,
      reason: updated.reason as SalesHandoffReason,
      priority: updated.priority as SalesHandoffPriority,
      status: updated.status as SalesHandoffStatus,
      assignedStaffId: updated.assignedStaffId,
      assignedStaffName: updated.assignedStaff?.displayName || null,
      notes: updated.notes,
      customerSummary: updated.customerSummary,
      resolvedAt: updated.resolvedAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * 4. Handoff to Receptionist Booking Capability (Day 32/35 integration).
   */
  async routeToReceptionist(
    organisationId: string,
    params: {
      conversationId: string;
      leadId: string;
      action: 'BOOK_CLASS' | 'SCHEDULE_APPOINTMENT' | 'GENERAL_OPERATION';
      details?: Record<string, any>;
    },
  ) {
    return this.actionTools.handoffToReceptionist(organisationId, params);
  }
}
