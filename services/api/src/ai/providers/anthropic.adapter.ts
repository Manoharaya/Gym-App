import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProviderRequest, AIProviderResponse } from '@fitcore/types';
import { AIProviderAdapter } from './ai-provider.interface';

@Injectable()
export class AnthropicAdapter implements AIProviderAdapter {
  readonly providerName = 'ANTHROPIC';
  private readonly logger = new Logger(AnthropicAdapter.name);
  private readonly apiKey?: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ai.anthropicApiKey') || process.env.ANTHROPIC_API_KEY;
  }

  async generate(request: AIProviderRequest): Promise<AIProviderResponse> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured on this server.');
    }

    const startTime = Date.now();
    const messages = request.messages.map((m) => ({
      role: m.role === 'system' ? 'user' : m.role,
      content: m.content,
    }));

    const body: any = {
      model: request.model,
      messages,
      max_tokens: request.maxTokens ?? 1000,
      temperature: request.temperature ?? 0.7,
    };

    if (request.systemInstruction) {
      body.system = request.systemInstruction;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
      }

      const json = await response.json();
      const latencyMs = Date.now() - startTime;
      const content = json.content?.[0]?.text || '';

      let structuredOutput: any = null;
      if (request.responseFormat === 'json') {
        try {
          structuredOutput = JSON.parse(content);
        } catch {
          // Handled downstream
        }
      }

      const inputTokens = json.usage?.input_tokens ?? 0;
      const outputTokens = json.usage?.output_tokens ?? 0;

      return {
        provider: 'ANTHROPIC',
        model: json.model || request.model,
        content,
        structuredOutput,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        finishReason: json.stop_reason || 'STOP',
        latencyMs,
        providerRequestId: json.id,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async checkHealth(): Promise<'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE'> {
    return this.apiKey ? 'AVAILABLE' : 'UNAVAILABLE';
  }
}
