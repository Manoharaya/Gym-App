import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class StructuredLogger implements NestLoggerService {
  private readonly sensitiveKeys = [
    'password',
    'passwordhash',
    'token',
    'refreshtoken',
    'accesstoken',
    'authorization',
    'secret',
    'creditcard',
    'cardnumber',
    'cvv',
  ];

  private sanitize(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (this.sensitiveKeys.some((s) => lowerKey.includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private formatMessage(level: string, message: any, context?: string, ...optionalParams: any[]) {
    const timestamp = new Date().toISOString();
    const sanitizedParams = optionalParams.map((param) => this.sanitize(param));

    const logObject = {
      timestamp,
      level,
      context: context || 'Application',
      message: typeof message === 'object' ? this.sanitize(message) : message,
      ...(sanitizedParams.length > 0 ? { extra: sanitizedParams } : {}),
    };

    return JSON.stringify(logObject);
  }

  log(message: any, context?: string, ...optionalParams: any[]) {
    console.log(this.formatMessage('INFO', message, context, ...optionalParams));
  }

  error(message: any, trace?: string, context?: string, ...optionalParams: any[]) {
    console.error(
      this.formatMessage('ERROR', message, context, { trace, ...optionalParams }),
    );
  }

  warn(message: any, context?: string, ...optionalParams: any[]) {
    console.warn(this.formatMessage('WARN', message, context, ...optionalParams));
  }

  debug(message: any, context?: string, ...optionalParams: any[]) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('DEBUG', message, context, ...optionalParams));
    }
  }

  verbose(message: any, context?: string, ...optionalParams: any[]) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage('VERBOSE', message, context, ...optionalParams));
    }
  }
}
