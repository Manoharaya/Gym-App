import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAIPromptDto } from '../dto/ai.dto';
import { AIFeature, AIPromptStatus } from '@fitcore/types';

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
    const effectiveKey = key === 'default' && feature === 'FITNESS_COACH' ? 'fitness_coach.v1' : key;

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
