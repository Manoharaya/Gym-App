import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import {
  CreateTrainingGoalDto,
  UpdateTrainingGoalDto,
  UpdateGoalProgressDto,
} from '../dto/personal-training.dto';
import { TrainingProgramService } from './training-program.service';

@Injectable()
export class TrainingGoalService {
  private readonly logger = new Logger(TrainingGoalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly programService: TrainingProgramService,
  ) {}

  /**
   * Creates a member fitness goal.
   * Goals belong permanently to the member.
   */
  async createGoal(
    organisationId: string,
    memberProfileId: string,
    dto: CreateTrainingGoalDto,
    actor: AuthenticatedUser,
  ) {
    await this.programService.assertMemberCoachingAccess(organisationId, memberProfileId, actor);

    // Optional training program link verification
    if (dto.trainingProgramId) {
      const program = await this.prisma.trainingProgram.findFirst({
        where: { id: dto.trainingProgramId, memberProfileId, organisationId },
      });
      if (!program) {
        throw new BadRequestException({
          code: 'TRAINING_PROGRAM_NOT_FOUND',
          message: `Program '${dto.trainingProgramId}' does not belong to this member`,
        });
      }
    }

    const goal = await this.prisma.trainingGoal.create({
      data: {
        organisationId,
        memberProfileId,
        trainingProgramId: dto.trainingProgramId,
        createdById: actor.id,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        baselineValue: dto.baselineValue,
        targetValue: dto.targetValue,
        currentValue: dto.baselineValue,
        unit: dto.unit,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        priority: dto.priority || 1,
        status: 'ACTIVE',
      },
      include: {
        trainingProgram: true,
        memberProfile: { include: { user: true } },
      },
    });

    // Create initial history record
    await this.prisma.goalHistory.create({
      data: {
        goalId: goal.id,
        actorId: actor.id,
        previousStatus: null,
        newStatus: 'ACTIVE',
        previousValue: null,
        newValue: dto.baselineValue || null,
        changeReason: 'Initial goal creation',
      },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'TRAINING_GOAL_CREATED',
      resource: 'training_goals',
      resourceId: goal.id,
      metadata: {
        memberProfileId,
        category: dto.category,
        title: dto.title,
        targetValue: dto.targetValue,
      },
    });

    return goal;
  }

  /**
   * Retrieves all goals for a member.
   */
  async findMemberGoals(
    organisationId: string,
    memberProfileId: string,
    actor: AuthenticatedUser,
    statusFilter?: string,
  ) {
    await this.programService.assertMemberCoachingAccess(organisationId, memberProfileId, actor);

    return this.prisma.trainingGoal.findMany({
      where: {
        organisationId,
        memberProfileId,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        trainingProgram: true,
        history: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Retrieves a single goal by ID.
   */
  async findGoalById(organisationId: string, goalId: string, actor: AuthenticatedUser) {
    const goal = await this.prisma.trainingGoal.findFirst({
      where: { id: goalId, organisationId },
      include: {
        trainingProgram: true,
        memberProfile: { include: { user: true } },
        history: {
          include: { actor: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!goal) {
      throw new NotFoundException({
        code: 'TRAINING_GOAL_NOT_FOUND',
        message: `Goal '${goalId}' not found`,
      });
    }

    await this.programService.assertMemberCoachingAccess(
      organisationId,
      goal.memberProfileId,
      actor,
    );

    return goal;
  }

  /**
   * Updates goal metadata (title, target date, target value, priority).
   */
  async updateGoal(
    organisationId: string,
    goalId: string,
    dto: UpdateTrainingGoalDto,
    actor: AuthenticatedUser,
  ) {
    const goal = await this.findGoalById(organisationId, goalId, actor);

    if (['COMPLETED', 'CANCELLED'].includes(goal.status)) {
      throw new BadRequestException({
        code: 'TRAINING_GOAL_INVALID_STATE',
        message: `Cannot update a goal with status '${goal.status}'`,
      });
    }

    const updated = await this.prisma.trainingGoal.update({
      where: { id: goalId },
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        baselineValue: dto.baselineValue,
        targetValue: dto.targetValue,
        unit: dto.unit,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        priority: dto.priority,
      },
      include: { trainingProgram: true },
    });

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'TRAINING_GOAL_UPDATED',
      resource: 'training_goals',
      resourceId: goalId,
      metadata: { changes: dto },
    });

    return updated;
  }

  /**
   * Records a progress update (new current value and optional status transition).
   * Preserves history in GoalHistory.
   */
  async recordProgress(
    organisationId: string,
    goalId: string,
    dto: UpdateGoalProgressDto,
    actor: AuthenticatedUser,
  ) {
    const goal = await this.findGoalById(organisationId, goalId, actor);

    const newStatus = dto.status || goal.status;
    const isNowCompleted = newStatus === 'COMPLETED';

    const [updated] = await this.prisma.$transaction([
      this.prisma.trainingGoal.update({
        where: { id: goalId },
        data: {
          currentValue: dto.currentValue,
          status: newStatus,
          completedAt: isNowCompleted ? new Date() : goal.completedAt,
        },
        include: { trainingProgram: true },
      }),
      this.prisma.goalHistory.create({
        data: {
          goalId,
          actorId: actor.id,
          previousStatus: goal.status,
          newStatus,
          previousValue: goal.currentValue,
          newValue: dto.currentValue,
          changeReason: dto.notes || 'Progress check-in',
          notes: dto.notes,
        },
      }),
    ]);

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: isNowCompleted ? 'TRAINING_GOAL_COMPLETED' : 'TRAINING_GOAL_PROGRESS_UPDATED',
      resource: 'training_goals',
      resourceId: goalId,
      metadata: {
        previousValue: goal.currentValue,
        newValue: dto.currentValue,
        status: newStatus,
      },
    });

    return updated;
  }

  /**
   * Explicitly marks a goal as completed.
   */
  async completeGoal(organisationId: string, goalId: string, actor: AuthenticatedUser) {
    const goal = await this.findGoalById(organisationId, goalId, actor);

    if (goal.status === 'COMPLETED') {
      return goal;
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.trainingGoal.update({
        where: { id: goalId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      }),
      this.prisma.goalHistory.create({
        data: {
          goalId,
          actorId: actor.id,
          previousStatus: goal.status,
          newStatus: 'COMPLETED',
          previousValue: goal.currentValue,
          newValue: goal.targetValue || goal.currentValue,
          changeReason: 'Goal achieved and marked completed',
        },
      }),
    ]);

    await this.auditService.log({
      userId: actor.id,
      organisationId,
      action: 'TRAINING_GOAL_COMPLETED',
      resource: 'training_goals',
      resourceId: goalId,
      metadata: { previousStatus: goal.status, newStatus: 'COMPLETED' },
    });

    return updated;
  }
}
