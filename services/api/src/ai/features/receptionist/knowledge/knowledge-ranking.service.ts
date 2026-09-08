/**
 * Day 31 — Knowledge Ranking Service
 * Scores and re-ranks retrieved knowledge candidates based on outlet match, semantic relevance, and recency.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ReceptionistKnowledgeType } from '@fitcore/types';

export interface ScoredKnowledgeItem {
  id: string;
  type: ReceptionistKnowledgeType;
  title: string;
  content: string;
  outletId?: string | null;
  score: number;
}

@Injectable()
export class KnowledgeRankingService {
  private readonly logger = new Logger(KnowledgeRankingService.name);

  /**
   * Ranks candidates against the user's query and target outlet.
   */
  rank(
    items: Array<{
      id: string;
      type: string;
      title: string;
      content: string;
      outletId?: string | null;
      tags?: string[];
    }>,
    query: string,
    targetOutletId?: string | null,
  ): ScoredKnowledgeItem[] {
    const queryTokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scored: ScoredKnowledgeItem[] = items.map((item) => {
      let score = 0.5; // baseline

      const titleLower = item.title.toLowerCase();
      const contentLower = item.content.toLowerCase();
      const tags = (item.tags || []).map((t) => t.toLowerCase());

      // 1. Outlet specificity bonus
      if (targetOutletId && item.outletId === targetOutletId) {
        score += 0.3; // Specific to the requested outlet
      } else if (!item.outletId) {
        score += 0.1; // Org-wide generic knowledge
      }

      // 2. Token overlap in title (heavy weight)
      for (const token of queryTokens) {
        if (titleLower.includes(token)) {
          score += 0.25;
        }
        if (tags.some((t) => t.includes(token))) {
          score += 0.2;
        }
        if (contentLower.includes(token)) {
          score += 0.1;
        }
      }

      // Cap at 0.99
      const normalizedScore = Math.min(0.99, Math.max(0.1, score));

      return {
        id: item.id,
        type: item.type as ReceptionistKnowledgeType,
        title: item.title,
        content: item.content,
        outletId: item.outletId,
        score: normalizedScore,
      };
    });

    return scored.sort((a, b) => b.score - a.score);
  }
}
