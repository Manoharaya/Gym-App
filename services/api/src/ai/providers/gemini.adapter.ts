import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProviderRequest, AIProviderResponse } from '@fitcore/types';
import { AIProviderAdapter } from './ai-provider.interface';

@Injectable()
export class GeminiAdapter implements AIProviderAdapter {
  readonly providerName = 'GOOGLE';
  private readonly logger = new Logger(GeminiAdapter.name);
  private readonly apiKey?: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ai.geminiApiKey') || process.env.GEMINI_API_KEY;
  }

  async generate(request: AIProviderRequest): Promise<AIProviderResponse> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on this server.');
    }

    const startTime = Date.now();
    const contents = request.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: any = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 1000,
      },
    };

    if (request.systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: request.systemInstruction }],
      };
    }

    if (request.responseFormat === 'json') {
      body.generationConfig.responseMimeType = 'application/json';
    }

    const modelName = request.model.startsWith('gemini') ? request.model : 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const json = await response.json();
      const latencyMs = Date.now() - startTime;
      const candidate = json.candidates?.[0];
      const content = candidate?.content?.parts?.[0]?.text || '';

      let structuredOutput: any = null;
      if (request.responseFormat === 'json') {
        try {
          structuredOutput = JSON.parse(content);
        } catch {
          // Handled downstream
        }
      }

      const usageMetadata = json.usageMetadata || {};
      const inputTokens = usageMetadata.promptTokenCount ?? 0;
      const outputTokens = usageMetadata.candidatesTokenCount ?? 0;

      return {
        provider: 'GOOGLE',
        model: modelName,
        content,
        structuredOutput,
        inputTokens,
        outputTokens,
        totalTokens: usageMetadata.totalTokenCount ?? inputTokens + outputTokens,
        finishReason: candidate?.finishReason || 'STOP',
        latencyMs,
        providerRequestId: `gemini_${Date.now()}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async checkHealth(): Promise<'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE'> {
    return this.apiKey ? 'AVAILABLE' : 'UNAVAILABLE';
  }
}
