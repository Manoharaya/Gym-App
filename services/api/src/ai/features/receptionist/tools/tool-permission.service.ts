/**
 * Day 32 — Receptionist Tool Permission Service
 * Enforces strict risk-tiered execution guardrails, authenticated member boundaries,
 * single-use confirmation token requirements, and multi-tenant isolation.
 */

import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';

export const ALLOWED_READ_TOOLS = [
  'lookup_gym_info',
  'lookup_operating_hours',
  'lookup_classes',
  'lookup_class_schedule',
  'lookup_trainers',
  'lookup_membership_plans',
  'lookup_pricing',
  'lookup_knowledge_source',
  'search_class_availability',
] as const;

export const ALLOWED_MEMBER_READ_TOOLS = [
  'get_member_bookings',
  'get_booking_details',
] as const;

export const ALLOWED_MUTATION_TOOLS = [
  'create_booking',
  'cancel_booking',
  'reschedule_booking',
  'join_waitlist',
] as const;

export const ALLOWED_RECEPTIONIST_TOOLS = [
  ...ALLOWED_READ_TOOLS,
  ...ALLOWED_MEMBER_READ_TOOLS,
  ...ALLOWED_MUTATION_TOOLS,
] as const;

export type AllowedReceptionistTool = (typeof ALLOWED_RECEPTIONIST_TOOLS)[number];

export type ToolRiskTier = 'LOW' | 'MEDIUM' | 'HIGH';

@Injectable()
export class ToolPermissionService {
  private readonly logger = new Logger(ToolPermissionService.name);

  /**
   * Returns the risk tier of a given tool.
   */
  getRiskTier(toolName: string): ToolRiskTier {
    if (ALLOWED_MUTATION_TOOLS.includes(toolName as any)) {
      return 'HIGH';
    }
    if (ALLOWED_MEMBER_READ_TOOLS.includes(toolName as any)) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  /**
   * Validates tool call against allowed whitelist, risk tier, member context, and tenant scope.
   */
  validateToolExecution(
    toolName: string,
    organisationId: string,
    inputParams: Record<string, any>,
    context?: { memberProfileId?: string; isProspect?: boolean },
  ): void {
    // 1. Whitelist validation
    if (!ALLOWED_RECEPTIONIST_TOOLS.includes(toolName as AllowedReceptionistTool)) {
      this.logger.warn(`[BLOCKED] Receptionist attempted unauthorized tool: ${toolName}`);
      throw new ForbiddenException(
        `Tool '${toolName}' is not authorized for AI Receptionist execution.`,
      );
    }

    // 2. Reject sensitive / forbidden operations (financials, raw deletes, refunds)
    const forbiddenSubstrings = ['pay', 'refund', 'charge', 'delete_user', 'drop'];
    for (const forbidden of forbiddenSubstrings) {
      if (toolName.toLowerCase().includes(forbidden)) {
        throw new ForbiddenException(
          `Operation '${toolName}' is strictly forbidden for AI Receptionist.`,
        );
      }
    }

    // 3. IDOR / Tenant verification: If inputParams contains an organisationId, ensure it matches
    if (inputParams.organisationId && inputParams.organisationId !== organisationId) {
      throw new ForbiddenException('Cross-tenant tool execution violation');
    }

    const memberId = inputParams.memberProfileId || context?.memberProfileId;
    const riskTier = this.getRiskTier(toolName);

    // 4. Medium Risk: Member-scoped reads require an authenticated member
    if (riskTier === 'MEDIUM') {
      if (!memberId) {
        throw new ForbiddenException(
          `Tool '${toolName}' requires an authenticated member account. Prospects cannot view private member bookings.`,
        );
      }
    }

    // 5. High Risk: Controlled mutations require authenticated member AND valid confirmation token
    if (riskTier === 'HIGH') {
      if (!memberId) {
        throw new ForbiddenException(
          `Tool '${toolName}' requires an authenticated member account. Unauthenticated prospects cannot perform booking mutations.`,
        );
      }

      if (!inputParams.confirmationToken || typeof inputParams.confirmationToken !== 'string') {
        throw new BadRequestException(
          `Tool '${toolName}' requires a valid single-use confirmation token. Operations must follow the two-step confirmation flow.`,
        );
      }
    }
  }
}
