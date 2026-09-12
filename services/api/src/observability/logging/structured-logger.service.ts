import { Injectable, LoggerService } from '@nestjs/common';
import { LogRedactionService } from './log-redaction.service';

export interface LogContext {
  service?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  organisationId?: string;
  userId?: string;
  durationMs?: number;
  [key: string]: any;
}

@Injectable()
export class StructuredLoggerService implements LoggerService {
  constructor(private readonly redactionService: LogRedactionService) {}

  log(message: any, context?: LogContext | string) {
    this.output('INFO', message, context);
  }

  error(message: any, trace?: string, context?: LogContext | string) {
    this.output('ERROR', message, context, trace);
  }

  warn(message: any, context?: LogContext | string) {
    this.output('WARN', message, context);
  }

  debug(message: any, context?: LogContext | string) {
    if (process.env.NODE_ENV !== 'production') {
      this.output('DEBUG', message, context);
    }
  }

  verbose(message: any, context?: LogContext | string) {
    if (process.env.NODE_ENV !== 'production') {
      this.output('TRACE', message, context);
    }
  }

  private output(level: string, message: any, context?: LogContext | string, trace?: string) {
    const timestamp = new Date().toISOString();
    const ctxObj = typeof context === 'string' ? { context } : context || {};

    const rawPayload = {
      timestamp,
      level,
      message,
      service: ctxObj.service || 'fitcore-api',
      requestId: ctxObj.requestId,
      traceId: ctxObj.traceId,
      organisationId: ctxObj.organisationId,
      userId: ctxObj.userId,
      durationMs: ctxObj.durationMs,
      ...(trace ? { stack: trace } : {}),
      meta: ctxObj,
    };

    // Deep sanitize sensitive data
    const sanitized = this.redactionService.redact(rawPayload);

    // Output formatted JSON for log aggregators (Fluentd, CloudWatch, Datadog)
    if (process.env.NODE_ENV === 'test') {
      // Keep tests quiet unless explicitly debugging
      return;
    }

    if (level === 'ERROR') {
      console.error(JSON.stringify(sanitized));
    } else if (level === 'WARN') {
      console.warn(JSON.stringify(sanitized));
    } else {
      console.log(JSON.stringify(sanitized));
    }
  }
}
