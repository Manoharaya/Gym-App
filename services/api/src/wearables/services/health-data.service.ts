import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QueryHealthDataDto } from '../dto/query-health-data.dto';
import {
  HealthDataRecordDto,
  HealthDataType,
  HealthUnit,
  WearableProviderType,
} from '@fitcore/types';
import { PaginatedHealthDataResponseDto } from '../dto/wearable-response.dto';

@Injectable()
export class HealthDataService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves paginated health records strictly isolated to the requesting member and organisation.
   */
  async getMemberHealthData(
    memberId: string,
    organisationId: string,
    query: QueryHealthDataDto,
  ): Promise<PaginatedHealthDataResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 50));
    const skip = (page - 1) * limit;

    const where: any = {
      memberId,
      organisationId,
    };

    if (query.dataType) {
      where.dataType = query.dataType;
    }

    if (query.provider) {
      where.provider = query.provider;
    }

    if (query.startDate || query.endDate) {
      where.startTime = {};
      if (query.startDate) {
        where.startTime.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.startTime.lte = new Date(query.endDate);
      }
    }

    const [total, records] = await Promise.all([
      this.prisma.healthDataRecord.count({ where }),
      this.prisma.healthDataRecord.findMany({
        where,
        orderBy: { startTime: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formattedRecords: HealthDataRecordDto[] = records.map((r) => ({
      id: r.id,
      organisationId: r.organisationId,
      memberId: r.memberId,
      connectionId: r.connectionId,
      provider: r.provider as WearableProviderType,
      dataType: r.dataType as HealthDataType,
      sourceRecordId: r.sourceRecordId,
      startTime: r.startTime.toISOString(),
      endTime: r.endTime ? r.endTime.toISOString() : null,
      value: r.value,
      unit: r.unit as HealthUnit,
      timezone: r.timezone,
      sourceName: r.sourceName,
      sourceDevice: r.sourceDevice,
      metadata: (r.metadata as Record<string, any>) || null,
      recordedAt: r.recordedAt.toISOString(),
    }));

    return {
      records: formattedRecords,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
