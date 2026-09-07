import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { AIOrchestratorService } from '../orchestrator/ai-orchestrator.service';
import { AIFeatureConfigService } from '../services/ai-feature-config.service';
import { AIUsageService } from '../usage/ai-usage.service';
import { AIFeedbackService } from '../services/ai-feedback.service';
import { AIHealthService } from '../services/ai-health.service';
import { AIToolRegistryService } from '../services/ai-tool-registry.service';
import { AITestRequestDto, SubmitAIFeedbackDto, AIUsageQueryDto } from '../dto/ai.dto';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('AI Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai')
export class AIController {
  constructor(
    private readonly orchestrator: AIOrchestratorService,
    private readonly featureConfig: AIFeatureConfigService,
    private readonly usageService: AIUsageService,
    private readonly feedbackService: AIFeedbackService,
    private readonly healthService: AIHealthService,
    private readonly toolRegistry: AIToolRegistryService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('test')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Execute a controlled AI test prompt through the centralized gateway' })
  async executeTestPrompt(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AITestRequestDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrganisationId(user, headerOrgId);

    // Resolve member profile if any
    const member = await this.prisma.memberProfile.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    return this.orchestrator.execute({
      feature: dto.feature || 'AI_PLATFORM_TEST',
      prompt: dto.prompt,
      organisationId,
      user,
      memberId: member?.id,
      modelId: dto.modelId,
      systemInstructionOverride: dto.systemInstruction,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
      responseFormat: dto.responseFormat,
      expectedSchema: dto.expectedSchema,
    });
  }

  @Get('features')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Get available AI features and status for the user organisation' })
  async getFeatures(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrganisationId(user, headerOrgId);
    return this.featureConfig.listOrganisationFeatures(organisationId);
  }

  @Get('usage')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Get current user AI usage and token metrics' })
  async getUsage(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AIUsageQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const organisationId = this.resolveOrganisationId(user, headerOrgId);
    return this.usageService.getUsageSummary(organisationId, {
      ...query,
      userId: user.id,
    });
  }

  @Post('feedback')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Submit feedback on an AI response' })
  async submitFeedback(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitAIFeedbackDto) {
    return this.feedbackService.submitFeedback(user, dto);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check AI model gateway provider health' })
  async getHealth() {
    return this.healthService.getHealthStatus();
  }

  @Post('actions/confirm')
  @RequirePermissions({ resource: 'ai', action: 'use' })
  @ApiOperation({ summary: 'Confirm and execute an AI tool write action' })
  async confirmAction(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { actionToken: string; confirmed: boolean },
  ) {
    if (!body.actionToken) {
      throw new BadRequestException('actionToken is required');
    }
    return this.toolRegistry.confirmAndExecuteAction(body.actionToken, body.confirmed, user.id);
  }

  private resolveOrganisationId(user: AuthenticatedUser, headerOrgId?: string): string {
    const userOrgId = user.roles?.[0]?.organisationId;
    const orgId = userOrgId || headerOrgId;
    if (!orgId) {
      throw new BadRequestException('Organisation context is required');
    }
    return orgId;
  }
}
