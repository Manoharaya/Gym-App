import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateEngagementInsightDto {
  @ApiPropertyOptional({ description: 'Optional member ID (for staff/trainer generating insight)' })
  @IsString()
  @IsOptional()
  memberId?: string;

  @ApiPropertyOptional({ description: 'Optional contextual question or focus area' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  promptQuery?: string;

  @ApiPropertyOptional({ description: 'Idempotency key for request deduplication' })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
