import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QueryUsageDto } from '../dto/platform-admin.dto';

export interface PlatformMetricDefinition {
  metricKey: string;
  description: string;
  source: string;
  unit: string;
  aggregation: 'SUM' | 'COUNT' | 'AVERAGE' | 'GAUGE';
  period: 'REALTIME' | 'HOURLY' | 'DAILY' | 'MONTHLY';
  tenantScope: 'PLATFORM' | 'ORGANISATION' | 'OUTLET';
  freshness: string;
}

export const PLATFORM_METRIC_DEFINITIONS: PlatformMetricDefinition[] = [
  {
    metricKey: 'ACTIVE_MEMBERS',
    description: 'Count of members with active profile status across gyms',
    source: 'MemberProfile',
    unit: 'COUNT',
    aggregation: 'COUNT',
    period: 'REALTIME',
    tenantScope: 'ORGANISATION',
    freshness: 'Immediate',
  },
  {
    metricKey: 'ACTIVE_OUTLETS',
    description: 'Count of operational club locations',
    source: 'Outlet',
    unit: 'COUNT',
    aggregation: 'COUNT',
    period: 'REALTIME',
    tenantScope: 'PLATFORM',
    freshness: 'Immediate',
  },
  {
    metricKey: 'STAFF_USERS',
    description: 'Active personnel, trainers, and administrative users',
    source: 'StaffProfile',
    unit: 'COUNT',
    aggregation: 'COUNT',
    period: 'REALTIME',
    tenantScope: 'ORGANISATION',
    freshness: 'Immediate',
  },
  {
    metricKey: 'BOOKINGS',
    description: 'Class, personal training, and resource reservations recorded',
    source: 'Booking',
    unit: 'COUNT',
    aggregation: 'COUNT',
    period: 'DAILY',
    tenantScope: 'OUTLET',
    freshness: 'Immediate',
  },
  {
    metricKey: 'CHECK_INS',
    description: 'Access control and front-desk attendance events',
    source: 'CheckIn',
    unit: 'COUNT',
    aggregation: 'COUNT',
    period: 'DAILY',
    tenantScope: 'OUTLET',
    freshness: 'Immediate',
  },
  {
    metricKey: 'WORKOUTS',
    description: 'Completed and logged member exercise routines',
    source: 'Workout',
    unit: 'COUNT',
    aggregation: 'COUNT',
    period: 'DAILY',
    tenantScope: 'ORGANISATION',
    freshness: 'Immediate',
  },
  {
    metricKey: 'AI_REQUESTS',
    description: 'Invocations across fitness, nutrition, receptionist, and intelligence agents',
    source: 'AIRequest',
    unit: 'REQUESTS',
    aggregation: 'COUNT',
    period: 'REALTIME',
    tenantScope: 'ORGANISATION',
    freshness: 'Immediate',
  },
  {
    metricKey: 'AI_TOKENS',
    description: 'Aggregated prompt and completion tokens processed by LLM gateway',
    source: 'AIUsageRecord',
    unit: 'TOKENS',
    aggregation: 'SUM',
    period: 'REALTIME',
    tenantScope: 'ORGANISATION',
    freshness: 'Immediate',
  },
  {
    metricKey: 'VOICE_MINUTES',
    description: 'Inbound receptionist and outbound AI voice phone call duration',
    source: 'VoiceSession',
    unit: 'MINUTES',
    aggregation: 'SUM',
    period: 'DAILY',
    tenantScope: 'ORGANISATION',
    freshness: 'Immediate',
  },
  {
    metricKey: 'SMS_MESSAGES',
    description: 'Direct SMS dispatches via Day 28 Communication engine',
    source: 'Communication',
    unit: 'MESSAGES',
    aggregation: 'COUNT',
    period: 'DAILY',
    tenantScope: 'ORGANISATION',
    freshness: 'Immediate',
  },
  {
    metricKey: 'WHATSAPP_MESSAGES',
    description: 'WhatsApp messages processed through communication channels',
    source: 'Communication',
    unit: 'MESSAGES',
    aggregation: 'COUNT',
    period: 'DAILY',
    tenantScope: 'ORGANISATION',
    freshness: 'Immediate',
  },
  {
    metricKey: 'EMAIL_MESSAGES',
    description: 'System, marketing, and transactional emails sent',
    source: 'Communication',
    unit: 'MESSAGES',
    aggregation: 'COUNT',
    period: 'DAILY',
    tenantScope: 'ORGANISATION',
    freshness: 'Immediate',
  },
  {
    metricKey: 'PUSH_NOTIFICATIONS',
    description: 'Mobile device push notifications delivered to members/staff',
    source: 'Communication',
    unit: 'MESSAGES',
    aggregation: 'COUNT',
    period: 'DAILY',
    tenantScope: 'ORGANISATION',
    freshness: 'Immediate',
  },
  {
    metricKey: 'WEBHOOK_DELIVERIES',
    description: 'Outbound webhook dispatches to third-party developer integrations',
    source: 'WebhookDelivery',
    unit: 'REQUESTS',
    aggregation: 'COUNT',
    period: 'DAILY',
    tenantScope: 'ORGANISATION',
    freshness: 'Immediate',
  },
  {
    metricKey: 'INTEGRATIONS',
    description: 'Active third-party connections (Xero, Stripe, Apple Health, Twilio)',
    source: 'IntegrationConnection',
    unit: 'COUNT',
    aggregation: 'COUNT',
    period: 'REALTIME',
    tenantScope: 'ORGANISATION',
    freshness: 'Immediate',
  },
];

@Injectable()
export class PlatformUsageService {
  private readonly logger = new Logger(PlatformUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  getMetricDefinitions(): PlatformMetricDefinition[] {
    return PLATFORM_METRIC_DEFINITIONS;
  }

  /**
   * Calculates live aggregate platform usage metrics across reliable domain sources.
   */
  async getLiveUsageTotals(query?: QueryUsageDto) {
    const orgId = query?.organisationId;
    const orgFilter = orgId ? { organisationId: orgId } : {};

    const [
      activeMembers,
      activeOutlets,
      staffUsers,
      bookingsCount,
      checkInsCount,
      workoutsCount,
      aiRequestsCount,
      aiTokensAggregate,
      smsCount,
      emailCount,
      whatsAppCount,
      pushCount,
      activeIntegrationsCount,
    ] = await Promise.all([
      this.prisma.memberProfile.count({
        where: { ...orgFilter, status: 'ACTIVE' },
      }),
      this.prisma.outlet.count({
        where: { ...orgFilter, status: 'ACTIVE' },
      }),
      this.prisma.staffProfile.count({
        where: { ...orgFilter, employmentStatus: 'ACTIVE' },
      }),
      this.prisma.booking.count({ where: orgFilter }),
      this.prisma.checkIn.count({ where: orgFilter }),
      this.prisma.workout.count({ where: orgFilter }),
      this.prisma.aIRequest.count({ where: orgFilter }),
      this.prisma.aIUsageRecord.aggregate({
        where: orgFilter,
        _sum: { totalTokens: true, estimatedCost: true },
      }),
      this.prisma.communication.count({
        where: { ...orgFilter, channel: 'SMS' },
      }),
      this.prisma.communication.count({
        where: { ...orgFilter, channel: 'EMAIL' },
      }),
      this.prisma.communication.count({
        where: { ...orgFilter, channel: 'WHATSAPP' },
      }),
      this.prisma.communication.count({
        where: { ...orgFilter, channel: 'PUSH' },
      }),
      this.prisma.integrationConnection.count({
        where: { ...orgFilter, status: 'CONNECTED' },
      }),
    ]);

    return {
      activeMembers: { value: activeMembers, unit: 'COUNT' },
      activeOutlets: { value: activeOutlets, unit: 'COUNT' },
      staffUsers: { value: staffUsers, unit: 'COUNT' },
      bookings: { value: bookingsCount, unit: 'COUNT' },
      checkIns: { value: checkInsCount, unit: 'COUNT' },
      workouts: { value: workoutsCount, unit: 'COUNT' },
      aiRequests: { value: aiRequestsCount, unit: 'REQUESTS' },
      aiTokens: {
        value: aiTokensAggregate._sum.totalTokens || 0,
        unit: 'TOKENS',
      },
      aiEstimatedCostCents: {
        value: Number(aiTokensAggregate._sum.estimatedCost || 0),
        unit: 'CENTS',
      },
      smsMessages: { value: smsCount, unit: 'MESSAGES' },
      emailMessages: { value: emailCount, unit: 'MESSAGES' },
      whatsAppMessages: { value: whatsAppCount, unit: 'MESSAGES' },
      pushNotifications: { value: pushCount, unit: 'MESSAGES' },
      activeIntegrations: { value: activeIntegrationsCount, unit: 'COUNT' },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Queries or creates periodic usage snapshots for analytical trend reporting.
   */
  async getUsageSnapshots(query: QueryUsageDto) {
    const where: any = {};
    if (query.organisationId) where.organisationId = query.organisationId;
    if (query.outletId) where.outletId = query.outletId;
    if (query.metricKey) where.metricKey = query.metricKey;
    if (query.from || query.to) {
      where.periodStart = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    return this.prisma.platformUsageSnapshot.findMany({
      where,
      orderBy: { periodStart: 'desc' },
      take: 100,
    });
  }

  /**
   * Records an analytics projection snapshot (non-authoritative analytical projection).
   */
  async recordUsageSnapshot(data: {
    organisationId?: string | null;
    outletId?: string | null;
    metricKey: string;
    value: number;
    unit: string;
    periodStart: Date;
    periodEnd: Date;
  }) {
    return this.prisma.platformUsageSnapshot.create({
      data: {
        organisationId: data.organisationId,
        outletId: data.outletId,
        metricKey: data.metricKey,
        value: data.value,
        unit: data.unit,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
      },
    });
  }
}
