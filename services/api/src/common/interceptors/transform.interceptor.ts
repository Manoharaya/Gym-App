import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

export interface ApiResponseEnvelope<T> {
  success: true;
  data: T;
  requestId: string;
}

// Global BigInt JSON serialization fallback
if (!(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return Number(this);
  };
}

function serializeBigInts(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      res[key] = serializeBigInts(obj[key]);
    }
    return res;
  }
  return obj;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponseEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponseEnvelope<T>> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const requestId = req?.requestId || 'req_unknown';

    return next.handle().pipe(
      map((rawData) => {
        const data = serializeBigInts(rawData);
        // If data is an RFC 6749 OAuth token response, preserve top-level standard fields
        if (data && typeof data === 'object' && 'access_token' in data) {
          return data;
        }

        // If data is already enveloped with success property, preserve it
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return {
            ...data,
            requestId: data.requestId || requestId,
          };
        }

        // If data is a paginated result with { data, meta }
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return {
            success: true,
            data: data.data,
            meta: data.meta,
            requestId,
          };
        }

        return {
          success: true,
          data: data !== undefined ? data : null,
          requestId,
        };
      }),
    );
  }
}
