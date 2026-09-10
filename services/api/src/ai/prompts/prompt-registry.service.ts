import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAIPromptDto } from '../dto/ai.dto';
import { AIFeature, AIPromptStatus } from '@fitcore/types';
import { WEARABLE_INTELLIGENCE_PROMPT_DEFINITION } from '../features/wearable-intelligence/prompts/wearable_intelligence.v1';
import { ENGAGEMENT_INTELLIGENCE_PROMPT_DEFINITION } from '../features/engagement-intelligence/prompts/engagement_intelligence.v1';
import { RETENTION_INTELLIGENCE_PROMPT_DEFINITION } from '../features/retention-intelligence/prompts/retention_intelligence.v1';
import { REACTIVATION_PROMPT_DEFINITION } from '../features/reactivation/prompts/reactivation.v1';
import { RETENTION_AGENT_PROMPT_DEFINITION } from '../features/retention-agent/prompts/retention_agent.v1';
import { RECEPTIONIST_PROMPT_DEFINITION } from '../features/receptionist/prompts/receptionist.v1';
import { RECEPTIONIST_BOOKING_PROMPT_DEFINITION } from '../features/receptionist/prompts/receptionist-booking.v1';
import { LEAD_QUALIFICATION_PROMPT_DEFINITION } from '../features/lead-qualification/prompts/lead_qualification.v1';
import { SALES_AGENT_PROMPT_DEFINITION } from '../features/sales-agent/prompts/sales_agent.v1';
import { FOLLOW_UP_MESSAGE_PROMPT_DEFINITION } from '../features/follow-up/prompts/follow_up_message.v1';
import { SALES_INTELLIGENCE_PROMPT_DEFINITION } from '../../sales-intelligence/prompts/sales_intelligence.v1';

@Injectable()
export class PromptRegistryService implements OnModuleInit {
  private readonly logger = new Logger(PromptRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultPrompts();
  }

  async seedDefaultPrompts(): Promise<void> {
    const defaultPrompts = [
      {
        organisationId: null,
        feature: 'AI_PLATFORM_TEST',
        key: 'default',
        version: 1,
        systemPrompt:
          'You are the FitCore AI Platform test agent. You verify gateway routing, context isolation, structured outputs, and safety guardrails.',
        developerPrompt: 'Output must be clear, concise, and structured.',
        outputSchema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            confidence: { type: 'number' },
            insights: { type: 'array', items: { type: 'string' } },
          },
          required: ['summary'],
        },
        status: 'ACTIVE',
      },
      {
        organisationId: null,
        feature: 'AI_PLATFORM_TEST',
        key: 'echo',
        version: 1,
        systemPrompt: 'Echo the user message accurately and concisely for verification.',
        developerPrompt: undefined,
        outputSchema: undefined,
        status: 'ACTIVE',
      },
      {
        organisationId: null,
        feature: 'FITNESS_COACH',
        key: 'fitness_coach.v1',
        version: 1,
        systemPrompt:
          'You are the FitCore AI Fitness Coach, an intelligent training and consistency assistant.\nYou help members understand and optimize their workout routines, training plans, consistency, and progress.\nCRITICAL SAFETY & OPERATIONAL DIRECTIVES:\n1. You are a fitness coaching assistant, NOT a medical doctor, physical therapist, or diagnostic clinician.\n2. NEVER diagnose injuries, prescribe medical treatments, or make clinical evaluations. If the member reports severe pain, chest pain, dizziness, or acute swelling, instruct them to stop exercising and consult a medical professional immediately.\n3. BASE ALL ANSWERS ON ACTUAL STORED FITCORE DATA. Never fabricate, assume, or hallucinate workouts, weights, repetitions, streaks, goals, or attendance. If data does not exist, explicitly state: "I don\'t have enough recorded activity to determine that."\n4. If a workout or plan was prescribed by a personal trainer, do not silently change exercises, sets, reps, or progression. Instead, explain the rationale or recommend questions for the member to discuss with their trainer.\n5. All actions must be read/navigation only (VIEW_WORKOUT, VIEW_PROGRESS, VIEW_GOAL, VIEW_TRAINING_PLAN, VIEW_BOOKING, OPEN_CHALLENGE). You are NOT authorized to autonomously book classes, cancel memberships, make payments, or overwrite trainer programs.\n6. Provide structured output matching the requested schema with supportive, actionable, and safe recommendations.',
        developerPrompt:
          'Ensure output conforms strictly to the FitnessCoachResponse schema with message, insights, recommendations, cautions, and suggestedActions.',
        outputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            summary: { type: 'string' },
            insights: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  confidence: { type: 'number' },
                },
                required: ['type', 'title', 'description'],
              },
            },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  rationale: { type: 'string' },
                  priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
                  type: {
                    type: 'string',
                    enum: [
                      'TRAINING',
                      'RECOVERY',
                      'CONSISTENCY',
                      'WORKOUT_EXECUTION',
                      'GOAL_SETTING',
                      'SCHEDULING',
                      'PROGRESS_REVIEW',
                      'GENERAL_FITNESS',
                    ],
                  },
                },
                required: ['title', 'description', 'type'],
              },
            },
            cautions: {
              type: 'array',
              items: { type: 'string' },
            },
            suggestedActions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: {
                    type: 'string',
                    enum: [
                      'VIEW_WORKOUT',
                      'VIEW_PROGRESS',
                      'VIEW_GOAL',
                      'VIEW_TRAINING_PLAN',
                      'VIEW_BOOKING',
                      'OPEN_CHALLENGE',
                    ],
                  },
                  label: { type: 'string' },
                  parameters: { type: 'object' },
                },
                required: ['action', 'label'],
              },
            },
            followUpQuestion: { type: 'string' },
          },
          required: ['message'],
        },
        status: 'ACTIVE',
      },
      {
        organisationId: null,
        feature: 'NUTRITION_COACH',
        key: 'nutrition_coach.v1',
        version: 1,
        systemPrompt:
          'You are the FitCore AI Nutrition Coach, an intelligent nutrition, dietary guidance, and consistency assistant.\nYou help members understand their nutrition targets, meal plans, food alternatives, and daily intake.\nCRITICAL SAFETY & OPERATIONAL DIRECTIVES:\n1. You are a nutrition coaching assistant, NOT a medical doctor, registered dietitian, or clinical practitioner.\n2. NEVER diagnose diseases, prescribe medical nutrition therapy, or prescribe treatment for clinical conditions. If the member asks to cure, treat, or diagnose diseases (e.g. diabetes, cancer, renal failure, celiac), direct them to consult a qualified physician or registered dietitian.\n3. BASE ALL ANSWERS ON ACTUAL STORED FITCORE DATA. Never fabricate, assume, or hallucinate food logs, calories, macro targets, meal plans, or historical intake. If data does not exist, explicitly state: "I don\'t have enough recorded nutrition data to determine that."\n4. ALLERGY & INTOLERANCE SAFETY: Distinguish clearly between preferences, dislikes, intolerances, and allergies. NEVER recommend a food containing a known allergen under ANY circumstances. Do NOT bypass allergy restrictions even if requested by the user.\n5. NO AUTONOMOUS WRITES: You cannot autonomously change nutrition targets (calories, protein, carbs, fat, water) or modify assigned meal plans. All responses are read-only and educational.\n6. Provide structured output conforming strictly to the NutritionCoachResponse schema.',
        developerPrompt:
          'Ensure output conforms strictly to the NutritionCoachResponse schema with answer, responseType, confidence, recommendations, mealSuggestions, foodAlternatives, warnings, and followUpQuestions.',
        outputSchema: {
          type: 'object',
          properties: {
            answer: { type: 'string' },
            responseType: {
              type: 'string',
              enum: ['EXPLANATION', 'SUGGESTION', 'SUMMARY', 'SAFETY_INTERVENTION', 'EDUCATIONAL'],
            },
            confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
            groundedSources: { type: 'array', items: { type: 'string' } },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: [
                      'MEAL_SUGGESTION',
                      'FOOD_ALTERNATIVE',
                      'HYDRATION',
                      'MEAL_TIMING',
                      'CONSISTENCY',
                      'TARGET_EDUCATION',
                      'LOGGING_GUIDANCE',
                      'TRAINING_NUTRITION',
                      'GENERAL_EDUCATION',
                    ],
                  },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  rationale: { type: 'string' },
                  priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
                },
                required: ['type', 'title', 'description'],
              },
            },
            mealSuggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  ingredients: { type: 'array', items: { type: 'string' } },
                  estimatedCalories: { type: 'number' },
                  estimatedProtein: { type: 'number' },
                  estimatedCarbs: { type: 'number' },
                  estimatedFat: { type: 'number' },
                  whyItFits: { type: 'string' },
                  allergySafetyNote: { type: 'string' },
                  isAiSuggestion: { type: 'boolean' },
                },
                required: ['name', 'ingredients', 'whyItFits', 'isAiSuggestion'],
              },
            },
            foodAlternatives: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  originalFood: { type: 'string' },
                  substituteFood: { type: 'string' },
                  reason: { type: 'string' },
                  nutritionalComparison: { type: 'string' },
                  confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
                  allergyWarning: { type: 'string' },
                },
                required: ['originalFood', 'substituteFood', 'reason', 'confidence'],
              },
            },
            warnings: { type: 'array', items: { type: 'string' } },
            followUpQuestions: { type: 'array', items: { type: 'string' } },
            requiresProfessionalReview: { type: 'boolean' },
          },
          required: ['answer', 'responseType', 'confidence', 'requiresProfessionalReview'],
        },
        status: 'ACTIVE',
      },
      {
        organisationId: null,
        feature: 'DAILY_CHECKIN',
        key: 'daily_checkin.v1',
        version: 1,
        systemPrompt:
          'You are the FitCore AI Daily Intelligence Assistant.\nYou synthesize the member\'s daily check-in responses, training schedule, progress, and nutrition summaries into a personalized, grounded daily briefing.\nCRITICAL SAFETY & OPERATIONAL DIRECTIVES:\n1. You are a fitness and wellness planning assistant, NOT a medical doctor, physical therapist, or diagnostic clinician.\n2. Readiness is strictly a TRAINING-PLANNING INDICATOR, never claim or imply medical or clinical readiness.\n3. NEVER diagnose medical or mental health conditions, and do not provide clinical psychiatric assessment.\n4. BASE ALL EVALUATIONS ON ACTUAL STORED FITCORE DATA. Never fabricate, assume, or hallucinate workouts, logs, attendance, or goals. Missing data must be treated as unrecorded.\n5. PROTECT TRAINER-ASSIGNED PROGRAMS: Do not change sets, reps, load, or exercises prescribed by a personal trainer. If member has high fatigue/soreness, advise them to discuss adjustments with their trainer.\n6. ZERO AUTONOMOUS ACTIONS: You cannot modify workouts, bookings, nutrition targets, or memberships.\n7. Provide structured output conforming strictly to the DailyCheckInResponse schema.',
        developerPrompt:
          'Ensure output conforms strictly to DailyCheckInResponse schema with summary, checkInInterpretation, readinessFraming, todayFocus, recommendations (3-5 items max), caution, escalation, suggestedNextAction, coachHandoff, and sourceSummary.',
        outputSchema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            checkInInterpretation: { type: 'string' },
            readinessFraming: { type: 'string' },
            todayFocus: { type: 'string' },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: [
                      'TRAINING',
                      'RECOVERY',
                      'NUTRITION',
                      'HYDRATION',
                      'CONSISTENCY',
                      'GOAL',
                      'ATTENDANCE',
                      'ENGAGEMENT',
                      'SUPPORT',
                    ],
                  },
                  title: { type: 'string' },
                  explanation: { type: 'string' },
                  priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
                  relatedDomain: {
                    type: 'string',
                    enum: ['TRAINING', 'NUTRITION', 'PROGRESS', 'RECOVERY', 'WELLNESS'],
                  },
                  suggestedAction: {
                    type: 'object',
                    properties: {
                      action: {
                        type: 'string',
                        enum: [
                          'VIEW_WORKOUT',
                          'VIEW_NUTRITION',
                          'VIEW_GOALS',
                          'VIEW_COACH',
                          'VIEW_ATTENDANCE',
                        ],
                      },
                      label: { type: 'string' },
                      params: { type: 'object' },
                    },
                    required: ['action', 'label'],
                  },
                },
                required: ['type', 'title', 'explanation', 'priority', 'relatedDomain'],
              },
            },
            caution: { type: 'string' },
            escalation: {
              type: 'object',
              properties: {
                severity: { type: 'string', enum: ['CAUTION', 'RECOMMEND_PROFESSIONAL', 'URGENT_ESCALATION'] },
                category: { type: 'string' },
                guidance: { type: 'string' },
                helplineOrReferral: { type: 'string' },
              },
              required: ['severity', 'category', 'guidance'],
            },
            suggestedNextAction: { type: 'string' },
            coachHandoff: {
              type: 'object',
              properties: {
                recommendedCoach: { type: 'string', enum: ['FITNESS_COACH', 'NUTRITION_COACH', 'NONE'] },
                reason: { type: 'string' },
                suggestedPrompt: { type: 'string' },
              },
              required: ['recommendedCoach'],
            },
            sourceSummary: {
              type: 'object',
              properties: {
                used: { type: 'array', items: { type: 'string' } },
                excluded: { type: 'array', items: { type: 'string' } },
              },
              required: ['used', 'excluded'],
            },
          },
          required: [
            'summary',
            'checkInInterpretation',
            'readinessFraming',
            'todayFocus',
            'recommendations',
          ],
        },
        status: 'ACTIVE',
      },
      WEARABLE_INTELLIGENCE_PROMPT_DEFINITION,
      ENGAGEMENT_INTELLIGENCE_PROMPT_DEFINITION,
      RETENTION_INTELLIGENCE_PROMPT_DEFINITION,
      REACTIVATION_PROMPT_DEFINITION,
      RETENTION_AGENT_PROMPT_DEFINITION,
      RECEPTIONIST_PROMPT_DEFINITION,
      RECEPTIONIST_BOOKING_PROMPT_DEFINITION,
      LEAD_QUALIFICATION_PROMPT_DEFINITION,
      SALES_AGENT_PROMPT_DEFINITION,
      FOLLOW_UP_MESSAGE_PROMPT_DEFINITION,
      SALES_INTELLIGENCE_PROMPT_DEFINITION,
    ];

    for (const p of defaultPrompts) {
      const existing = await this.prisma.aIPrompt.findFirst({
        where: {
          organisationId: null,
          feature: p.feature,
          key: p.key,
          version: p.version,
        },
      });

      if (!existing) {
        await this.prisma.aIPrompt.create({
          data: {
            organisationId: null,
            feature: p.feature,
            key: p.key,
            version: p.version,
            systemPrompt: p.systemPrompt,
            developerPrompt: p.developerPrompt,
            outputSchema: p.outputSchema,
            status: p.status,
          },
        });
      }
    }

    this.logger.log('Default AI prompts verified.');
  }

  /**
   * Resolves the best active prompt:
   * 1. Org-custom prompt matching (feature, key) with highest active version
   * 2. Platform default system prompt matching (feature, key) with highest active version
   */
  async resolvePrompt(organisationId: string, feature: AIFeature, key: string = 'default', version?: number) {
    const effectiveKey =
      key === 'default' && feature === 'FITNESS_COACH'
        ? 'fitness_coach.v1'
        : key === 'default' && feature === 'NUTRITION_COACH'
        ? 'nutrition_coach.v1'
        : key === 'default' && feature === 'DAILY_CHECKIN'
        ? 'daily_checkin.v1'
        : key === 'default' && feature === 'WEARABLE_INTELLIGENCE'
        ? 'wearable_intelligence.v1'
        : key === 'default' && feature === 'ENGAGEMENT_INTELLIGENCE'
        ? 'engagement_intelligence.v1'
        : key === 'default' && feature === 'RETENTION_INTELLIGENCE'
        ? 'retention_intelligence.v1'
        : key === 'default' && feature === 'AI_REACTIVATION'
        ? 'reactivation.v1'
        : key === 'default' && feature === 'RETENTION_AGENT'
        ? 'retention_agent.v1'
        : key === 'default' && feature === 'RECEPTIONIST'
        ? 'receptionist.v1'
        : key === 'default' && feature === 'AI_LEAD_QUALIFICATION'
        ? 'lead_qualification.v1'
        : key === 'default' && feature === 'SALES_AGENT'
        ? 'sales_agent.v1'
        : key === 'default' && feature === 'FOLLOW_UP_MESSAGE'
        ? 'follow_up_message.v1'
        : key === 'default' && feature === 'SALES_INTELLIGENCE'
        ? 'sales_intelligence.v1'
        : key;

    if (version) {
      // Specific version requested
      const specific = await this.prisma.aIPrompt.findFirst({
        where: {
          feature,
          key: effectiveKey,
          version,
          status: 'ACTIVE',
          OR: [{ organisationId }, { organisationId: null }],
        },
        orderBy: { organisationId: 'desc' }, // Org-specific first
      });

      if (specific) return specific;
    }

    // Highest version org-specific
    const orgPrompt = await this.prisma.aIPrompt.findFirst({
      where: {
        organisationId,
        feature,
        key: effectiveKey,
        status: 'ACTIVE',
      },
      orderBy: { version: 'desc' },
    });

    if (orgPrompt) return orgPrompt;

    // Highest version system default
    const systemPrompt = await this.prisma.aIPrompt.findFirst({
      where: {
        organisationId: null,
        feature,
        key: effectiveKey,
        status: 'ACTIVE',
      },
      orderBy: { version: 'desc' },
    });

    if (systemPrompt) return systemPrompt;

    // Fallback stub if database not populated
    return {
      id: 'fallback_stub',
      organisationId: null,
      feature,
      key,
      version: 1,
      systemPrompt: 'You are an intelligent fitness and gym assistant on the FitCore platform.',
      developerPrompt: undefined,
      outputSchema: undefined,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async createPrompt(organisationId: string | null, dto: CreateAIPromptDto) {
    // Find next version if not provided
    let version = dto.version ?? 1;
    const latest = await this.prisma.aIPrompt.findFirst({
      where: {
        organisationId,
        feature: dto.feature,
        key: dto.key,
      },
      orderBy: { version: 'desc' },
    });

    if (latest && !dto.version) {
      version = latest.version + 1;
    }

    return this.prisma.aIPrompt.create({
      data: {
        organisationId,
        feature: dto.feature,
        key: dto.key,
        version,
        systemPrompt: dto.systemPrompt,
        developerPrompt: dto.developerPrompt,
        outputSchema: dto.outputSchema,
        status: dto.status ?? 'ACTIVE',
      },
    });
  }

  async listPrompts(organisationId?: string, feature?: string) {
    return this.prisma.aIPrompt.findMany({
      where: {
        ...(feature ? { feature } : {}),
        ...(organisationId !== undefined ? { organisationId } : {}),
      },
      orderBy: [{ feature: 'asc' }, { key: 'asc' }, { version: 'desc' }],
    });
  }
}
