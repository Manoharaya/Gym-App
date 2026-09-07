import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProviderRequest, AIProviderResponse } from '@fitcore/types';
import { AIProviderAdapter } from './ai-provider.interface';

@Injectable()
export class OpenAIAdapter implements AIProviderAdapter {
  readonly providerName = 'OPENAI';
  private readonly logger = new Logger(OpenAIAdapter.name);
  private readonly apiKey?: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ai.openaiApiKey') || process.env.OPENAI_API_KEY;
  }

  async generate(request: AIProviderRequest): Promise<AIProviderResponse> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured on this server.');
    }

    const startTime = Date.now();
    const messages: any[] = [];

    if (request.systemInstruction) {
      messages.push({ role: 'system', content: request.systemInstruction });
    }

    for (const msg of request.messages) {
      messages.push({ role: msg.role, content: msg.content, name: msg.name });
    }

    const body: any = {
      model: request.model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 1000,
    };

    if (request.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
      }

      const json = await response.json();
      const latencyMs = Date.now() - startTime;
      const choice = json.choices?.[0];
      const content = choice?.message?.content || '';

      let structuredOutput: any = null;
      if (request.responseFormat === 'json') {
        try {
          structuredOutput = JSON.parse(content);
        } catch {
          // Handled downstream by validator
        }
      }

      return {
        provider: 'OPENAI',
        model: json.model || request.model,
        content,
        structuredOutput,
        inputTokens: json.usage?.prompt_tokens ?? 0,
        outputTokens: json.usage?.completion_tokens ?? 0,
        totalTokens: json.usage?.total_tokens ?? 0,
        finishReason: choice?.finish_reason || 'STOP',
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
