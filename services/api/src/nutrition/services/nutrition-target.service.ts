import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { NutritionProfileService } from './nutrition-profile.service';
import { SetNutritionTargetDto, TargetSourceEnum } from '../dto/nutrition.dto';

@Injectable()
export class NutritionTargetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly profileService: NutritionProfileService,
  ) {}

  /**
   * Configure or update nutrition target for a member with historical preservation.
   * When a new target is set, existing active targets are retired to HISTORICAL.
   */
  async setTarget(
    organisationId: string,
    memberProfileId: string,
    dto: SetNutritionTargetDto,
    actor: AuthenticatedUser,
  ) {
    await this.profileService.assertNutritionAccess(organisationId, memberProfileId, actor);

    // Determine source if not explicitly provided
    const isTrainerOrStaff = actor.roles?.some((r) =>
      ['TRAINER', 'OUTLET_MANAGER', 'ORGANISATION_OWNER', 'SUPERADMIN'].includes(r.role),
    );
    const source =
      dto.source ??
      (isTrainerOrStaff ? TargetSourceEnum.TRAINER_ASSIGNED : TargetSourceEnum.MEMBER_DEFINED);

    const now = new Date();
    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : now;

    // Retire existing active targets to HISTORICAL
    await this.prisma.nutritionTarget.updateMany({
      where: {
        memberProfileId,
        status: 'ACTIVE',
      },
      data: {
        status: 'HISTORICAL',
        effectiveTo: now,
      },
    });

    const newTarget = await this.prisma.nutritionTarget.create({
      data: {
        organisationId,
        memberProfileId,
        dailyCalories: dto.dailyCalories,
        proteinGrams: dto.proteinGrams,
        carbohydrateGrams: dto.carbohydrateGrams,
        fatGrams: dto.fatGrams,
        fiberGrams: dto.fiberGrams ?? null,
        waterMl: dto.waterMl ?? null,
        minCalories: dto.minCalories ?? null,
        maxCalories: dto.maxCalories ?? null,
        minProtein: dto.minProtein ?? null,
        effectiveFrom,
        source,
        assignedById: actor.id,
        status: 'ACTIVE',
        notes: dto.notes ?? null,
      },
    });

    await this.auditService.log({
      userId: actor.id,
      action: 'NUTRITION_TARGET_CREATED',
      resource: 'nutrition',
      resourceId: newTarget.id,
      organisationId,
      metadata: {
        memberProfileId,
        dailyCalories: newTarget.dailyCalories,
        proteinGrams: newTarget.proteinGrams,
        source: newTarget.source,
      },
    });

    return newTarget;
  }

  /**
   * Get the current active nutrition target for a member.
   */
  async getActiveTarget(
    organisationId: string,
    memberProfileId: string,
    actor: AuthenticatedUser,
  ) {
    await this.profileService.assertNutritionAccess(organisationId, memberProfileId, actor);

    const activeTarget = await this.prisma.nutritionTarget.findFirst({
      where: {
        organisationId,
        memberProfileId,
        status: 'ACTIVE',
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (activeTarget) {
      return activeTarget;
    }

    // Default neutral target if none configured
    return {
      id: 'default-target',
      organisationId,
      memberProfileId,
      dailyCalories: 2000,
      proteinGrams: 150,
      carbohydrateGrams: 200,
      fatGrams: 65,
      fiberGrams: 30,
      waterMl: 2500,
      source: TargetSourceEnum.DEFAULT,
      status: 'ACTIVE',
      effectiveFrom: new Date().toISOString(),
      isDefault: true,
    };
  }

  /**
   * Get target change history to observe progression and adjustments over time.
   */
  async getTargetHistory(
    organisationId: string,
    memberProfileId: string,
    actor: AuthenticatedUser,
  ) {
    await this.profileService.assertNutritionAccess(organisationId, memberProfileId, actor);

    return this.prisma.nutritionTarget.findMany({
      where: { organisationId, memberProfileId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}
