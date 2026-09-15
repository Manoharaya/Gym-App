import { Injectable, BadRequestException } from '@nestjs/common';
import * as path from 'path';

export interface FileValidationResult {
  isValid: boolean;
  sanitizedFilename: string;
  extension: string;
  detectedMimeType: string;
  fileSize: number;
}

@Injectable()
export class ExerciseMediaValidatorService {
  // Configurable size ceilings per media category (in bytes)
  private readonly MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15 MB
  private readonly MAX_VIDEO_SIZE = 150 * 1024 * 1024; // 150 MB
  private readonly MAX_3D_SIZE = 50 * 1024 * 1024; // 50 MB
  private readonly MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25 MB
  private readonly MAX_ANIMATION_SIZE = 25 * 1024 * 1024; // 25 MB
  private readonly MAX_CAPTION_SIZE = 5 * 1024 * 1024; // 5 MB
  private readonly MAX_DEFAULT_SIZE = 15 * 1024 * 1024;

  // Strict MIME type whitelists per category
  private readonly MIME_WHITELISTS: Record<string, string[]> = {
    IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    THUMBNAIL: ['image/jpeg', 'image/png', 'image/webp'],
    ILLUSTRATION: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    VIDEO: ['video/mp4', 'video/webm', 'video/quicktime'],
    ANIMATION: ['image/gif', 'video/webm', 'application/json'],
    MODEL_3D: [
      'model/gltf-binary',
      'model/gltf+json',
      'model/vnd.usdz+zip',
      'application/octet-stream', // fallback for .glb files
    ],
    AUDIO: ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm'],
    CAPTION: ['text/vtt', 'application/x-subrip', 'text/plain'],
    TRANSCRIPT: ['text/plain', 'application/json', 'text/vtt'],
  };

  // Extension mappings to validate client-supplied extensions match MIME types
  private readonly EXTENSION_MIME_MAP: Record<string, string[]> = {
    jpg: ['image/jpeg'],
    jpeg: ['image/jpeg'],
    png: ['image/png'],
    webp: ['image/webp'],
    gif: ['image/gif'],
    svg: ['image/svg+xml'],
    mp4: ['video/mp4'],
    webm: ['video/webm', 'audio/webm'],
    mov: ['video/quicktime'],
    glb: ['model/gltf-binary', 'application/octet-stream'],
    gltf: ['model/gltf+json'],
    usdz: ['model/vnd.usdz+zip', 'application/octet-stream'],
    mp3: ['audio/mpeg'],
    wav: ['audio/wav'],
    ogg: ['audio/ogg'],
    vtt: ['text/vtt', 'text/plain'],
    srt: ['application/x-subrip', 'text/plain'],
    txt: ['text/plain'],
    json: ['application/json'],
  };

  /**
   * Sanitizes a client-provided filename to prevent path traversal and unsafe characters.
   */
  sanitizeFilename(rawFilename: string): string {
    if (!rawFilename || typeof rawFilename !== 'string') {
      return 'asset.bin';
    }

    // Strip path traversal characters, directory separators, null bytes, and non-printable characters
    const base = path.basename(rawFilename.replace(/[\x00-\x1F\x7F]/g, ''));
    const safeName = base
      .replace(/^(\.\.[\/\\])+/, '')
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
      .replace(/_{2,}/g, '_');

    return safeName || 'asset.bin';
  }

  /**
   * Extracts extension without leading dot in lowercase.
   */
  extractExtension(filename: string): string {
    const ext = path.extname(filename).toLowerCase().replace(/^\./, '');
    return ext;
  }

  /**
   * Returns maximum allowed file size for a given media type.
   */
  getMaxSizeBytes(mediaType: string): number {
    switch (mediaType) {
      case 'IMAGE':
      case 'THUMBNAIL':
      case 'ILLUSTRATION':
        return this.MAX_IMAGE_SIZE;
      case 'VIDEO':
        return this.MAX_VIDEO_SIZE;
      case 'MODEL_3D':
        return this.MAX_3D_SIZE;
      case 'AUDIO':
        return this.MAX_AUDIO_SIZE;
      case 'ANIMATION':
        return this.MAX_ANIMATION_SIZE;
      case 'CAPTION':
      case 'TRANSCRIPT':
        return this.MAX_CAPTION_SIZE;
      default:
        return this.MAX_DEFAULT_SIZE;
    }
  }

  /**
   * Validates media upload parameters (for pre-signing or prior to direct upload).
   */
  validateMediaMetadata(params: {
    filename: string;
    mimeType: string;
    mediaType: string;
    fileSize?: number;
  }): { sanitizedFilename: string; extension: string; cleanMimeType: string } {
    const { filename, mimeType, mediaType, fileSize } = params;

    const sanitizedFilename = this.sanitizeFilename(filename);
    const extension = this.extractExtension(sanitizedFilename);

    if (!extension) {
      throw new BadRequestException('File must have a valid file extension');
    }

    // Reject executable and script extensions explicitly
    const executableExtensions = ['exe', 'bat', 'cmd', 'sh', 'php', 'js', 'py', 'pl', 'jar', 'vbs', 'msi', 'com'];
    if (executableExtensions.includes(extension)) {
      throw new BadRequestException(`Executable file extension '.${extension}' is strictly prohibited`);
    }

    const cleanMime = (mimeType || '').toLowerCase().trim();
    const allowedMimes = this.MIME_WHITELISTS[mediaType];

    if (!allowedMimes) {
      throw new BadRequestException(`Unsupported media type: ${mediaType}`);
    }

    if (!allowedMimes.includes(cleanMime)) {
      throw new BadRequestException(
        `MIME type '${cleanMime}' is not permitted for media category '${mediaType}'. Allowed: ${allowedMimes.join(', ')}`,
      );
    }

    // Check extension aligns with MIME type
    const expectedMimes = this.EXTENSION_MIME_MAP[extension];
    if (expectedMimes && !expectedMimes.includes(cleanMime)) {
      throw new BadRequestException(
        `File extension '.${extension}' does not match declared MIME type '${cleanMime}'`,
      );
    }

    // Check size limit if provided
    if (fileSize !== undefined) {
      const maxSize = this.getMaxSizeBytes(mediaType);
      if (fileSize > maxSize) {
        throw new BadRequestException(
          `File size ${Math.round(fileSize / (1024 * 1024))}MB exceeds maximum limit of ${Math.round(
            maxSize / (1024 * 1024),
          )}MB for ${mediaType}`,
        );
      }
    }

    return {
      sanitizedFilename,
      extension,
      cleanMimeType: cleanMime,
    };
  }

  /**
   * Inspects buffer magic bytes (file signature) to detect actual binary format.
   */
  verifyMagicBytes(buffer: Buffer, declaredMimeType: string, extension: string): void {
    if (!buffer || buffer.length < 4) {
      throw new BadRequestException('Uploaded file buffer is empty or corrupted');
    }

    const headerHex = buffer.subarray(0, 16).toString('hex').toUpperCase();

    // JPEG signature: FF D8 FF
    if (declaredMimeType === 'image/jpeg' || ['jpg', 'jpeg'].includes(extension)) {
      if (!headerHex.startsWith('FFD8FF')) {
        throw new BadRequestException('File header does not match a valid JPEG image format');
      }
    }

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (declaredMimeType === 'image/png' || extension === 'png') {
      if (!headerHex.startsWith('89504E470D0A1A0A')) {
        throw new BadRequestException('File header does not match a valid PNG image format');
      }
    }

    // GIF signature: 47 49 46 38 ('GIF8')
    if (declaredMimeType === 'image/gif' || extension === 'gif') {
      if (!headerHex.startsWith('47494638')) {
        throw new BadRequestException('File header does not match a valid GIF format');
      }
    }

    // WEBP signature: 'RIFF....WEBP'
    if (declaredMimeType === 'image/webp' || extension === 'webp') {
      const asciiPrefix = buffer.subarray(0, 4).toString('ascii');
      const asciiFormat = buffer.subarray(8, 12).toString('ascii');
      if (asciiPrefix !== 'RIFF' || asciiFormat !== 'WEBP') {
        throw new BadRequestException('File header does not match a valid WEBP format');
      }
    }

    // MP4 signature: contains 'ftyp' in bytes 4-8
    if (declaredMimeType === 'video/mp4' || extension === 'mp4') {
      const ftypMarker = buffer.subarray(4, 8).toString('ascii');
      if (ftypMarker !== 'ftyp') {
        throw new BadRequestException('File header does not match a valid MP4 video format');
      }
    }

    // GLB 3D signature: 'glTF' (0x67 0x6C 0x54 0x46)
    if (extension === 'glb') {
      const gltfMarker = buffer.subarray(0, 4).toString('ascii');
      if (gltfMarker !== 'glTF') {
        throw new BadRequestException('File header does not match a valid GLB (glTF binary) format');
      }
    }
  }
}
