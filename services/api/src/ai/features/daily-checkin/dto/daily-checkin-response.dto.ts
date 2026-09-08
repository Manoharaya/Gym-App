import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DailyCheckInStatus,
  DailyReadinessCategory,
  DailyRecommendationType,
  EnergyLevel,
  WellbeingMood,
  SleepQuality,
  SorenessLevel,
  StressLevel,
  MotivationLevel,
} from '../domain/daily-checkin.enums';

export class DailyRecommendationItemDto {
  @ApiProperty({ enum: DailyRecommendationType })
  type: DailyRecommendationType;

  @ApiProperty({ example: 'Complete Scheduled Session' })
  title: string;

  @ApiProperty({ example: 'Your readiness signals align well with today\'s upper body hypertrophy session.' })
  explanation: string;

  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH'], example: 'HIGH' })
  priority: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiProperty({ enum: ['TRAINING', 'NUTRITION', 'PROGRESS', 'RECOVERY', 'WELLNESS'], example: 'TRAINING' })
  relatedDomain: 'TRAINING' | 'NUTRITION' | 'PROGRESS' | 'RECOVERY' | 'WELLNESS';

  @ApiPropertyOptional()
  suggestedAction?: {
    action: string;
    label: string;
    params?: Record<string, any>;
  };
}

export class DailyCheckInResponseDto {
  @ApiProperty({ example: 'dci_clx123abc' })
  id: string;

  @ApiProperty({ example: 'org_123' })
  organisationId: string;

  @ApiProperty({ example: 'mem_123' })
  memberId: string;

  @ApiProperty({ example: '2026-09-07' })
  checkInDate: string;

  @ApiProperty({ enum: DailyCheckInStatus, example: DailyCheckInStatus.COMPLETED })
  status: DailyCheckInStatus;

  @ApiPropertyOptional()
  completedAt?: string | null;

  @ApiPropertyOptional({ enum: EnergyLevel })
  energyLevel?: EnergyLevel | null;

  @ApiPropertyOptional({ enum: WellbeingMood })
  wellbeingMood?: WellbeingMood | null;

  @ApiPropertyOptional({ enum: SleepQuality })
  sleepQuality?: SleepQuality | null;

  @ApiPropertyOptional()
  sleepDurationMinutes?: number | null;

  @ApiPropertyOptional({ enum: SorenessLevel })
  sorenessLevel?: SorenessLevel | null;

  @ApiPropertyOptional({ enum: StressLevel })
  stressLevel?: StressLevel | null;

  @ApiPropertyOptional({ enum: MotivationLevel })
  motivationLevel?: MotivationLevel | null;

  @ApiPropertyOptional()
  yesterdayWorkoutCompleted?: boolean | null;

  @ApiPropertyOptional()
  notes?: string | null;

  // Deterministic Readiness
  @ApiPropertyOptional({ example: 85, description: 'Deterministic 0-100 planning score' })
  readinessScore?: number | null;

  @ApiPropertyOptional({ enum: DailyReadinessCategory, example: DailyReadinessCategory.OPTIMAL })
  readinessCategory?: DailyReadinessCategory | null;

  @ApiPropertyOptional()
  readinessDetails?: any | null;

  @ApiPropertyOptional({ example: ['TRAINING_CONSISTENCY_IMPROVING'] })
  detectedTrends?: string[];

  // Structured AI Insights
  @ApiPropertyOptional({ example: 'Strong recovery and solid sleep foundation for today.' })
  aiSummary?: string | null;

  @ApiPropertyOptional()
  aiCheckInInterpretation?: string | null;

  @ApiPropertyOptional()
  aiReadinessFraming?: string | null;

  @ApiPropertyOptional({ example: 'Upper Body Hypertrophy & Target Hydration' })
  aiTodayFocus?: string | null;

  @ApiPropertyOptional({ type: [DailyRecommendationItemDto] })
  aiRecommendations?: DailyRecommendationItemDto[] | null;

  @ApiPropertyOptional()
  aiCaution?: string | null;

  @ApiPropertyOptional()
  aiEscalation?: any | null;

  @ApiProperty({ example: false })
  safetyFlagged: boolean;

  @ApiPropertyOptional()
  suggestedNextAction?: string | null;

  @ApiPropertyOptional()
  coachHandoff?: {
    recommendedCoach: 'FITNESS_COACH' | 'NUTRITION_COACH' | 'NONE';
    reason?: string;
    suggestedPrompt?: string;
  };

  @ApiPropertyOptional()
  sourceSummary?: {
    used: string[];
    excluded: string[];
  } | null;

  @ApiProperty({ example: '2026-09-07T08:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-07T08:00:05.000Z' })
  updatedAt: string;
}
