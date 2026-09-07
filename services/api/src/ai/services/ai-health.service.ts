import { Injectable, Logger } from '@nestjs/common';
import { ModelGatewayService } from '../gateway/model-gateway.service';

@Injectable()
export class AIHealthService {
  private readonly logger = new Logger(AIHealthService.name);

  constructor(private readonly gateway: ModelGatewayService) {}

  /**
   * Health check reporting status of all registered AI providers without exposing API keys.
   */
  async getHealthStatus(): Promise<{
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    providers: Record<string, 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE'>;
    timestamp: string;
  }> {
    const providers = await this.gateway.checkAllProviders();

    const statuses = Object.values(providers);
    const hasAvailable = statuses.includes('AVAILABLE');
    const hasUnavailable = statuses.includes('UNAVAILABLE') || statuses.includes('DEGRADED');

    let overallStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY';
    if (!hasAvailable) {
      overallStatus = 'UNHEALTHY';
    } else if (hasUnavailable) {
      overallStatus = 'DEGRADED';
    }

    return {
      status: overallStatus,
      providers,
      timestamp: new Date().toISOString(),
    };
  }
}
