import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import {
  CreateNutritionProfileDto,
  UpdateNutritionProfileDto,
  CreateDietaryPreferenceDto,
} from '../dto/nutrition.dto';

@Injectable()
export class NutritionProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Enforce zero-trust multi-tenant and role-based access for sensitive nutrition and dietary data.
   * - Strict denial for FINANCE and RECEPTION roles.
   * - Self-only for members.
   * - Assigned-clients only for trainers.
   * - Tenant isolation for all operations.
   */
  async assertNutritionAccess(
    organisationId: string,
    memberProfileId: string,
    actor?: AuthenticatedUser,
  ): Promise<void> {
    if (!actor) return;

    // 1. Strict denial for FINANCE role
    const hasFinanceRole = actor.roles?.some((r) => r.role === 'FINANCE');
    if (hasFinanceRole && !actor.isSuperAdmin) {
      throw new ForbiddenException({
        code: 'ACCESS_DENIED_FINANCE_RESTRICTION',
        message: 'Finance role does not have authorization to access sensitive nutrition or health data',
      });
    }

    // 2. Strict denial for RECEPTION role (receptionists manage check-ins/front-desk, not medical/nutrition)
    const hasReceptionRole = actor.roles?.some((r) => r.role === 'RECEPTION');
    if (hasReceptionRole && !actor.isSuperAdmin) {
      throw new ForbiddenException({
        code: 'ACCESS_DENIED_RECEPTION_RESTRICTION',
        message: 'Reception role does not have authorization to access sensitive nutrition records',
      });
    }

    if (actor.isSuperAdmin) {
      return;
    }

    // 3. Verify member exists in target organisation
    const member = await this.prisma.memberProfile.findFirst({
      where: { id: memberProfileId, organisationId },
      include: {
        memberOutlets: true,
      },
    });

    if (!member) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: `Member profile '${memberProfileId}' not found in organisation '${organisationId}'`,
      });
    }

    // 4. Member self-access
    const isSelf = member.userId === actor.id;
    if (isSelf) {
      return;
    }

    // 5. Organisation Owner
    const isOrgOwner = actor.roles?.some(
      (r) => r.role === 'ORGANISATION_OWNER' && r.organisationId === organisationId,
    );
    if (isOrgOwner) {
      return;
    }

    // 6. Outlet Manager
    const outletRoles = actor.roles?.filter((r) => r.role === 'OUTLET_MANAGER');
    if (outletRoles && outletRoles.length > 0) {
      const managerOutletIds = outletRoles.map((r) => r.outletId).filter(Boolean);
      const hasSharedOutlet = member.memberOutlets.some((mo) =>
        managerOutletIds.includes(mo.outletId),
      );
      if (hasSharedOutlet) {
        return;
      }
    }

    // 7. Trainer assigned-client access
    const isTrainer = actor.roles?.some((r) => r.role === 'TRAINER');
    if (isTrainer) {
      const trainer = await this.prisma.trainerProfile.findFirst({
        where: { staffProfile: { userId: actor.id }, organisationId },
      });

      if (trainer) {
        const assignment = await this.prisma.trainerClientAssignment.findFirst({
          where: {
            trainerProfileId: trainer.id,
            memberProfileId,
            status: 'ACTIVE',
          },
        });
        if (assignment) {
          return;
        }
      }

      throw new ForbiddenException({
        code: 'TRAINER_UNASSIGNED_CLIENT',
        message: 'Trainer does not have an active client assignment for this member',
      });
    }

    throw new ForbiddenException({
      code: 'FORBIDDEN_NUTRITION_ACCESS',
      message: 'You do not have permission to access nutrition data for this member',
    });
  }

  /**
   * Get member nutrition profile, automatically creating a clean default if none exists yet.
   */
  async getProfile(
    organisationId: string,
    memberProfileId: string,
    actor: AuthenticatedUser,
  ) {
    await this.assertNutritionAccess(organisationId, memberProfileId, actor);

    let profile = await this.prisma.nutritionProfile.findUnique({
      where: { memberProfileId },
    });

    if (!profile) {
      profile = await this.prisma.nutritionProfile.create({
        data: {
          organisationId,
          memberProfileId,
          dietaryPattern: 'OMNIVORE',
          preferredUnits: 'METRIC',
          status: 'ACTIVE',
        },
      });
    }

    const preferences = await this.prisma.dietaryPreference.findMany({
      where: { organisationId, memberProfileId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...profile,
      preferences,
    };
  }

  /**
   * Upsert member nutrition profile with preferences and restrictions.
   */
  async createOrUpdateProfile(
    organisationId: string,
    memberProfileId: string,
    dto: CreateNutritionProfileDto | UpdateNutritionProfileDto,
    actor: AuthenticatedUser,
  ) {
    await this.assertNutritionAccess(organisationId, memberProfileId, actor);

    const existing = await this.prisma.nutritionProfile.findUnique({
      where: { memberProfileId },
    });

    const data: any = {
      dietaryPattern: dto.dietaryPattern ?? existing?.dietaryPattern ?? 'OMNIVORE',
      activityLevel: dto.activityLevel ?? existing?.activityLevel ?? null,
      nutritionGoal: dto.nutritionGoal ?? existing?.nutritionGoal ?? null,
      preferredUnits: dto.preferredUnits ?? existing?.preferredUnits ?? 'METRIC',
      timezone: dto.timezone ?? existing?.timezone ?? 'Australia/Perth',
      allergies: dto.allergies ?? existing?.allergies ?? [],
      intolerances: dto.intolerances ?? existing?.intolerances ?? [],
      foodsAvoided: dto.foodsAvoided ?? existing?.foodsAvoided ?? [],
      dietaryRestrictions: dto.dietaryRestrictions ?? existing?.dietaryRestrictions ?? null,
      notes: dto.notes ?? existing?.notes ?? null,
      status: 'ACTIVE',
    };

    const updated = await this.prisma.nutritionProfile.upsert({
      where: { memberProfileId },
      create: {
        organisationId,
        memberProfileId,
        ...data,
      },
      update: data,
    });

    await this.auditService.log({
      userId: actor.id,
      action: 'NUTRITION_PROFILE_UPDATED',
      resource: 'nutrition',
      resourceId: updated.id,
      organisationId,
      metadata: { memberProfileId, dietaryPattern: updated.dietaryPattern },
    });

    return updated;
  }

  /**
   * Add a structured dietary preference, allergy, or food avoidance record.
   */
  async addDietaryPreference(
    organisationId: string,
    memberProfileId: string,
    dto: CreateDietaryPreferenceDto,
    actor: AuthenticatedUser,
  ) {
    await this.assertNutritionAccess(organisationId, memberProfileId, actor);

    const preference = await this.prisma.dietaryPreference.create({
      data: {
        organisationId,
        memberProfileId,
        preferenceType: dto.preferenceType,
        itemName: dto.itemName.trim(),
        severity: dto.severity ?? null,
        notes: dto.notes ?? null,
      },
    });

    // Sync item with NutritionProfile arrays
    const profile = await this.prisma.nutritionProfile.findUnique({
      where: { memberProfileId },
    });

    if (profile) {
      const item = dto.itemName.trim();
      if (dto.preferenceType === 'ALLERGY' && !profile.allergies.includes(item)) {
        await this.prisma.nutritionProfile.update({
          where: { memberProfileId },
          data: { allergies: { push: item } },
        });
      } else if (dto.preferenceType === 'INTOLERANCE' && !profile.intolerances.includes(item)) {
        await this.prisma.nutritionProfile.update({
          where: { memberProfileId },
          data: { intolerances: { push: item } },
        });
      } else if (dto.preferenceType === 'AVOID' && !profile.foodsAvoided.includes(item)) {
        await this.prisma.nutritionProfile.update({
          where: { memberProfileId },
          data: { foodsAvoided: { push: item } },
        });
      }
    }

    return preference;
  }

  /**
   * Delete a dietary preference.
   */
  async deleteDietaryPreference(
    organisationId: string,
    memberProfileId: string,
    preferenceId: string,
    actor: AuthenticatedUser,
  ) {
    await this.assertNutritionAccess(organisationId, memberProfileId, actor);

    const preference = await this.prisma.dietaryPreference.findFirst({
      where: { id: preferenceId, organisationId, memberProfileId },
    });

    if (!preference) {
      throw new NotFoundException('Dietary preference record not found');
    }

    await this.prisma.dietaryPreference.delete({
      where: { id: preferenceId },
    });

    return { success: true };
  }
}
