import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MembershipLifecycleService } from './membership-lifecycle.service';

@Injectable()
export class MembershipExpirationProcessor {
  private readonly logger = new Logger(MembershipExpirationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycleService: MembershipLifecycleService
  ) {}

  /**
   * Identifies all memberships whose term has concluded (endDate < now)
   * while still flagged as ACTIVE or TRIAL, transitioning them to EXPIRED.
   */
  async processExpiredMemberships(organisationId?: string): Promise<{
    processedCount: number;
    expiredIds: string[];
  }> {
    const now = new Date();
    const whereClause: any = {
      status: { in: ['ACTIVE', 'TRIAL'] },
      endDate: { lt: now },
    };

    if (organisationId) {
      whereClause.organisationId = organisationId;
    }

    const eligible = await this.prisma.memberMembership.findMany({
      where: whereClause,
      select: { id: true, memberProfileId: true, organisationId: true },
    });

    const expiredIds: string[] = [];

    for (const item of eligible) {
      try {
        await this.lifecycleService.expire(item.id, 'Membership reached end date without renewal');
        expiredIds.push(item.id);
      } catch (err: any) {
        this.logger.error(`Failed to auto-expire membership ${item.id}: ${err.message}`);
      }
    }

    this.logger.log(`Processed ${expiredIds.length} expired memberships.`);
    return {
      processedCount: expiredIds.length,
      expiredIds,
    };
  }
}
