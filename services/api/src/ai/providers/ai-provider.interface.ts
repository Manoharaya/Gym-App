import { AIProviderRequest, AIProviderResponse } from '@fitcore/types';

export interface AIProviderAdapter {
  readonly providerName: string;
  generate(request: AIProviderRequest): Promise<AIProviderResponse>;
  checkHealth(): Promise<'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE'>;
}
