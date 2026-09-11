import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StepUpService } from '../../security/step-up/step-up.service';
import {
  PrivacyRequestType,
  PrivacyRequestStatus,
  PrivacyRequestDto,
  StepUpAction,
} from '@fitcore/types';

const VALID_STATE_TRANSITIONS: Record<PrivacyRequestStatus, PrivacyRequestStatus[]> = {
  SUBMITTED: [
    'IDENTITY_VERIFICATION_REQUIRED',
    'VERIFICATION_PENDING',
    'APPROVED',
    'WAITING_FOR_REVIEW',
    'CANCELLED',
    'REJECTED',
  ],
  IDENTITY_VERIFICATION_REQUIRED: [
    'VERIFICATION_PENDING',
    'APPROVED',
    'CANCELLED',
    'REJECTED',
    'EXPIRED',
  ],
  VERIFICATION_PENDING: [
    'APPROVED',
    'WAITING_FOR_REVIEW',
    'CANCELLED',
    'REJECTED',
    'EXPIRED',
  ],
  WAITING_FOR_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['PROCESSING', 'CANCELLED', 'FAILED'],
  PROCESSING: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
  EXPIRED: [],
  FAILED: ['PROCESSING', 'CANCELLED'], // Allow retry from failed
  RECEIVED: ['APPROVED', 'IDENTITY_VERIFICATION_REQUIRED'],
};

@Injectable()
export class PrivacyRequestService {
  private readonly logger = new Logger(PrivacyRequestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stepUpService: StepUpService,
  ) {}

  /**
   * Asserts valid state transition.
   */
  private assertTransition(current: PrivacyRequestStatus, next: PrivacyRequestStatus): void {
    const allowed = VALID_STATE_TRANSITIONS[current] || [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Invalid privacy request state transition from '${current}' to '${next}'`,
      );
    }
  }

  /**
   * Creates a new privacy request from a member.
   */
  async createRequest(
    organisationId: string,
    requesterUserId: string,
    memberId: string | null,
    type: PrivacyRequestType,
    reason?: string,
    metadata?: Record<string, any>,
    stepUpToken?: string,
  ): Promise<PrivacyRequestDto> {
    // Check for duplicate pending requests of the same type
    if (memberId && ['DELETION', 'EXPORT'].includes(type)) {
      const activePending = await this.prisma.privacyRequest.findFirst({
        where: {
          organisationId,
          memberId,
          type,
          status: {
            in: [
              'SUBMITTED',
              'IDENTITY_VERIFICATION_REQUIRED',
              'VERIFICATION_PENDING',
              'APPROVED',
              'PROCESSING',
              'WAITING_FOR_REVIEW',
            ],
          },
        },
      });

      if (activePending) {
        throw new BadRequestException(
          `You already have an active ${type.toLowerCase()} request in progress (ID: ${activePending.id}).`,
        );
      }
    }

    // Determine verification requirement from SLA policy or defaults
    const policy = await this.prisma.privacyRequestPolicy.findUnique({
      where: {
        organisationId_requestType: {
          organisationId,
          requestType: type,
        },
      },
    });

    const isSensitive = ['DELETION', 'EXPORT'].includes(type);
    const requiresVerification = policy?.verificationRequired ?? isSensitive;
    const targetDays = policy?.targetProcessingDays ?? 30;
    const expiresAt = new Date(Date.now() + targetDays * 24 * 60 * 60 * 1000);

    let initialStatus: PrivacyRequestStatus = 'SUBMITTED';
    let verifiedAt: Date | null = null;

    // If step-up token is provided, verify it immediately
    if (stepUpToken && requiresVerification) {
      try {
        const stepUpAction: StepUpAction =
          type === 'DELETION' ? 'DELETE_ACCOUNT' : 'EXPORT_SENSITIVE_DATA';
        await this.stepUpService.consumeChallenge(requesterUserId, stepUpToken, stepUpAction);
        verifiedAt = new Date();
        initialStatus = 'APPROVED';
      } catch (err: any) {
        this.logger.warn(`Step-up consumption failed on request creation: ${err.message}`);
        initialStatus = 'IDENTITY_VERIFICATION_REQUIRED';
      }
    } else if (requiresVerification) {
      initialStatus = 'IDENTITY_VERIFICATION_REQUIRED';
    } else {
      initialStatus = 'SUBMITTED';
    }

    const request = await this.prisma.privacyRequest.create({
      data: {
        organisationId,
        requesterUserId,
        memberId,
        type,
        status: initialStatus,
        reason,
        expiresAt,
        verifiedAt,
        metadata: metadata || {},
      },
    });

    this.logger.log(
      `Privacy request ${request.id} (${type}) created for user ${requesterUserId} with status ${initialStatus}`,
    );

    return this.mapToDto(request);
  }

  /**
   * Verifies member identity for an existing request using step-up auth.
   */
  async verifyRequest(
    requestId: string,
    userId: string,
    stepUpToken: string,
  ): Promise<PrivacyRequestDto> {
    const request = await this.prisma.privacyRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Privacy request not found');
    }

    if (request.requesterUserId !== userId) {
      throw new ForbiddenException('You cannot verify a request created by another user');
    }

    if (
      !['SUBMITTED', 'IDENTITY_VERIFICATION_REQUIRED', 'VERIFICATION_PENDING'].includes(
        request.status,
      )
    ) {
      throw new BadRequestException(`Request is not in a verifiable state (${request.status})`);
    }

    const stepUpAction: StepUpAction =
      request.type === 'DELETION' ? 'DELETE_ACCOUNT' : 'EXPORT_SENSITIVE_DATA';

    await this.stepUpService.consumeChallenge(userId, stepUpToken, stepUpAction);

    this.assertTransition(request.status as PrivacyRequestStatus, 'APPROVED');

    const updated = await this.prisma.privacyRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        verifiedAt: new Date(),
      },
    });

    this.logger.log(`Privacy request ${requestId} verified via Step-Up authentication`);

    return this.mapToDto(updated);
  }

  /**
   * Cancels a privacy request by the requester.
   */
  async cancelRequest(
    requestId: string,
    userId: string,
    organisationId?: string,
  ): Promise<PrivacyRequestDto> {
    const request = await this.prisma.privacyRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || (organisationId && request.organisationId !== organisationId)) {
      throw new NotFoundException('Privacy request not found');
    }

    if (request.requesterUserId !== userId) {
      throw new ForbiddenException('You can only cancel your own privacy requests');
    }

    const cancellableStatuses: PrivacyRequestStatus[] = [
      'SUBMITTED',
      'IDENTITY_VERIFICATION_REQUIRED',
      'VERIFICATION_PENDING',
      'APPROVED',
      'WAITING_FOR_REVIEW',
    ];

    if (!cancellableStatuses.includes(request.status as PrivacyRequestStatus)) {
      throw new BadRequestException(
        `Cannot cancel request in '${request.status}' status (already executing or finalized)`,
      );
    }

    this.assertTransition(request.status as PrivacyRequestStatus, 'CANCELLED');

    const updated = await this.prisma.privacyRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
        resolution: 'Cancelled by requester',
      },
    });

    return this.mapToDto(updated);
  }

  /**
   * Retrieves requests for a specific member or requester.
   */
  async getMemberRequests(
    organisationId: string,
    requesterUserId: string,
  ): Promise<PrivacyRequestDto[]> {
    const requests = await this.prisma.privacyRequest.findMany({
      where: {
        organisationId,
        requesterUserId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => this.mapToDto(r));
  }

  /**
   * Retrieves request by ID, verifying tenant and user ownership.
   */
  async getRequestById(
    requestId: string,
    organisationId: string,
    userId?: string,
  ): Promise<PrivacyRequestDto> {
    const request = await this.prisma.privacyRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.organisationId !== organisationId) {
      throw new NotFoundException('Privacy request not found');
    }

    if (userId && request.requesterUserId !== userId) {
      throw new ForbiddenException('Access to requested privacy record is denied');
    }

    return this.mapToDto(request);
  }

  /**
   * Staff/Admin: Lists privacy requests queue with optional status filtering.
   */
  async getQueue(
    organisationId: string,
    options?: {
      status?: PrivacyRequestStatus;
      type?: PrivacyRequestType;
      page?: number;
      limit?: number;
    },
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { organisationId };
    if (options?.status) where.status = options.status;
    if (options?.type) where.type = options.type;

    const [total, requests] = await Promise.all([
      this.prisma.privacyRequest.count({ where }),
      this.prisma.privacyRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requesterUser: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: requests.map((r: any) => ({
        ...this.mapToDto(r),
        requester: {
          id: r.requesterUser.id,
          email: r.requesterUser.email,
          fullName: `${r.requesterUser.firstName} ${r.requesterUser.lastName}`.trim(),
        },
      })),
    };
  }

  /**
   * Staff: Approves, rejects, or updates status of a request.
   */
  async updateStatusByStaff(
    requestId: string,
    organisationId: string,
    staffUserId: string,
    newStatus: PrivacyRequestStatus,
    resolution?: string,
  ): Promise<PrivacyRequestDto> {
    const request = await this.prisma.privacyRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.organisationId !== organisationId) {
      throw new NotFoundException('Privacy request not found');
    }

    this.assertTransition(request.status as PrivacyRequestStatus, newStatus);

    const updated = await this.prisma.privacyRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        assignedTo: staffUserId,
        resolution: resolution || request.resolution,
        ...(newStatus === 'COMPLETED' ? { completedAt: new Date() } : {}),
        ...(newStatus === 'PROCESSING' ? { startedAt: new Date() } : {}),
      },
    });

    this.logger.log(
      `Privacy request ${requestId} status transitioned to ${newStatus} by staff ${staffUserId}`,
    );

    return this.mapToDto(updated);
  }

  private mapToDto(r: any): PrivacyRequestDto {
    return {
      id: r.id,
      organisationId: r.organisationId,
      requesterUserId: r.requesterUserId,
      memberId: r.memberId,
      type: r.type as PrivacyRequestType,
      status: r.status as PrivacyRequestStatus,
      reason: r.reason,
      submittedAt: r.submittedAt.toISOString(),
      verifiedAt: r.verifiedAt?.toISOString() || null,
      startedAt: r.startedAt?.toISOString() || null,
      completedAt: r.completedAt?.toISOString() || null,
      expiresAt: r.expiresAt?.toISOString() || null,
      assignedTo: r.assignedTo,
      resolution: r.resolution,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
