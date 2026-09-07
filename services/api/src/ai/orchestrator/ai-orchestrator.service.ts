import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
  BadGatewayException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AIFeatureConfigService } from '../services/ai-feature-config.service';
import { AIRateLimitService } from '../services/ai-rate-limit.service';
import { AIUsageLimitService } from '../usage/ai-usage-limit.service';
import { AIContextEngineService } from '../context/ai-context-engine.service';
import { AISafetyService } from '../safety/ai-safety.service';
import { PromptRegistryService } from '../prompts/prompt-registry.service';
import { PromptTemplateService } from '../prompts/prompt-template.service';
import { ModelRouterService } from '../models/model-router.service';
import { ModelFallbackService } from '../models/model-fallback.service';
import { ModelGatewayService } from '../gateway/model-gateway.service';
import { AIOutputValidatorService } from '../services/ai-output-validator.service';
import { AIUsageService } from '../usage/ai-usage.service';
import { AICacheService } from '../cache/ai-cache.service';
import { AIAuditService } from '../services/ai-audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { AIFeature, AIContextSource, AIProviderRequest } from '@fitcore/types';

export interface ExecuteAIOptions {
  feature: AIFeature;
  prompt: string;
  organisationId: string;
  outletId?: string | null;
  user: AuthenticatedUser;
  memberId?: string | null;
  modelId?: string;
  promptKey?: string;
  promptVersion?: number;
  systemInstructionOverride?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  expectedSchema?: Record<string, any>;
  requestedSources?: AIContextSource[];
}

export interface AIExecutionResult {
  requestId: string;
  responseId: string;
  content: string;
  structuredOutput?: any;
  model: string;
  provider: string;
  latencyMs: number;
  tokens: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cached?: boolean;
}

@Injectable()
export class AIOrchestratorService {
  private readonly logger = new Logger(AIOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly featureConfig: AIFeatureConfigService,
    private readonly rateLimiter: AIRateLimitService,
    private readonly usageLimiter: AIUsageLimitService,
    private readonly contextEngine: AIContextEngineService,
    private readonly safetyService: AISafetyService,
    private readonly promptRegistry: PromptRegistryService,
    private readonly promptTemplate: PromptTemplateService,
    private readonly modelRouter: ModelRouterService,
    private readonly modelFallback: ModelFallbackService,
    private readonly modelGateway: ModelGatewayService,
    private readonly outputValidator: AIOutputValidatorService,
    private readonly usageService: AIUsageService,
    private readonly cacheService: AICacheService,
    private readonly auditService: AIAuditService,
  ) {}

  /**
   * Complete 12-step centralized AI request execution pipeline.
   * Non-bypassable by application code.
   */
  async execute(options: ExecuteAIOptions): Promise<AIExecutionResult> {
    const {
      feature,
      prompt,
      organisationId,
      outletId,
      user,
      memberId,
      modelId,
      promptKey = 'default',
      promptVersion,
      systemInstructionOverride,
      temperature,
      maxTokens,
      responseFormat = 'text',
      expectedSchema,
      requestedSources,
    } = options;

    const userRoles = (user.roles || []).map((r: any) => (typeof r === 'string' ? r : r.role));
    const primaryRole = userRoles[0] || 'MEMBER';

    // 1. Authorization & Feature Validation
    const config = await this.featureConfig.validateFeatureAccess(
      organisationId,
      feature,
      primaryRole,
      outletId,
    );

    // 2. Rate Limiting & Usage Limits
    await this.rateLimiter.assertRateLimit(user.id);
    await this.usageLimiter.assertLimitsNotExceeded(
      organisationId,
      feature,
      user.id,
      config.dailyLimit,
      config.monthlyLimit,
    );

    // 3. Safety Pre-Check on Input (Prompt Injection Defense & Prohibited Content)
    const safetyCheck = this.safetyService.evaluateInput(prompt);
    if (safetyCheck.decision === 'BLOCK') {
      await this.auditService.recordAuditEvent({
        organisationId,
        outletId,
        userId: user.id,
        feature,
        eventType: 'AI_REQUEST_BLOCKED',
        result: 'BLOCKED',
        metadata: { reason: safetyCheck.reason, flagged: safetyCheck.flaggedPatterns },
      });

      // Persist blocked request record for audit
      await this.prisma.aIRequest.create({
        data: {
          organisationId,
          outletId,
          userId: user.id,
          memberId: memberId || null,
          feature,
          status: 'BLOCKED',
          requestType: 'SYNC',
          completedAt: new Date(),
          metadata: { reason: safetyCheck.reason },
        },
      });

      throw new BadRequestException(safetyCheck.reason || 'Prompt blocked by safety policy');
    }

    // 4. Cache Check (Only for non-personal prompts)
    const cachedResult = await this.cacheService.getCachedResponse(
      organisationId,
      feature,
      prompt,
      memberId,
    );
    if (cachedResult) {
      this.logger.log(`Serving cached AI response for org '${organisationId}', feature '${feature}'`);
      return {
        ...cachedResult,
        cached: true,
      };
    }

    // 5. Context Permission & Assembly
    const { memberContext, activeSources } = await this.contextEngine.buildContext({
      feature,
      organisationId,
      memberId: memberId || undefined,
      user,
      requestedSources,
    });

    // 6. Prompt Resolution & Variable Interpolation
    const promptRecord = await this.promptRegistry.resolvePrompt(
      organisationId,
      feature,
      promptKey,
      promptVersion,
    );

    const mergedContext = {
      ...(memberContext || {}),
      organisation: { id: organisationId },
      currentDate: new Date().toISOString().split('T')[0],
    };

    const renderedSystemPrompt = this.promptTemplate.render(
      systemInstructionOverride || promptRecord.systemPrompt,
      mergedContext,
    );

    // 7. Model Routing
    const effectiveModelId = modelId || config.modelId || undefined;
    const requiredCapabilities = responseFormat === 'json' ? ['STRUCTURED_OUTPUT' as const] : [];
    let selectedModel = await this.modelRouter.routeModel({
      feature,
      preferredModelId: effectiveModelId,
      requiredCapabilities,
    });

    // 8. Request Persistence (STARTED)
    const aiRequest = await this.prisma.aIRequest.create({
      data: {
        organisationId,
        outletId,
        userId: user.id,
        memberId: memberId || null,
        feature,
        status: 'PROCESSING',
        modelId: selectedModel.id,
        provider: selectedModel.provider,
        requestType: 'SYNC',
        metadata: {
          promptKey,
          promptVersion: promptRecord.version,
          activeSources,
        },
      },
    });

    await this.auditService.recordAuditEvent({
      organisationId,
      outletId,
      userId: user.id,
      feature,
      requestId: aiRequest.id,
      eventType: 'AI_REQUEST_STARTED',
      result: 'SUCCESS',
      metadata: { model: selectedModel.displayName, provider: selectedModel.provider },
    });

    // 9. Frame Messages with strict System, Context, and Untrusted User boundaries
    const framedMessages = this.safetyService.buildFramedMessages(
      renderedSystemPrompt,
      JSON.stringify(mergedContext),
      prompt,
    );

    const schemaToUse = expectedSchema || (promptRecord.outputSchema as Record<string, any>) || undefined;

    const providerRequest: AIProviderRequest = {
      model: selectedModel.modelKey,
      messages: framedMessages,
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens ?? 1000,
      responseFormat,
      outputSchema: schemaToUse,
    };

    // 10. Provider Execution with Fallback Handling
    let providerResponse: any;
    try {
      providerResponse = await this.modelGateway.execute(selectedModel.provider, providerRequest);
    } catch (primaryErr: any) {
      this.logger.warn(`Primary model execution failed (${selectedModel.modelKey}): ${primaryErr.message}`);

      // Attempt Fallback (Slice 30)
      const fallbackModel = await this.modelFallback.resolveFallbackModel(
        selectedModel.id,
        requiredCapabilities,
      );

      if (fallbackModel) {
        this.logger.log(`Executing on fallback model: ${fallbackModel.displayName}`);
        await this.auditService.recordAuditEvent({
          organisationId,
          outletId,
          userId: user.id,
          feature,
          requestId: aiRequest.id,
          eventType: 'AI_MODEL_FALLBACK',
          result: 'SUCCESS',
          metadata: { fromModel: selectedModel.displayName, toModel: fallbackModel.displayName },
        });

        selectedModel = fallbackModel;
        providerRequest.model = fallbackModel.modelKey;
        providerResponse = await this.modelGateway.execute(fallbackModel.provider, providerRequest);
      } else {
        await this.prisma.aIRequest.update({
          where: { id: aiRequest.id },
          data: { status: 'FAILED', completedAt: new Date() },
        });
        await this.auditService.recordAuditEvent({
          organisationId,
          outletId,
          userId: user.id,
          feature,
          requestId: aiRequest.id,
          eventType: 'AI_REQUEST_FAILED',
          result: 'FAILURE',
          metadata: { error: primaryErr.message },
        });
        throw new ServiceUnavailableException(`AI Provider execution failed: ${primaryErr.message}`);
      }
    }

    // 11. Output Safety & Schema Validation
    const outputSafety = this.safetyService.evaluateOutput(providerResponse.content);
    const finalContent = outputSafety.sanitizedOutput;

    if (schemaToUse) {
      const validation = this.outputValidator.validate(
        finalContent,
        providerResponse.structuredOutput,
        schemaToUse,
      );

      if (!validation.isValid) {
        await this.auditService.recordAuditEvent({
          organisationId,
          outletId,
          userId: user.id,
          feature,
          requestId: aiRequest.id,
          eventType: 'AI_RESPONSE_REJECTED',
          result: 'FAILURE',
          metadata: { errors: validation.errors },
        });
        throw new BadGatewayException(
          `AI output validation failed: ${validation.errors?.join(', ') || 'schema mismatch'}`,
        );
      }
      providerResponse.structuredOutput = validation.data;
    }

    // 12. Persistence, Usage Recording & Caching
    const aiResponse = await this.prisma.aIResponse.create({
      data: {
        aiRequestId: aiRequest.id,
        content: finalContent,
        structuredOutput: providerResponse.structuredOutput || null,
        status: 'SUCCEEDED',
        model: selectedModel.displayName,
        provider: selectedModel.provider,
        latencyMs: providerResponse.latencyMs,
      },
    });

    await this.prisma.aIRequest.update({
      where: { id: aiRequest.id },
      data: { status: 'SUCCEEDED', completedAt: new Date() },
    });

    await this.usageService.recordUsage({
      organisationId,
      outletId,
      userId: user.id,
      memberId: memberId || null,
      feature,
      provider: selectedModel.provider,
      model: selectedModel.displayName,
      modelId: selectedModel.id,
      requestId: aiRequest.id,
      inputTokens: providerResponse.inputTokens,
      outputTokens: providerResponse.outputTokens,
      latencyMs: providerResponse.latencyMs,
      inputCostPer1M: selectedModel.inputCostPer1M,
      outputCostPer1M: selectedModel.outputCostPer1M,
    });

    await this.auditService.recordAuditEvent({
      organisationId,
      outletId,
      userId: user.id,
      feature,
      requestId: aiRequest.id,
      eventType: 'AI_REQUEST_COMPLETED',
      result: 'SUCCESS',
      metadata: { totalTokens: providerResponse.totalTokens },
    });

    const executionResult: AIExecutionResult = {
      requestId: aiRequest.id,
      responseId: aiResponse.id,
      content: finalContent,
      structuredOutput: providerResponse.structuredOutput,
      model: selectedModel.displayName,
      provider: selectedModel.provider,
      latencyMs: providerResponse.latencyMs,
      tokens: {
        inputTokens: providerResponse.inputTokens,
        outputTokens: providerResponse.outputTokens,
        totalTokens: providerResponse.totalTokens,
      },
    };

    // Cache if safe (non-personal query)
    await this.cacheService.setCachedResponse(
      organisationId,
      feature,
      prompt,
      executionResult,
      memberId,
    );

    return executionResult;
  }
}
