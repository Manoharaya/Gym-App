import { Injectable, Logger } from '@nestjs/common';
import { MemberAIContext } from '@fitcore/types';

@Injectable()
export class SensitiveDataSanitizerService {
  private readonly logger = new Logger(SensitiveDataSanitizerService.name);

  // Blacklist keys that must NEVER enter AI context
  private readonly FORBIDDEN_KEYS = new Set([
    'parq',
    'parqresponses',
    'medical',
    'medicalclearance',
    'medicalconditions',
    'healthconditions',
    'doctorclearance',
    'privatenotes',
    'confidentialnotes',
    'password',
    'passwordhash',
    'token',
    'jwt',
    'secret',
    'creditcard',
    'bankaccount',
    'paymentmethod',
    'stripe',
  ]);

  /**
   * Deep sanitization of context object removing all blacklisted sensitive fields.
   */
  sanitizeContext(context: Record<string, any>): Record<string, any> {
    return this.cleanObject(context);
  }

  /**
   * Sanitizes MemberAIContext specifically, ensuring bounded volume and zero health secrets.
   */
  sanitizeMemberAIContext(rawContext: Partial<MemberAIContext>): MemberAIContext {
    return {
      identity: {
        memberId: rawContext.identity?.memberId || '',
        firstName: rawContext.identity?.firstName,
        gender: rawContext.identity?.gender,
        age: rawContext.identity?.age,
      },
      membership: {
        status: rawContext.membership?.status || 'UNKNOWN',
        plan: rawContext.membership?.plan,
        expiryDate: rawContext.membership?.expiryDate,
      },
      training: {
        activeProgram: rawContext.training?.activeProgram
          ? this.cleanObject(rawContext.training.activeProgram)
          : undefined,
        recentWorkouts: (rawContext.training?.recentWorkouts || [])
          .slice(0, 5)
          .map((w) => this.cleanObject(w)),
        upcomingSessions: (rawContext.training?.upcomingSessions || [])
          .slice(0, 3)
          .map((s) => this.cleanObject(s)),
      },
      progress: {
        goals: (rawContext.progress?.goals || []).slice(0, 5).map((g) => this.cleanObject(g)),
        recentProgress: (rawContext.progress?.recentProgress || [])
          .slice(0, 5)
          .map((p) => this.cleanObject(p)),
      },
      nutrition: {
        targets: rawContext.nutrition?.targets
          ? this.cleanObject(rawContext.nutrition.targets)
          : undefined,
        recentSummary: rawContext.nutrition?.recentSummary
          ? this.cleanObject(rawContext.nutrition.recentSummary)
          : undefined,
      },
      engagement: {
        recentActivity: (rawContext.engagement?.recentActivity || [])
          .slice(0, 5)
          .map((a) => this.cleanObject(a)),
        streak: rawContext.engagement?.streak,
        engagementLevel: rawContext.engagement?.engagementLevel,
        points: rawContext.engagement?.points,
      },
    };
  }

  private cleanObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.cleanObject(item));
    }

    if (typeof obj === 'object') {
      const cleaned: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (this.FORBIDDEN_KEYS.has(lowerKey)) {
          this.logger.debug(`[Sanitizer] Redacted blacklisted key: ${key}`);
          continue;
        }
        cleaned[key] = this.cleanObject(value);
      }
      return cleaned;
    }

    return obj;
  }
}
