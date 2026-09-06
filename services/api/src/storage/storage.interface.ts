export interface SignedUploadUrlResult {
  uploadUrl: string;
  storageKey: string;
  expiresAt: Date;
  headers?: Record<string, string>;
}

export interface StorageProvider {
  /**
   * Generates a secure, temporary pre-signed URL for client-side uploads.
   * Path traversal safe. Never constructs keys from untrusted client filenames.
   */
  getUploadSignedUrl(
    storageKey: string,
    mimeType: string,
    expiresInSeconds?: number
  ): Promise<SignedUploadUrlResult>;

  /**
   * Generates a temporary pre-signed URL for viewing/downloading sensitive files.
   * Never returns public, permanent URLs.
   */
  getDownloadSignedUrl(
    storageKey: string,
    expiresInSeconds?: number
  ): Promise<string>;

  /**
   * Deletes an object from storage.
   */
  deleteFile(storageKey: string): Promise<void>;

  /**
   * Saves a file directly to storage (used in local development or server-side processing).
   */
  saveFile(
    storageKey: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<void>;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
