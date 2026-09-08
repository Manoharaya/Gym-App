/**
 * Day 31 — Receptionist Message Service
 * Stores conversation transcripts, citations, tool executions, and audit records.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { MessageRole, MessageContentType, ReceptionistIntent } from '@fitcore/types';

@Injectable()
export class ReceptionistMessageService {
  private readonly logger = new Logger(ReceptionistMessageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Appends an incoming customer message.
   */
  async recordCustomerMessage(params: {
    conversationId: string;
    content: string;
    contentType?: MessageContentType;
    rawPayload?: Record<string, any>;
  }) {
    const { conversationId, content, contentType = 'TEXT', rawPayload } = params;

    const message = await this.prisma.receptionistMessage.create({
      data: {
        conversationId,
        direction: 'INBOUND',
        role: 'CUSTOMER',
        contentType,
        content,
        metadata: rawPayload ? (rawPayload as any) : undefined,
      },
    });

    // Bump conversation lastMessageAt
    await this.prisma.receptionistConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  /**
   * Appends an outgoing AI response message.
   */
  async recordAIMessage(params: {
    conversationId: string;
    content: string;
    intent?: ReceptionistIntent;
    confidenceScore?: number;
    citations?: any[];
    toolCalls?: any[];
    toolResults?: any[];
    latencyMs?: number;
    tokensUsed?: number;
    costEstimate?: number;
    safetyFlag?: string;
  }) {
    const {
      conversationId,
      content,
      intent,
      confidenceScore,
      citations,
      toolCalls,
      toolResults,
      latencyMs,
      tokensUsed,
      costEstimate,
      safetyFlag,
    } = params;

    const metadata = {
      intent,
      confidenceScore,
      citations,
      toolCalls,
      toolResults,
      latencyMs,
      tokensUsed,
      costEstimate,
      safetyFlag,
    };

    const message = await this.prisma.receptionistMessage.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        role: 'AI',
        contentType: 'STRUCTURED',
        content,
        metadata,
      },
    });

    // Bump conversation lastMessageAt
    await this.prisma.receptionistConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  /**
   * Appends a staff message or internal note.
   */
  async recordStaffMessage(params: {
    conversationId: string;
    content: string;
    staffUserId: string;
  }) {
    const { conversationId, content, staffUserId } = params;

    return this.prisma.receptionistMessage.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        role: 'STAFF',
        contentType: 'TEXT',
        content,
        metadata: { staffUserId },
      },
    });
  }

  /**
   * Retrieves messages for a conversation.
   */
  async getMessages(conversationId: string, limit: number = 50) {
    return this.prisma.receptionistMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }
}
