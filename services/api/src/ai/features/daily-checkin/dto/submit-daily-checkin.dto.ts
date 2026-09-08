import {
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EnergyLevel,
  WellbeingMood,
  SleepQuality,
  SorenessLevel,
  StressLevel,
  MotivationLevel,
} from '../domain/daily-checkin.enums';

export class SubmitDailyCheckInDto {
  @ApiProperty({
    enum: EnergyLevel,
    description: 'Self-reported energy level',
    example: EnergyLevel.GOOD,
  })
  @IsEnum(EnergyLevel)
  energyLevel: EnergyLevel;

  @ApiProperty({
    enum: WellbeingMood,
    description: 'Self-reported general wellbeing / mood (non-psychiatric fitness signal)',
    example: WellbeingMood.GOOD,
  })
  @IsEnum(WellbeingMood)
  wellbeingMood: WellbeingMood;

  @ApiProperty({
    enum: SleepQuality,
    description: 'Self-reported sleep quality',
    example: SleepQuality.GOOD,
  })
  @IsEnum(SleepQuality)
  sleepQuality: SleepQuality;

  @ApiPropertyOptional({
    description: 'Estimated sleep duration in minutes',
    example: 480,
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(1440)
  sleepDurationMinutes?: number;

  @ApiProperty({
    enum: SorenessLevel,
    description: 'Self-reported muscular soreness level',
    example: SorenessLevel.MILD,
  })
  @IsEnum(SorenessLevel)
  sorenessLevel: SorenessLevel;

  @ApiProperty({
    enum: StressLevel,
    description: 'Self-reported perceived stress level',
    example: StressLevel.LOW,
  })
  @IsEnum(StressLevel)
  stressLevel: StressLevel;

  @ApiProperty({
    enum: MotivationLevel,
    description: 'Self-reported motivation level',
    example: MotivationLevel.HIGH,
  })
  @IsEnum(MotivationLevel)
  motivationLevel: MotivationLevel;

  @ApiPropertyOptional({
    description: 'Whether the member completed yesterday\'s scheduled workout',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  yesterdayWorkoutCompleted?: boolean;

  @ApiPropertyOptional({
    description: 'Optional notes regarding factors affecting today\'s training (untrusted input)',
    example: 'Shoulders feeling slightly tight from yesterday\'s overhead press.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Client timezone',
    example: 'Australia/Perth',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
