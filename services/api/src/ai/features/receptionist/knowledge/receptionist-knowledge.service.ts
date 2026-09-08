/**
 * Day 31 — Receptionist Knowledge Facade Service
 * Coordinates knowledge retrieval, knowledge source authoring, and knowledge gap tracking.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { KnowledgeRetrievalService } from './knowledge-retrieval.service';
import { KnowledgeSourceService } from './knowledge-source.service';
import { KnowledgeSearchParams } from '../receptionist.types';
import { CreateKnowledgeSourceDto, UpdateKnowledgeSourceDto } from '../dto/receptionist.dto';

@Injectable()
export class ReceptionistKnowledgeService {
  private readonly logger = new Logger(ReceptionistKnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly retrievalService: KnowledgeRetrievalService,
    private readonly sourceService: KnowledgeSourceService,
  ) {}

  async searchKnowledge(params: KnowledgeSearchParams) {
    return this.retrievalService.retrieveKnowledge(params);
  }

  async createKnowledgeSource(organisationId: string, dto: CreateKnowledgeSourceDto, authorUserId?: string) {
    return this.sourceService.createKnowledgeSource(organisationId, dto, authorUserId);
  }

  async updateKnowledgeSource(organisationId: string, id: string, dto: UpdateKnowledgeSourceDto, authorUserId?: string) {
    return this.sourceService.updateKnowledgeSource(organisationId, id, dto, authorUserId);
  }

  async getKnowledgeSource(organisationId: string, id: string) {
    return this.sourceService.getKnowledgeSource(organisationId, id);
  }

  async listKnowledgeSources(params: {
    organisationId: string;
    outletId?: string;
    type?: string;
    isPublished?: boolean;
    limit?: number;
    offset?: number;
  }) {
    return this.sourceService.listKnowledgeSources(params);
  }

  async deleteKnowledgeSource(organisationId: string, id: string) {
    return this.sourceService.deleteKnowledgeSource(organisationId, id);
  }

  /**
   * Records an ungrounded or missing topic into ReceptionistKnowledgeGap for staff review.
   */
  async recordKnowledgeGap(params: {
    organisationId: string;
    outletId?: string | null;
    query: string;
    detectedTopic?: string;
    conversationId?: string;
  }) {
    const { organisationId, outletId, query, detectedTopic } = params;

    // Check if duplicate gap exists
    const existing = await this.prisma.receptionistKnowledgeGap.findFirst({
      where: {
        organisationId,
        normalizedQuestion: query.trim(),
        status: { in: ['NEW', 'REVIEW_REQUIRED'] },
      },
    });

    if (existing) {
      return this.prisma.receptionistKnowledgeGap.update({
        where: { id: existing.id },
        data: {
          frequency: existing.frequency + 1,
          lastSeenAt: new Date(),
        },
      });
    }

    return this.prisma.receptionistKnowledgeGap.create({
      data: {
        organisationId,
        outletId: outletId || null,
        normalizedQuestion: query.trim(),
        questionCategory: detectedTopic || 'GENERAL',
        frequency: 1,
        status: 'NEW',
      },
    });
  }

  /**
   * Lists unresolved knowledge gaps for staff to review.
   */
  async listKnowledgeGaps(organisationId: string) {
    return this.prisma.receptionistKnowledgeGap.findMany({
      where: { organisationId },
      orderBy: [{ frequency: 'desc' }, { lastSeenAt: 'desc' }],
      take: 50,
    });
  }
}
