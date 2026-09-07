import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AITool, AIToolContext, AIToolType } from '@fitcore/types';
import * as crypto from 'crypto';

@Injectable()
export class AIToolRegistryService {
  private readonly logger = new Logger(AIToolRegistryService.name);
  private readonly tools = new Map<string, AITool>();
  private readonly pendingConfirmations = new Map<
    string,
    { toolName: string; input: any; context: AIToolContext; expiresAt: number }
  >();

  constructor() {
    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    // 1. Harmless Read Tool (Slice 33)
    this.registerTool({
      name: 'get_gym_hours',
      description: 'Returns standard opening and closing hours for the gym.',
      toolType: 'READ_TOOL',
      requiresConfirmation: false,
      inputSchema: {
        type: 'object',
        properties: {
          dayOfWeek: { type: 'string', description: 'Day of week e.g. Monday' },
        },
      },
      execute: async (input, context) => {
        return {
          weekday: '06:00 - 22:00',
          saturday: '07:00 - 20:00',
          sunday: '08:00 - 18:00',
          publicHolidays: '08:00 - 16:00',
          timezone: 'Australia/Sydney',
        };
      },
    });

    // 2. Harmless Write Tool requiring confirmation (Slice 34)
    this.registerTool({
      name: 'log_water_intake',
      description: 'Records daily hydration volume for the member.',
      toolType: 'WRITE_TOOL',
      requiresConfirmation: true,
      inputSchema: {
        type: 'object',
        properties: {
          milliliters: { type: 'number', minimum: 50, maximum: 5000 },
        },
        required: ['milliliters'],
      },
      execute: async (input, context) => {
        return {
          status: 'SUCCESS',
          recordedMl: input.milliliters,
          loggedAt: new Date().toISOString(),
          memberId: context.memberId,
        };
      },
    });
  }

  registerTool(tool: AITool) {
    this.tools.set(tool.name, tool);
    this.logger.log(`Registered AI Tool '${tool.name}' (${tool.toolType})`);
  }

  getTool(name: string): AITool | undefined {
    return this.tools.get(name);
  }

  listTools(): AITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Generates a secure action preview token for write tools requiring user confirmation.
   */
  requestActionConfirmation(toolName: string, input: any, context: AIToolContext): {
    requiresConfirmation: true;
    confirmationToken: string;
    preview: { toolName: string; action: string; parameters: any };
  } {
    const token = `act_${crypto.randomBytes(16).toString('hex')}`;
    this.pendingConfirmations.set(token, {
      toolName,
      input,
      context,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
    });

    return {
      requiresConfirmation: true,
      confirmationToken: token,
      preview: {
        toolName,
        action: `Execute write action '${toolName}'`,
        parameters: input,
      },
    };
  }

  /**
   * Confirms and executes an authorized action.
   */
  async confirmAndExecuteAction(token: string, confirmed: boolean, executingUserId: string): Promise<any> {
    const pending = this.pendingConfirmations.get(token);
    if (!pending) {
      throw new BadRequestException('Invalid or expired action confirmation token');
    }

    if (pending.expiresAt < Date.now()) {
      this.pendingConfirmations.delete(token);
      throw new BadRequestException('Action confirmation token has expired');
    }

    if (pending.context.userId !== executingUserId) {
      throw new ForbiddenException('Action can only be confirmed by the initiating user');
    }

    this.pendingConfirmations.delete(token);

    if (!confirmed) {
      return { status: 'CANCELLED', message: 'Action was cancelled by user' };
    }

    const tool = this.tools.get(pending.toolName);
    if (!tool) {
      throw new BadRequestException(`Tool '${pending.toolName}' no longer available`);
    }

    return await tool.execute(pending.input, pending.context);
  }
}
