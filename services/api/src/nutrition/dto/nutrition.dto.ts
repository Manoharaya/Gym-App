import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum DietaryPatternEnum {
  OMNIVORE = 'OMNIVORE',
  VEGETARIAN = 'VEGETARIAN',
  VEGAN = 'VEGAN',
  PESCATARIAN = 'PESCATARIAN',
  KETO = 'KETO',
  LOW_CARB = 'LOW_CARB',
  HIGH_PROTEIN = 'HIGH_PROTEIN',
  CUSTOM = 'CUSTOM',
}

export enum NutritionGoalEnum {
  WEIGHT_LOSS = 'WEIGHT_LOSS',
  MAINTENANCE = 'MAINTENANCE',
  MUSCLE_GAIN = 'MUSCLE_GAIN',
  PERFORMANCE = 'PERFORMANCE',
  HEALTH = 'HEALTH',
}

export enum ActivityLevelEnum {
  SEDENTARY = 'SEDENTARY',
  LIGHTLY_ACTIVE = 'LIGHTLY_ACTIVE',
  MODERATELY_ACTIVE = 'MODERATELY_ACTIVE',
  VERY_ACTIVE = 'VERY_ACTIVE',
  EXTREMELY_ACTIVE = 'EXTREMELY_ACTIVE',
}

export enum PreferenceTypeEnum {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
  AVOID = 'AVOID',
  ALLERGY = 'ALLERGY',
  INTOLERANCE = 'INTOLERANCE',
  RELIGIOUS_RESTRICTION = 'RELIGIOUS_RESTRICTION',
}

export enum PreferenceSeverityEnum {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  ANAPHYLACTIC = 'ANAPHYLACTIC',
}

export enum MealTypeEnum {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  SNACK = 'SNACK',
  PRE_WORKOUT = 'PRE_WORKOUT',
  POST_WORKOUT = 'POST_WORKOUT',
  OTHER = 'OTHER',
}

export enum FoodOwnershipEnum {
  SYSTEM = 'SYSTEM',
  ORGANISATION = 'ORGANISATION',
}

export enum FoodCategoryEnum {
  PROTEIN = 'PROTEIN',
  GRAINS = 'GRAINS',
  VEGETABLES = 'VEGETABLES',
  FRUITS = 'FRUITS',
  DAIRY = 'DAIRY',
  FATS_OILS = 'FATS_OILS',
  SNACKS = 'SNACKS',
  BEVERAGES = 'BEVERAGES',
  SUPPLEMENTS = 'SUPPLEMENTS',
  OTHER = 'OTHER',
}

export enum TargetSourceEnum {
  MEMBER_DEFINED = 'MEMBER_DEFINED',
  TRAINER_ASSIGNED = 'TRAINER_ASSIGNED',
  DEFAULT = 'DEFAULT',
}

export enum MealPlanStatusEnum {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum MealPlanAssignmentStatusEnum {
  ASSIGNED = 'ASSIGNED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// ==========================================
// NUTRITION PROFILE DTOS
// ==========================================

export class CreateNutritionProfileDto {
  @IsOptional()
  @IsEnum(DietaryPatternEnum)
  dietaryPattern?: DietaryPatternEnum;

  @IsOptional()
  @IsEnum(ActivityLevelEnum)
  activityLevel?: ActivityLevelEnum;

  @IsOptional()
  @IsEnum(NutritionGoalEnum)
  nutritionGoal?: NutritionGoalEnum;

  @IsOptional()
  @IsString()
  preferredUnits?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  intolerances?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  foodsAvoided?: string[];

  @IsOptional()
  @IsString()
  dietaryRestrictions?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateNutritionProfileDto {
  @IsOptional()
  @IsEnum(DietaryPatternEnum)
  dietaryPattern?: DietaryPatternEnum;

  @IsOptional()
  @IsEnum(ActivityLevelEnum)
  activityLevel?: ActivityLevelEnum;

  @IsOptional()
  @IsEnum(NutritionGoalEnum)
  nutritionGoal?: NutritionGoalEnum;

  @IsOptional()
  @IsString()
  preferredUnits?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  intolerances?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  foodsAvoided?: string[];

  @IsOptional()
  @IsString()
  dietaryRestrictions?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateDietaryPreferenceDto {
  @IsEnum(PreferenceTypeEnum)
  preferenceType: PreferenceTypeEnum;

  @IsString()
  @IsNotEmpty()
  itemName: string;

  @IsOptional()
  @IsEnum(PreferenceSeverityEnum)
  severity?: PreferenceSeverityEnum;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ==========================================
// NUTRITION TARGET DTOS
// ==========================================

export class SetNutritionTargetDto {
  @IsNumber()
  @Min(0)
  dailyCalories: number;

  @IsNumber()
  @Min(0)
  proteinGrams: number;

  @IsNumber()
  @Min(0)
  carbohydrateGrams: number;

  @IsNumber()
  @Min(0)
  fatGrams: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fiberGrams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  waterMl?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minCalories?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCalories?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minProtein?: number;

  @IsOptional()
  @IsEnum(TargetSourceEnum)
  source?: TargetSourceEnum;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
}

// ==========================================
// FOOD LIBRARY DTOS
// ==========================================

export class CreateFoodDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsEnum(FoodCategoryEnum)
  category: FoodCategoryEnum;

  @IsNumber()
  @Min(0.1)
  servingSize: number;

  @IsString()
  @IsNotEmpty()
  servingUnit: string;

  @IsNumber()
  @Min(0)
  calories: number;

  @IsNumber()
  @Min(0)
  protein: number;

  @IsNumber()
  @Min(0)
  carbohydrates: number;

  @IsNumber()
  @Min(0)
  fat: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fiber?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sugar?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sodium?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  calcium?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  iron?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  potassium?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminD?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vitaminB12?: number;

  @IsOptional()
  @IsString()
  barcode?: string;
}

export class UpdateFoodDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsEnum(FoodCategoryEnum)
  category?: FoodCategoryEnum;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  servingSize?: number;

  @IsOptional()
  @IsString()
  servingUnit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  calories?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  protein?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carbohydrates?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fat?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fiber?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sugar?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sodium?: number;
}

export class FoodSearchQueryDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsEnum(FoodCategoryEnum)
  category?: FoodCategoryEnum;

  @IsOptional()
  @IsEnum(FoodOwnershipEnum)
  ownership?: FoodOwnershipEnum;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}

// ==========================================
// MEAL & MEAL PLAN DTOS
// ==========================================

export class CreateMealDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(MealTypeEnum)
  mealType: MealTypeEnum;

  @IsOptional()
  @IsString()
  scheduledTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  workoutId?: string;
}

export class AddFoodToMealDto {
  @IsString()
  @IsNotEmpty()
  foodId: string;

  @IsNumber()
  @Min(0.1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateMealPlanFoodItemDto {
  @IsString()
  @IsNotEmpty()
  foodId: string;

  @IsNumber()
  @Min(0.1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMealPlanMealDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(MealTypeEnum)
  mealType: MealTypeEnum;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  items?: CreateMealPlanFoodItemDto[];
}

export class CreateMealPlanDayDto {
  @IsNumber()
  @Min(1)
  dayNumber: number;

  @IsOptional()
  @IsString()
  dayName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  meals?: CreateMealPlanMealDto[];
}

export class CreateMealPlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(DietaryPatternEnum)
  dietaryPattern?: DietaryPatternEnum;

  @IsOptional()
  @IsNumber()
  targetDailyCalories?: number;

  @IsOptional()
  @IsNumber()
  targetProteinGrams?: number;

  @IsOptional()
  @IsNumber()
  targetCarbGrams?: number;

  @IsOptional()
  @IsNumber()
  targetFatGrams?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationDays?: number = 7;

  @IsOptional()
  @IsEnum(MealPlanStatusEnum)
  status?: MealPlanStatusEnum = MealPlanStatusEnum.ACTIVE;

  @IsOptional()
  @IsArray()
  days?: CreateMealPlanDayDto[];
}

export class AssignMealPlanDto {
  @IsString()
  @IsNotEmpty()
  mealPlanId: string;

  @IsDateString()
  effectiveFrom: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ==========================================
// FOOD LOGGING & WATER DTOS
// ==========================================

export class LogFoodDto {
  @IsString()
  @IsNotEmpty()
  foodId: string;

  @IsEnum(MealTypeEnum)
  mealType: MealTypeEnum;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsOptional()
  @IsDateString()
  consumedAt?: string;

  @IsOptional()
  @IsString()
  mealId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class LogWaterDto {
  @IsNumber()
  @Min(1)
  amountMl: number;

  @IsOptional()
  @IsDateString()
  loggedAt?: string;
}

export class NutritionQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  period?: string = '7D';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 30;
}

export type NutritionHistoryQueryDto = NutritionQueryDto;

