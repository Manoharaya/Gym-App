import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { AppEngagementSignals } from '../engagement-intelligence.types';
import { AppEngagementEventType } from '@fitcore/types';

export interface RecordAppEventDto {
  eventType: AppEngagementEventType;
  outletId?: string;
  metadata?: Record<string, any>;
  source?: string;
  idempotencyKey?: string;
  occurredAt?: string | Date;
}

const ALLOWED_APP_EVENT_TYPES: Set<string> = new Set([
  'APP_OPENED',
  'LOGIN',
  'PROFILE_VIEWED',
  'CLASS_VIEWED',
  'BOOKING_CREATED',
  'BOOKING_CANCELLED',
  'WORKOUT_VIEWED',
  'WORKOUT_STARTED',
  'WORKOUT_COMPLETED',
  'GOAL_VIEWED',
  'NUTRITION_VIEWED',
  'NUTRITION_LOGGED',
  'DAILY_CHECKIN_STARTED',
  'DAILY_CHECKIN_COMPLETED',
  'AI_COACH_USED',
  'AI_NUTRITION_USED',
  'WEARABLE_VIEWED',
]);

const SENSITIVE_KEY_REGEX = /(password|token|secret|credit|card|cvv|medical|parq|diagnosis|prescription|note)/i;

@Injectable()
export class AppEngagementService {
  private readonly logger = new Logger(AppEngagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an intentional app engagement event.
   * Enforces event taxonomy validation and sanitizes sensitive payload data.
   */
  async recordEvent(
    organisationId: string,
    memberId: string,
    dto: RecordAppEventDto,
  ) {
    if (!ALLOWED_APP_EVENT_TYPES.has(dto.eventType)) {
      throw new BadRequestException(`Unrecognized app engagement event type: '${dto.eventType}'`);
    }

    // Sanitize metadata: remove any accidentally included sensitive tokens or health details
    const sanitizedMetadata: Record<string, any> = {};
    if (dto.metadata && typeof dto.metadata === 'object') {
      for (const [key, val] of Object.entries(dto.metadata)) {
        if (!SENSITIVE_KEY_REGEX.test(key)) {
          sanitizedMetadata[key] = val;
        }
      }
    }

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();

    if (dto.idempotencyKey) {
      const existing = await this.prisma.engagementEvent.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    const event = await this.prisma.engagementEvent.create({
      data: {
        organisationId,
        memberId,
        outletId: dto.outletId,
        eventType: dto.eventType,
        sourceType: dto.source || 'APP',
        sourceId: dto.eventType,
        metadata: sanitizedMetadata,
        idempotencyKey: dto.idempotencyKey,
        occurredAt,
      },
    });

    return event;
  }

  /**
   * Collects aggregated app engagement signals over 7d and 28d windows.
   */
  async collect(memberId: string, organisationId: string, now: Date = new Date()): Promise<AppEngagementSignals> {
    const d7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d28Ago = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const events = await this.prisma.engagementEvent.findMany({
      where: {
        memberId,
        organisationId,
        occurredAt: { gte: d28Ago, lte: now },
      },
      select: {
        id: true,
        eventType: true,
        occurredAt: true,
      },
      orderBy: { occurredAt: 'desc' },
    });

    const eventsLast7d = events.filter((e) => e.occurredAt >= d7Ago).length;
    const eventsLast28d = events.length;

    const loginsLast28d = events.filter((e) => e.eventType === 'LOGIN').length;
    const appOpensLast28d = events.filter((e) => e.eventType === 'APP_OPENED').length;

    const distinctFeatures = new Set(events.map((e) => e.eventType));
    const featuresUsedCount = distinctFeatures.size;

    const lastAppActivityAt = events[0]?.occurredAt || null;

    const recentWeeklyRate = eventsLast7d;
    const baselineWeeklyRate = eventsLast28d / 4;
    let eventsDeltaPct = 0;
    if (baselineWeeklyRate > 0) {
      eventsDeltaPct = Math.round(((recentWeeklyRate - baselineWeeklyRate) / baselineWeeklyRate) * 100);
    } else if (recentWeeklyRate > 0) {
      eventsDeltaPct = 100;
    }

    return {
      eventsLast7d,
      eventsLast28d,
      loginsLast28d,
      appOpensLast28d,
      featuresUsedCount,
      lastAppActivityAt,
      eventsDeltaPct,
    };
  }
}
