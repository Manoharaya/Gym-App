import { Injectable, Logger, OnModuleInit, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAIModelDto, UpdateAIModelDto } from '../dto/ai.dto';
import { AIModelCapability, AIModelStatus } from '@fitcore/types';

@Injectable()
export class ModelRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ModelRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultModels();
  }

  async seedDefaultModels(): Promise<void> {
    const defaultModels = [
      {
        provider: 'DEVELOPMENT',
        modelKey: 'dev-test-model',
        displayName: 'FitCore Development Model',
        capabilities: ['TEXT_GENERATION', 'STRUCTURED_OUTPUT', 'TOOL_USE'],
        contextWindow: 128000,
        inputCostPer1M: 0,
        outputCostPer1M: 0,
        status: 'ACTIVE',
      },
      {
        provider: 'OPENAI',
        modelKey: 'gpt-4o-mini',
        displayName: 'OpenAI GPT-4o Mini',
        capabilities: ['TEXT_GENERATION', 'STRUCTURED_OUTPUT', 'VISION', 'TOOL_USE'],
        contextWindow: 128000,
        inputCostPer1M: 15,
        outputCostPer1M: 60,
        status: 'ACTIVE',
      },
      {
        provider: 'OPENAI',
        modelKey: 'gpt-4o',
        displayName: 'OpenAI GPT-4o',
        capabilities: ['TEXT_GENERATION', 'STRUCTURED_OUTPUT', 'VISION', 'TOOL_USE', 'LONG_CONTEXT'],
        contextWindow: 128000,
        inputCostPer1M: 250,
        outputCostPer1M: 1000,
        status: 'ACTIVE',
      },
      {
        provider: 'ANTHROPIC',
        modelKey: 'claude-3-5-sonnet',
        displayName: 'Anthropic Claude 3.5 Sonnet',
        capabilities: ['TEXT_GENERATION', 'STRUCTURED_OUTPUT', 'VISION', 'TOOL_USE', 'LONG_CONTEXT'],
        contextWindow: 200000,
        inputCostPer1M: 300,
        outputCostPer1M: 1500,
        status: 'ACTIVE',
      },
      {
        provider: 'GOOGLE',
        modelKey: 'gemini-1.5-flash',
        displayName: 'Google Gemini 1.5 Flash',
        capabilities: ['TEXT_GENERATION', 'STRUCTURED_OUTPUT', 'VISION', 'TOOL_USE', 'LONG_CONTEXT'],
        contextWindow: 1000000,
        inputCostPer1M: 8,
        outputCostPer1M: 30,
        status: 'ACTIVE',
      },
    ];

    for (const model of defaultModels) {
      const existing = await this.prisma.aIModel.findUnique({
        where: { modelKey: model.modelKey },
      });

      if (!existing) {
        await this.prisma.aIModel.create({
          data: {
            provider: model.provider,
            modelKey: model.modelKey,
            displayName: model.displayName,
            capabilities: model.capabilities,
            contextWindow: model.contextWindow,
            inputCostPer1M: model.inputCostPer1M,
            outputCostPer1M: model.outputCostPer1M,
            status: model.status,
          },
        });
      }
    }

    this.logger.log('Default AI models verified.');
  }

  async listModels(provider?: string, status: string = 'ACTIVE') {
    return this.prisma.aIModel.findMany({
      where: {
        ...(provider ? { provider: provider.toUpperCase() } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { inputCostPer1M: 'asc' },
    });
  }

  async getModelById(id: string) {
    const model = await this.prisma.aIModel.findUnique({ where: { id } });
    if (!model) throw new NotFoundException(`AI Model '${id}' not found`);
    return model;
  }

  async getModelByKey(modelKey: string) {
    const model = await this.prisma.aIModel.findUnique({ where: { modelKey } });
    if (!model) throw new NotFoundException(`AI Model with key '${modelKey}' not found`);
    return model;
  }

  async createModel(dto: CreateAIModelDto) {
    const existing = await this.prisma.aIModel.findUnique({
      where: { modelKey: dto.modelKey },
    });
    if (existing) {
      throw new ConflictException(`AI Model with key '${dto.modelKey}' already exists`);
    }

    return this.prisma.aIModel.create({
      data: {
        provider: dto.provider,
        modelKey: dto.modelKey,
        displayName: dto.displayName,
        capabilities: dto.capabilities,
        contextWindow: dto.contextWindow ?? 128000,
        inputCostPer1M: dto.inputCostPer1M ?? 0,
        outputCostPer1M: dto.outputCostPer1M ?? 0,
        status: dto.status ?? 'ACTIVE',
        configuration: dto.configuration,
      },
    });
  }

  async updateModel(id: string, dto: UpdateAIModelDto) {
    await this.getModelById(id);
    return this.prisma.aIModel.update({
      where: { id },
      data: {
        ...(dto.displayName ? { displayName: dto.displayName } : {}),
        ...(dto.capabilities ? { capabilities: dto.capabilities } : {}),
        ...(dto.contextWindow !== undefined ? { contextWindow: dto.contextWindow } : {}),
        ...(dto.inputCostPer1M !== undefined ? { inputCostPer1M: dto.inputCostPer1M } : {}),
        ...(dto.outputCostPer1M !== undefined ? { outputCostPer1M: dto.outputCostPer1M } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.configuration ? { configuration: dto.configuration } : {}),
      },
    });
  }
}
