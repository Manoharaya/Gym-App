import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { BodyMeasurementService } from './body-measurement.service';
import {
  CreateAssessmentTemplateDto,
  CreateAssessmentDto,
} from '../dto/progress.dto';

export const SYSTEM_ASSESSMENT_TEMPLATES = [
  {
    name: '3RM Back Squat',
    slug: '3rm-back-squat',
    category: 'STRENGTH',
    metricType: 'WEIGHT',
    defaultUnit: 'kg',
    description: '3-Repetition Maximum Barbell Back Squat test to assess lower-body maximal strength.',
    instructions: 'Perform warm-up sets, then attempt highest load completed with full depth for 3 consecutive reps.',
  },
  {
    name: 'Push-Up Test',
    slug: 'push-up-test',
    category: 'STRENGTH',
    metricType: 'REPETITIONS',
    defaultUnit: 'reps',
    description: 'Continuous maximal push-up test for upper-body muscular endurance.',
    instructions: 'Complete as many continuous, strict push-ups as possible until failure.',
  },
  {
    name: '1 km Run Test',
    slug: '1km-run-test',
    category: 'CARDIO',
    metricType: 'TIME',
    defaultUnit: 'sec',
    description: '1000m running time trial assessing aerobic capacity and speed endurance.',
    instructions: 'Run 1000 meters on a track or treadmill as fast as possible. Record elapsed time in seconds.',
  },
  {
    name: '5 km Run Test',
    slug: '5km-run-test',
    category: 'CARDIO',
    metricType: 'TIME',
    defaultUnit: 'min',
    description: '5 kilometer outdoor or treadmill run assessing sustained aerobic endurance.',
    instructions: 'Complete 5 kilometers at maximum sustainable pace.',
  },
  {
    name: 'Plank Hold Test',
    slug: 'plank-hold-test',
    category: 'ENDURANCE',
    metricType: 'TIME',
    defaultUnit: 'sec',
    description: 'Isometric prone forearm plank hold to failure assessing core endurance.',
    instructions: 'Maintain a rigid straight-line plank position. Stop test when hips sag or break position.',
  },
  {
    name: 'Sit-and-Reach',
    slug: 'sit-and-reach',
    category: 'FLEXIBILITY',
    metricType: 'DISTANCE',
    defaultUnit: 'cm',
    description: 'Standardized sit-and-reach test assessing hamstring and lower back flexibility.',
    instructions: 'Sit with legs extended, reach forward along the measuring box without bouncing.',
  },
  {
    name: 'Resting Heart Rate',
    slug: 'resting-heart-rate',
    category: 'CARDIO',
    metricType: 'SCORE',
    defaultUnit: 'bpm',
    description: 'Resting heart rate measured after 5 minutes of seated rest.',
    instructions: 'Remain still and seated for 5 minutes, record pulse for 60 seconds.',
  },
  {
    name: 'Body Composition (Caliper)',
    slug: 'body-composition-caliper',
    category: 'BODY_COMPOSITION',
    metricType: 'PERCENTAGE',
    defaultUnit: '%',
    description: 'Multi-site skinfold assessment estimating body fat percentage.',
    instructions: 'Use calibrated calipers at standard Jackson-Pollock 3 or 7 site locations.',
  },
];

@Injectable()
export class FitnessAssessmentService {
  private readonly logger = new Logger(FitnessAssessmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly measurementService: BodyMeasurementService,
  ) {}

  /**
   * Seeds system assessment templates if not already present.
   */
  async ensureSystemTemplates() {
    for (const template of SYSTEM_ASSESSMENT_TEMPLATES) {
      const existing = await this.prisma.assessmentTemplate.findFirst({
        where: { slug: template.slug, organisationId: null },
      });
      if (!existing) {
        await this.prisma.assessmentTemplate.create({
          data: {
            organisationId: null,
            name: template.name,
            slug: template.slug,
            category: template.category,
            metricType: template.metricType,
            defaultUnit: template.defaultUnit,
            description: template.description,
            instructions: template.instructions,
            active: true,
          },
        });
      }
    }
  }

  /**
   * Retrieves available assessment templates (system templates + organisation custom templates).
   */
  async getTemplates(organisationId: string) {
    await this.ensureSystemTemplates();

    return this.prisma.assessmentTemplate.findMany({
      where: {
        OR: [{ organisationId: null }, { organisationId }],
        active: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Creates a custom organisation-level assessment template.
   */
  async createCustomTemplate(
    organisationId: string,
    dto: CreateAssessmentTemplateDto,
    actor: AuthenticatedUser,
  ) {
    // Only trainers, managers, or org owners can create templates
    const canCreate = actor.isSuperAdmin || actor.roles?.some((r) =>
      ['ORGANISATION_OWNER', 'OUTLET_MANAGER', 'TRAINER'].includes(r.role),
    );

    if (!canCreate) {
      throw new ForbiddenException({
        code: 'TEMPLATE_CREATION_DENIED',
        message: 'Only trainers or staff can create custom assessment templates',
      });
    }

    const slug = dto.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const template = await this.prisma.assessmentTemplate.create({
      data: {
        organisationId,
        name: dto.name,
        slug: `${slug}-${Date.now().toString(36)}`,
        category: dto.category,
        metricType: dto.metricType,
        description: dto.description,
        instructions: dto.instructions,
        defaultUnit: dto.defaultUnit,
        scoringProtocol: dto.scoringProtocol,
        targetGender: dto.targetGender,
        targetAgeRange: dto.targetAgeRange,
        active: true,
      },
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'ASSESSMENT_TEMPLATE_CREATED',
      resource: 'assessment_templates',
      resourceId: template.id,
      metadata: { name: template.name, category: template.category },
    });

    return template;
  }

  /**
   * Records or completes an assessment for a member with structured typed results.
   */
  async recordAssessment(
    organisationId: string,
    memberProfileId: string,
    dto: CreateAssessmentDto,
    actor: AuthenticatedUser,
  ) {
    await this.measurementService.assertProgressAccess(organisationId, memberProfileId, actor);

    let trainerProfileId = dto.trainerProfileId;
    if (!trainerProfileId && actor.roles?.some((r) => r.role === 'TRAINER')) {
      const trainer = await this.prisma.trainerProfile.findFirst({
        where: { staffProfile: { userId: actor.id }, organisationId },
      });
      if (trainer) {
        trainerProfileId = trainer.id;
      }
    }

    const completedAt = dto.completedAt ? new Date(dto.completedAt) : new Date();

    const assessment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.assessment.create({
        data: {
          organisationId,
          outletId: dto.outletId,
          memberProfileId,
          trainerProfileId,
          templateId: dto.templateId,
          title: dto.title,
          category: dto.category,
          status: dto.status || 'COMPLETED',
          scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
          completedAt: (dto.status || 'COMPLETED') === 'COMPLETED' ? completedAt : null,
          notes: dto.notes,
          summaryScore: dto.summaryScore,
        },
      });

      if (dto.results && dto.results.length > 0) {
        for (const item of dto.results) {
          await tx.assessmentResult.create({
            data: {
              assessmentId: created.id,
              metricName: item.metricName,
              value: item.value,
              unit: item.unit,
              textValue: item.textValue,
              rating: item.rating,
              score: item.score,
              repetitions: item.repetitions,
              weight: item.weight,
              distance: item.distance,
              durationSeconds: item.durationSeconds,
              percentage: item.percentage,
              booleanResult: item.booleanResult,
              notes: item.notes,
            },
          });
        }
      }

      return tx.assessment.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          template: true,
          results: true,
          trainerProfile: {
            include: { staffProfile: { include: { user: true } } },
          },
        },
      });
    });

    await this.auditService.log({
      organisationId,
      userId: actor.id,
      action: 'ASSESSMENT_RECORDED',
      resource: 'assessments',
      resourceId: assessment.id,
      metadata: {
        memberProfileId,
        category: assessment.category,
        title: assessment.title,
        status: assessment.status,
      },
    });

    return assessment;
  }

  /**
   * Retrieves assessments for a member with results and historical progression.
   */
  async getMemberAssessments(
    organisationId: string,
    memberProfileId: string,
    actor: AuthenticatedUser,
    categoryFilter?: string,
  ) {
    await this.measurementService.assertProgressAccess(organisationId, memberProfileId, actor);

    return this.prisma.assessment.findMany({
      where: {
        organisationId,
        memberProfileId,
        ...(categoryFilter ? { category: categoryFilter } : {}),
      },
      include: {
        template: true,
        results: true,
        trainerProfile: {
          include: { staffProfile: { include: { user: true } } },
        },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  /**
   * Compares the latest assessment with previous assessment of same template/title.
   */
  async getAssessmentComparison(
    organisationId: string,
    assessmentId: string,
    actor: AuthenticatedUser,
  ) {
    const current = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, organisationId },
      include: { template: true, results: true },
    });

    if (!current) {
      throw new NotFoundException({
        code: 'ASSESSMENT_NOT_FOUND',
        message: `Assessment '${assessmentId}' not found`,
      });
    }

    await this.measurementService.assertProgressAccess(
      organisationId,
      current.memberProfileId,
      actor,
    );

    // Find previous assessment
    const previous = await this.prisma.assessment.findFirst({
      where: {
        organisationId,
        memberProfileId: current.memberProfileId,
        id: { not: current.id },
        status: 'COMPLETED',
        completedAt: { lt: current.completedAt || new Date() },
        OR: [
          current.templateId ? { templateId: current.templateId } : { title: current.title },
          { category: current.category },
        ],
      },
      include: { results: true },
      orderBy: { completedAt: 'desc' },
    });

    return {
      current,
      previous: previous || null,
      hasImprovement: previous && current.summaryScore && previous.summaryScore
        ? current.summaryScore > previous.summaryScore
        : null,
    };
  }
}
