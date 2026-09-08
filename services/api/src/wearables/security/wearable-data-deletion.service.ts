import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { WearableProviderType } from '@fitcore/types';

export interface DeletionResult {
  recordsDeleted: number;
  connectionsDeleted: number;
  syncLogsDeleted: number;
  rawDataDeleted: number;
}

@Injectable()
export class WearableDataDeletionService {
  private readonly logger = new Logger(WearableDataDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Deletes all health data associated with a specific connection.
   */
  async deleteConnectionData(
    connectionId: string,
    memberId: string,
    organisationId: string,
    actorUserId: string,
  ): Promise<DeletionResult> {
    const connection = await this.prisma.wearableConnection.findFirst({
      where: { id: connectionId, memberId, organisationId },
    });

    if (!connection) {
      throw new NotFoundException('Wearable connection not found');
    }

    const [deletedRecords, deletedLogs, deletedRaw] = await this.prisma.$transaction([
      this.prisma.healthDataRecord.deleteMany({
        where: { connectionId, memberId, organisationId },
      }),
      this.prisma.wearableSyncLog.deleteMany({
        where: { connectionId, memberId, organisationId },
      }),
      this.prisma.wearableRawData.deleteMany({
        where: { connectionId, memberId, organisationId },
      }),
    ]);

    await this.audit.log({
      userId: actorUserId,
      organisationId,
      action: 'WEARABLE_DATA_DELETED',
      resource: 'wearable_connections',
      resourceId: connectionId,
      metadata: {
        provider: connection.provider,
        deletedRecordsCount: deletedRecords.count,
        scope: 'SINGLE_CONNECTION',
      },
    });

    this.logger.log(
      `Deleted ${deletedRecords.count} health records for connection ${connectionId} (member ${memberId})`,
    );

    return {
      recordsDeleted: deletedRecords.count,
      connectionsDeleted: 0,
      syncLogsDeleted: deletedLogs.count,
      rawDataDeleted: deletedRaw.count,
    };
  }

  /**
   * Deletes all wearable data for a given provider belonging to a member.
   */
  async deleteProviderData(
    provider: WearableProviderType,
    memberId: string,
    organisationId: string,
    actorUserId: string,
  ): Promise<DeletionResult> {
    const connections = await this.prisma.wearableConnection.findMany({
      where: { provider, memberId, organisationId },
      select: { id: true },
    });

    const connectionIds = connections.map((c) => c.id);

    const [deletedRecords, deletedLogs, deletedRaw] = await this.prisma.$transaction([
      this.prisma.healthDataRecord.deleteMany({
        where: { provider, memberId, organisationId },
      }),
      this.prisma.wearableSyncLog.deleteMany({
        where: { provider, memberId, organisationId },
      }),
      this.prisma.wearableRawData.deleteMany({
        where: { provider, memberId, organisationId },
      }),
    ]);

    await this.audit.log({
      userId: actorUserId,
      organisationId,
      action: 'WEARABLE_DATA_DELETED',
      resource: 'health_data_records',
      metadata: {
        provider,
        memberId,
        recordsDeleted: deletedRecords.count,
        connectionIds,
        scope: 'PROVIDER_DATA',
      },
    });

    return {
      recordsDeleted: deletedRecords.count,
      connectionsDeleted: 0,
      syncLogsDeleted: deletedLogs.count,
      rawDataDeleted: deletedRaw.count,
    };
  }

  /**
   * Deletes ALL wearable and health data for a member across all providers.
   * Essential for Day 49 Privacy Centre "Right to be Forgotten" and data portability.
   */
  async deleteAllMemberWearableData(
    memberId: string,
    organisationId: string,
    actorUserId: string,
  ): Promise<DeletionResult> {
    const [deletedRecords, deletedLogs, deletedRaw, deletedConnections] =
      await this.prisma.$transaction([
        this.prisma.healthDataRecord.deleteMany({
          where: { memberId, organisationId },
        }),
        this.prisma.wearableSyncLog.deleteMany({
          where: { memberId, organisationId },
        }),
        this.prisma.wearableRawData.deleteMany({
          where: { memberId, organisationId },
        }),
        this.prisma.wearableConnection.deleteMany({
          where: { memberId, organisationId },
        }),
      ]);

    await this.audit.log({
      userId: actorUserId,
      organisationId,
      action: 'ALL_WEARABLE_DATA_DELETED',
      resource: 'member_profiles',
      resourceId: memberId,
      metadata: {
        recordsDeleted: deletedRecords.count,
        connectionsDeleted: deletedConnections.count,
        scope: 'ALL_MEMBER_DATA',
      },
    });

    return {
      recordsDeleted: deletedRecords.count,
      connectionsDeleted: deletedConnections.count,
      syncLogsDeleted: deletedLogs.count,
      rawDataDeleted: deletedRaw.count,
    };
  }
}
