import type {
  DocumentCategory,
  DocumentRecord,
  FileUploadRequest,
  FileUploadResponse,
} from '@fitcore/types';
import { apiClient } from '../api';
import { logger } from '../logging';

/**
 * FitCore Document & File Service Abstraction
 *
 * CRITICAL ARCHITECTURAL RULE:
 * Never upload sensitive documents directly from UI components.
 * All file uploads and signatures must route through DocumentService.
 */
export class DocumentService {
  public async getDocuments(category?: DocumentCategory): Promise<DocumentRecord[]> {
    logger.debug('Fetching user documents', { category });
    const response = await apiClient.get<DocumentRecord[]>('/documents', {
      params: category ? { category } : undefined,
    });
    return response.data;
  }

  public async requestPresignedUpload(request: FileUploadRequest): Promise<FileUploadResponse> {
    logger.info('Requesting secure presigned document upload URL', {
      category: request.category,
      fileName: request.fileName,
    });
    const response = await apiClient.post<FileUploadResponse>('/documents/upload-url', {
      category: request.category,
      fileName: request.fileName,
      mimeType: request.mimeType,
      fileSizeBytes: request.fileSizeBytes,
      metadata: request.metadata,
    });
    return response.data;
  }

  public async completeUpload(documentId: string): Promise<DocumentRecord> {
    logger.info(`Finalizing document registration: ${documentId}`);
    const response = await apiClient.post<DocumentRecord>(`/documents/${documentId}/complete`);
    return response.data;
  }
}

export const documentService = new DocumentService();
