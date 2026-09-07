import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { TrainingPlansService } from './training-plans.service';
import { GenerateWorkoutsFromTemplateDto } from '../dto/training-plan.dto';

@Injectable()
export class TrainingPlanGenerationService {
  private readonly logger = new Logger(TrainingPlanGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly plansService: TrainingPlansService,
  ) {}

  /**
   * Generates workouts across multiple weeks for a training plan from a template.
   * - Transactional
   * - Idempotent (does not overwrite or duplicate existing workouts on a day)
   * - Applies active progression rules
   * - Creates immutable exercise name & instruction snapshots
   */
  async generateWorkouts(
    organisationId: string,
    planId: string,
    dto: GenerateWorkoutsFromTemplateDto,
    actor: AuthenticatedUser,
  ) {
    const plan = await this.plansService.findOne(organisationId, planId, actor);
    await this.plansService.assertCoachingAccess(organisationId, plan.memberProfileId, actor, true);

    // Verify template
    const template = await this.prisma.workoutTemplate.findFirst({
      where: {
        id: dto.workoutTemplateId,
        OR: [{ organisationId }, { organisationId: 'system' }],
        status: { not: 'ARCHIVED' },
      },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: { exercise: true },
        },
      },
    });

    if (!template) {
      throw new NotFoundException({
        code: 'TEMPLATE_NOT_FOUND',
        message: `Workout template '${dto.workoutTemplateId}' not found in organisation`,
      });
    }

    if (template.exercises.length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_TEMPLATE',
        message: 'Cannot generate workouts from a template with no exercises prescribed',
      });
    }

    // Load active progression rules for this plan or template
    const progressionRules = await this.prisma.workoutProgressionRule.findMany({
      where: {
        organisationId,
        active: true,
        OR: [
          { trainingPlanId: plan.id },
          { workoutTemplateId: template.id },
        ],
      },
    });

    const startWeek = dto.startWeek || 1;
    const endWeek = dto.endWeek || plan.durationWeeks;

    if (startWeek > endWeek) {
      throw new BadRequestException('startWeek cannot be greater than endWeek');
    }

    // Filter weeks within the plan that match the requested range
    const targetWeeks = plan.weeks.filter(
      (w: any) => w.weekNumber >= startWeek && w.weekNumber <= endWeek,
    );

    const generatedWorkoutIds: string[] = [];
    const skippedDaysCount = { count: 0 };

    // Execute multi-week generation inside a transaction
    await this.prisma.$transaction(async (tx) => {
      for (const week of targetWeeks) {
        const weekIndex = week.weekNumber - 1; // 0-based for math

        for (const dayNumber of dto.dayNumbers) {
          // 1. Find or create the TrainingPlanDay
          let day = await tx.trainingPlanDay.findFirst({
            where: { trainingPlanWeekId: week.id, dayNumber },
          });

          // IDEMPOTENCY CHECK:
          // If this day already has an active workout, do NOT recreate or duplicate it.
          if (day && day.workoutId) {
            skippedDaysCount.count++;
            continue;
          }

          // Calculate deterministic scheduled date for this day
          const planBaseDate = new Date(plan.startDate);
          // dayNumber 1 = Monday (0 offset), 2 = Tuesday (+1 day), etc.
          const dayOffset = weekIndex * 7 + (dayNumber - 1);
          const scheduledDate = new Date(planBaseDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);

          if (!day) {
            day = await tx.trainingPlanDay.create({
              data: {
                trainingPlanWeekId: week.id,
                dayNumber,
                date: scheduledDate,
                name: `${template.name} - W${week.weekNumber}D${dayNumber}`,
                focus: template.goal || template.name,
                restDay: false,
              },
            });
          } else {
            // Update day date & title if needed
            day = await tx.trainingPlanDay.update({
              where: { id: day.id },
              data: {
                date: scheduledDate,
                name: day.name || `${template.name} - W${week.weekNumber}D${dayNumber}`,
                focus: day.focus || template.goal || template.name,
                restDay: false,
              },
            });
          }

          // 2. Create the executable Workout instance
          const workout = await tx.workout.create({
            data: {
              organisationId,
              memberProfileId: plan.memberProfileId,
              trainerProfileId: plan.trainerProfileId,
              trainingProgramId: plan.trainingProgramId,
              trainingPlanId: plan.id,
              workoutTemplateId: template.id,
              title: `${template.name} (Week ${week.weekNumber})`,
              description: template.description,
              scheduledDate,
              estimatedDurationMinutes: template.estimatedDurationMinutes || 60,
              status: 'ASSIGNED',
            },
          });

          generatedWorkoutIds.push(workout.id);

          // Link workout to training plan day
          await tx.trainingPlanDay.update({
            where: { id: day.id },
            data: { workoutId: workout.id },
          });

          // 3. Clone template exercises into WorkoutExercise with historical snapshots
          for (let i = 0; i < template.exercises.length; i++) {
            const te = template.exercises[i];
            const exercise = te.exercise;

            // Progression calculations
            let targetLoad = te.targetLoad;
            let targetReps = te.targetReps;
            let targetSets = te.targetSets || 3;

            if (dto.applyProgression !== false) {
              const rule = progressionRules.find(
                (r) => !r.exerciseId || r.exerciseId === te.exerciseId,
              );

              if (rule) {
                const config = rule.configuration as Record<string, any>;
                if (rule.progressionType === 'LINEAR_LOAD' && config.loadIncrementKg && targetLoad) {
                  // E.g. +2.5kg per week
                  const freq = config.frequencyWeeks || 1;
                  const step = Math.floor(weekIndex / freq);
                  targetLoad = Number((targetLoad + step * config.loadIncrementKg).toFixed(2));
                } else if (rule.progressionType === 'REP_PROGRESSION' && config.repIncrement && targetReps) {
                  const freq = config.frequencyWeeks || 1;
                  const step = Math.floor(weekIndex / freq);
                  const maxReps = config.maxReps || 15;
                  targetReps = Math.min(targetReps + step * config.repIncrement, maxReps);
                } else if (rule.progressionType === 'SET_PROGRESSION' && config.setIncrement && targetSets) {
                  const freq = config.frequencyWeeks || 1;
                  const step = Math.floor(weekIndex / freq);
                  const maxSets = config.maxSets || 6;
                  targetSets = Math.min(targetSets + step * config.setIncrement, maxSets);
                }
              }
            }

            const workoutExercise = await tx.workoutExercise.create({
              data: {
                workoutId: workout.id,
                exerciseId: te.exerciseId,
                orderIndex: te.orderIndex || i,
                sectionName: te.sectionName || 'MAIN',
                exerciseNameSnapshot: exercise.name,
                instructionSnapshot: exercise.instructions,
                coachingCueSnapshot: Array.isArray(exercise.coachingCues)
                  ? (exercise.coachingCues as string[]).join(', ')
                  : null,
                prescriptionType: te.prescriptionType,
                targetSets,
                targetReps,
                targetLoad,
                targetDurationSeconds: te.targetDurationSeconds,
                targetDistance: te.targetDistance,
                targetRPE: te.targetRPE,
                restSeconds: te.restSeconds || 90,
                notes: te.notes,
                status: 'PENDING',
              },
            });

            // Pre-create set prescription skeletons for the member
            const setsCount = targetSets || 3;
            for (let s = 1; s <= setsCount; s++) {
              await tx.workoutSet.create({
                data: {
                  workoutExerciseId: workoutExercise.id,
                  setNumber: s,
                  targetReps,
                  targetLoad,
                  loadUnit: 'KG',
                  targetDurationSeconds: te.targetDurationSeconds,
                  targetDistance: te.targetDistance,
                  targetRPE: te.targetRPE,
                  completed: false,
                },
              });
            }
          }
        }
      }
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'WORKOUT_GENERATED',
      resource: 'training_plans',
      resourceId: plan.id,
      metadata: {
        planId: plan.id,
        templateId: template.id,
        generatedCount: generatedWorkoutIds.length,
        skippedCount: skippedDaysCount.count,
        generatedWorkoutIds,
      },
    });

    return {
      message: `Workouts generated successfully for training plan '${plan.name}'`,
      generatedCount: generatedWorkoutIds.length,
      skippedCount: skippedDaysCount.count,
      generatedWorkoutIds,
    };
  }
}
