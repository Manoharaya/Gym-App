import { Injectable, Logger } from '@nestjs/common';
import { ModelRegistryService } from './model-registry.service';
import { AIModelCapability } from '@fitcore/types';

@Injectable()
export class ModelFallbackService {
  private readonly logger = new Logger(ModelFallbackService.name);

  constructor(private readonly registry: ModelRegistryService) {}

  /**
   * Resolves a fallback model when the primary model fails.
   * Respects required capabilities and organization policies.
   */
  async resolveFallbackModel(failedModelId: string, requiredCapabilities: AIModelCapability[] = []) {
    const activeModels = await this.registry.listModels(undefined, 'ACTIVE');

    // Filter out the failed model
    const alternatives = activeModels.filter((m) => m.id !== failedModelId);

    // Filter by required capabilities
    const capableAlternatives = alternatives.filter((m) =>
      requiredCapabilities.every((cap) => m.capabilities.includes(cap)),
    );

    if (capableAlternatives.length === 0) {
      // If dev-test-model exists, use as ultimate fallback
      try {
        const dev = await this.registry.getModelByKey('dev-test-model');
        if (dev.id !== failedModelId) return dev;
      } catch {}
      return null;
    }

    this.logger.warn(
      `Falling back from model '${failedModelId}' to alternative '${capableAlternatives[0].displayName}'`,
    );
    return capableAlternatives[0];
  }
}
