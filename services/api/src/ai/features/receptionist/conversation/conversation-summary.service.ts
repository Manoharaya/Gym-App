/**
 * Day 31 — Receptionist Conversation Summary Service
 * Summarizes multi-turn conversations, identifies key themes, and prepares handoff briefing notes.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class ConversationSummaryService {
  private readonly logger = new Logger(ConversationSummaryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a concise briefing summary of a conversation based on its transcripts.
   */
  async generateSummary(conversationId: string): Promise<string> {
    const conversation = await this.prisma.receptionistConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 30,
        },
      },
    });

    if (!conversation || !conversation.messages || conversation.messages.length === 0) {
      return 'No conversation messages recorded yet.';
    }

    const customerQueries = conversation.messages
      .filter((m) => m.role === 'CUSTOMER')
      .map((m) => m.content);

    const intentsUsed = conversation.messages
      .filter((m) => m.role === 'AI' && (m.metadata as any)?.intent)
      .map((m) => (m.metadata as any).intent as string);

    const uniqueIntents = Array.from(new Set(intentsUsed));

    const summaryParts: string[] = [
      `Channel: ${conversation.channel}`,
      `Total messages: ${conversation.messages.length}`,
      uniqueIntents.length > 0 ? `Primary topics: ${uniqueIntents.join(', ')}` : '',
      customerQueries.length > 0 ? `Latest inquiry: "${customerQueries[customerQueries.length - 1]}"` : '',
    ].filter(Boolean);

    const summary = summaryParts.join(' | ');

    await this.prisma.receptionistConversation.update({
      where: { id: conversationId },
      data: { summary },
    });

    return summary;
  }
}
