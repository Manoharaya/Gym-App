import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithUser, res: Response, next: NextFunction) {
    const rawRequestId = req.headers['x-request-id'];
    const requestId = typeof rawRequestId === 'string' && rawRequestId.trim() ? rawRequestId : randomUUID();

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    next();
  }
}
