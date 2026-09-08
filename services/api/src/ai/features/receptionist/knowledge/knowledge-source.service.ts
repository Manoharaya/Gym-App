/**
 * Day 31 — Knowledge Source Management Service
 * Handles authoring, publishing, versioning, and lifecycle for receptionist knowledge sources.
 */

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { KnowledgeCacheService } from './knowledge-cache.service';
import { CreateKnowledgeSourceDto, UpdateKnowledgeSourceDto } from '../dto/receptionist.dto';

@Injectable()
export class KnowledgeSourceService {
  private readonly logger = new Logger(KnowledgeSourceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: KnowledgeCacheService,
  ) {}

  /**
   * Creates a new knowledge source with initial version record.
   */
  async createKnowledgeSource(
    organisationId: string,
    dto: CreateKnowledgeSourceDto,
    authorUserId?: string,
  ) {
    const source = await this.prisma.receptionistKnowledgeSource.create({
      data: {
        organisationId,
        outletId: dto.outletId || null,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        description: dto.summary || null,
        visibility: dto.visibility || 'PUBLIC',
        status: 'PUBLISHED',
        version: 1,
        metadata: {
          tags: dto.tags || [],
          custom: dto.metadata,
        },
      },
    });

    // Create initial version record
    await this.prisma.receptionistKnowledgeVersion.create({
      data: {
        knowledgeSourceId: source.id,
        version: 1,
        content: source.content,
        publishedAt: new Date(),
        createdBy: authorUserId || null,
        metadata: {
          title: source.title,
          changeSummary: 'Initial publication',
        },
      },
    });

    this.cache.invalidate(`knowledge:${organisationId}`);
    return source;
  }

  /**
   * Updates an existing knowledge source and archives previous version.
   */
  async updateKnowledgeSource(
    organisationId: string,
    id: string,
    dto: UpdateKnowledgeSourceDto,
    authorUserId?: string,
  ) {
    const existing = await this.prisma.receptionistKnowledgeSource.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Knowledge source ${id} not found`);
    }

    if (existing.organisationId !== organisationId) {
      throw new ForbiddenException('Access to knowledge source denied');
    }

    const nextVersion = existing.version + 1;

    const updated = await this.prisma.receptionistKnowledgeSource.update({
      where: { id },
      data: {
        title: dto.title ?? existing.title,
        content: dto.content ?? existing.content,
        description: dto.summary !== undefined ? dto.summary : existing.description,
        outletId: dto.outletId !== undefined ? dto.outletId : existing.outletId,
        visibility: dto.visibility ?? existing.visibility,
        status: dto.isPublished !== undefined ? (dto.isPublished ? 'PUBLISHED' : 'DRAFT') : existing.status,
        version: nextVersion,
        metadata: {
          ...(existing.metadata as any),
          tags: dto.tags ?? (existing.metadata as any)?.tags ?? [],
          custom: dto.metadata ?? (existing.metadata as any)?.custom,
        },
      },
    });

    // Create version snapshot
    await this.prisma.receptionistKnowledgeVersion.create({
      data: {
        knowledgeSourceId: updated.id,
        version: nextVersion,
        content: updated.content,
        publishedAt: new Date(),
        createdBy: authorUserId || null,
        metadata: {
          title: updated.title,
          changeSummary: 'Content revision update',
        },
      },
    });

    this.cache.invalidate(`knowledge:${organisationId}`);
    return updated;
  }

  /**
   * Retrieves knowledge source by ID.
   */
  async getKnowledgeSource(organisationId: string, id: string) {
    const source = await this.prisma.receptionistKnowledgeSource.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 10,
        },
      },
    });

    if (!source) {
      throw new NotFoundException(`Knowledge source ${id} not found`);
    }

    if (source.organisationId !== organisationId) {
      throw new ForbiddenException('Access to knowledge source denied');
    }

    return source;
  }

  /**
   * Lists knowledge sources for an organisation/outlet.
   */
  async listKnowledgeSources(params: {
    organisationId: string;
    outletId?: string;
    type?: string;
    isPublished?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const { organisationId, outletId, type, isPublished, limit = 50, offset = 0 } = params;

    const where: any = { organisationId };
    if (outletId) where.outletId = outletId;
    if (type) where.type = type;
    if (isPublished !== undefined) {
      where.status = isPublished ? 'PUBLISHED' : 'DRAFT';
    }

    const [total, items] = await Promise.all([
      this.prisma.receptionistKnowledgeSource.count({ where }),
      this.prisma.receptionistKnowledgeSource.findMany({
        where,
        orderBy: [{ type: 'asc' }, { title: 'asc' }],
        take: limit,
        skip: offset,
      }),
    ]);

    return { total, items, limit, offset };
  }

  /**
   * Deletes a knowledge source.
   */
  async deleteKnowledgeSource(organisationId: string, id: string) {
    const existing = await this.getKnowledgeSource(organisationId, id);
    await this.prisma.receptionistKnowledgeSource.delete({
      where: { id: existing.id },
    });
    this.cache.invalidate(`knowledge:${organisationId}`);
    return { success: true };
  }
}
