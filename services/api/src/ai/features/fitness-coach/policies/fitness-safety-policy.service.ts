import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import type {
  SafetyEscalationSeverity,
  SafetyEscalationCategory,
  FitnessCoachResponse,
} from '@fitcore/types';

export interface FitnessSafetyEvaluation {
  severity: SafetyEscalationSeverity;
  category?: SafetyEscalationCategory;
  isSafeToProceed: boolean;
  safeResponse?: FitnessCoachResponse;
  triggerPhrase?: string;
  actionTaken: string;
}

@Injectable()
export class FitnessSafetyPolicyService {
  private readonly logger = new Logger(FitnessSafetyPolicyService.name);

  // Red-flag acute symptoms requiring emergency or urgent medical escalation
  private readonly URGENT_SYMPTOM_PATTERNS: Array<{ pattern: RegExp; category: SafetyEscalationCategory }> = [
    {
      pattern: /\b(severe\s+pain\s+in\s+(my\s+)?chest|chest\s+pain|heart\s+palpitations|irregular\s+heartbeat|pressure\s+in\s+(my\s+)?chest)\b/i,
      category: 'CHEST_PAIN',
    },
    {
      pattern: /\b(faint(ed|ing)?|passed\s+out|blacked\s+out|loss\s+of\s+consciousness|severe\s+dizziness\s+during\s+exercise)\b/i,
      category: 'MEDICAL_SYMPTOM',
    },
    {
      pattern: /\b(can't\s+breathe|unable\s+to\s+catch\s+my\s+breath|severe\s+shortness\s+of\s+breath|gasping\s+for\s+air)\b/i,
      category: 'MEDICAL_SYMPTOM',
    },
  ];

  // Injury & diagnostic inquiry patterns requiring non-clinical referral
  private readonly INJURY_PATTERNS: Array<{ pattern: RegExp; category: SafetyEscalationCategory }> = [
    {
      pattern: /\b(what\s+injury\s+do\s+i\s+have|diagnose\s+(my\s+)?|did\s+i\s+tear\s+(my\s+)?|is\s+my\s+(knee|shoulder|back|ankle|hip)\s+broken|sprain\s+or\s+strain)\b/i,
      category: 'INJURY',
    },
    {
      pattern: /\b(severe\s+sharp\s+pain|popping\s+sound\s+in\s+(my\s+)?joint|(knee|shoulder|joint)\s+popped|popped\s+and|unable\s+to\s+bear\s+weight|acute\s+joint\s+swelling|joint\s+swollen|joint\s+swelling|numbness\s+and\s+tingling)\b/i,
      category: 'INJURY',
    },
    {
      pattern: /\b(burn\s+5000\s+calories|eat\s+(under|less\s+than)\s+500\s+calories|starv(e|ing)|fast\s+for\s+a\s+week\s+to\s+lose)\b/i,
      category: 'UNSAFE_WEIGHT_LOSS',
    },
    {
      pattern: /\b(work\s+out\s+until\s+i\s+vomit|pass\s+out\s+from\s+training|train\s+8\s+hours\s+a\s+day)\b/i,
      category: 'EXTREME_EXERCISE',
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates user fitness query against safety policies.
   */
  async evaluateQuery(
    content: string,
    organisationId: string,
    memberId: string,
    conversationId?: string,
  ): Promise<FitnessSafetyEvaluation> {
    const trimmed = content.trim();

    // 1. Check Urgent Symptoms (Slice 25, 76)
    for (const item of this.URGENT_SYMPTOM_PATTERNS) {
      if (item.pattern.test(trimmed)) {
        this.logger.warn(`Urgent medical symptom detected in member '${memberId}': category ${item.category}`);
        const triggerPhrase = item.pattern.exec(trimmed)?.[0] || 'Urgent symptom match';

        const safeResponse: FitnessCoachResponse = {
          message:
            'I cannot prescribe or recommend exercises when you are experiencing chest pain, severe shortness of breath, or urgent medical symptoms. Please stop all physical activity immediately, sit or rest comfortably, and seek urgent medical evaluation or call emergency services.',
          summary: 'Urgent medical safety escalation triggered.',
          insights: [
            {
              type: 'SAFETY_INTERVENTION',
              title: 'Activity Stopped for Safety',
              description: 'Exertion during chest pain or acute cardiopulmonary symptoms is contraindicated.',
              confidence: 1.0,
            },
          ],
          recommendations: [
            {
              title: 'Seek Immediate Medical Attention',
              description: 'Contact emergency healthcare services or visit the nearest emergency facility immediately.',
              rationale: 'Acute symptoms during exercise require medical evaluation by a licensed physician.',
              priority: 'HIGH',
              type: 'RECOVERY',
            },
            {
              title: 'Cease All Exercise',
              description: 'Do not resume any cardiovascular or resistance training until cleared in writing by a physician.',
              rationale: 'Prevent compounding cardiovascular or pulmonary risk.',
              priority: 'HIGH',
              type: 'CONSISTENCY',
            },
          ],
          cautions: [
            'FitCore AI does not provide emergency medical diagnosis or treatment.',
            'Always consult a physician before resuming exercise after experiencing acute symptoms.',
          ],
          suggestedActions: [],
        };

        // Record persistent escalation record
        await this.recordEscalation({
          organisationId,
          memberId,
          conversationId,
          severity: 'URGENT_ESCALATION',
          category: item.category,
          triggerPhrase,
          actionTaken: 'REFUSED_WORKOUT_DIRECTED_TO_EMERGENCY_MEDICAL',
        });

        return {
          severity: 'URGENT_ESCALATION',
          category: item.category,
          isSafeToProceed: false,
          safeResponse,
          triggerPhrase,
          actionTaken: 'REFUSED_WORKOUT_DIRECTED_TO_EMERGENCY_MEDICAL',
        };
      }
    }

    // 2. Check Injury & Diagnosis Inquiries (Slice 24)
    for (const item of this.INJURY_PATTERNS) {
      if (item.pattern.test(trimmed)) {
        this.logger.warn(`Clinical/injury diagnosis request detected in member '${memberId}': category ${item.category}`);
        const triggerPhrase = item.pattern.exec(trimmed)?.[0] || 'Injury diagnosis match';

        const isUnsafePractice = item.category === 'EXTREME_EXERCISE' || item.category === 'UNSAFE_WEIGHT_LOSS';

        const safeResponse: FitnessCoachResponse = {
          message: isUnsafePractice
            ? 'I cannot recommend extreme exercise volume or severe caloric deficits. Sustainable fitness progress is built on progressive overload, adequate nutrition, and structured recovery.'
            : 'I cannot provide medical diagnoses or identify specific injuries. If you are experiencing pain or joint discomfort, please stop the irritating exercise, avoid loading the painful area, and consult a qualified physiotherapist or physician for an examination.',
          summary: isUnsafePractice
            ? 'Unsafe fitness or weight loss request blocked.'
            : 'Non-diagnostic guidance provided for pain/injury report.',
          insights: [
            {
              type: 'CLINICAL_BOUNDARY',
              title: 'Non-Diagnostic Scope',
              description: 'FitCore AI is a training coach, not a physical therapist or medical doctor.',
              confidence: 1.0,
            },
          ],
          recommendations: [
            {
              title: isUnsafePractice ? 'Adopt Sustainable Programming' : 'Consult a Licensed Professional',
              description: isUnsafePractice
                ? 'Work with a certified trainer to establish realistic, safe progression goals.'
                : 'Have a licensed physiotherapist evaluate joint mechanics and musculoskeletal function.',
              rationale: 'Safety and injury prevention are paramount for long-term consistency.',
              priority: 'HIGH',
              type: 'RECOVERY',
            },
          ],
          cautions: [
            'FitCore AI is for fitness guidance only and does not provide medical advice or injury diagnoses.',
          ],
          suggestedActions: [
            {
              action: 'VIEW_WORKOUT',
              label: 'Review Safe Exercises',
              parameters: {},
            },
          ],
        };

        // Record persistent escalation record
        await this.recordEscalation({
          organisationId,
          memberId,
          conversationId,
          severity: 'RECOMMEND_PROFESSIONAL',
          category: item.category,
          triggerPhrase,
          actionTaken: 'NON_DIAGNOSTIC_REFERRAL_ISSUED',
        });

        return {
          severity: 'RECOMMEND_PROFESSIONAL',
          category: item.category,
          isSafeToProceed: false,
          safeResponse,
          triggerPhrase,
          actionTaken: 'NON_DIAGNOSTIC_REFERRAL_ISSUED',
        };
      }
    }

    return {
      severity: 'NONE',
      isSafeToProceed: true,
      actionTaken: 'PROCEED_TO_ORCHESTRATOR',
    };
  }

  private async recordEscalation(data: {
    organisationId: string;
    memberId: string;
    conversationId?: string;
    severity: SafetyEscalationSeverity;
    category: SafetyEscalationCategory;
    triggerPhrase?: string;
    actionTaken: string;
  }) {
    try {
      await this.prisma.aIFitnessSafetyEscalation.create({
        data: {
          organisationId: data.organisationId,
          memberId: data.memberId,
          conversationId: data.conversationId,
          severity: data.severity,
          category: data.category,
          triggerPhrase: data.triggerPhrase,
          actionTaken: data.actionTaken,
          resolved: false,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record safety escalation: ${err.message}`);
    }
  }
}
