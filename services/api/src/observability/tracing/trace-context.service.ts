import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
}

@Injectable()
export class TraceContextService {
  /**
   * Generates a 32-character hex traceId compliant with W3C TraceContext.
   */
  generateTraceId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Generates a 16-character hex spanId.
   */
  generateSpanId(): string {
    return randomBytes(8).toString('hex');
  }

  /**
   * Parses W3C traceparent header: version-traceId-spanId-traceFlags
   * Example: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
   */
  parseTraceparent(header?: string): TraceContext {
    if (header && typeof header === 'string') {
      const parts = header.trim().split('-');
      if (parts.length === 4 && parts[1].length === 32 && parts[2].length === 16) {
        return {
          traceId: parts[1],
          parentSpanId: parts[2],
          spanId: this.generateSpanId(),
          sampled: parts[3] === '01',
        };
      }
    }

    return {
      traceId: this.generateTraceId(),
      spanId: this.generateSpanId(),
      sampled: true,
    };
  }

  /**
   * Formats context into standard traceparent header string.
   */
  formatTraceparent(ctx: TraceContext): string {
    const flags = ctx.sampled ? '01' : '00';
    return `00-${ctx.traceId}-${ctx.spanId}-${flags}`;
  }
}
