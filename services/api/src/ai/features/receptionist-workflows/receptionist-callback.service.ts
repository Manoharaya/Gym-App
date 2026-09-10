/**
 * Day 35 — Receptionist Callback Service
 * Manages customer callback requests, preferred time windows, channel preferences,
 * staff triage, and completion lifecycle.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../audit/audit.service';
import { ReceptionistRoutingService } from './receptionist-routing.service';
import { ReceptionistNotificationService } from './receptionist-notification.service';
import { CallbackChannel, CallbackStatus } from '@fitcore/types';
import { RECEPTIONIST_AUDIT_ACTIONS } from './receptionist-workflow.constants';

@Injectable()
export class ReceptionistCallbackService {
  private readonly logger = new Logger(ReceptionistCallbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly routingService: ReceptionistRoutingService,
    private readonly notificationService: ReceptionistNotificationService,
  ) {}

  /**
   * Registers a structured callback request.
   */
  async createCallbackRequest(params: {
    organisationId: string;
    outletId?: string | null;
    memberId?: string | null;
    leadId?: string | null;
    interactionId?: string | null;
    phoneNumber?: string | null;
    preferredTime?: Date | null;
    preferredTimeNote?: string | null;
    preferredChannel?: CallbackChannel;
    reason: string;
    userId?: string;
  }) {
    const {
      organisationId,
      outletId,
      memberId,
      leadId,
      interactionId,
      phoneNumber,
      preferredTime,
      preferredTimeNote,
      preferredChannel = 'PHONE',
      reason,
      userId,
    } = params;

    // Route to eligible staff
    const routing = await this.routingService.findEligibleStaff({
      organisationId,
      outletId,
    });

    const callback = await this.prisma.callbackRequest.create({
      data: {
        organisationId,
        outletId: outletId || null,
        memberId: memberId || null,
        leadId: leadId || null,
        interactionId: interactionId || null,
        phoneNumber: phoneNumber || null,
        preferredTime: preferredTime || null,
        preferredTimeNote: preferredTimeNote || null,
        preferredChannel,
        reason,
        status: routing.assignedStaffId ? 'ASSIGNED' : 'REQUESTED',
        assignedStaffId: routing.assignedStaffId || null,
      },
    });

    // Notify assigned staff
    if (routing.assignedStaffId) {
      await this.notificationService.notifyStaffOfFollowUp({
        organisationId,
        taskId: callback.id,
        assignedStaffId: routing.assignedStaffId,
        title: `Customer Callback Request: ${phoneNumber || 'Customer'}`,
        description: `Reason: ${reason}. Preferred Channel: ${preferredChannel}`,
      });
    }

    // Audit log
    await this.audit.log({
      userId,
      organisationId,
      outletId: outletId || undefined,
      action: RECEPTIONIST_AUDIT_ACTIONS.CALLBACK_REQUESTED,
      resource: 'CallbackRequest',
      resourceId: callback.id,
      metadata: { preferredChannel, phoneNumber, assignedStaffId: routing.assignedStaffId },
    });

    return callback;
  }

  /**
   * Updates callback request status (e.g. SCHEDULED, COMPLETED, CANCELLED).
   */
  async updateCallbackStatus(params: {
    organisationId: string;
    callbackId: string;
    status: CallbackStatus;
    notes?: string;
    assignedStaffId?: string;
    userId?: string;
  }) {
    const { organisationId, callbackId, status, notes, assignedStaffId, userId } = params;

    const callback = await this.prisma.callbackRequest.findUnique({
      where: { id: callbackId },
    });

    if (!callback) {
      throw new NotFoundException(`Callback request ${callbackId} not found`);
    }

    if (callback.organisationId !== organisationId) {
      throw new ForbiddenException('Tenant access violation');
    }

    if (assignedStaffId && assignedStaffId !== callback.assignedStaffId) {
      const staff = await this.prisma.staffProfile.findFirst({
        where: { id: assignedStaffId, organisationId, employmentStatus: 'ACTIVE' },
      });
      if (!staff) {
        throw new BadRequestException('Cannot assign callback to inactive staff');
      }
    }

    const isCompleted = status === 'COMPLETED';
    const updated = await this.prisma.callbackRequest.update({
      where: { id: callbackId },
      data: {
        status,
        notes: notes ?? callback.notes,
        assignedStaffId: assignedStaffId ?? callback.assignedStaffId,
        completedAt: isCompleted ? new Date() : callback.completedAt,
      },
    });

    return updated;
  }

  /**
   * Lists callback requests.
   */
  async listCallbacks(params: {
    organisationId: string;
    outletId?: string;
    status?: CallbackStatus;
    assignedStaffId?: string;
    limit?: number;
    offset?: number;
  }) {
    const { organisationId, outletId, status, assignedStaffId, limit = 50, offset = 0 } = params;

    const where: any = { organisationId };
    if (outletId) where.outletId = outletId;
    if (status) where.status = status;
    if (assignedStaffId) where.assignedStaffId = assignedStaffId;

    const [total, items] = await Promise.all([
      this.prisma.callbackRequest.count({ where }),
      this.prisma.callbackRequest.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: limit,
        skip: offset,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, phone: true } },
          member: { select: { id: true, userId: true } },
        },
      }),
    ]);

    return { total, items, limit, offset };
  }
}
