/**
 * Day 31 — Knowledge Retrieval Service
 * Hybrid retrieval combining structured platform database entities and authoritative knowledge sources.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { KnowledgeCacheService } from './knowledge-cache.service';
import { KnowledgeRankingService, ScoredKnowledgeItem } from './knowledge-ranking.service';
import { KnowledgeSearchParams } from '../receptionist.types';

@Injectable()
export class KnowledgeRetrievalService {
  private readonly logger = new Logger(KnowledgeRetrievalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: KnowledgeCacheService,
    private readonly rankingService: KnowledgeRankingService,
  ) {}

  /**
   * Retrieves and ranks grounded knowledge relevant to the user query.
   */
  async retrieveKnowledge(params: KnowledgeSearchParams): Promise<ScoredKnowledgeItem[]> {
    const { organisationId, outletId, query, limit = 5 } = params;
    const cacheKey = `knowledge:${organisationId}:${outletId || 'all'}:${query.toLowerCase().trim()}`;

    const cached = this.cache.get<ScoredKnowledgeItem[]>(cacheKey);
    if (cached) return cached;

    const candidates: Array<{
      id: string;
      type: string;
      title: string;
      content: string;
      outletId?: string | null;
      tags?: string[];
    }> = [];

    // 1. Fetch published knowledge sources
    const knowledgeSources = await this.prisma.receptionistKnowledgeSource.findMany({
      where: {
        organisationId,
        status: 'PUBLISHED',
        OR: [
          { outletId: null },
          ...(outletId ? [{ outletId }] : []),
        ],
      },
    });

    for (const ks of knowledgeSources) {
      candidates.push({
        id: ks.id,
        type: ks.type,
        title: ks.title,
        content: ks.content,
        outletId: ks.outletId,
        tags: (ks.metadata as any)?.tags || [],
      });
    }

    // 2. Fetch Structured Platform Data (Authoritative Grounding)
    const lowerQuery = query.toLowerCase();

    // 2a. Membership Plans
    if (
      lowerQuery.includes('membership') ||
      lowerQuery.includes('pricing') ||
      lowerQuery.includes('cost') ||
      lowerQuery.includes('plan') ||
      lowerQuery.includes('fee')
    ) {
      const plans = await this.prisma.membershipPlan.findMany({
        where: {
          organisationId,
          status: 'ACTIVE',
        },
        take: 5,
      });

      for (const p of plans) {
        candidates.push({
          id: `plan_${p.id}`,
          type: 'MEMBERSHIP_PLAN',
          title: `Membership Plan: ${p.name}`,
          content: `Plan Name: ${p.name}. Description: ${p.description || 'Standard membership'}. Price: $${p.price} per ${p.durationValue} ${p.durationUnit.toLowerCase()}. Access Level: ${p.membershipType}.`,
          outletId: null,
          tags: ['membership', 'pricing', p.name.toLowerCase()],
        });
      }
    }

    // 2b. Class Types
    if (
      lowerQuery.includes('class') ||
      lowerQuery.includes('schedule') ||
      lowerQuery.includes('yoga') ||
      lowerQuery.includes('hiit') ||
      lowerQuery.includes('workout')
    ) {
      const classTypes = await this.prisma.classType.findMany({
        where: { organisationId },
        take: 5,
      });

      for (const ct of classTypes) {
        candidates.push({
          id: `class_${ct.id}`,
          type: 'CLASS_TYPE',
          title: `Group Class: ${ct.name}`,
          content: `Class: ${ct.name}. Category: ${ct.category || 'Fitness'}. Duration: ${ct.durationMinutes || 45} mins. Description: ${ct.description || 'Instructor-led session'}.`,
          outletId: null,
          tags: ['class', ct.name.toLowerCase()],
        });
      }
    }

    // 2c. Trainer Profiles
    if (
      lowerQuery.includes('trainer') ||
      lowerQuery.includes('coach') ||
      lowerQuery.includes('personal train') ||
      lowerQuery.includes('pt')
    ) {
      const trainers = await this.prisma.trainerProfile.findMany({
        where: {
          organisationId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          professionalName: true,
          bio: true,
          specialties: true,
        },
        take: 5,
      });

      for (const t of trainers) {
        const name = t.professionalName;
        candidates.push({
          id: `trainer_${t.id}`,
          type: 'TRAINER_PROFILE',
          title: `Personal Trainer: ${name}`,
          content: `Trainer: ${name}. Specializations: ${(t.specialties || []).join(', ') || 'General Fitness'}. Bio: ${t.bio || 'Certified Trainer'}.`,
          outletId: null,
          tags: ['trainer', 'coach', name.toLowerCase()],
        });
      }
    }

    // 3. Rank and Slice
    const ranked = this.rankingService.rank(candidates, query, outletId);
    const topResults = ranked.slice(0, limit);

    // Cache top results
    this.cache.set(cacheKey, topResults);

    return topResults;
  }
}
