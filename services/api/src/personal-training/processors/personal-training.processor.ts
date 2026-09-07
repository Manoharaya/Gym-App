import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';

export interface CoachingScanResult {
  expiredProgramsCount: number;
  overdueGoalsCount: number;
  expiredProgramIds: string[];
  overdueGoalIds: string[];
}

@Injectable()
export class PersonalTrainingProcessor {
  private readonly logger = new Logger(PersonalTrainingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Scans for programs past endDate and active goals past targetDate.
   * Completely idempotent.
   */
  async processCoachingLifecycle(organisationId?: string): Promise<CoachingScanResult> {
    const now = new Date();

    const expiredProgramIds: string[] = [];
    const overdueGoalIds: string[] = [];

    // 1. Programs that have ended (endDate < now and status == 'ACTIVE')
    const programWhere: any = {
      endDate: { lte: now },
      status: 'ACTIVE',
    };
    if (organisationId) {
      programWhere.organisationId = organisationId;
    }

    const expiredPrograms = await this.prisma.trainingProgram.findMany({
      where: programWhere,
    });

    for (const program of expiredPrograms) {
      await this.prisma.trainingProgram.update({
        where: { id: program.id },
        data: {
          status: 'COMPLETED',
          completedAt: now,
        },
      });

      await this.auditService.log({
        organisationId: program.organisationId,
        action: 'TRAINING_PROGRAM_AUTO_COMPLETED',
        resource: 'training_programs',
        resourceId: program.id,
        metadata: {
          reason: 'Program reached scheduled end date',
          endDate: program.endDate?.toISOString(),
        },
      });

      expiredProgramIds.push(program.id);
    }

    // 2. Active goals past target date that should be marked AT_RISK
    const goalWhere: any = {
      targetDate: { lte: now },
      status: 'ACTIVE',
    };
    if (organisationId) {
      goalWhere.organisationId = organisationId;
    }

    const overdueGoals = await this.prisma.trainingGoal.findMany({
      where: goalWhere,
    });

    for (const goal of overdueGoals) {
      await this.prisma.$transaction([
        this.prisma.trainingGoal.update({
          where: { id: goal.id },
          data: { status: 'AT_RISK' },
        }),
        this.prisma.goalHistory.create({
          data: {
            goalId: goal.id,
            previousStatus: 'ACTIVE',
            newStatus: 'AT_RISK',
            previousValue: goal.currentValue,
            newValue: goal.currentValue,
            changeReason: 'Target date elapsed; marked AT_RISK by background processor',
          },
        }),
      ]);

      overdueGoalIds.push(goal.id);
    }

    this.logger.log(
      `[COACHING PROCESSOR] Completed lifecycle scan: ${expiredProgramIds.length} programs auto-completed, ${overdueGoalIds.length} goals flagged AT_RISK`,
    );

    return {
      expiredProgramsCount: expiredProgramIds.length,
      overdueGoalsCount: overdueGoalIds.length,
      expiredProgramIds,
      overdueGoalIds,
    };
  }
}
