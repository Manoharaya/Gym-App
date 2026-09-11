import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../database/prisma.service';
import { DomainExportersService } from './exporters/domain-exporters';
import {
  PrivacyExportFormat,
  PrivacyExportResponseDto,
} from '@fitcore/types';

@Injectable()
export class PrivacyExportService {
  private readonly logger = new Logger(PrivacyExportService.name);
  private readonly exportStorageDir = path.resolve(process.cwd(), 'scratch', 'exports');
  private readonly tokenExpiryHours = 24;

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainExporters: DomainExportersService,
  ) {
    if (!fs.existsSync(this.exportStorageDir)) {
      fs.mkdirSync(this.exportStorageDir, { recursive: true });
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a random AES-256 key and encrypts payload.
   */
  private encryptPayload(payload: string): {
    encryptedBuffer: Buffer;
    iv: string;
    authTag: string;
    encryptedKeyReference: string;
  } {
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Package: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext
    const combined = Buffer.concat([iv, authTag, encrypted]);

    return {
      encryptedBuffer: combined,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encryptedKeyReference: key.toString('hex'), // In prod, encrypt with KMS master key
    };
  }

  /**
   * Decrypts an encrypted payload.
   */
  private decryptPayload(combined: Buffer, keyHex: string): string {
    const key = Buffer.from(keyHex, 'hex');
    const iv = combined.subarray(0, 16);
    const authTag = combined.subarray(16, 32);
    const ciphertext = combined.subarray(32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  }

  /**
   * Starts an asynchronous export job for a member.
   */
  async createExportJob(
    organisationId: string,
    memberId: string,
    formats: PrivacyExportFormat[] = ['JSON'],
    privacyRequestId?: string,
  ): Promise<PrivacyExportResponseDto> {
    const job = await this.prisma.privacyExportJob.create({
      data: {
        organisationId,
        memberId,
        privacyRequestId: privacyRequestId || null,
        status: 'PROCESSING',
        formats,
      },
    });

    // Execute generation asynchronously
    this.processExportAsync(job.id, organisationId, memberId, formats).catch((err) => {
      this.logger.error(`Export generation failed for job ${job.id}: ${err.message}`, err.stack);
    });

    return {
      id: job.id,
      privacyRequestId: job.privacyRequestId,
      organisationId: job.organisationId,
      memberId: job.memberId,
      status: 'PROCESSING',
      formats,
      downloadUrl: null,
      downloadExpiresAt: null,
      fileSizeBytes: null,
      createdAt: job.createdAt.toISOString(),
    };
  }

  /**
   * Asynchronously gathers domain sections, encrypts, and persists artifacts.
   */
  async processExportAsync(
    jobId: string,
    organisationId: string,
    memberId: string,
    formats: PrivacyExportFormat[],
  ): Promise<void> {
    try {
      const existing = await this.prisma.privacyExportJob.findUnique({
        where: { id: jobId },
      });
      if (existing?.status === 'COMPLETED') {
        return;
      }

      // 1. Gather all domain datasets
      const [
        profile,
        health,
        training,
        nutrition,
        wearables,
        payments,
        consent,
        security,
      ] = await Promise.all([
        this.domainExporters.exportMemberProfile(memberId),
        this.domainExporters.exportHealthData(memberId),
        this.domainExporters.exportTrainingData(memberId),
        this.domainExporters.exportNutritionData(memberId),
        this.domainExporters.exportWearableData(memberId),
        this.domainExporters.exportPaymentData(memberId),
        this.domainExporters.exportConsentData(memberId),
        this.domainExporters.exportSecurityData(memberId),
      ]);

      const exportPackage = {
        metadata: {
          exportJobId: jobId,
          organisationId,
          memberId,
          generatedAt: new Date().toISOString(),
          version: '1.0',
          platform: 'FitCore Privacy Center',
          disclaimer:
            'This export contains your personal data stored in FitCore. Maintain confidentiality when storing or sharing this file.',
        },
        sections: {
          profile,
          health,
          training,
          nutrition,
          wearables,
          payments,
          consent,
          security,
        },
      };

      const rawJson = JSON.stringify(exportPackage, null, 2);

      // 2. Encrypt artifact
      const { encryptedBuffer, encryptedKeyReference } = this.encryptPayload(rawJson);
      const checksumSha256 = crypto.createHash('sha256').update(encryptedBuffer).digest('hex');

      const fileName = `export_${jobId}_${Date.now()}.enc`;
      const filePath = path.join(this.exportStorageDir, fileName);
      fs.writeFileSync(filePath, encryptedBuffer);

      // 3. Create expiring download token
      const rawDownloadToken = `fc_exp_${crypto.randomBytes(32).toString('hex')}`;
      const downloadTokenHash = this.hashToken(rawDownloadToken);
      const downloadExpiresAt = new Date(
        Date.now() + this.tokenExpiryHours * 60 * 60 * 1000,
      );

      // 4. Update Job and Artifact in database
      await this.prisma.$transaction([
        this.prisma.privacyExportArtifact.deleteMany({
          where: { exportJobId: jobId },
        }),
        this.prisma.privacyExportArtifact.create({
          data: {
            exportJobId: jobId,
            format: 'JSON',
            storagePath: filePath,
            mimeType: 'application/json+encrypted',
            checksumSha256,
            fileSizeBytes: encryptedBuffer.length,
          },
        }),
        this.prisma.privacyExportJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            downloadTokenHash,
            downloadExpiresAt,
            fileSizeBytes: encryptedBuffer.length,
            encryptedKeyReference,
            completedAt: new Date(),
          },
        }),
      ]);

      this.logger.log(`Export job ${jobId} completed successfully (${encryptedBuffer.length} bytes)`);
    } catch (err: any) {
      this.logger.error(`Export processing failed for job ${jobId}: ${err.message}`);
      await this.prisma.privacyExportJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorReason: err.message,
        },
      });
    }
  }

  /**
   * Retrieves export status for a member.
   */
  async getExportStatus(jobId: string, memberId: string, organisationId: string) {
    const job = await this.prisma.privacyExportJob.findFirst({
      where: {
        id: jobId,
        memberId,
        organisationId,
      },
      include: {
        artifacts: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Export job not found');
    }

    const isExpired = job.downloadExpiresAt && job.downloadExpiresAt.getTime() <= Date.now();

    return {
      id: job.id,
      privacyRequestId: job.privacyRequestId,
      status: isExpired ? 'EXPIRED' : job.status,
      formats: job.formats as PrivacyExportFormat[],
      downloadExpiresAt: job.downloadExpiresAt?.toISOString() || null,
      downloadCount: job.downloadCount,
      maxDownloads: job.maxDownloads,
      fileSizeBytes: job.fileSizeBytes,
      errorReason: job.errorReason,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() || null,
    };
  }

  /**
   * Securely generates or retrieves a single-use or limited-use download stream/payload.
   */
  async downloadExport(
    jobId: string,
    memberId: string,
    organisationId: string,
  ): Promise<{ data: any; filename: string; contentType: string }> {
    const job = await this.prisma.privacyExportJob.findFirst({
      where: {
        id: jobId,
        memberId,
        organisationId,
      },
      include: {
        artifacts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Export job not found');
    }

    if (job.status !== 'COMPLETED') {
      throw new BadRequestException(`Export is not ready for download (status: ${job.status})`);
    }

    if (job.downloadExpiresAt && job.downloadExpiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Export download link has expired. Please request a new export.');
    }

    if (job.downloadCount >= job.maxDownloads) {
      throw new UnauthorizedException(
        `Maximum download limit (${job.maxDownloads}) exceeded for this export artifact.`,
      );
    }

    const artifact = job.artifacts[0];
    if (!artifact || !fs.existsSync(artifact.storagePath)) {
      throw new NotFoundException('Export artifact file missing from storage');
    }

    // Read and decrypt payload
    const encryptedBuffer = fs.readFileSync(artifact.storagePath);
    if (!job.encryptedKeyReference) {
      throw new Error('Missing encryption key reference for artifact');
    }

    const decryptedJson = this.decryptPayload(encryptedBuffer, job.encryptedKeyReference);

    // Increment download counter
    await this.prisma.privacyExportJob.update({
      where: { id: jobId },
      data: {
        downloadCount: { increment: 1 },
      },
    });

    return {
      data: JSON.parse(decryptedJson),
      filename: `FitCore_Personal_Data_Export_${jobId}.json`,
      contentType: 'application/json',
    };
  }
}
