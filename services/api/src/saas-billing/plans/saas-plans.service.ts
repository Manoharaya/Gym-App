import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateSaasPlanDto,
  CreatePlanVersionDto,
  SaasPlanStatusEnum,
  SaasPlanVisibilityEnum,
} from '../dto/saas-billing.dto';

@Injectable()
export class SaasPlansService {
  private readonly logger = new Logger(SaasPlansService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists active and public plans for gym customers, or all plans for superadmin.
   */
  async listPlans(includeInternal: boolean = false) {
    const where = includeInternal
      ? {}
      : {
          status: 'ACTIVE',
          visibility: { in: ['PUBLIC', 'INVITE_ONLY'] },
        };

    return this.prisma.saasPlan.findMany({
      where,
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            entitlements: {
              include: { entitlement: true },
            },
          },
        },
      },
      orderBy: { basePriceMinor: 'asc' },
    });
  }

  /**
   * Retrieves plan by ID or unique code with latest version details.
   */
  async getPlanByIdOrCode(idOrCode: string) {
    const plan = await this.prisma.saasPlan.findFirst({
      where: {
        OR: [{ id: idOrCode }, { code: idOrCode }],
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          include: {
            entitlements: {
              include: { entitlement: true },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`SaaS Plan ${idOrCode} not found`);
    }

    return plan;
  }

  /**
   * Creates a new SaaS Plan along with its initial Version (Version 1).
   */
  async createPlan(dto: CreateSaasPlanDto) {
    const existing = await this.prisma.saasPlan.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`SaaS Plan code ${dto.code} already exists`);
    }

    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.saasPlan.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description,
          visibility: dto.visibility || SaasPlanVisibilityEnum.PUBLIC,
          billingInterval: dto.billingInterval || 'MONTHLY',
          basePriceMinor: dto.basePriceMinor,
          currency: dto.currency || 'AUD',
          trialDays: dto.trialDays ?? 14,
          version: 1,
          status: SaasPlanStatusEnum.ACTIVE,
        },
      });

      const version = await tx.saasPlanVersion.create({
        data: {
          planId: plan.id,
          version: 1,
          basePriceMinor: dto.basePriceMinor,
          currency: dto.currency || 'AUD',
          billingInterval: dto.billingInterval || 'MONTHLY',
          trialDays: dto.trialDays ?? 14,
          changeNotes: 'Initial Plan Release',
        },
      });

      // Bind entitlements if specified
      if (dto.entitlements && dto.entitlements.length > 0) {
        for (const entConfig of dto.entitlements) {
          let ent = await tx.saasEntitlement.findUnique({
            where: { code: entConfig.entitlementCode },
          });

          if (!ent) {
            const inferredMeterKey = entConfig.entitlementCode.endsWith('_LIMIT')
              ? entConfig.entitlementCode.replace(/_LIMIT$/, '')
              : entConfig.entitlementCode;

            ent = await tx.saasEntitlement.create({
              data: {
                code: entConfig.entitlementCode,
                name: entConfig.entitlementCode.replace(/_/g, ' '),
                type: entConfig.limitType,
                meterKey: inferredMeterKey,
              },
            });
          }

          await tx.saasPlanEntitlement.create({
            data: {
              planVersionId: version.id,
              entitlementId: ent.id,
              limitType: entConfig.limitType,
              includedAllowance: entConfig.includedAllowance,
              overageAllowed: entConfig.overageAllowed ?? false,
              overageUnitMinor: entConfig.overageUnitMinor ?? 0,
              overageBatchSize: entConfig.overageBatchSize ?? 1,
              softLimitThresholdPercent: entConfig.softLimitThresholdPercent ?? 80,
            },
          });
        }
      }

      return tx.saasPlan.findUnique({
        where: { id: plan.id },
        include: {
          versions: {
            where: { id: version.id },
            include: {
              entitlements: {
                include: { entitlement: true },
              },
            },
          },
        },
      });
    });
  }

  /**
   * Creates a new immutable plan version. Historical subscriptions remain on their existing version!
   */
  async createPlanVersion(planId: string, dto: CreatePlanVersionDto) {
    const plan = await this.prisma.saasPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found`);
    }

    const nextVersionNumber = plan.version + 1;

    return this.prisma.$transaction(async (tx) => {
      const version = await tx.saasPlanVersion.create({
        data: {
          planId: plan.id,
          version: nextVersionNumber,
          basePriceMinor: dto.basePriceMinor,
          currency: dto.currency || plan.currency,
          billingInterval: dto.billingInterval || plan.billingInterval,
          trialDays: dto.trialDays ?? plan.trialDays,
          changeNotes: dto.changeNotes || `Version ${nextVersionNumber}`,
        },
      });

      if (dto.entitlements && dto.entitlements.length > 0) {
        for (const entConfig of dto.entitlements) {
          let ent = await tx.saasEntitlement.findUnique({
            where: { code: entConfig.entitlementCode },
          });

          if (!ent) {
            const inferredMeterKey = entConfig.entitlementCode.endsWith('_LIMIT')
              ? entConfig.entitlementCode.replace(/_LIMIT$/, '')
              : entConfig.entitlementCode;

            ent = await tx.saasEntitlement.create({
              data: {
                code: entConfig.entitlementCode,
                name: entConfig.entitlementCode.replace(/_/g, ' '),
                type: entConfig.limitType,
                meterKey: inferredMeterKey,
              },
            });
          }

          await tx.saasPlanEntitlement.create({
            data: {
              planVersionId: version.id,
              entitlementId: ent.id,
              limitType: entConfig.limitType,
              includedAllowance: entConfig.includedAllowance,
              overageAllowed: entConfig.overageAllowed ?? false,
              overageUnitMinor: entConfig.overageUnitMinor ?? 0,
              overageBatchSize: entConfig.overageBatchSize ?? 1,
              softLimitThresholdPercent: entConfig.softLimitThresholdPercent ?? 80,
            },
          });
        }
      }

      await tx.saasPlan.update({
        where: { id: plan.id },
        data: {
          version: nextVersionNumber,
          basePriceMinor: dto.basePriceMinor,
          currency: dto.currency || plan.currency,
          billingInterval: dto.billingInterval || plan.billingInterval,
          trialDays: dto.trialDays ?? plan.trialDays,
        },
      });

      return version;
    });
  }

  /**
   * Retires a plan so no new subscriptions can be created with it.
   */
  async retirePlan(planId: string) {
    const plan = await this.prisma.saasPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found`);
    }

    return this.prisma.saasPlan.update({
      where: { id: planId },
      data: {
        status: SaasPlanStatusEnum.RETIRED,
        retiredAt: new Date(),
      },
    });
  }
}
