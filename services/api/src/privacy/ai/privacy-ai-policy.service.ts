import { Injectable, Logger } from '@nestjs/common';
import { AIContextSource } from '@fitcore/types';
import { PrivacyPolicyService } from '../policies/privacy-policy.service';

@Injectable()
export class PrivacyAIDataPolicyService {
  private readonly logger = new Logger(PrivacyAIDataPolicyService.name);

  constructor(private readonly privacyPolicy: PrivacyPolicyService) {}

  /**
   * Filters requested AI context sources according to member privacy preferences and consents.
   * Enforces data minimization and strict exclusion of withdrawn or restricted datasets.
   */
  async filterAuthorizedContextSources(
    organisationId: string,
    memberId: string,
    requestedSources: AIContextSource[],
  ): Promise<{
    allowedSources: AIContextSource[];
    excludedSources: { source: AIContextSource; reason: string }[];
  }> {
    const allowedSources: AIContextSource[] = [];
    const excludedSources: { source: AIContextSource; reason: string }[] = [];

    for (const source of requestedSources) {
      if (source === 'WEARABLE_HEALTH_DATA') {
        const evalResult = await this.privacyPolicy.canUseForAI(
          organisationId,
          memberId,
          'WEARABLE',
        );

        if (evalResult.decision === 'ALLOWED') {
          allowedSources.push(source);
        } else {
          excludedSources.push({ source, reason: evalResult.reason });
          this.logger.warn(
            `Context source '${source}' excluded for member ${memberId}: ${evalResult.reason}`,
          );
        }
      } else if (source === 'NUTRITION') {
        const evalResult = await this.privacyPolicy.canUseForAI(
          organisationId,
          memberId,
          'NUTRITION',
        );

        if (evalResult.decision === 'ALLOWED') {
          allowedSources.push(source);
        } else {
          excludedSources.push({ source, reason: evalResult.reason });
        }
      } else {
        // Base profile, training, progress: check general AI personalization
        const evalResult = await this.privacyPolicy.canUseForAI(
          organisationId,
          memberId,
          'PROFILE',
        );

        if (evalResult.decision === 'ALLOWED') {
          allowedSources.push(source);
        } else {
          excludedSources.push({ source, reason: evalResult.reason });
        }
      }
    }

    return { allowedSources, excludedSources };
  }
}

export { PrivacyAIDataPolicyService as PrivacyAiPolicyService };
