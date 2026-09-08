import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AIContextPermissionService } from './ai-context-permission.service';
import { SensitiveDataSanitizerService } from './sensitive-data-sanitizer.service';
import { AIFeature, AIContextSource, MemberAIContext } from '@fitcore/types';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';

export interface ContextBuildOptions {
  feature: AIFeature;
  organisationId: string;
  memberId?: string;
  user: AuthenticatedUser;
  requestedSources?: AIContextSource[];
}

@Injectable()
export class AIContextEngineService {
  private readonly logger = new Logger(AIContextEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: AIContextPermissionService,
    private readonly sanitizer: SensitiveDataSanitizerService,
  ) {}

  /**
   * Builds bounded, sanitized, and authorized context for an AI request.
   */
  async buildContext(options: ContextBuildOptions): Promise<{
    memberContext?: MemberAIContext;
    activeSources: AIContextSource[];
  }> {
    const { feature, organisationId, memberId, user } = options;

    // Default requested sources if not specified
    const requestedSources: AIContextSource[] = options.requestedSources || [
      'MEMBER_PROFILE',
      'MEMBERSHIP',
      'TRAINING',
      'PROGRESS',
      'ENGAGEMENT',
    ];

    // Filter by feature permissions
    const authorizedSources = this.permissionService.filterAuthorizedSources(feature, requestedSources);

    if (!memberId) {
      return { activeSources: authorizedSources };
    }

    // Enforce Tenant & Role Boundaries (Slice 46 & 47)
    await this.validateMemberAccess(user, memberId, organisationId);

    // Fetch authorized domain slices
    const memberContext = await this.assembleMemberContext(memberId, authorizedSources);
    const sanitizedContext = this.sanitizer.sanitizeMemberAIContext(memberContext);

    return {
      memberContext: sanitizedContext,
      activeSources: authorizedSources,
    };
  }

  /**
   * Enforces Slice 46 (Trainer boundary) and Slice 47 (Member boundary).
   */
  private async validateMemberAccess(user: AuthenticatedUser, memberId: string, organisationId: string) {
    const member = await this.prisma.memberProfile.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!member || member.organisationId !== organisationId) {
      throw new NotFoundException(`Member '${memberId}' not found in organisation '${organisationId}'`);
    }

    const userRoles = (user.roles || []).map((r: any) => (typeof r === 'string' ? r : r.role));
    const isSuperAdmin = user.isSuperAdmin || userRoles.includes('SUPERADMIN');
    const isOwner = userRoles.includes('ORGANISATION_OWNER');
    const isManager = userRoles.includes('OUTLET_MANAGER');

    if (isSuperAdmin || isOwner || isManager) {
      return; // Authorized across organisation/platform
    }

    // Member self-access check
    if (userRoles.includes('MEMBER') && !userRoles.includes('TRAINER')) {
      if (member.userId !== user.id) {
        throw new ForbiddenException('Members can only request AI using their own authorized context');
      }
      return;
    }

    // Trainer client assignment check (Slice 46)
    if (userRoles.includes('TRAINER')) {
      const trainerProfile = await this.prisma.trainerProfile.findFirst({
        where: { staffProfile: { userId: user.id } },
      });

      if (!trainerProfile) {
        throw new ForbiddenException('Trainer profile not found');
      }

      const assignment = await this.prisma.trainerClientAssignment.findFirst({
        where: {
          trainerProfileId: trainerProfile.id,
          memberProfileId: memberId,
          status: 'ACTIVE',
        },
      });

      if (!assignment) {
        throw new ForbiddenException(
          `Trainer '${user.id}' is not assigned to member '${memberId}'. AI context access denied.`,
        );
      }
    }
  }

  /**
   * Assembles the permitted domain objects.
   */
  private async assembleMemberContext(
    memberId: string,
    authorizedSources: AIContextSource[],
  ): Promise<Partial<MemberAIContext>> {
    const context: Partial<MemberAIContext> = {
      identity: { memberId },
      membership: { status: 'UNKNOWN' },
      training: { recentWorkouts: [], upcomingSessions: [] },
      progress: { goals: [], recentProgress: [] },
      nutrition: {},
      engagement: { recentActivity: [] },
    };

    // 1. Identity & MemberProfile
    if (authorizedSources.includes('MEMBER_PROFILE')) {
      const profile = await this.prisma.memberProfile.findUnique({
        where: { id: memberId },
        include: { user: true },
      });

      if (profile) {
        context.identity = {
          memberId: profile.id,
          firstName: profile.user.firstName,
          gender: profile.gender || undefined,
          age: profile.dateOfBirth
            ? Math.floor((Date.now() - new Date(profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : undefined,
        };
      }
    }

    // 2. Membership
    if (authorizedSources.includes('MEMBERSHIP')) {
      const membership = await this.prisma.memberMembership.findFirst({
        where: { memberProfileId: memberId },
        orderBy: { createdAt: 'desc' },
      });

      if (membership) {
        context.membership = {
          status: membership.status,
          plan: membership.planNameAtPurchase,
          expiryDate: membership.endDate ? membership.endDate.toISOString() : undefined,
        };
      }
    }

    // 3. Training
    if (authorizedSources.includes('TRAINING')) {
      const recentWorkouts = await this.prisma.workout.findMany({
        where: { memberProfileId: memberId, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          estimatedDurationMinutes: true,
          completedAt: true,
        },
      });

      context.training = {
        recentWorkouts,
        upcomingSessions: [],
      };
    }

    // 4. Progress & Goals
    if (authorizedSources.includes('PROGRESS')) {
      const goals = await this.prisma.trainingGoal.findMany({
        where: { memberProfileId: memberId, status: 'ACTIVE' },
        take: 5,
        select: {
          id: true,
          title: true,
          category: true,
          targetValue: true,
          currentValue: true,
          unit: true,
          targetDate: true,
        },
      });

      context.progress = {
        goals,
        recentProgress: [],
      };
    }

    // 5. Nutrition
    if (authorizedSources.includes('NUTRITION')) {
      const target = await this.prisma.nutritionTarget.findFirst({
        where: { memberProfileId: memberId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        select: {
          dailyCalories: true,
          proteinGrams: true,
          carbohydrateGrams: true,
          fatGrams: true,
        },
      });

      context.nutrition = {
        targets: target || undefined,
      };
    }

    // 6. Engagement
    if (authorizedSources.includes('ENGAGEMENT')) {
      const engagement = await this.prisma.memberEngagementProfile.findUnique({
        where: { memberId },
      });

      if (engagement) {
        context.engagement = {
          recentActivity: [],
          streak: engagement.currentStreak,
          engagementLevel: engagement.engagementLevel,
          points: 0,
        };
      }
    }

    // 7. Wearable Health Data (Day 23 Foundation for Day 24 AI Intelligence)
    if (authorizedSources.includes('WEARABLE_HEALTH_DATA')) {
      const activeConnections = await this.prisma.wearableConnection.findMany({
        where: { memberId, status: 'CONNECTED' },
        select: { provider: true },
      });

      if (activeConnections.length > 0) {
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        const todayRecords = await this.prisma.healthDataRecord.findMany({
          where: { memberId, startTime: { gte: todayStart } },
        });

        let steps = 0;
        let activeCalories = 0;
        let distanceKm = 0;
        let restingHeartRate: number | null = null;

        for (const rec of todayRecords) {
          if (rec.dataType === 'STEPS') steps += Math.round(rec.value);
          if (rec.dataType === 'ACTIVE_CALORIES') activeCalories += Math.round(rec.value);
          if (rec.dataType === 'DISTANCE') distanceKm += rec.value;
          if (rec.dataType === 'RESTING_HEART_RATE') restingHeartRate = Math.round(rec.value);
        }

        context.wearables = {
          connectedProviders: activeConnections.map((c) => c.provider),
          todayActivity: {
            steps,
            activeCaloriesKcal: activeCalories,
            distanceKm: Number(distanceKm.toFixed(2)),
            restingHeartRateBpm: restingHeartRate,
          },
        };
      }
    }

    return context;
  }
}
