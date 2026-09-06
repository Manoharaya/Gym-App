import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateMembershipPlanDto,
  UpdateMembershipPlanDto,
} from './dto/membership-domain.dto';

@Injectable()
export class MembershipPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async createPlan(organisationId: string, dto: CreateMembershipPlanDto, actorId: string) {
    const existing = await this.prisma.membershipPlan.findUnique({
      where: {
        organisationId_code: {
          organisationId,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Membership plan with code ${dto.code} already exists for this organization`
      );
    }

    const plan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.membershipPlan.create({
        data: {
          organisationId,
          name: dto.name,
          description: dto.description,
          code: dto.code,
          status: dto.status ?? 'ACTIVE',
          membershipType: dto.membershipType ?? 'STANDARD',
          billingType: dto.billingType ?? 'RECURRING',
          durationValue: dto.durationValue,
          durationUnit: dto.durationUnit,
          price: dto.price,
          currency: dto.currency ?? 'AUD',
          trialDuration: dto.trialDuration,
          isPublic: dto.isPublic ?? true,
          requiresApproval: dto.requiresApproval ?? false,
        },
      });

      // Link to outlets
      if (dto.outletIds && dto.outletIds.length > 0) {
        for (const outletId of dto.outletIds) {
          await tx.membershipPlanOutlet.create({
            data: {
              membershipPlanId: created.id,
              outletId,
            },
          });
        }
      }

      // Add entitlements
      if (dto.entitlements && dto.entitlements.length > 0) {
        for (const ent of dto.entitlements) {
          await tx.membershipEntitlement.create({
            data: {
              membershipPlanId: created.id,
              type: ent.type,
              name: ent.name,
              description: ent.description,
              value: ent.value,
              metadata: ent.metadata,
            },
          });
        }
      }

      return created;
    });

    await this.audit.log({
      action: 'MEMBERSHIP_PLAN_CREATED',
      resource: 'membership_plan',
      resourceId: plan.id,
      organisationId,
      userId: actorId,
      metadata: { code: dto.code, name: dto.name, price: dto.price },
    });

    return this.getPlanById(organisationId, plan.id);
  }

  async updatePlan(
    organisationId: string,
    planId: string,
    dto: UpdateMembershipPlanDto,
    actorId: string
  ) {
    const existing = await this.prisma.membershipPlan.findFirst({
      where: { id: planId, organisationId },
    });

    if (!existing) {
      throw new NotFoundException(`Membership plan with ID ${planId} not found`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const plan = await tx.membershipPlan.update({
        where: { id: planId },
        data: {
          name: dto.name,
          description: dto.description,
          status: dto.status,
          price: dto.price,
          isPublic: dto.isPublic,
        },
      });

      if (dto.outletIds) {
        await tx.membershipPlanOutlet.deleteMany({ where: { membershipPlanId: planId } });
        for (const outletId of dto.outletIds) {
          await tx.membershipPlanOutlet.create({
            data: { membershipPlanId: planId, outletId },
          });
        }
      }

      if (dto.entitlements) {
        await tx.membershipEntitlement.deleteMany({ where: { membershipPlanId: planId } });
        for (const ent of dto.entitlements) {
          await tx.membershipEntitlement.create({
            data: {
              membershipPlanId: planId,
              type: ent.type,
              name: ent.name,
              description: ent.description,
              value: ent.value,
              metadata: ent.metadata,
            },
          });
        }
      }

      return plan;
    });

    await this.audit.log({
      action: 'MEMBERSHIP_PLAN_UPDATED',
      resource: 'membership_plan',
      resourceId: planId,
      organisationId,
      userId: actorId,
      metadata: { changes: dto },
    });

    return this.getPlanById(organisationId, updated.id);
  }

  async archivePlan(organisationId: string, planId: string, actorId: string) {
    const plan = await this.prisma.membershipPlan.findFirst({
      where: { id: planId, organisationId },
    });

    if (!plan) {
      throw new NotFoundException(`Membership plan with ID ${planId} not found`);
    }

    const archived = await this.prisma.membershipPlan.update({
      where: { id: planId },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    await this.audit.log({
      action: 'MEMBERSHIP_PLAN_ARCHIVED',
      resource: 'membership_plan',
      resourceId: planId,
      organisationId,
      userId: actorId,
    });

    return archived;
  }

  async getPlans(
    organisationId: string,
    filters?: {
      status?: string;
      outletId?: string;
      membershipType?: string;
      billingType?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters?.page ? Math.max(1, Number(filters.page)) : 1;
    const limit = filters?.limit ? Math.min(100, Math.max(1, Number(filters.limit))) : 20;
    const skip = (page - 1) * limit;

    const where: any = { organisationId };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.membershipType) {
      where.membershipType = filters.membershipType;
    }
    if (filters?.billingType) {
      where.billingType = filters.billingType;
    }
    if (filters?.outletId) {
      where.planOutlets = {
        some: { outletId: filters.outletId },
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.membershipPlan.count({ where }),
      this.prisma.membershipPlan.findMany({
        where,
        skip,
        take: limit,
        include: {
          planOutlets: { include: { outlet: { select: { id: true, name: true, slug: true, code: true } } } },
          entitlements: true,
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

  async getPlanById(organisationId: string, planId: string) {
    const plan = await this.prisma.membershipPlan.findFirst({
      where: { id: planId, organisationId },
      include: {
        planOutlets: { include: { outlet: { select: { id: true, name: true, slug: true, code: true } } } },
        entitlements: true,
      },
    });

    if (!plan) {
      throw new NotFoundException(`Membership plan with ID ${planId} not found`);
    }

    return plan;
  }

  async getPlanEntitlements(organisationId: string, planId: string) {
    const plan = await this.getPlanById(organisationId, planId);
    return plan.entitlements;
  }
}
