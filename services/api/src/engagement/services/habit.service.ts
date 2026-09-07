import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { StreakService } from './streak.service';
import {
  CreateHabitDto,
  UpdateHabitDto,
  AssignMemberHabitDto,
  LogHabitCompletionDto,
} from '../dto/engagement.dto';
import { HabitStatus, HabitCategory, HabitFrequency } from '@fitcore/types';

@Injectable()
export class HabitService {
  private readonly logger = new Logger(HabitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly streakService: StreakService,
  ) {}

  /**
   * List available habits (catalog + organisation specific).
   */
  async getHabits(organisationId: string, category?: HabitCategory) {
    return this.prisma.habit.findMany({
      where: {
        active: true,
        OR: [{ organisationId: null }, { organisationId }],
        ...(category ? { category } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create custom habit definition.
   */
  async createHabit(organisationId: string, dto: CreateHabitDto, actorUserId: string) {
    const habit = await this.prisma.habit.create({
      data: {
        organisationId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        frequency: dto.frequency ?? HabitFrequency.DAILY,
        target: dto.target,
        unit: dto.unit,
        active: dto.active ?? true,
      },
    });

    await this.audit.log({
      userId: actorUserId,
      organisationId,
      action: 'CREATE',
      resource: 'habits',
      resourceId: habit.id,
      metadata: { name: habit.name, category: habit.category },
    });

    return habit;
  }

  /**
   * Assign habit to a member (Self or Trainer within coaching scope).
   */
  async assignMemberHabit(
    organisationId: string,
    memberId: string,
    dto: AssignMemberHabitDto,
    assignedByUserId: string,
  ) {
    const habit = await this.prisma.habit.findUnique({
      where: { id: dto.habitId },
    });

    if (!habit || (habit.organisationId && habit.organisationId !== organisationId)) {
      throw new NotFoundException('Habit definition not found');
    }

    const memberHabit = await this.prisma.memberHabit.create({
      data: {
        organisationId,
        memberId,
        habitId: dto.habitId,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        target: dto.target ?? habit.target,
        frequency: dto.frequency ?? habit.frequency,
        status: HabitStatus.ACTIVE,
        createdById: assignedByUserId,
      },
      include: { habit: true },
    });

    return memberHabit;
  }

  /**
   * List active/all habits for a member.
   */
  async getMemberHabits(memberId: string, organisationId: string, status?: HabitStatus) {
    return this.prisma.memberHabit.findMany({
      where: {
        memberId,
        organisationId,
        ...(status ? { status } : {}),
      },
      include: {
        habit: true,
        completions: {
          orderBy: { date: 'desc' },
          take: 7, // Last 7 days preview
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Logs a daily completion for a member habit.
   * Idempotent per day. Recalculates streaks using member timezone.
   */
  async logCompletion(
    organisationId: string,
    memberId: string,
    memberHabitId: string,
    dto: LogHabitCompletionDto,
  ) {
    const memberHabit = await this.prisma.memberHabit.findUnique({
      where: { id: memberHabitId },
      include: { memberProfile: { select: { timezone: true } } },
    });

    if (!memberHabit || memberHabit.memberId !== memberId || memberHabit.organisationId !== organisationId) {
      throw new NotFoundException('Member habit not found or unauthorized');
    }

    if (memberHabit.status !== HabitStatus.ACTIVE) {
      throw new BadRequestException(`Cannot log completion for habit in ${memberHabit.status} status`);
    }

    const timezone = memberHabit.memberProfile?.timezone || 'UTC';
    // Normalize date to UTC midnight representing the member's local day
    const localDateStr = dto.date.split('T')[0];
    const dateUtcMidnight = new Date(`${localDateStr}T00:00:00.000Z`);

    const completion = await this.prisma.habitCompletion.upsert({
      where: {
        memberHabitId_date: {
          memberHabitId,
          date: dateUtcMidnight,
        },
      },
      create: {
        memberHabitId,
        date: dateUtcMidnight,
        value: dto.value,
        unit: dto.unit,
        completed: dto.completed ?? true,
        source: dto.source || 'MANUAL',
        notes: dto.notes,
      },
      update: {
        value: dto.value,
        unit: dto.unit,
        completed: dto.completed ?? true,
        notes: dto.notes,
      },
    });

    // Recalculate streak for this habit
    const streakResult = await this.streakService.calculateMemberHabitStreak(memberHabitId, timezone);
    await this.prisma.memberHabit.update({
      where: { id: memberHabitId },
      data: {
        currentStreak: streakResult.currentStreak,
        longestStreak: Math.max(memberHabit.longestStreak, streakResult.longestStreak),
      },
    });

    return { completion, streak: streakResult };
  }

  /**
   * Pause or resume member habit.
   */
  async updateMemberHabitStatus(
    organisationId: string,
    memberId: string,
    memberHabitId: string,
    status: HabitStatus,
  ) {
    const memberHabit = await this.prisma.memberHabit.findUnique({
      where: { id: memberHabitId },
    });

    if (!memberHabit || memberHabit.memberId !== memberId || memberHabit.organisationId !== organisationId) {
      throw new NotFoundException('Member habit not found or unauthorized');
    }

    return this.prisma.memberHabit.update({
      where: { id: memberHabitId },
      data: { status },
      include: { habit: true },
    });
  }
}
