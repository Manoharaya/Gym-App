import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ModelRegistryService } from './model-registry.service';
import { AIFeature, AIModelCapability } from '@fitcore/types';

export interface ModelRoutingOptions {
  feature: AIFeature;
  preferredModelId?: string;
  requiredCapabilities?: AIModelCapability[];
  costPreference?: 'LOW_COST' | 'BALANCED' | 'HIGH_PERFORMANCE';
}

@Injectable()
export class ModelRouterService {
  private readonly logger = new Logger(ModelRouterService.name);

  constructor(private readonly registry: ModelRegistryService) {}

  /**
   * Deterministically routes request to an appropriate active model.
   */
  async routeModel(options: ModelRoutingOptions) {
    const { feature, preferredModelId, requiredCapabilities = [], costPreference = 'BALANCED' } = options;

    // 1. If explicit preferred model requested, validate capabilities and status
    if (preferredModelId) {
      const model = await this.registry.getModelById(preferredModelId);
      if (model.status !== 'ACTIVE') {
        throw new BadRequestException(`Requested AI Model '${model.displayName}' is ${model.status}`);
      }

      for (const reqCap of requiredCapabilities) {
        if (!model.capabilities.includes(reqCap)) {
          throw new BadRequestException(
            `Model '${model.displayName}' does not support required capability '${reqCap}'`,
          );
        }
      }

      return model;
    }

    // 2. If feature is AI_PLATFORM_TEST or in non-production, prioritize DEVELOPMENT model if present
    if (feature === 'AI_PLATFORM_TEST') {
      try {
        const devModel = await this.registry.getModelByKey('dev-test-model');
        if (devModel.status === 'ACTIVE') {
          return devModel;
        }
      } catch {
        // Fall through to general selection
      }
    }

    // 3. Fetch active models
    const activeModels = await this.registry.listModels(undefined, 'ACTIVE');
    if (activeModels.length === 0) {
      throw new NotFoundException('No active AI models available in the system');
    }

    // 4. Filter by required capabilities
    const capableModels = activeModels.filter((model) =>
      requiredCapabilities.every((cap) => model.capabilities.includes(cap)),
    );

    if (capableModels.length === 0) {
      throw new BadRequestException(
        `No active AI model supports the required capabilities: ${requiredCapabilities.join(', ')}`,
      );
    }

    // 5. Select based on cost preference
    if (costPreference === 'LOW_COST') {
      return capableModels[0]; // ordered by inputCost asc
    } else if (costPreference === 'HIGH_PERFORMANCE') {
      return capableModels[capableModels.length - 1];
    } else {
      // Balanced: choose lowest cost model that is not 0 (or first)
      const balanced = capableModels.find((m) => m.inputCostPer1M > 0) || capableModels[0];
      return balanced;
    }
  }
}
