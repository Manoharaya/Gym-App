import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  WearablePrivacyViewDto,
  WearableProviderType,
  WearableConnectionStatus,
  HealthDataType,
} from '@fitcore/types';

@Injectable()
export class WearablePrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a full privacy and transparency view for the member.
   * Informs the member exactly what data is held, who can view summaries, and how to revoke.
   */
  async getPrivacyView(memberId: string, organisationId: string): Promise<WearablePrivacyViewDto> {
    // 1. Consent status
    const consentType = await this.prisma.consentType.findUnique({
      where: { key: 'WEARABLE_DATA' },
      include: {
        records: {
          where: { memberProfileId: memberId },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const latestRecord = consentType?.records[0];
    const latestVersion = consentType?.versions[0];

    // 2. Connected providers
    const connections = await this.prisma.wearableConnection.findMany({
      where: { memberId, organisationId },
    });

    const connectedProviders = connections.map((c) => ({
      provider: c.provider as WearableProviderType,
      status: c.status as WearableConnectionStatus,
      connectedAt: c.connectedAt ? c.connectedAt.toISOString() : null,
      lastSyncAt: c.lastSyncAt ? c.lastSyncAt.toISOString() : null,
      authorizedDataTypes: (c.scopes || []) as HealthDataType[],
    }));

    // 3. Stored data categories
    const recordsGrouped = await this.prisma.healthDataRecord.groupBy({
      by: ['dataType'],
      where: { memberId, organisationId },
      _count: { id: true },
      _min: { startTime: true },
      _max: { startTime: true },
    });

    const storedDataCategories = recordsGrouped.map((g) => ({
      dataType: g.dataType as HealthDataType,
      recordCount: g._count.id,
      oldestRecordDate: g._min.startTime ? g._min.startTime.toISOString() : null,
      newestRecordDate: g._max.startTime ? g._max.startTime.toISOString() : null,
    }));

    // 4. Trainer assignment check
    const trainerAssignment = await this.prisma.trainerClientAssignment.findFirst({
      where: {
        memberProfileId: memberId,
        organisationId,
        status: 'ACTIVE',
      },
      include: {
        trainerProfile: {
          include: {
            staffProfile: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
    });

    const trainerUser = trainerAssignment?.trainerProfile?.staffProfile?.user;
    const assignedTrainerName = trainerUser
      ? `${trainerUser.firstName} ${trainerUser.lastName}`
      : null;

    return {
      memberId,
      activeConsent: {
        consented: latestRecord?.status === 'CONSENTED',
        consentKey: 'WEARABLE_DATA',
        consentedAt: latestRecord?.consentedAt ? latestRecord.consentedAt.toISOString() : null,
        version: latestVersion?.version || '1.0',
      },
      connectedProviders,
      storedDataCategories,
      trainerAccess: {
        isPermitted: !!trainerAssignment,
        assignedTrainerName,
        accessibleMetrics: [
          'Daily step totals',
          'Daily active calories',
          'Resting heart rate average',
          'Sleep duration average',
          'Workout counts',
        ],
        rawValuesExposed: false, // Core privacy guarantee: raw telemetry streams are NEVER exposed to trainers
      },
      retentionPolicy: {
        normalizedHealthRecordsDays: 730, // 2 years
        rawPayloadsDays: 7, // 7-day debug window
        selfServiceDeletionAllowed: true,
      },
    };
  }
}
