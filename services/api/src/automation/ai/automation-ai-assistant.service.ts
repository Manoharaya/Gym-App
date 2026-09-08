/**
 * Day 30 — AI Automation Assistant Service
 *
 * Provides intelligent workflow drafting, condition recommendations,
 * and safe multi-lingual messaging templates via Day 19 AI Orchestrator.
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { AIOrchestratorService } from '../../ai/orchestrator/ai-orchestrator.service';
import { WorkflowSafetyService } from '../safeguards/workflow-safety.service';
import {
  AIAssistWorkflowPromptDto,
  AIAssistWorkflowResponseDto,
  WorkflowTriggerType,
} from '@fitcore/types';

@Injectable()
export class AutomationAIAssistantService {
  private readonly logger = new Logger(AutomationAIAssistantService.name);

  constructor(
    @Optional() private readonly aiOrchestrator?: AIOrchestratorService,
    private readonly safetyService?: WorkflowSafetyService,
  ) {}

  /**
   * Generates a workflow recommendation from natural language gym intent.
   */
  async draftWorkflow(
    dto: AIAssistWorkflowPromptDto,
    user?: any,
  ): Promise<AIAssistWorkflowResponseDto> {
    this.logger.log(`Drafting workflow for organisation ${dto.organisationId}: "${dto.intent}"`);

    // 1. If AI Orchestrator is available and user authenticated, run through central AI Platform
    if (this.aiOrchestrator && user) {
      try {
        const systemPrompt = `You are the FitCore Gym Automation Architect.
Design a deterministic, event-driven engagement workflow based on gym staff intent.
STRICT RULES:
1. NEVER recommend high-risk actions (CANCEL_MEMBERSHIP, MODIFY_PRICE, APPLY_DISCOUNT, GATE_ACCESS).
2. ONLY use supported trigger types: INACTIVITY_DAYS_REACHED, ATTENDANCE_DROP_PERCENT, CLASS_MISSED, MULTIPLE_SESSIONS_MISSED, MEMBERSHIP_EXPIRING, MEMBER_REENGAGED, WORKOUT_MILESTONE_REACHED, SCHEDULED_WORKOUT_MISSED, ONBOARDING_STEP_COMPLETED, CUSTOM_EVENT.
3. ONLY use supported action types: SEND_COMMUNICATION, CREATE_STAFF_TASK, SEND_IN_APP_NOTIFICATION, NOTIFY_ASSIGNED_TRAINER, NOTIFY_MANAGER, ADD_ENGAGEMENT_NOTE, ADD_MEMBER_TAG, REMOVE_MEMBER_TAG, DELAY.
4. Tone must be supportive, encouraging, respectful. NEVER use shaming language.
5. Provide bilingual copy (English and Nepali with 'नमस्ते').
Return strictly valid JSON matching the AIAssistWorkflowResponseDto schema.`;

        const result = await this.aiOrchestrator.execute({
          feature: 'AUTOMATION_ASSISTANT',
          prompt: `Intent: ${dto.intent}\nTarget Audience: ${dto.targetAudience || 'All Members'}\nTone: ${dto.preferredTone || 'SUPPORTIVE'}\nLanguage: ${dto.language || 'en'}`,
          systemInstructionOverride: systemPrompt,
          organisationId: dto.organisationId,
          user,
          responseFormat: 'json',
        });

        if (result.structuredOutput) {
          return this.sanitizeOutput(result.structuredOutput);
        }
      } catch (err: any) {
        this.logger.warn(`AI Orchestrator failed or unconfigured; falling back to deterministic template builder: ${err.message}`);
      }
    }

    // 2. Deterministic heuristic drafting fallback
    return this.generateDeterministicDraft(dto);
  }

  private sanitizeOutput(draft: any): AIAssistWorkflowResponseDto {
    if (this.safetyService && draft.actions) {
      this.safetyService.validateActionsSafety(draft.actions);
    }
    return draft as AIAssistWorkflowResponseDto;
  }

  private generateDeterministicDraft(dto: AIAssistWorkflowPromptDto): AIAssistWorkflowResponseDto {
    const lowerIntent = dto.intent.toLowerCase();

    let triggerType: WorkflowTriggerType = 'INACTIVITY_DAYS_REACHED';
    let name = 'Automated Member Check-in';
    let params: Record<string, any> = { inactivityDays: 7 };

    if (lowerIntent.includes('class') || lowerIntent.includes('no show') || lowerIntent.includes('missed class')) {
      triggerType = 'CLASS_MISSED';
      name = 'Class Missed Gentle Follow-up';
      params = {};
    } else if (lowerIntent.includes('birthday')) {
      triggerType = 'MEMBER_BIRTHDAY';
      name = 'Birthday Warm Wishes';
      params = {};
    } else if (lowerIntent.includes('onboard') || lowerIntent.includes('new member') || lowerIntent.includes('trial')) {
      triggerType = 'ONBOARDING_STEP_COMPLETED';
      name = 'New Member Welcoming Sequence';
      params = { step: 'WELCOME' };
    } else if (lowerIntent.includes('milestone') || lowerIntent.includes('workout count')) {
      triggerType = 'WORKOUT_MILESTONE_REACHED';
      name = 'Workout Milestone Cheer';
      params = { milestoneCount: 25 };
    } else if (lowerIntent.includes('expire') || lowerIntent.includes('renewal')) {
      triggerType = 'MEMBERSHIP_EXPIRING';
      name = 'Membership Expiration Heads-up';
      params = { daysUntilExpiration: 14 };
    }

    return {
      recommendedName: name,
      description: `AI-assisted engagement workflow configured to address: "${dto.intent}".`,
      triggerType,
      triggerConfig: {
        triggerType,
        parameters: params,
        conditions: {
          field: Object.keys(params)[0] || 'status',
          operator: 'GREATER_THAN_OR_EQUAL',
          value: Object.values(params)[0] || 1,
          fieldType: 'NUMBER',
        },
      },
      audienceFilter: {
        membershipStatuses: ['ACTIVE'],
      },
      stopConditions: {
        stopIfActivityDetected: true,
      },
      safetyPolicy: {
        cooldownHours: 168,
        cooldownScope: 'MEMBER_AND_WORKFLOW',
        respectQuietHours: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      },
      actions: [
        {
          id: 'step_1_comm',
          type: 'SEND_COMMUNICATION',
          params: {
            channel: 'SMS',
            subject: 'A warm note from FitCore',
            message: 'Hi {{firstName}}, we hope you are having an amazing week! We are here to support your health journey whenever you need us.',
            messageNepali: 'नमस्ते {{firstName}}, तपाईंको हप्ता उत्कृष्ट बितिरहेको आशा गर्दछौं! हामी तपाईंको फिटनेस यात्रामा साथ दिन सदैव तत्पर छौं।',
          },
          requireApproval: false,
        },
        {
          id: 'step_2_task',
          type: 'CREATE_STAFF_TASK',
          params: {
            title: `Follow-up for ${name}: {{firstName}} {{lastName}}`,
            description: 'Check in on progress and ensure member feels supported.',
            priority: 'MEDIUM',
          },
          requireApproval: false,
        },
      ],
      suggestedMessageTemplates: [
        {
          channel: 'SMS',
          subject: 'FitCore Check-in',
          body: 'Hi {{firstName}}, hope you are having an energizing week! See you at the gym soon.',
          language: 'en',
        },
        {
          channel: 'SMS',
          subject: 'FitCore Check-in',
          body: 'नमस्ते {{firstName}}, आशा छ तपाईंको स्वास्थ्य राम्रो छ। तपाईंलाई पुनः जिममा देख्न पाउँदा खुसी लाग्नेछ।',
          language: 'ne',
        },
      ],
      explanation: 'Workflow drafted with supportive anti-shaming messaging, quiet hours protection, and 7-day cooldown.',
    };
  }
}
