/**
 * FitCore — Day 49: API Versioning Service
 */

import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiVersionService {
  readonly CURRENT_VERSION = 'v1';
  readonly SUPPORTED_VERSIONS = ['v1'];

  /**
   * Resolves the requested API version from URL path or header
   */
  resolveVersion(req: Request): string {
    // Check header Accept-Version
    const headerVersion = req.header('Accept-Version') || req.header('X-API-Version');
    if (headerVersion && this.SUPPORTED_VERSIONS.includes(headerVersion.toLowerCase())) {
      return headerVersion.toLowerCase();
    }

    // Default to v1
    return this.CURRENT_VERSION;
  }

  isSupported(version: string): boolean {
    return this.SUPPORTED_VERSIONS.includes(version);
  }
}
