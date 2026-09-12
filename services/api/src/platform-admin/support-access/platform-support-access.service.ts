import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { SecurityEventService } from '../../security/events/security-event.service';
import { StepUpService } from '../../security/step-up/step-up.service';
import {
  RequestSupportAccessDto,
  ApproveSupportAccessDto,
  RevokeSupportAccessDto,
} from '../dto/platform-admin.dto';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { SupportAccessGrant } from '@fitcore/types';

@Injectable()
export class PlatformSupportAccessService {
  private readonly logger = new Logger(PlatformSupportAccessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly securityEventService: SecurityEventService,
    private readonly stepUpService: StepUpService,
  ) {}

  /**
   * Submits a time-bounded support access request.
   */
  async requestAccess(dto: RequestSupportAccessDto, requester: AuthenticatedUser) {
    const org = await this.prisma.organisation.findUnique({
      where: { id: dto.organisationId },
    });

    if (!org) {
      throw new NotFoundException(`Organisation ${dto.organisationId} not found`);
    }

    const durationMinutes = dto.durationMinutes || 30;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const request = await this.prisma.supportAccessRequest.create({
      data: {
        organisationId: dto.organisationId,
        ticketId: dto.ticketId,
        requesterUserId: requester.id,
        purpose: dto.purpose,
        scope: dto.scope || 'ORGANISATION',
        status: 'PENDING',
        isBreakGlass: dto.isBreakGlass || false,
        expiresAt,
      },
      include: {
        organisation: { select: { name: true } },
        requesterUser: { select: { email: true } },
      },
    });

    await this.auditService.log({
      userId: requester.id,
      organisationId: dto.organisationId,
      action: dto.isBreakGlass ? 'BREAK_GLASS_ACCESS_REQUESTED' : 'SUPPORT_ACCESS_REQUESTED',
      resource: 'support_access_request',
      resourceId: request.id,
      metadata: {
        purpose: dto.purpose,
        durationMinutes,
        isBreakGlass: dto.isBreakGlass,
      },
    });

    return request;
  }

  /**
   * Approves a support access request, requiring step-up challenge verification.
   */
  async approveAccess(
    requestId: string,
    dto: ApproveSupportAccessDto,
    approver: AuthenticatedUser,
  ) {
    const accessRequest = await this.prisma.supportAccessRequest.findUnique({
      where: { id: requestId },
      include: {
        organisation: { select: { id: true, name: true } },
        requesterUser: { select: { id: true, email: true } },
      },
    });

    if (!accessRequest) {
      throw new NotFoundException(`Support access request ${requestId} not found`);
    }

    if (accessRequest.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${accessRequest.status.toLowerCase()}`);
    }

    if (accessRequest.expiresAt.getTime() <= Date.now()) {
      await this.prisma.supportAccessRequest.update({
        where: { id: requestId },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Support access request has expired');
    }

    // Step-up verification for sensitive support access grant
    if (dto.stepUpToken) {
      const stepUpAction = accessRequest.isBreakGlass
        ? 'BREAK_GLASS_ACCESS'
        : 'SUPPORT_ACCESS_APPROVAL';
      await this.stepUpService.consumeChallenge(approver.id, dto.stepUpToken, stepUpAction);
    }

    const updated = await this.prisma.supportAccessRequest.update({
      where: { id: requestId },
      data: {
        status: 'ACTIVE',
        approverUserId: approver.id,
        stepUpVerified: true,
      },
    });

    await this.auditService.log({
      userId: approver.id,
      organisationId: accessRequest.organisationId,
      action: accessRequest.isBreakGlass
        ? 'BREAK_GLASS_ACCESS_GRANTED'
        : 'SUPPORT_ACCESS_GRANTED',
      resource: 'support_access_request',
      resourceId: requestId,
      metadata: {
        requesterEmail: accessRequest.requesterUser.email,
        approverEmail: approver.email,
        expiresAt: accessRequest.expiresAt,
      },
    });

    await this.securityEventService.recordEvent({
      organisationId: accessRequest.organisationId,
      userId: approver.id,
      eventType: accessRequest.isBreakGlass ? 'BREAK_GLASS_ACCESS' : 'SUPPORT_ACCESS_GRANTED',
      severity: accessRequest.isBreakGlass ? 'CRITICAL' : 'HIGH',
      source: 'platform-admin',
      metadata: {
        requesterId: accessRequest.requesterUserId,
        purpose: accessRequest.purpose,
        expiresAt: accessRequest.expiresAt.toISOString(),
      },
    });

    return updated;
  }

  /**
   * Revokes active support access immediately.
   */
  async revokeAccess(
    requestId: string,
    dto: RevokeSupportAccessDto,
    actor: AuthenticatedUser,
  ) {
    const accessRequest = await this.prisma.supportAccessRequest.findUnique({
      where: { id: requestId },
    });

    if (!accessRequest) {
      throw new NotFoundException(`Support access request ${requestId} not found`);
    }

    const updated = await this.prisma.supportAccessRequest.update({
      where: { id: requestId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        reason: dto.reason,
      },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId: accessRequest.organisationId,
      action: 'SUPPORT_ACCESS_REVOKED',
      resource: 'support_access_request',
      resourceId: requestId,
      metadata: { reason: dto.reason },
    });

    await this.securityEventService.recordEvent({
      organisationId: accessRequest.organisationId,
      userId: actor.id,
      eventType: 'SUPPORT_ACCESS_REVOKED',
      severity: 'MEDIUM',
      source: 'platform-admin',
      metadata: { requestId, reason: dto.reason },
    });

    return updated;
  }

  /**
   * Lists support access requests with status and expiration checking.
   */
  async listRequests(query?: { organisationId?: string; status?: string }) {
    const where: any = {};
    if (query?.organisationId) where.organisationId = query.organisationId;
    if (query?.status) where.status = query.status;

    // Automatically flag expired active sessions
    await this.prisma.supportAccessRequest.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lte: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    return this.prisma.supportAccessRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        organisation: { select: { id: true, name: true } },
        requesterUser: { select: { id: true, email: true, firstName: true, lastName: true } },
        approverUser: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }
}
