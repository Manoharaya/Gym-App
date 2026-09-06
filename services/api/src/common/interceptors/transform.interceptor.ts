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

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponseEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponseEnvelope<T>> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const requestId = req?.requestId || 'req_unknown';

    return next.handle().pipe(
      map((data) => {
        // If data is already enveloped with success property, preserve it
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return {
            ...data,
            requestId: data.requestId || requestId,
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
