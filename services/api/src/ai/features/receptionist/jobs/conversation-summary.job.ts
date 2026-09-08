/**
 * Day 31 — Receptionist Conversation Summary Background Job
 * Periodically updates summaries for completed or idle conversations.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { ConversationSummaryService } from '../conversation/conversation-summary.service';

@Injectable()
export class ConversationSummaryJob {
  private readonly logger = new Logger(ConversationSummaryJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly summaryService: ConversationSummaryService,
  ) {}

  async runJob(): Promise<{ summarizedCount: number }> {
    const idleThreshold = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes idle

    const idleConversations = await this.prisma.receptionistConversation.findMany({
      where: {
        lastMessageAt: { lte: idleThreshold },
        summary: null,
      },
      take: 20,
    });

    let count = 0;
    for (const conv of idleConversations) {
      try {
        await this.summaryService.generateSummary(conv.id);
        count++;
      } catch (err: any) {
        this.logger.error(`Error summarizing conversation ${conv.id}: ${err.message}`);
      }
    }

    return { summarizedCount: count };
  }
}
