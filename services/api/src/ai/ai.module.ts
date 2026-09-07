import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { RedisModule } from '../redis/redis.module';

// Controllers
import { AIController } from './controllers/ai.controller';
import { AIAdminController } from './controllers/ai-admin.controller';
import { AISuperadminController } from './controllers/ai-superadmin.controller';

// Adapters & Gateway
import { DevelopmentAIProvider } from './providers/development.provider';
import { OpenAIAdapter } from './providers/openai.adapter';
import { AnthropicAdapter } from './providers/anthropic.adapter';
import { GeminiAdapter } from './providers/gemini.adapter';
import { ModelGatewayService } from './gateway/model-gateway.service';

// Models & Routing
import { ModelRegistryService } from './models/model-registry.service';
import { ModelRouterService } from './models/model-router.service';
import { ModelFallbackService } from './models/model-fallback.service';

// Features & Config
import { AIFeatureConfigService } from './services/ai-feature-config.service';

// Context & Privacy
import { AIContextPermissionService } from './context/ai-context-permission.service';
import { SensitiveDataSanitizerService } from './context/sensitive-data-sanitizer.service';
import { AIContextEngineService } from './context/ai-context-engine.service';

// Safety & Prompts
import { AISafetyService } from './safety/ai-safety.service';
import { PromptTemplateService } from './prompts/prompt-template.service';
import { PromptRegistryService } from './prompts/prompt-registry.service';
import { AIOutputValidatorService } from './services/ai-output-validator.service';

// Usage, Limits, Cache, Observability
import { AIUsageService } from './usage/ai-usage.service';
import { AIUsageLimitService } from './usage/ai-usage-limit.service';
import { AIRateLimitService } from './services/ai-rate-limit.service';
import { AICacheService } from './cache/ai-cache.service';
import { AIToolRegistryService } from './services/ai-tool-registry.service';
import { AIAuditService } from './services/ai-audit.service';
import { AIFeedbackService } from './services/ai-feedback.service';
import { AIHealthService } from './services/ai-health.service';
import { AIObservabilityService } from './services/ai-observability.service';
import { AIJobService } from './jobs/ai-job.service';

// Orchestrator
import { AIOrchestratorService } from './orchestrator/ai-orchestrator.service';

@Module({
  imports: [DatabaseModule, AuditModule, RedisModule],
  controllers: [AIController, AIAdminController, AISuperadminController],
  providers: [
    // Providers & Gateway
    DevelopmentAIProvider,
    OpenAIAdapter,
    AnthropicAdapter,
    GeminiAdapter,
    ModelGatewayService,

    // Model Registry & Routing
    ModelRegistryService,
    ModelRouterService,
    ModelFallbackService,

    // Features & Config
    AIFeatureConfigService,

    // Context & Sanitization
    AIContextPermissionService,
    SensitiveDataSanitizerService,
    AIContextEngineService,

    // Safety & Prompts
    AISafetyService,
    PromptTemplateService,
    PromptRegistryService,
    AIOutputValidatorService,

    // Usage, Rate Limiting, Cache, Observability
    AIUsageService,
    AIUsageLimitService,
    AIRateLimitService,
    AICacheService,
    AIToolRegistryService,
    AIAuditService,
    AIFeedbackService,
    AIHealthService,
    AIObservabilityService,
    AIJobService,

    // Central Orchestrator
    AIOrchestratorService,
  ],
  exports: [
    AIOrchestratorService,
    ModelGatewayService,
    ModelRegistryService,
    AIFeatureConfigService,
    AIContextEngineService,
    AIUsageService,
    AISafetyService,
    AIToolRegistryService,
    AIAuditService,
  ],
})
export class AIModule {}
