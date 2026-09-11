/**
 * FitCore — Day 49: API Scope Registry & Verification Service
 */

import { Injectable } from '@nestjs/common';
import { ApiScope, ApiScopeDefinition, ScopeSensitivity } from '@fitcore/types';
import { API_SCOPE_REGISTRY } from '../domain/developer-scopes';
import { DeveloperError } from '../domain/developer-errors';

@Injectable()
export class ApiScopeService {
  /**
   * Returns all supported scopes and metadata
   */
  getAllScopes(): ApiScopeDefinition[] {
    return Object.values(API_SCOPE_REGISTRY);
  }

  /**
   * Validates that requested scopes exist in the scope registry.
   */
  validateScopes(scopes: string[]): ApiScope[] {
    for (const scope of scopes) {
      if (!API_SCOPE_REGISTRY[scope as ApiScope]) {
        throw new DeveloperError(
          'INVALID_REQUEST',
          `Unknown API scope: '${scope}'`,
        );
      }
    }
    return scopes as ApiScope[];
  }

  /**
   * Evaluates whether granted scopes satisfy required scopes.
   */
  hasRequiredScopes(grantedScopes: string[], requiredScopes: string[]): boolean {
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }
    return requiredScopes.every((req) => grantedScopes.includes(req));
  }

  /**
   * Asserts required scopes, throwing DeveloperError if insufficient.
   */
  assertScopes(grantedScopes: string[], requiredScopes: string[]): void {
    if (!this.hasRequiredScopes(grantedScopes, requiredScopes)) {
      throw DeveloperError.insufficientScope(requiredScopes, grantedScopes);
    }
  }

  /**
   * Checks if any of the given scopes are SENSITIVE or RESTRICTED.
   */
  hasSensitiveScopes(scopes: string[]): boolean {
    return scopes.some((s) => {
      const def = API_SCOPE_REGISTRY[s as ApiScope];
      return def && (def.sensitivity === 'SENSITIVE' || def.sensitivity === 'RESTRICTED');
    });
  }

  /**
   * Returns whether a scope grants health data access.
   */
  isHealthScope(scope: string): boolean {
    return scope === 'health:read' || scope === 'health:write' || scope === 'wearables:read';
  }
}
