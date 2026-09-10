import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePipelineDto } from '../dto/sales-pipeline.dto';
import {
  CANONICAL_STAGE_DEFINITIONS,
} from '../domain/sales-stage.constants';

@Injectable()
export class SalesPipelineService {
  private readonly logger = new Logger(SalesPipelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves or automatically seeds the default Sales Pipeline for an organisation.
   */
  async getOrCreateDefaultPipeline(organisationId: string, outletId?: string) {
    // 1. Check if outlet-specific default pipeline exists
    if (outletId) {
      const outletPipeline = await this.prisma.salesPipeline.findFirst({
        where: {
          organisationId,
          outletId,
          isDefault: true,
        },
        include: {
          stages: {
            orderBy: { position: 'asc' },
          },
        },
      });
      if (outletPipeline) return outletPipeline;
    }

    // 2. Check if organization-wide default exists
    let pipeline = await this.prisma.salesPipeline.findFirst({
      where: {
        organisationId,
        isDefault: true,
      },
      include: {
        stages: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (pipeline) return pipeline;

    // 3. Check if standard pipeline exists by name
    pipeline = await this.prisma.salesPipeline.findFirst({
      where: {
        organisationId,
        name: 'Standard Sales Pipeline',
      },
      include: {
        stages: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (pipeline) return pipeline;

    this.logger.log(
      `No default pipeline found for organisation ${organisationId}. Seeding canonical pipeline...`,
    );
    return this.seedDefaultPipeline(organisationId, outletId);
  }

  /**
   * Seeds default pipeline with all 8 canonical stages in an atomic transaction.
   */
  async seedDefaultPipeline(organisationId: string, outletId?: string) {
    const existing = await this.prisma.salesPipeline.findFirst({
      where: {
        organisationId,
        name: 'Standard Sales Pipeline',
      },
      include: {
        stages: {
          orderBy: { position: 'asc' },
        },
      },
    });
    if (existing) return existing;

    return this.prisma.$transaction(async (tx) => {
      // Create pipeline record
      const created = await tx.salesPipeline.create({
        data: {
          organisationId,
          outletId: outletId || null,
          name: 'Standard Sales Pipeline',
          isDefault: true,
        },
      });

      // Insert all 8 canonical stages
      const stagesData = Object.values(CANONICAL_STAGE_DEFINITIONS).map((def) => ({
        pipelineId: created.id,
        type: def.stage,
        name: def.displayName,
        description: def.description,
        position: def.order,
        color: def.color,
        isTerminal: def.isTerminal,
      }));

      await tx.salesPipelineStage.createMany({
        data: stagesData,
      });

      return tx.salesPipeline.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          stages: {
            orderBy: { position: 'asc' },
          },
        },
      });
    });
  }

  /**
   * Creates a custom pipeline (if requested).
   */
  async createPipeline(organisationId: string, dto: CreatePipelineDto) {
    if (dto.isDefault) {
      // Unset previous default in this scope
      await this.prisma.salesPipeline.updateMany({
        where: {
          organisationId,
          ...(dto.outletId ? { outletId: dto.outletId } : {}),
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.salesPipeline.create({
        data: {
          organisationId,
          outletId: dto.outletId || null,
          name: dto.name,
          isDefault: dto.isDefault ?? false,
        },
      });

      // Seed standard stages for the new pipeline
      const stagesData = Object.values(CANONICAL_STAGE_DEFINITIONS).map((def) => ({
        pipelineId: created.id,
        type: def.stage,
        name: def.displayName,
        description: def.description,
        position: def.order,
        color: def.color,
        isTerminal: def.isTerminal,
      }));

      await tx.salesPipelineStage.createMany({
        data: stagesData,
      });

      return tx.salesPipeline.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          stages: {
            orderBy: { position: 'asc' },
          },
        },
      });
    });
  }

  /**
   * List all pipelines for an organisation.
   */
  async listPipelines(organisationId: string, outletId?: string) {
    return this.prisma.salesPipeline.findMany({
      where: {
        organisationId,
        ...(outletId ? { outletId } : {}),
      },
      include: {
        stages: {
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { opportunities: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Retrieve a single pipeline.
   */
  async getPipeline(organisationId: string, pipelineId: string) {
    const pipeline = await this.prisma.salesPipeline.findFirst({
      where: {
        id: pipelineId,
        organisationId,
      },
      include: {
        stages: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!pipeline) {
      throw new NotFoundException(`Sales Pipeline with ID ${pipelineId} not found.`);
    }

    return pipeline;
  }
}
