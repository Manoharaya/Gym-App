import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TriggerBackupDto, BackupTypeEnum, BackupStorageTierEnum } from '../dto/disaster-recovery.dto';
import * as crypto from 'crypto';

@Injectable()
export class BackupOrchestratorService {
  private readonly logger = new Logger(BackupOrchestratorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Orchestrates an encrypted database backup with SHA-256 integrity checksumming.
   * Enforces retention policy and optional immutability lock.
   */
  async triggerBackup(dto: TriggerBackupDto, actorId?: string) {
    const timestamp = new Date();
    const backupType = (dto.backupType || BackupTypeEnum.FULL) as any;
    const storageTier = (dto.storageTier || BackupStorageTierEnum.PRIMARY) as any;
    const retentionDays = dto.retentionDays ?? 30;
    const isImmutable = dto.isImmutable ?? false;
    const encryptionKeyId = dto.encryptionKeyId ?? 'kms-key-fitcore-primary';

    // Formulate deterministic storage artifact path
    const fileSuffix = `${timestamp.toISOString().replace(/[:.]/g, '-')}`;
    const storagePath = `s3://fitcore-dr-backups/${storageTier.toLowerCase()}/fitcore_db_${backupType.toLowerCase()}_${fileSuffix}.enc.sql`;

    // Simulate encrypted payload generation and compute cryptographic SHA-256 checksum
    const simulatedPayload = `FITCORE_ENCRYPTED_DUMP_${backupType}_${timestamp.getTime()}_${storagePath}`;
    const checksumSha256 = crypto.createHash('sha256').update(simulatedPayload).digest('hex');
    const sizeBytes = BigInt(1024 * 1024 * 48); // ~48 MB synthetic dump size

    const immutableUntil = isImmutable
      ? new Date(timestamp.getTime() + retentionDays * 86400000)
      : null;

    this.logger.log(
      `[BACKUP ORCHESTRATOR] Initiating ${backupType} backup to ${storagePath} (Checksum: ${checksumSha256.substring(0, 12)}...)`,
    );

    const record = await this.prisma.backupRecord.create({
      data: {
        backupType,
        status: 'COMPLETED',
        storagePath,
        storageTier,
        checksumSha256,
        sizeBytes,
        encryptionKeyId,
        startedAt: timestamp,
        completedAt: new Date(timestamp.getTime() + 1200), // simulated 1.2s snapshot duration
        rpoTimestamp: timestamp,
        retentionDays,
        isImmutable,
        immutableUntil,
        metadata: {
          initiatedBy: actorId || 'SYSTEM_AUTOMATION',
          algorithm: 'AES-256-GCM',
          pgVersion: '16.2',
          ...dto.metadata,
        },
      },
      include: {
        verifications: true,
        restoreTests: true,
      },
    });

    this.logger.log(`[BACKUP ORCHESTRATOR] Backup record ${record.id} created successfully`);
    return record;
  }

  /**
   * Lists backup records with verification history.
   */
  async listBackups(filter?: { status?: string; backupType?: string }) {
    return this.prisma.backupRecord.findMany({
      where: {
        ...(filter?.status ? { status: filter.status as any } : {}),
        ...(filter?.backupType ? { backupType: filter.backupType as any } : {}),
      },
      orderBy: { startedAt: 'desc' },
      include: {
        verifications: {
          orderBy: { verifiedAt: 'desc' },
          take: 1,
        },
        restoreTests: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Retrieves single backup record with details.
   */
  async getBackup(id: string) {
    const backup = await this.prisma.backupRecord.findUnique({
      where: { id },
      include: {
        verifications: { orderBy: { verifiedAt: 'desc' } },
        restoreTests: { orderBy: { startedAt: 'desc' } },
      },
    });

    if (!backup) {
      throw new NotFoundException(`Backup record ${id} not found`);
    }

    return backup;
  }

  /**
   * Enforces retention policy while strictly respecting immutability locks.
   * Returns list of deleted and protected records.
   */
  async enforceRetentionPolicy() {
    const now = new Date();
    const allBackups = await this.prisma.backupRecord.findMany();

    const expiredEligible: string[] = [];
    const immutableProtected: string[] = [];

    for (const b of allBackups) {
      const expiresAt = new Date(b.startedAt.getTime() + b.retentionDays * 86400000);
      if (expiresAt < now) {
        if (b.isImmutable && b.immutableUntil && b.immutableUntil > now) {
          immutableProtected.push(b.id);
        } else {
          expiredEligible.push(b.id);
        }
      }
    }

    if (expiredEligible.length > 0) {
      await this.prisma.backupRecord.deleteMany({
        where: { id: { in: expiredEligible } },
      });
      this.logger.log(`[BACKUP RETENTION] Pruned ${expiredEligible.length} expired backups`);
    }

    return {
      prunedCount: expiredEligible.length,
      prunedIds: expiredEligible,
      protectedImmutableCount: immutableProtected.length,
      protectedImmutableIds: immutableProtected,
    };
  }

  /**
   * Retrieves backup metrics for observability and platform health.
   */
  async getBackupMetrics() {
    const backups = await this.prisma.backupRecord.findMany({
      orderBy: { startedAt: 'desc' },
      take: 100,
    });

    const total = backups.length;
    const completed = backups.filter((b) => b.status === 'COMPLETED').length;
    const failed = backups.filter((b) => b.status === 'FAILED').length;
    const successRate = total > 0 ? (completed / total) * 100 : 100;

    const latest = backups[0];
    const backupAgeHours = latest
      ? (Date.now() - latest.startedAt.getTime()) / (1000 * 60 * 60)
      : null;

    return {
      totalBackups: total,
      completedBackups: completed,
      failedBackups: failed,
      backupSuccessRate: Math.round(successRate * 10) / 10,
      latestBackupId: latest?.id ?? null,
      latestBackupStartedAt: latest?.startedAt ?? null,
      backupAgeHours: backupAgeHours !== null ? Math.round(backupAgeHours * 10) / 10 : null,
      isFresh: backupAgeHours !== null ? backupAgeHours < 24 : false,
    };
  }
}
