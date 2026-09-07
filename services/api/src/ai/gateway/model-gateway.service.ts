import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { AIProviderRequest, AIProviderResponse, AIProvider } from '@fitcore/types';
import { AIProviderAdapter } from '../providers/ai-provider.interface';
import { DevelopmentAIProvider } from '../providers/development.provider';
import { OpenAIAdapter } from '../providers/openai.adapter';
import { AnthropicAdapter } from '../providers/anthropic.adapter';
import { GeminiAdapter } from '../providers/gemini.adapter';

@Injectable()
export class ModelGatewayService {
  private readonly logger = new Logger(ModelGatewayService.name);
  private readonly adapters = new Map<string, AIProviderAdapter>();

  constructor(
    private readonly devProvider: DevelopmentAIProvider,
    private readonly openAIAdapter: OpenAIAdapter,
    private readonly anthropicAdapter: AnthropicAdapter,
    private readonly geminiAdapter: GeminiAdapter,
  ) {
    this.adapters.set('DEVELOPMENT', this.devProvider);
    this.adapters.set('OPENAI', this.openAIAdapter);
    this.adapters.set('ANTHROPIC', this.anthropicAdapter);
    this.adapters.set('GOOGLE', this.geminiAdapter);
  }

  /**
   * Resolves provider and executes LLM generation.
   * If an external provider is requested but unavailable, falls back to development provider in non-prod.
   */
  async execute(providerName: string, request: AIProviderRequest): Promise<AIProviderResponse> {
    let adapter = this.adapters.get(providerName.toUpperCase());

    if (!adapter) {
      this.logger.warn(`Provider '${providerName}' unknown. Falling back to DEVELOPMENT adapter.`);
      adapter = this.devProvider;
    }

    try {
      return await adapter.generate(request);
    } catch (err: any) {
      this.logger.error(`Adapter execution failed for '${adapter.providerName}': ${err.message}`);

      // In development or test environments, fallback to DevelopmentAIProvider if external provider fails
      if (process.env.NODE_ENV !== 'production' && adapter.providerName !== 'DEVELOPMENT') {
        this.logger.warn(`Falling back to DevelopmentAIProvider due to error: ${err.message}`);
        return await this.devProvider.generate(request);
      }

      throw new ServiceUnavailableException(`AI Provider '${adapter.providerName}' failed: ${err.message}`);
    }
  }

  async checkProviderHealth(providerName: string): Promise<'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE'> {
    const adapter = this.adapters.get(providerName.toUpperCase());
    if (!adapter) return 'UNAVAILABLE';
    try {
      return await adapter.checkHealth();
    } catch {
      return 'UNAVAILABLE';
    }
  }

  async checkAllProviders(): Promise<Record<string, 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE'>> {
    const results: Record<string, 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE'> = {};
    for (const [name, adapter] of this.adapters.entries()) {
      try {
        results[name] = await adapter.checkHealth();
      } catch {
        results[name] = 'UNAVAILABLE';
      }
    }
    return results;
  }
}
