import { Injectable } from '@nestjs/common';

@Injectable()
export class LogRedactionService {
  private readonly sensitivePatterns = [
    /pass(word)?/i,
    /token/i,
    /secret/i,
    /key/i,
    /authorization/i,
    /auth_?token/i,
    /cookie/i,
    /mfa/i,
    /recovery/i,
    /card(number)?/i,
    /cvv/i,
    /parq/i,
    /medical/i,
    /credential/i,
    /clientsecret/i,
  ];

  /**
   * Recursively sanitizes payloads, replacing values for matching sensitive keys with '[REDACTED]'.
   */
  redact(data: any, depth: number = 0): any {
    if (depth > 8 || data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      // Direct Bearer token regex check
      if (/bearer\s+[a-zA-Z0-9\-_.]+/i.test(data)) {
        return data.replace(/bearer\s+[a-zA-Z0-9\-_.]+/gi, 'Bearer [REDACTED]');
      }
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.redact(item, depth + 1));
    }

    if (typeof data === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        if (this.isSensitiveKey(key)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.redact(value, depth + 1);
        }
      }
      return sanitized;
    }

    return data;
  }

  isSensitiveKey(key: string): boolean {
    return this.sensitivePatterns.some((pattern) => pattern.test(key));
  }
}
