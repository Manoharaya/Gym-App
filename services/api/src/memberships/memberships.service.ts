import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MembershipDateService } from './membership-date.service';
import { MembershipLifecycleService } from './membership-lifecycle.service';
import { MembershipAccessPolicy } from './policies/membership-access.policy';
import {
  AssignMembershipDto,
  MembershipQueryDto,
} from './dto/membership-domain.dto';
import { AuthenticatedUser } from '../common/interfaces/request-with-user.interface';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly dateService: MembershipDateService,
    private readonly lifecycleService: MembershipLifecycleService,
    private readonly accessPolicy: MembershipAccessPolicy
  ) {}

  /**
   * Assigns a membership plan to a member profile within the organization.
   * Performs commercial snapshotting to preserve historical price/name integrity.
   */
  async assignMembership(
    organisationId: string,
    dto: AssignMembershipDto,
    actor: AuthenticatedUser
  ) {
    // 1. Verify Member Profile exists within Organisation
    const member = await this.prisma.memberProfile.findFirst({
      where: {
        id: dto.memberProfileId,
        organisationId,
      },
    });

    if (!member) {
      throw new NotFoundException(
        `Member with ID ${dto.memberProfileId} not found in this organization`
      );
    }

    // 2. Verify Membership Plan exists within Organisation and is available
    const plan = await this.prisma.membershipPlan.findFirst({
      where: {
        id: dto.membershipPlanId,
        organisationId,
      },
      include: {
        planOutlets: true,
      },
    });

    if (!plan) {
      throw new NotFoundException(
        `Membership plan with ID ${dto.membershipPlanId} not found in this organization`
      );
    }

    if (plan.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot assign an archived membership plan');
    }

    // 3. Compute Dates
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = this.dateService.calculateEndDate(
      startDate,
      plan.durationValue,
      plan.durationUnit
    );

    const isTrial = plan.membershipType === 'TRIAL';
    const trialEndsAt = isTrial
      ? this.dateService.calculateEndDate(startDate, plan.trialDuration ?? plan.durationValue, 'DAY')
      : null;

    const initialStatus = isTrial ? 'TRIAL' : 'ACTIVE';
    const accessScope = dto.accessScope ?? (plan.planOutlets.length > 1 ? 'ALL_ORGANISATION_OUTLETS' : 'SINGLE_OUTLET');

    // 4. Create MemberMembership with snapshot in transaction
    const newMembership = await this.prisma.$transaction(async (tx) => {
      const created = await tx.memberMembership.create({
        data: {
          organisationId,
          memberProfileId: member.id,
          membershipPlanId: plan.id,
          status: initialStatus,
          accessScope,
          originOutletId: dto.originOutletId,
          startDate,
          endDate,
          activatedAt: new Date(),
          trialEndsAt,
          autoRenew: dto.autoRenew ?? false,
          // Commercial snapshot
          planNameAtPurchase: plan.name,
          priceAtPurchase: plan.price,
          currencyAtPurchase: plan.currency,
          billingTypeAtPurchase: plan.billingType,
          durationValueAtPurchase: plan.durationValue,
          durationUnitAtPurchase: plan.durationUnit,
        },
      });

      // Link specific outlets if not all-organisation
      const targetOutlets = dto.outletIds && dto.outletIds.length > 0
        ? dto.outletIds
        : (dto.originOutletId ? [dto.originOutletId] : plan.planOutlets.map((po) => po.outletId));

      if (accessScope !== 'ALL_ORGANISATION_OUTLETS' && targetOutlets.length > 0) {
        for (const outId of targetOutlets) {
          await tx.memberMembershipOutlet.create({
            data: {
              memberMembershipId: created.id,
              outletId: outId,
            },
          });
        }
      }

      // Initial history
      await tx.memberMembershipHistory.create({
        data: {
          memberMembershipId: created.id,
          fromStatus: null,
          toStatus: initialStatus,
          action: 'CREATE',
          reason: 'Initial membership assignment',
          actorId: actor.id,
          actorRole: actor.roles[0]?.role ?? 'STAFF',
        },
      });

      return created;
    });

    await this.audit.log({
      action: 'MEMBERSHIP_CREATED',
      resource: 'member_membership',
      resourceId: newMembership.id,
      organisationId,
      userId: actor.id,
      metadata: {
        memberProfileId: member.id,
        planId: plan.id,
        status: initialStatus,
        priceAtPurchase: plan.price,
      },
    });

    return this.prisma.memberMembership.findUnique({
      where: { id: newMembership.id },
      include: {
        membershipPlan: { include: { entitlements: true } },
        accessOutlets: { include: { outlet: true } },
        history: true,
      },
    });
  }

  /**
   * Returns a paginated list of memberships for staff/admin with searching and filtering.
   */
  async getMemberships(
    organisationId: string,
    query: MembershipQueryDto,
    actor: AuthenticatedUser
  ) {
    const page = query.page ? Math.max(1, Number(query.page)) : 1;
    const limit = query.limit ? Math.min(100, Math.max(1, Number(query.limit))) : 20;
    const skip = (page - 1) * limit;

    const where: any = { organisationId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.memberProfileId) {
      where.memberProfileId = query.memberProfileId;
    }

    if (query.outletId) {
      where.OR = [
        { accessScope: 'ALL_ORGANISATION_OUTLETS' },
        { accessOutlets: { some: { outletId: query.outletId } } },
      ];
    }

    if (query.search) {
      where.memberProfile = {
        OR: [
          { preferredName: { contains: query.search, mode: 'insensitive' } },
          { user: { firstName: { contains: query.search, mode: 'insensitive' } } },
          { user: { lastName: { contains: query.search, mode: 'insensitive' } } },
          { user: { email: { contains: query.search, mode: 'insensitive' } } },
        ],
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.memberMembership.count({ where }),
      this.prisma.memberMembership.findMany({
        where,
        skip,
        take: limit,
        include: {
          memberProfile: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
          membershipPlan: {
            select: {
              id: true,
              name: true,
              code: true,
              price: true,
              currency: true,
              durationValue: true,
              durationUnit: true,
            },
          },
          accessOutlets: {
            include: {
              outlet: { select: { id: true, name: true, code: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves a single membership by ID with IDOR and Tenant isolation checks.
   */
  async getMembershipById(
    organisationId: string,
    membershipId: string,
    actor: AuthenticatedUser
  ) {
    const membership = await this.prisma.memberMembership.findFirst({
      where: {
        id: membershipId,
        organisationId,
      },
      include: {
        memberProfile: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        membershipPlan: {
          include: {
            entitlements: true,
          },
        },
        accessOutlets: {
          include: {
            outlet: { select: { id: true, name: true, code: true, slug: true } },
          },
        },
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException(`Membership with ID ${membershipId} not found`);
    }

    // IDOR Check: If actor is a member, verify ownership
    const isMemberRole = actor.roles.some((r) => r.role === 'MEMBER');
    const isStaffRole = actor.roles.some((r) =>
      ['SUPERADMIN', 'ORGANISATION_OWNER', 'OUTLET_MANAGER', 'RECEPTION', 'FINANCE', 'TRAINER'].includes(
        r.role
      )
    );

    if (isMemberRole && !isStaffRole && membership.memberProfile.userId !== actor.id) {
      throw new ForbiddenException('You do not have permission to access this membership record');
    }

    return membership;
  }

  /**
   * Returns current active or trial membership for the authenticated user.
   */
  async getActiveMembershipForUser(userId: string) {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Member profile not found for authenticated user');
    }

    const now = new Date();
    const active = await this.prisma.memberMembership.findFirst({
      where: {
        memberProfileId: profile.id,
        status: { in: ['ACTIVE', 'TRIAL'] },
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        membershipPlan: {
          include: {
            entitlements: true,
          },
        },
        accessOutlets: {
          include: {
            outlet: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!active) {
      return null;
    }

    return {
      ...active,
      daysRemaining: this.dateService.calculateDaysRemaining(active.endDate),
    };
  }

  /**
   * Returns all memberships (active and historical) for the authenticated user.
   */
  async getMembershipsForUser(userId: string) {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Member profile not found for authenticated user');
    }

    const memberships = await this.prisma.memberMembership.findMany({
      where: {
        memberProfileId: profile.id,
      },
      include: {
        membershipPlan: {
          include: {
            entitlements: true,
          },
        },
        accessOutlets: {
          include: {
            outlet: { select: { id: true, name: true, code: true } },
          },
        },
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m,
      daysRemaining: this.dateService.calculateDaysRemaining(m.endDate),
    }));
  }

  /**
   * Updates membership parameters (such as autoRenew, endDate) with audit logging.
   */
  async updateMembership(
    organisationId: string,
    membershipId: string,
    dto: any,
    actor: AuthenticatedUser
  ) {
    const membership = await this.prisma.memberMembership.findFirst({
      where: { id: membershipId, organisationId },
    });

    if (!membership) {
      throw new NotFoundException(`Membership with ID ${membershipId} not found`);
    }

    const updated = await this.prisma.memberMembership.update({
      where: { id: membershipId },
      data: {
        ...(dto.autoRenew !== undefined ? { autoRenew: dto.autoRenew } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
      },
    });

    await this.audit.log({
      action: 'MEMBERSHIP_UPDATED',
      resource: 'member_membership',
      resourceId: membershipId,
      organisationId,
      userId: actor.id,
      metadata: { updatedFields: dto },
    });

    return updated;
  }

  /**
   * Evaluates facility access for a member at a given outlet.
   */
  async checkFacilityAccess(memberProfileId: string, outletId: string, entitlementType?: string) {
    return this.accessPolicy.canAccessOutlet(memberProfileId, outletId, entitlementType);
  }
}
