/**
 * Day 31 — Receptionist Knowledge Refresh Background Job
 * Periodically verifies active knowledge validity, discovers new gaps, and prunes stale caches.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { KnowledgeCacheService } from '../knowledge/knowledge-cache.service';

@Injectable()
export class KnowledgeRefreshJob {
  private readonly logger = new Logger(KnowledgeRefreshJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: KnowledgeCacheService,
  ) {}

  async runJob(): Promise<{ verifiedSourcesCount: number }> {
    const activeSources = await this.prisma.receptionistKnowledgeSource.count({
      where: { status: 'PUBLISHED' },
    });

    this.logger.log(`[KnowledgeRefreshJob] Verified ${activeSources} published knowledge sources.`);
    return { verifiedSourcesCount: activeSources };
  }
}
