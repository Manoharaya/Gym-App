import { Injectable, Inject, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { STORAGE_PROVIDER, StorageProvider, SignedUploadUrlResult } from '../../storage/storage.interface';
import { ExerciseMediaValidatorService } from './exercise-media-validator.service';

export interface GeneratedStorageKey {
  storageKey: string;
  categoryFolder: string;
}

@Injectable()
export class ExerciseMediaStorageService {
  private readonly logger = new Logger(ExerciseMediaStorageService.name);

  constructor(
    @Inject(STORAGE_PROVIDER) private readonly storageProvider: StorageProvider,
    private readonly validator: ExerciseMediaValidatorService,
  ) {}

  /**
   * Generates a deterministic, tenant-isolated storage key.
   * Format:
   * System: fitbeat/exercises/{exerciseId}/{category}/{timestamp}_{uuid}.{ext}
   * Tenant: fitbeat/tenants/{orgId}/exercises/{exerciseId}/{category}/{timestamp}_{uuid}.{ext}
   */
  generateStorageKey(params: {
    organisationId?: string | null;
    exerciseId: string;
    mediaType: string;
    extension: string;
  }): string {
    const { organisationId, exerciseId, mediaType, extension } = params;

    const categoryFolder = mediaType.toLowerCase() + 's';
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(6).toString('hex');
    const safeExt = extension.replace(/^\./, '').toLowerCase();
    const filename = `${timestamp}_${randomSuffix}.${safeExt}`;

    if (!organisationId) {
      // System-level global asset
      return `fitbeat/exercises/${exerciseId}/${categoryFolder}/${filename}`;
    }

    // Tenant-isolated asset
    return `fitbeat/tenants/${organisationId}/exercises/${exerciseId}/${categoryFolder}/${filename}`;
  }

  /**
   * Generates a pre-signed URL for uploading a file directly to storage.
   */
  async getUploadPresignedUrl(params: {
    storageKey: string;
    mimeType: string;
    expiresInSeconds?: number;
  }): Promise<SignedUploadUrlResult> {
    return this.storageProvider.getUploadSignedUrl(
      params.storageKey,
      params.mimeType,
      params.expiresInSeconds ?? 900,
    );
  }

  /**
   * Generates a temporary pre-signed download/view URL.
   */
  async getDownloadPresignedUrl(
    storageKey: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    return this.storageProvider.getDownloadSignedUrl(storageKey, expiresInSeconds);
  }

  /**
   * Saves a buffer directly to storage.
   */
  async saveBuffer(storageKey: string, buffer: Buffer, mimeType: string): Promise<void> {
    await this.storageProvider.saveFile(storageKey, buffer, mimeType);
  }

  /**
   * Deletes an asset from storage safely.
   */
  async deleteStorageFile(storageKey: string): Promise<boolean> {
    try {
      if (this.storageProvider.exists) {
        const exists = await this.storageProvider.exists(storageKey);
        if (!exists) {
          this.logger.warn(`Storage file already absent: ${storageKey}`);
          return false;
        }
      }
      await this.storageProvider.deleteFile(storageKey);
      return true;
    } catch (err) {
      this.logger.error(`Failed to delete storage file ${storageKey}: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Checks if an asset exists in storage.
   */
  async fileExists(storageKey: string): Promise<boolean> {
    if (this.storageProvider.exists) {
      return this.storageProvider.exists(storageKey);
    }
    return true;
  }
}
