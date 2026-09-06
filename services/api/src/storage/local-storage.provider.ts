import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { StorageProvider, SignedUploadUrlResult } from './storage.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly storageRoot: string;

  constructor() {
    this.storageRoot = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.storageRoot)) {
      fs.mkdirSync(this.storageRoot, { recursive: true });
    }
  }

  private sanitizeKey(storageKey: string): string {
    // Prevent path traversal attacks
    const normalized = path.normalize(storageKey).replace(/^(\.\.(\/|\\|$))+/, '');
    return normalized.replace(/[^a-zA-Z0-9_\-\.\/]/g, '_');
  }

  async getUploadSignedUrl(
    storageKey: string,
    mimeType: string,
    expiresInSeconds = 900
  ): Promise<SignedUploadUrlResult> {
    const cleanKey = this.sanitizeKey(storageKey);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const token = crypto.createHmac('sha256', 'dev_storage_secret')
      .update(`${cleanKey}:${expiresAt.getTime()}`)
      .digest('hex');

    // In local development, return a signed endpoint URL
    const uploadUrl = `/api/v1/storage/upload?key=${encodeURIComponent(cleanKey)}&token=${token}&expires=${expiresAt.getTime()}`;

    return {
      uploadUrl,
      storageKey: cleanKey,
      expiresAt,
      headers: {
        'Content-Type': mimeType,
      },
    };
  }

  async getDownloadSignedUrl(
    storageKey: string,
    expiresInSeconds = 900
  ): Promise<string> {
    const cleanKey = this.sanitizeKey(storageKey);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const token = crypto.createHmac('sha256', 'dev_storage_secret')
      .update(`${cleanKey}:${expiresAt.getTime()}`)
      .digest('hex');

    return `/api/v1/storage/download?key=${encodeURIComponent(cleanKey)}&token=${token}&expires=${expiresAt.getTime()}`;
  }

  async deleteFile(storageKey: string): Promise<void> {
    const cleanKey = this.sanitizeKey(storageKey);
    const fullPath = path.join(this.storageRoot, cleanKey);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  async saveFile(
    storageKey: string,
    buffer: Buffer,
    _mimeType: string
  ): Promise<void> {
    const cleanKey = this.sanitizeKey(storageKey);
    const fullPath = path.join(this.storageRoot, cleanKey);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(fullPath, buffer);
  }
}
