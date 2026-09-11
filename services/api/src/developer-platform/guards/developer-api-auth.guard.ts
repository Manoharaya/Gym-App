/**
 * FitCore — Day 49: Developer Public API Authentication & Rate Limiting Guard
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ApiAuthorizationService } from '../services/api-authorization.service';
import { ApiRateLimitService } from '../services/api-rate-limit.service';
import { ApiUsageService } from '../services/api-usage.service';
import { Request, Response } from 'express';

@Injectable()
export class DeveloperApiAuthGuard implements CanActivate {
  private readonly logger = new Logger(DeveloperApiAuthGuard.name);

  constructor(
    private readonly authService: ApiAuthorizationService,
    private readonly rateLimitService: ApiRateLimitService,
    private readonly usageService: ApiUsageService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { developerContext?: any; requestId?: string }>();
    const res = http.getResponse<Response>();

    const startTime = Date.now();

    // Ensure requestId
    const requestId =
      (req.header('X-Request-Id') as string) ||
      `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    // 1. Authenticate & Authorize Context
    const devContext = await this.authService.resolveContext(req);
    req.developerContext = devContext;

    // 2. Evaluate Rate Limit
    const rateLimitTier = devContext.environment === 'PRODUCTION' ? 'STANDARD' : 'SANDBOX';
    const rateLimit = await this.rateLimitService.checkRateLimit(
      devContext.applicationId,
      rateLimitTier,
    );

    res.setHeader('X-RateLimit-Limit', rateLimit.limit.toString());
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
    res.setHeader('X-RateLimit-Reset', rateLimit.resetSeconds.toString());

    // 3. Attach response finish hook for usage tracking
    res.on('finish', () => {
      const latencyMs = Date.now() - startTime;
      this.usageService.recordUsage({
        applicationId: devContext.applicationId,
        organisationId: devContext.organisationId,
        apiKeyId: devContext.apiKeyId,
        environment: devContext.environment,
        endpoint: req.route?.path || req.path,
        method: req.method,
        statusCode: res.statusCode,
        latencyMs,
        scope: devContext.scopes?.[0] || null,
        requestId,
        ipAddress: req.ip,
        userAgent: req.header('user-agent'),
      });
    });

    return true;
  }
}
