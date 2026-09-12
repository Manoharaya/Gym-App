import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RecordDeploymentDto } from './dto/observability.dto';

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a deployment to correlate future error rate or latency shifts with releases.
   */
  async recordDeployment(dto: RecordDeploymentDto, deployedBy?: string) {
    return this.prisma.observabilityDeployment.create({
      data: {
        version: dto.version,
        commitSha: dto.commitSha,
        environment: dto.environment || 'production',
        notes: dto.notes,
        deployedBy,
      },
    });
  }

  /**
   * Retrieves recent deployments.
   */
  async listDeployments() {
    return this.prisma.observabilityDeployment.findMany({
      orderBy: { deployedAt: 'desc' },
      take: 20,
    });
  }
}
