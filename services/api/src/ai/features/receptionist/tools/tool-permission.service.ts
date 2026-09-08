/**
 * Day 31 — Receptionist Tool Permission Service
 * Enforces strict read-only execution guardrails and multi-tenant security boundaries.
 */

import { Injectable, Logger, ForbiddenException } from '@nestjs/common';

export const ALLOWED_RECEPTIONIST_TOOLS = [
  'lookup_gym_info',
  'lookup_operating_hours',
  'lookup_classes',
  'lookup_class_schedule',
  'lookup_trainers',
  'lookup_membership_plans',
  'lookup_pricing',
  'lookup_knowledge_source',
] as const;

export type AllowedReceptionistTool = (typeof ALLOWED_RECEPTIONIST_TOOLS)[number];

@Injectable()
export class ToolPermissionService {
  private readonly logger = new Logger(ToolPermissionService.name);

  /**
   * Validates tool call against allowed read-only whitelist and tenant scope.
   */
  validateToolExecution(
    toolName: string,
    organisationId: string,
    inputParams: Record<string, any>,
  ): void {
    // 1. Check if tool is on read-only whitelist
    if (!ALLOWED_RECEPTIONIST_TOOLS.includes(toolName as AllowedReceptionistTool)) {
      this.logger.warn(`[BLOCKED] Receptionist attempted unauthorized tool: ${toolName}`);
      throw new ForbiddenException(
        `Tool '${toolName}' is not authorized for AI Receptionist execution. Receptionist operates under strict read-only boundaries.`,
      );
    }

    // 2. Reject mutation verbs in tool names
    const forbiddenSubstrings = ['book', 'create', 'update', 'delete', 'cancel', 'pay', 'refund', 'charge'];
    for (const forbidden of forbiddenSubstrings) {
      if (toolName.toLowerCase().includes(forbidden)) {
        throw new ForbiddenException(
          `Mutation tool '${toolName}' is forbidden in Day 31 AI Receptionist.`,
        );
      }
    }

    // 3. IDOR / Tenant verification: If inputParams contains an organisationId, ensure it matches
    if (inputParams.organisationId && inputParams.organisationId !== organisationId) {
      throw new ForbiddenException('Cross-tenant tool execution violation');
    }
  }
}
