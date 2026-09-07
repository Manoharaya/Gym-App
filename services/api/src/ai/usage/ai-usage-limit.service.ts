import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AIFeature } from '@fitcore/types';

@Injectable()
export class AIUsageLimitService {
  private readonly logger = new Logger(AIUsageLimitService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Asserts that daily and monthly request limits have not been exceeded.
   */
  async assertLimitsNotExceeded(
    organisationId: string,
    feature: AIFeature,
    userId: string,
    dailyLimit?: number,
    monthlyLimit?: number,
  ): Promise<void> {
    const now = new Date();

    // 1. Daily limit check (last 24 hours)
    if (dailyLimit && dailyLimit > 0) {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dailyCount = await this.prisma.aIRequest.count({
        where: {
          organisationId,
          userId,
          feature,
          createdAt: { gte: startOfDay },
        },
      });

      if (dailyCount >= dailyLimit) {
        this.logger.warn(`Daily AI request limit reached (${dailyCount}/${dailyLimit}) for user '${userId}'`);
        throw new HttpException(
          `Daily AI request limit of ${dailyLimit} reached for this feature. Please try again tomorrow.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // 2. Monthly limit check (current calendar month)
    if (monthlyLimit && monthlyLimit > 0) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyCount = await this.prisma.aIRequest.count({
        where: {
          organisationId,
          feature,
          createdAt: { gte: startOfMonth },
        },
      });

      if (monthlyCount >= monthlyLimit) {
        this.logger.warn(
          `Monthly AI request limit reached (${monthlyCount}/${monthlyLimit}) for org '${organisationId}'`,
        );
        throw new HttpException(
          `Monthly AI quota for organisation has been exceeded. Please upgrade your tier or contact your administrator.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }
}
