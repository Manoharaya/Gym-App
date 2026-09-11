/**
 * FitCore — Day 49: Developer Scope Verification Guard
 */

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_SCOPES_KEY } from '../decorators/require-scopes.decorator';
import { ApiScopeService } from '../services/api-scope.service';
import { DeveloperSecurityContext } from '../services/api-authorization.service';
import { ApiScope } from '@fitcore/types';
import { DeveloperError } from '../domain/developer-errors';

@Injectable()
export class DeveloperScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly scopeService: ApiScopeService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<ApiScope[]>(REQUIRE_SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const devContext: DeveloperSecurityContext = req.developerContext;

    if (!devContext || !devContext.scopes) {
      throw DeveloperError.unauthenticated('No granted scopes found in request context');
    }

    this.scopeService.assertScopes(devContext.scopes, requiredScopes);
    return true;
  }
}
