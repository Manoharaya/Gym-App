/**
 * FitCore Document & File Upload Architecture Contracts
 *
 * Strict architectural rule:
 * Never upload sensitive documents directly from UI components.
 * All files must route through the DocumentService abstraction.
 */

export type DocumentCategory =
  | 'MEDICAL_CLEARANCE'
  | 'SIGNED_AGREEMENT'
  | 'LIABILITY_WAIVER'
  | 'PROGRESS_PHOTO'
  | 'PAYMENT_RECEIPT'
  | 'MEMBERSHIP_CONTRACT'
  | 'IDENTIFICATION';

export interface DocumentRecord {
  id: string;
  userId: string;
  organisationId: string;
  outletId?: string;
  category: DocumentCategory;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  url: string;
  isEncrypted: boolean;
  uploadedAt: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface FileUploadRequest {
  category: DocumentCategory;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  uri: string; // Local device URI
  metadata?: Record<string, unknown>;
}

export interface FileUploadResponse {
  documentId: string;
  uploadUrl: string;
  destinationPath: string;
  expiresAt: string;
}
