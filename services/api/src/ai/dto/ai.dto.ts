import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AIFeature,
  AIModelCapability,
  AIModelStatus,
  AIPromptStatus,
  AIFeedbackRating,
  AIProvider,
} from '@fitcore/types';

export class CreateAIModelDto {
  @IsString()
  @IsNotEmpty()
  provider!: AIProvider;

  @IsString()
  @IsNotEmpty()
  modelKey!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsArray()
  @IsString({ each: true })
  capabilities!: AIModelCapability[];

  @IsInt()
  @Min(1)
  @IsOptional()
  contextWindow?: number = 128000;

  @IsInt()
  @Min(0)
  @IsOptional()
  inputCostPer1M?: number = 0;

  @IsInt()
  @Min(0)
  @IsOptional()
  outputCostPer1M?: number = 0;

  @IsString()
  @IsOptional()
  status?: AIModelStatus = 'ACTIVE';

  @IsOptional()
  configuration?: Record<string, any>;
}

export class UpdateAIModelDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  capabilities?: AIModelCapability[];

  @IsInt()
  @Min(1)
  @IsOptional()
  contextWindow?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  inputCostPer1M?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  outputCostPer1M?: number;

  @IsString()
  @IsOptional()
  status?: AIModelStatus;

  @IsOptional()
  configuration?: Record<string, any>;
}

export class UpdateAIFeatureConfigDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsString()
  @IsOptional()
  modelId?: string | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  dailyLimit?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  monthlyLimit?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedRoles?: string[];

  @IsOptional()
  configuration?: Record<string, any>;
}

export class CreateAIPromptDto {
  @IsString()
  @IsNotEmpty()
  feature!: AIFeature;

  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  version?: number = 1;

  @IsString()
  @IsNotEmpty()
  systemPrompt!: string;

  @IsString()
  @IsOptional()
  developerPrompt?: string;

  @IsOptional()
  outputSchema?: Record<string, any>;

  @IsString()
  @IsOptional()
  status?: AIPromptStatus = 'ACTIVE';
}

export class AITestRequestDto {
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @IsString()
  @IsOptional()
  feature?: AIFeature = 'AI_PLATFORM_TEST';

  @IsString()
  @IsOptional()
  modelId?: string;

  @IsString()
  @IsOptional()
  systemInstruction?: string;

  @IsOptional()
  temperature?: number = 0.7;

  @IsInt()
  @Min(1)
  @Max(4096)
  @IsOptional()
  maxTokens?: number = 1000;

  @IsString()
  @IsOptional()
  responseFormat?: 'text' | 'json' = 'text';

  @IsOptional()
  expectedSchema?: Record<string, any>;
}

export class SubmitAIFeedbackDto {
  @IsString()
  @IsNotEmpty()
  aiResponseId!: string;

  @IsString()
  @IsNotEmpty()
  rating!: AIFeedbackRating;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class AIUsageQueryDto {
  @IsString()
  @IsOptional()
  from?: string;

  @IsString()
  @IsOptional()
  to?: string;

  @IsString()
  @IsOptional()
  feature?: AIFeature;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  memberId?: string;

  @IsString()
  @IsOptional()
  outletId?: string;
}
