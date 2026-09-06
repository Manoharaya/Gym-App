import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface IdempotencyCheckResult {
  isIdempotent: boolean;
  statusCode?: number;
  responseBody?: any;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Checks if an idempotency key was previously processed for this organisation.
   */
  async check(organisationId: string, idempotencyKey?: string): Promise<IdempotencyCheckResult> {
    if (!idempotencyKey) {
      return { isIdempotent: false };
    }

    const record = await this.prisma.idempotencyRecord.findUnique({
      where: {
        organisationId_idempotencyKey: {
          organisationId,
          idempotencyKey,
        },
      },
    });

    if (record && record.expiresAt > new Date()) {
      return {
        isIdempotent: true,
        statusCode: record.responseStatus,
        responseBody: record.responseBody,
      };
    }

    return { isIdempotent: false };
  }

  /**
   * Records response of an idempotent request.
   */
  async record(
    organisationId: string,
    idempotencyKey: string | undefined,
    resourceType: string,
    statusCode: number,
    responseBody: any,
    ttlHours: number = 24
  ): Promise<void> {
    if (!idempotencyKey) return;

    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    await this.prisma.idempotencyRecord.upsert({
      where: {
        organisationId_idempotencyKey: {
          organisationId,
          idempotencyKey,
        },
      },
      create: {
        organisationId,
        idempotencyKey,
        resourceType,
        responseStatus: statusCode,
        responseBody: responseBody || {},
        expiresAt,
      },
      update: {
        responseStatus: statusCode,
        responseBody: responseBody || {},
        expiresAt,
      },
    });
  }
}
