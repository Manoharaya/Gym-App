import { getAppConfig } from '@fitcore/config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = [
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'secret',
  'creditcard',
  'cardnumber',
  'cvv',
  'ssn',
  'medical',
  'diagnosis',
  'prescription',
  'heartrate',
  'bloodpressure',
];

export class Logger {
  private isProduction: boolean;

  constructor() {
    this.isProduction = getAppConfig().isProduction;
  }

  /**
   * Recursively redacts sensitive keys to protect user privacy & health data
   */
  private redact(obj: unknown): unknown {
    if (typeof obj === 'string') {
      if (obj.toLowerCase().includes('bearer ')) {
        return '[REDACTED_BEARER_TOKEN]';
      }
      return obj;
    }

    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redact(item));
    }

    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
        cleaned[key] = '[REDACTED]';
      } else {
        cleaned[key] = this.redact(val);
      }
    }
    return cleaned;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.isProduction) return;
    const sanitized = context ? this.redact(context) : undefined;
    console.debug(`[DEBUG] ${message}`, sanitized ?? '');
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.isProduction) return;
    const sanitized = context ? this.redact(context) : undefined;
    console.info(`[INFO] ${message}`, sanitized ?? '');
  }

  warn(message: string, context?: Record<string, unknown>): void {
    const sanitized = context ? this.redact(context) : undefined;
    console.warn(`[WARN] ${message}`, sanitized ?? '');
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const sanitizedContext = context ? this.redact(context) : undefined;
    const errorDetails =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: this.isProduction ? undefined : error.stack,
          }
        : error;

    console.error(`[ERROR] ${message}`, {
      error: errorDetails,
      context: sanitizedContext,
    });
  }
}

export const logger = new Logger();
