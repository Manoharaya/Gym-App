import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { DailyCheckInSafetyResult } from '../domain/daily-checkin.types';
import { SorenessLevel } from '../domain/daily-checkin.enums';

@Injectable()
export class DailyCheckInSafetyService {
  private readonly logger = new Logger(DailyCheckInSafetyService.name);

  // Red-flag patterns requiring immediate cessation of exercise and medical referral
  private readonly EMERGENCY_PATTERNS: Array<{ pattern: RegExp; category: string; description: string }> = [
    {
      pattern: /\b(severe\s+pain\s+in\s+(my\s+)?chest|chest\s+pain|tightness\s+in\s+(my\s+)?chest|pressure\s+in\s+chest|heart\s+palpitations)\b/i,
      category: 'CHEST_PAIN',
      description: 'Acute chest discomfort or cardiovascular symptom',
    },
    {
      pattern: /\b(can't\s+breathe|unable\s+to\s+breathe|gasping\s+for\s+air|severe\s+shortness\s+of\s+breath|difficulty\s+breathing)\b/i,
      category: 'DIFFICULTY_BREATHING',
      description: 'Acute respiratory distress',
    },
    {
      pattern: /\b(faint(ed|ing)?|passed\s+out|blacked\s+out|severe\s+dizziness|room\s+spinning)\b/i,
      category: 'FAINTING_DIZZINESS',
      description: 'Loss of consciousness or severe acute dizziness',
    },
    {
      pattern: /\b(bone\s+broken|fracture|joint\s+dislocated|popped\s+and\s+can't\s+walk|unable\s+to\s+bear\s+weight|cannot\s+bear\s+weight|can't\s+bear\s+weight|loud\s+pop|torn\s+ligament)\b/i,
      category: 'ACUTE_INJURY',
      description: 'Potential structural or severe acute joint injury',
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates check-in inputs for physical safety, injury red flags, or extreme symptoms.
   */
  async evaluateCheckIn(params: {
    organisationId: string;
    memberId: string;
    sorenessLevel: SorenessLevel;
    notes?: string;
  }): Promise<DailyCheckInSafetyResult> {
    const notesText = (params.notes || '').trim();

    // 1. Check for emergency / acute medical red flags in free text
    for (const item of this.EMERGENCY_PATTERNS) {
      if (item.pattern.test(notesText)) {
        const match = notesText.match(item.pattern)?.[0] || item.category;
        this.logger.warn(
          `[DailyCheckInSafety] Emergency symptom detected for member '${params.memberId}': '${match}'`,
        );

        // Record safety escalation
        await this.recordEscalation({
          organisationId: params.organisationId,
          memberId: params.memberId,
          severity: 'URGENT_ESCALATION',
          category: item.category,
          triggerPhrase: match,
          actionTaken: 'BLOCKED_WORKOUT_RECOMMENDATION_URGENT_REFERRAL',
        });

        return {
          isSafeToProceed: false,
          severity: 'URGENT_ESCALATION',
          category: item.category,
          triggerPhrase: match,
          actionTaken: 'IMMEDIATE_MEDICAL_REFERRAL',
          safeResponse: {
            summary:
              'Safety Priority: You reported symptoms that require prompt professional medical attention.',
            guidance:
              'Please do not proceed with any planned workout or physical exertion today. If you are experiencing acute chest discomfort, severe shortness of breath, or sudden faintness, please contact emergency medical services (e.g., 000 / 911) or your nearest urgent care immediately.',
            caution:
              'Exercise is strictly not advised while acute symptoms are present. FitCore does not diagnose conditions or assess clinical severity.',
            helplineOrReferral: 'Emergency Services / Qualified Healthcare Provider',
          },
        };
      }
    }

    // 2. Check for extreme soreness requiring recovery caution
    if (params.sorenessLevel === SorenessLevel.VERY_HIGH) {
      this.logger.log(`[DailyCheckInSafety] Very high soreness reported by member '${params.memberId}'`);

      return {
        isSafeToProceed: true,
        severity: 'CAUTION',
        category: 'EXTREME_SORENESS',
        actionTaken: 'ADVISED_RECOVERY_MODIFICATION',
        safeResponse: {
          summary: 'High Soreness Advisory: Your self-reported muscular soreness is at the maximum level.',
          guidance:
            'Consider replacing heavy loading with gentle mobility, active walking, or complete rest today. If you train with a personal trainer, let them know before your session so they can adjust your plan.',
          caution:
            'Training through severe acute soreness can compromise technique and increase muscle strain risks. If soreness is accompanied by joint swelling or sharp focal pain, please consult a healthcare professional.',
        },
      };
    }

    return {
      isSafeToProceed: true,
      actionTaken: 'STANDARD_CHECKIN_PERMITTED',
    };
  }

  private async recordEscalation(data: {
    organisationId: string;
    memberId: string;
    severity: string;
    category: string;
    triggerPhrase: string;
    actionTaken: string;
  }) {
    try {
      await this.prisma.aIFitnessSafetyEscalation.create({
        data: {
          organisationId: data.organisationId,
          memberId: data.memberId,
          severity: data.severity,
          category: data.category,
          triggerPhrase: data.triggerPhrase,
          actionTaken: data.actionTaken,
          resolved: false,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record safety escalation record: ${err.message}`);
    }
  }
}
