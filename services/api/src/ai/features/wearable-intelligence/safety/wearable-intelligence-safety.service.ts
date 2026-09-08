import { Injectable, Logger } from '@nestjs/common';
import { AIAuditService } from '../../../services/ai-audit.service';
import { PrismaService } from '../../../../database/prisma.service';

export interface WearableSafetyCheckResult {
  isSafe: boolean;
  category?: 'CARDIAC_OR_CLINICAL_DIAGNOSIS' | 'HEART_CONDITION_DIAGNOSIS' | 'MEDICATION_ADVICE' | 'ACUTE_CHEST_PAIN' | 'DISEASE_PREDICTION' | 'MEDICAL_SYMPTOM';
  redirectionMessage?: string;
  recommendedAction?: string;
}

@Injectable()
export class WearableIntelligenceSafetyService {
  private readonly logger = new Logger(WearableIntelligenceSafetyService.name);

  // Unsafe medical interpretation regex patterns
  private readonly unsafePatterns = [
    {
      category: 'ACUTE_CHEST_PAIN' as const,
      regex: /(chest\s+pain|tightness\s+in\s+chest|pressure\s+in\s+my\s+chest|shortness\s+of\s+breath|difficulty\s+breathing)/i,
      message:
        'Chest discomfort, tightness, or breathing difficulties can indicate an acute medical situation. Stop exercising immediately and seek emergency medical evaluation or contact local emergency services.',
    },
    {
      category: 'CARDIAC_OR_CLINICAL_DIAGNOSIS' as const,
      regex: /(do\s+i\s+have\s+(a\s+heart|arrhythmia|atrial\s+fibrillation|afib)|heart\s+(problem|condition|disease|attack|failure)|diagnose\s+my\s+(heart|arrhythmia|afib)|is\s+my\s+heart\s+failing|arrhythmia|atrial\s+fibrillation|afib|irregular\s+heartbeat)/i,
      message:
        'Commercial wearable measurements (such as resting heart rate or HRV) cannot diagnose or rule out cardiac conditions. If you are experiencing concerning physical symptoms or have cardiovascular questions, please consult a qualified physician or cardiologist.',
    },
    {
      category: 'MEDICATION_ADVICE' as const,
      regex: /(what\s+medication|which\s+drug|should\s+i\s+take\s+(aspirin|beta\s+blocker|pills|medicine)|prescribe|dosage)/i,
      message:
        'FitCore cannot recommend or evaluate pharmaceutical medications, supplements for medical conditions, or drug dosages. Consult your prescribing physician or pharmacist for medical treatment advice.',
    },
    {
      category: 'DISEASE_PREDICTION' as const,
      regex: /(am\s+i\s+sick|do\s+i\s+have\s+(covid|flu|infection|diabetes|cancer)|cure\s+my|test\s+positive)/i,
      message:
        'Wearable biometric fluctuations reflect normal day-to-day lifestyle variation and cannot diagnose clinical illness or infection. If you feel unwell, rest and consult a healthcare practitioner.',
    },
  ];

  constructor(
    private readonly audit: AIAuditService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Scans a member prompt or inquiry for unsafe medical interpretation requests.
   */
  async evaluateQuery(params: {
    prompt?: string;
    memberId: string;
    organisationId: string;
    userId?: string;
  }): Promise<WearableSafetyCheckResult> {
    const { prompt, memberId, organisationId } = params;

    if (!prompt || prompt.trim().length === 0) {
      return { isSafe: true };
    }

    for (const pattern of this.unsafePatterns) {
      if (pattern.regex.test(prompt)) {
        this.logger.warn(`Intercepted unsafe medical interpretation request (${pattern.category}) for member ${memberId}`);

        // Resolve userId for audit event foreign key constraint
        let targetUserId = params.userId;
        if (!targetUserId && memberId) {
          try {
            const profile = await this.prisma.memberProfile.findUnique({
              where: { id: memberId },
              select: { userId: true },
            });
            if (profile?.userId) {
              targetUserId = profile.userId;
            }
          } catch {
            // Ignore resolution failure in fallback
          }
        }

        // Record audit event
        if (targetUserId) {
          try {
            await this.audit.recordAuditEvent({
              organisationId,
              userId: targetUserId,
              feature: 'WEARABLE_INTELLIGENCE',
              eventType: 'AI_REQUEST_BLOCKED',
              result: 'BLOCKED',
              metadata: {
                category: pattern.category,
                promptSnippet: prompt.slice(0, 100),
                memberId,
                description: `Unsafe medical query blocked: ${pattern.category}`,
              },
            });
          } catch (auditErr: any) {
            this.logger.warn(`Failed to record safety audit: ${auditErr.message}`);
          }
        }

        return {
          isSafe: false,
          category: pattern.category,
          redirectionMessage: pattern.message,
          recommendedAction: 'CONSULT_HEALTHCARE_PROFESSIONAL',
        };
      }
    }

    return { isSafe: true };
  }
}
