import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { AIFeature, AIContextSource, SensitivityLevel } from '@fitcore/types';

export interface ContextSourceDefinition {
  source: AIContextSource;
  sensitivity: SensitivityLevel;
  description: string;
  allowedFeatures: AIFeature[];
}

export const CONTEXT_SOURCE_REGISTRY: Record<AIContextSource, ContextSourceDefinition> = {
  MEMBER_PROFILE: {
    source: 'MEMBER_PROFILE',
    sensitivity: 'PERSONAL',
    description: 'Basic member profile (name, gender, age bracket)',
    allowedFeatures: [
      'AI_PLATFORM_TEST',
      'FITNESS_COACH',
      'NUTRITION_COACH',
      'DAILY_CHECKIN',
      'PROGRESS_INSIGHTS',
      'ENGAGEMENT_ASSISTANT',
      'RECEPTIONIST',
    ],
  },
  MEMBERSHIP: {
    source: 'MEMBERSHIP',
    sensitivity: 'INTERNAL',
    description: 'Membership status, tier, and renewal date',
    allowedFeatures: ['AI_PLATFORM_TEST', 'RECEPTIONIST', 'SALES_AGENT', 'CHURN_INTELLIGENCE'],
  },
  TRAINING: {
    source: 'TRAINING',
    sensitivity: 'PERSONAL',
    description: 'Active training program, recent workouts, upcoming sessions',
    allowedFeatures: ['AI_PLATFORM_TEST', 'FITNESS_COACH', 'DAILY_CHECKIN', 'PROGRESS_INSIGHTS'],
  },
  PROGRESS: {
    source: 'PROGRESS',
    sensitivity: 'PERSONAL',
    description: 'Fitness goals, PRs, and general progress trends',
    allowedFeatures: ['AI_PLATFORM_TEST', 'FITNESS_COACH', 'NUTRITION_COACH', 'PROGRESS_INSIGHTS'],
  },
  NUTRITION: {
    source: 'NUTRITION',
    sensitivity: 'SENSITIVE',
    description: 'Nutrition targets, dietary preferences, and macro summaries',
    allowedFeatures: ['FITNESS_COACH', 'NUTRITION_COACH', 'DAILY_CHECKIN'],
  },
  ENGAGEMENT: {
    source: 'ENGAGEMENT',
    sensitivity: 'INTERNAL',
    description: 'Streaks, badges, engagement score, and completed challenges',
    allowedFeatures: [
      'AI_PLATFORM_TEST',
      'FITNESS_COACH',
      'DAILY_CHECKIN',
      'ENGAGEMENT_ASSISTANT',
      'CHURN_INTELLIGENCE',
    ],
  },
  BOOKING: {
    source: 'BOOKING',
    sensitivity: 'INTERNAL',
    description: 'Class reservations and appointment history',
    allowedFeatures: ['AI_PLATFORM_TEST', 'RECEPTIONIST', 'DAILY_CHECKIN', 'ENGAGEMENT_ASSISTANT'],
  },
  ATTENDANCE: {
    source: 'ATTENDANCE',
    sensitivity: 'INTERNAL',
    description: 'Gym check-in frequency and attendance recency',
    allowedFeatures: ['AI_PLATFORM_TEST', 'FITNESS_COACH', 'ENGAGEMENT_ASSISTANT', 'CHURN_INTELLIGENCE'],
  },
};

@Injectable()
export class AIContextPermissionService {
  private readonly logger = new Logger(AIContextPermissionService.name);

  /**
   * Validates if a specific AI feature is authorized to access the requested context sources.
   * Filters out unauthorized sources and returns only permitted sources.
   */
  filterAuthorizedSources(feature: AIFeature, requestedSources: AIContextSource[]): AIContextSource[] {
    const allowed: AIContextSource[] = [];

    for (const source of requestedSources) {
      const def = CONTEXT_SOURCE_REGISTRY[source];
      if (!def) continue;

      if (def.allowedFeatures.includes(feature)) {
        allowed.push(source);
      } else {
        this.logger.warn(
          `Feature '${feature}' is NOT authorized to access context source '${source}' (Sensitivity: ${def.sensitivity})`,
        );
      }
    }

    return allowed;
  }

  /**
   * Asserts that a single source is authorized for a feature, or throws ForbiddenException.
   */
  assertSourceAuthorized(feature: AIFeature, source: AIContextSource): void {
    const def = CONTEXT_SOURCE_REGISTRY[source];
    if (!def || !def.allowedFeatures.includes(feature)) {
      throw new ForbiddenException(
        `AI feature '${feature}' is not authorized to access context source '${source}'`,
      );
    }
  }
}
