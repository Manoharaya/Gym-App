import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { HealthDataType, HealthUnit, WearableProviderType } from '@fitcore/types';

export interface DeduplicationCheckInput {
  connectionId: string;
  provider: WearableProviderType;
  dataType: HealthDataType;
  sourceRecordId?: string | null;
  startTime: Date;
  value: number;
  unit: HealthUnit;
}

@Injectable()
export class DeduplicationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a deterministic SHA-256 fingerprint for records lacking an authoritative provider ID.
   */
  generateFingerprint(input: {
    connectionId: string;
    provider: WearableProviderType;
    dataType: HealthDataType;
    startTime: Date;
    value: number;
    unit: string;
  }): string {
    const raw = `${input.provider}:${input.connectionId}:${input.dataType}:${input.startTime.toISOString()}:${input.value}:${input.unit}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Evaluates whether a health record is already persisted.
   */
  async isDuplicate(input: DeduplicationCheckInput): Promise<{ isDuplicate: boolean; fingerprint: string }> {
    const fingerprint = this.generateFingerprint({
      connectionId: input.connectionId,
      provider: input.provider,
      dataType: input.dataType,
      startTime: input.startTime,
      value: input.value,
      unit: input.unit,
    });

    if (input.sourceRecordId) {
      const existing = await this.prisma.healthDataRecord.findUnique({
        where: {
          connectionId_dataType_sourceRecordId: {
            connectionId: input.connectionId,
            dataType: input.dataType,
            sourceRecordId: input.sourceRecordId,
          },
        },
        select: { id: true },
      });

      if (existing) {
        return { isDuplicate: true, fingerprint };
      }
    }

    // Secondary check: fingerprint match
    const existingByFingerprint = await this.prisma.healthDataRecord.findFirst({
      where: {
        connectionId: input.connectionId,
        dataType: input.dataType,
        fingerprint,
      },
      select: { id: true },
    });

    return {
      isDuplicate: !!existingByFingerprint,
      fingerprint,
    };
  }
}
