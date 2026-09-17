import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export const DISCOVERY_DIMENSIONS = [
  'category',
  'muscle',
  'equipment',
  'movement',
  'goal',
  'difficulty',
] as const;

export type DiscoveryDimension = (typeof DISCOVERY_DIMENSIONS)[number];

export class DiscoveryDimensionParamDto {
  @ApiProperty({
    description: 'Discovery dimension to explore',
    enum: DISCOVERY_DIMENSIONS,
  })
  @IsNotEmpty()
  @IsIn(DISCOVERY_DIMENSIONS)
  dimension: DiscoveryDimension;

  @ApiProperty({
    description: 'Dimension value/code (e.g. CHEST, DUMBBELL, PUSH, STRENGTH)',
  })
  @IsNotEmpty()
  @IsString()
  value: string;
}

export class DiscoveryRepresentativeExerciseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  difficulty?: string;
}

export class DiscoveryCategoryItemDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  group?: string;

  @ApiPropertyOptional({ type: DiscoveryRepresentativeExerciseDto })
  representativeExercise?: DiscoveryRepresentativeExerciseDto | null;
}

export class DiscoveryMuscleItemDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['UPPER_BODY', 'CORE', 'LOWER_BODY'] })
  group: 'UPPER_BODY' | 'CORE' | 'LOWER_BODY';

  @ApiProperty({ enum: ['ANTERIOR', 'POSTERIOR'] })
  region: 'ANTERIOR' | 'POSTERIOR';

  @ApiProperty()
  count: number;

  @ApiProperty()
  primaryCount: number;

  @ApiProperty()
  secondaryCount: number;

  @ApiPropertyOptional({ type: DiscoveryRepresentativeExerciseDto })
  representativeExercise?: DiscoveryRepresentativeExerciseDto | null;
}

export class DiscoveryEquipmentItemDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['FREE_WEIGHTS', 'BENCHES_SUPPORTS', 'MACHINES', 'BODYWEIGHT', 'ACCESSORIES'] })
  group: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  isNoEquipment: boolean;

  @ApiPropertyOptional({ type: DiscoveryRepresentativeExerciseDto })
  representativeExercise?: DiscoveryRepresentativeExerciseDto | null;
}

export class DiscoveryMovementItemDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  count: number;

  @ApiPropertyOptional({ type: DiscoveryRepresentativeExerciseDto })
  representativeExercise?: DiscoveryRepresentativeExerciseDto | null;
}

export class DiscoveryGoalItemDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  group: string;

  @ApiProperty()
  count: number;
}

export class DiscoveryDifficultyItemDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  level: number;
}

export class ExerciseDiscoveryOverviewResponseDto {
  @ApiProperty()
  totalExercises: number;

  @ApiProperty({ type: [DiscoveryCategoryItemDto] })
  categories: DiscoveryCategoryItemDto[];

  @ApiProperty({ type: [DiscoveryMuscleItemDto] })
  muscles: DiscoveryMuscleItemDto[];

  @ApiProperty({ type: [DiscoveryEquipmentItemDto] })
  equipment: DiscoveryEquipmentItemDto[];

  @ApiProperty({ type: [DiscoveryMovementItemDto] })
  movementPatterns: DiscoveryMovementItemDto[];

  @ApiProperty({ type: [DiscoveryGoalItemDto] })
  goals: DiscoveryGoalItemDto[];

  @ApiProperty({ type: [DiscoveryDifficultyItemDto] })
  difficulties: DiscoveryDifficultyItemDto[];
}

export class RelatedMetadataCountItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  count: number;

  @ApiPropertyOptional()
  role?: string;
}

export class PreviewExerciseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  difficulty: string;

  @ApiProperty()
  primaryMuscleGroup: string;

  @ApiProperty()
  equipment: string;

  @ApiPropertyOptional()
  movementPattern?: string | null;

  @ApiPropertyOptional()
  exerciseCategory?: string | null;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  muscleRole?: string;
}

export class ExerciseDimensionDetailResponseDto {
  @ApiProperty({ enum: DISCOVERY_DIMENSIONS })
  dimension: DiscoveryDimension;

  @ApiProperty()
  value: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  exerciseCount: number;

  @ApiPropertyOptional({ enum: ['ANTERIOR', 'POSTERIOR'] })
  region?: 'ANTERIOR' | 'POSTERIOR' | null;

  @ApiPropertyOptional()
  group?: string | null;

  @ApiPropertyOptional()
  isNoEquipment?: boolean;

  @ApiPropertyOptional()
  roles?: {
    primaryCount: number;
    secondaryCount: number;
    stabilizerCount: number;
  };

  @ApiProperty({ type: [RelatedMetadataCountItemDto] })
  relatedEquipment: RelatedMetadataCountItemDto[];

  @ApiProperty({ type: [RelatedMetadataCountItemDto] })
  relatedMuscles: RelatedMetadataCountItemDto[];

  @ApiProperty({ type: [RelatedMetadataCountItemDto] })
  relatedMovements: RelatedMetadataCountItemDto[];

  @ApiProperty({ type: [RelatedMetadataCountItemDto] })
  relatedCategories: RelatedMetadataCountItemDto[];

  @ApiProperty({ type: [RelatedMetadataCountItemDto] })
  difficultyDistribution: RelatedMetadataCountItemDto[];

  @ApiProperty({ type: [PreviewExerciseDto] })
  previewExercises: PreviewExerciseDto[];
}
