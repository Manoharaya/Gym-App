import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { RecordBodyMeasurementDto, QueryMeasurementsDto } from '../dto/progress.dto';

export interface MeasurementTrend {
  measurementType: string;
  latestValue: number;
  latestUnit: string;
  firstValue: number;
  minValue: number;
  maxValue: number;
  netChange: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  historyCount: number;
}

@Injectable()
export class BodyMeasurementService {
  private readonly logger = new Logger(BodyMeasurementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Enforces privacy and tenant boundary rules:
   * - FINANCE role is strictly prohibited from accessing health and progress data.
   * - Cross-tenant queries are blocked.
   * - MEMBER can only access own profile.
   * - TRAINER can only access assigned clients.
   * - OUTLET_MANAGER can access members assigned to their outlet.
   * - ORGANISATION_OWNER / SUPERADMIN can access organisation members.
   */
  async assertProgressAccess(
    organisationId: string,
    memberProfileId: string,
    actor?: AuthenticatedUser,
  ) {
    if (!actor) return;

    // Check if actor has FINANCE role
    const hasFinanceRole = actor.roles?.some((r) => r.role === 'FINANCE');
    if (hasFinanceRole && !actor.isSuperAdmin) {
      throw new ForbiddenException({
        code: 'ACCESS_DENIED_FINANCE_RESTRICTION',
        message: 'Finance role does not have authorization to view sensitive health and progress data',
      });
    }

    if (actor.isSuperAdmin) {
      return;
    }

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

    const isSelf = member.userId === actor.id;
    if (isSelf) {
      return;
    }

    const isOrgOwner = actor.roles?.some(
      (r) => r.role === 'ORGANISATION_OWNER' && r.organisationId === organisationId,
    );
    if (isOrgOwner) {
      return;
    }

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
      code: 'FORBIDDEN_PROGRESS_ACCESS',
      message: 'You do not have permission to access progress data for this member',
    });
  }

  /**
   * Append-only recording of a body measurement with audit attribution and trend detection.
   */
  async recordMeasurement(
    organisationId: string,
    memberProfileId: string,
    dto: RecordBodyMeasurementDto,
    actor: AuthenticatedUser,
  ) {
    await this.assertProgressAccess(organisationId, memberProfileId, actor);

    // Validate units
    const normalizedUnit = this.validateAndNormalizeUnit(dto.measurementType, dto.unit);

    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : new Date();

    // Find previous measurement of this type to calculate trend delta
    const previous = await this.prisma.bodyMeasurement.findFirst({
      where: {
        organisationId,
        memberProfileId,
        measurementType: dto.measurementType,
        recordedAt: { lte: recordedAt },
      },
      orderBy: { recordedAt: 'desc' },
    });

    const measurement = await this.prisma.bodyMeasurement.create({
      data: {
        organisationId,
        outletId: dto.outletId,
        memberProfileId,
        measurementType: dto.measurementType,
        value: dto.value,
        unit: normalizedUnit,
        recordedAt,
        source: dto.source || (actor.roles?.some((r) => r.role === 'TRAINER') ? 'TRAINER' : 'MEMBER'),
        recordedByUserId: actor.id,
        notes: dto.notes,
      },
    });

    let delta: number | null = null;
    let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';

    if (previous) {
      delta = Number((dto.value - previous.value).toFixed(2));
      if (delta > 0.05) trend = 'UP';
      else if (delta < -0.05) trend = 'DOWN';
      else trend = 'STABLE';
    }

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'BODY_MEASUREMENT_RECORDED',
      resource: 'body_measurements',
      resourceId: measurement.id,
      metadata: {
        memberProfileId,
        measurementType: dto.measurementType,
        unit: normalizedUnit,
        source: measurement.source,
      },
    });

    return {
      ...measurement,
      previousValue: previous ? previous.value : null,
      delta,
      trend,
    };
  }

  /**
   * Retrieves measurements for a member with optional type and date filtering.
   */
  async getMeasurements(
    organisationId: string,
    memberProfileId: string,
    query: QueryMeasurementsDto,
    actor: AuthenticatedUser,
  ) {
    await this.assertProgressAccess(organisationId, memberProfileId, actor);

    const where: any = {
      organisationId,
      memberProfileId,
    };

    if (query.measurementType) {
      where.measurementType = query.measurementType;
    }

    if (query.startDate || query.endDate) {
      where.recordedAt = {};
      if (query.startDate) where.recordedAt.gte = new Date(query.startDate);
      if (query.endDate) where.recordedAt.lte = new Date(query.endDate);
    }

    const items = await this.prisma.bodyMeasurement.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: query.limit || 50,
      include: {
        recordedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return items;
  }

  /**
   * Computes statistical trend for a measurement type.
   */
  async getMeasurementTrend(
    organisationId: string,
    memberProfileId: string,
    measurementType: string,
    actor: AuthenticatedUser,
  ): Promise<MeasurementTrend | null> {
    await this.assertProgressAccess(organisationId, memberProfileId, actor);

    const records = await this.prisma.bodyMeasurement.findMany({
      where: {
        organisationId,
        memberProfileId,
        measurementType,
      },
      orderBy: { recordedAt: 'asc' },
    });

    if (records.length === 0) {
      return null;
    }

    const values = records.map((r) => r.value);
    const firstValue = values[0];
    const latestValue = values[values.length - 1];
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const netChange = Number((latestValue - firstValue).toFixed(2));

    let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
    if (netChange > 0.05) trend = 'UP';
    else if (netChange < -0.05) trend = 'DOWN';

    return {
      measurementType,
      latestValue,
      latestUnit: records[records.length - 1].unit,
      firstValue,
      minValue,
      maxValue,
      netChange,
      trend,
      historyCount: records.length,
    };
  }

  private validateAndNormalizeUnit(type: string, unit: string): string {
    const u = unit.trim().toLowerCase();
    switch (type) {
      case 'WEIGHT':
        if (u === 'kg' || u === 'kilograms' || u === 'kgs') return 'kg';
        if (u === 'lb' || u === 'lbs' || u === 'pounds') return 'lb';
        throw new BadRequestException({
          code: 'INVALID_WEIGHT_UNIT',
          message: `Invalid unit '${unit}' for WEIGHT. Expected 'kg' or 'lb'`,
        });
      case 'HEIGHT':
      case 'CHEST':
      case 'WAIST':
      case 'HIPS':
      case 'NECK':
      case 'LEFT_ARM':
      case 'RIGHT_ARM':
      case 'LEFT_THIGH':
      case 'RIGHT_THIGH':
      case 'LEFT_CALF':
      case 'RIGHT_CALF':
      case 'SHOULDERS':
        if (u === 'cm' || u === 'centimeters') return 'cm';
        if (u === 'in' || u === 'inch' || u === 'inches') return 'in';
        if (u === 'm' || u === 'meters') return 'm';
        if (u === 'ft' || u === 'feet') return 'ft';
        return u;
      case 'BODY_FAT_PERCENT':
      case 'BMI':
        if (u === '%' || u === 'percent') return '%';
        return u;
      default:
        return unit.trim();
    }
  }
}
