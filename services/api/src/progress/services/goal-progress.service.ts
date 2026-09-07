import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { BodyMeasurementService } from './body-measurement.service';

export interface CalculatedGoalProgress {
  id: string;
  title: string;
  category: string;
  baselineValue: number | null;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
  progressPercentage: number;
  isCompleted: boolean;
  isOverdue: boolean;
  direction: 'INCREASING' | 'DECREASING' | 'NEUTRAL';
  targetDate: Date | null;
  status: string;
}

@Injectable()
export class GoalProgressService {
  private readonly logger = new Logger(GoalProgressService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly measurementService: BodyMeasurementService,
  ) {}

  /**
   * Calculates mathematically accurate goal progress for increasing, decreasing, or static goals.
   */
  calculateProgress(
    baseline: number | null,
    target: number | null,
    current: number | null,
  ): { progressPercentage: number; direction: 'INCREASING' | 'DECREASING' | 'NEUTRAL' } {
    if (baseline === null || target === null || current === null) {
      return { progressPercentage: 0, direction: 'NEUTRAL' };
    }

    if (target === baseline) {
      return {
        progressPercentage: current >= target ? 100 : 0,
        direction: 'NEUTRAL',
      };
    }

    // Increasing goal (e.g. Baseline 60, Target 80, Current 70 => (70-60)/(80-60) = 50%)
    if (target > baseline) {
      const percentage = ((current - baseline) / (target - baseline)) * 100;
      return {
        progressPercentage: Number(percentage.toFixed(1)),
        direction: 'INCREASING',
      };
    }

    // Decreasing goal (e.g. Baseline 100, Target 80, Current 90 => (100-90)/(100-80) = 50%)
    const percentage = ((baseline - current) / (baseline - target)) * 100;
    return {
      progressPercentage: Number(percentage.toFixed(1)),
      direction: 'DECREASING',
    };
  }

  /**
   * Retrieves all goals for a member with live progress calculation.
   */
  async getMemberGoalProgress(
    organisationId: string,
    memberProfileId: string,
    actor: AuthenticatedUser,
    statusFilter?: string,
  ): Promise<CalculatedGoalProgress[]> {
    await this.measurementService.assertProgressAccess(organisationId, memberProfileId, actor);

    const goals = await this.prisma.trainingGoal.findMany({
      where: {
        organisationId,
        memberProfileId,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    const now = new Date();

    return goals.map((g) => {
      const { progressPercentage, direction } = this.calculateProgress(
        g.baselineValue,
        g.targetValue,
        g.currentValue,
      );

      const isCompleted = g.status === 'COMPLETED' || progressPercentage >= 100;
      const isOverdue =
        g.targetDate !== null &&
        g.targetDate < now &&
        g.status !== 'COMPLETED';

      return {
        id: g.id,
        title: g.title,
        category: g.category,
        baselineValue: g.baselineValue,
        targetValue: g.targetValue,
        currentValue: g.currentValue,
        unit: g.unit,
        progressPercentage,
        isCompleted,
        isOverdue,
        direction,
        targetDate: g.targetDate,
        status: g.status,
      };
    });
  }

  /**
   * Synchronizes active goal current values with newly recorded measurements or PRs.
   */
  async syncGoalProgressFromMeasurement(
    organisationId: string,
    memberProfileId: string,
    measurementType: string,
    value: number,
  ) {
    let matchingCategory: string | null = null;
    if (measurementType === 'WEIGHT') matchingCategory = 'WEIGHT_LOSS';
    else if (measurementType === 'BODY_FAT_PERCENT') matchingCategory = 'BODY_COMPOSITION';

    if (!matchingCategory) return;

    const goals = await this.prisma.trainingGoal.findMany({
      where: {
        organisationId,
        memberProfileId,
        category: matchingCategory,
        status: 'ACTIVE',
      },
    });

    for (const goal of goals) {
      await this.prisma.trainingGoal.update({
        where: { id: goal.id },
        data: { currentValue: value },
      });

      await this.prisma.goalHistory.create({
        data: {
          goalId: goal.id,
          previousValue: goal.currentValue,
          newValue: value,
          newStatus: goal.status,
          changeReason: `Auto-updated from body measurement ${measurementType}`,
        },
      });
    }
  }
}
