import { apiClient } from '../../../services/api';

export interface DailyNutritionSummaryDto {
  memberProfileId: string;
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbohydrates: number;
  totalFat: number;
  totalFiber: number;
  totalWaterMl: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbohydrates: number;
  targetFat: number;
  targetWaterMl: number;
  remainingCalories: number;
  remainingProtein: number;
  remainingCarbs: number;
  remainingFat: number;
  calorieAdherencePct: number;
  proteinAdherencePct: number;
  carbAdherencePct: number;
  fatAdherencePct: number;
  waterAdherencePct: number;
  mealCount: number;
  foodItemCount: number;
  meals: Array<{
    mealType: string;
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    items: Array<{
      id: string;
      foodId: string;
      mealType: string;
      quantity: number;
      unit: string;
      foodNameAtLog: string;
      brandAtLog?: string | null;
      calories: number;
      protein: number;
      carbohydrates: number;
      fat: number;
      consumedAt: string;
      food?: {
        name: string;
        category: string;
      };
    }>;
  }>;
}

export interface NutritionProfileDto {
  id: string;
  memberProfileId: string;
  dietaryPattern: string;
  activityLevel?: string | null;
  nutritionGoal?: string | null;
  preferredUnits: string;
  timezone: string;
  allergies: string[];
  intolerances: string[];
  foodsAvoided: string[];
  dietaryRestrictions?: string | null;
  notes?: string | null;
  status: string;
  preferences?: Array<{
    id: string;
    preferenceType: string;
    itemName: string;
    severity?: string | null;
  }>;
}

export interface NutritionTargetDto {
  id: string;
  dailyCalories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  fiberGrams?: number | null;
  waterMl?: number | null;
  minCalories?: number | null;
  maxCalories?: number | null;
  source: string;
  effectiveFrom: string;
  isDefault?: boolean;
}

export interface FoodItemDto {
  id: string;
  name: string;
  brand?: string | null;
  category: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber?: number;
  ownership: string;
}

export interface FoodSearchResultDto {
  items: FoodItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AssignedMealPlanDto {
  id: string;
  mealPlanId: string;
  status: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  mealPlan: {
    id: string;
    name: string;
    description?: string | null;
    dietaryPattern?: string | null;
    targetDailyCalories?: number | null;
    durationDays: number;
    days: Array<{
      id: string;
      dayNumber: number;
      dayName?: string | null;
      meals: Array<{
        id: string;
        name: string;
        mealType: string;
        items: Array<{
          id: string;
          quantity: number;
          unit: string;
          calories: number;
          protein: number;
          carbohydrates: number;
          fat: number;
          food: {
            name: string;
            category: string;
          };
        }>;
      }>;
    }>;
  };
}

export class NutritionService {
  /**
   * Get logged-in member's daily nutrition summary calculated from real logs.
   */
  static async getMyDailySummary(date?: string): Promise<DailyNutritionSummaryDto> {
    const url = date
      ? `/members/me/nutrition/summary?date=${date}`
      : '/members/me/nutrition/summary';
    const res = await apiClient.get<DailyNutritionSummaryDto>(url);
    return res.data;
  }

  /**
   * Get target member's daily nutrition summary (e.g. for Trainer client view).
   */
  static async getMemberDailySummary(
    memberId: string,
    date?: string,
  ): Promise<DailyNutritionSummaryDto> {
    const url = date
      ? `/members/${memberId}/nutrition/summary?date=${date}`
      : `/members/${memberId}/nutrition/summary`;
    const res = await apiClient.get<DailyNutritionSummaryDto>(url);
    return res.data;
  }

  /**
   * Get member nutrition profile and preferences.
   */
  static async getMemberProfile(memberId: string = 'me'): Promise<NutritionProfileDto> {
    const res = await apiClient.get<NutritionProfileDto>(`/members/${memberId}/nutrition/profile`);
    return res.data;
  }

  /**
   * Update member nutrition profile.
   */
  static async updateMemberProfile(
    memberId: string = 'me',
    data: Partial<NutritionProfileDto>,
  ): Promise<NutritionProfileDto> {
    const res = await apiClient.post<NutritionProfileDto>(
      `/members/${memberId}/nutrition/profile`,
      data,
    );
    return res.data;
  }

  /**
   * Get member's active nutrition target.
   */
  static async getActiveTarget(memberId: string = 'me'): Promise<NutritionTargetDto> {
    const res = await apiClient.get<NutritionTargetDto>(`/members/${memberId}/nutrition/targets`);
    return res.data;
  }

  /**
   * Set member nutrition target.
   */
  static async setTarget(
    memberId: string = 'me',
    target: {
      dailyCalories: number;
      proteinGrams: number;
      carbohydrateGrams: number;
      fatGrams: number;
      waterMl?: number;
    },
  ): Promise<NutritionTargetDto> {
    const res = await apiClient.post<NutritionTargetDto>(
      `/members/${memberId}/nutrition/targets`,
      target,
    );
    return res.data;
  }

  /**
   * Search food library (SYSTEM foods + caller's organisation foods).
   */
  static async searchFoods(
    query?: string,
    category?: string,
    page: number = 1,
  ): Promise<FoodSearchResultDto> {
    let url = `/nutrition/foods?page=${page}&limit=20`;
    if (query) url += `&query=${encodeURIComponent(query)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    const res = await apiClient.get<FoodSearchResultDto>(url);
    return res.data;
  }

  /**
   * Log food consumption with immutable snapshot.
   */
  static async logFood(
    memberId: string = 'me',
    payload: {
      foodId: string;
      mealType: string;
      quantity: number;
      unit: string;
      consumedAt?: string;
      idempotencyKey?: string;
    },
  ) {
    const res = await apiClient.post(`/members/${memberId}/nutrition/food-logs`, payload);
    return res.data;
  }

  /**
   * Delete food log record.
   */
  static async deleteFoodLog(memberId: string = 'me', logId: string) {
    const res = await apiClient.delete(`/members/${memberId}/nutrition/food-logs/${logId}`);
    return res.data;
  }

  /**
   * Log water consumption.
   */
  static async logWater(memberId: string = 'me', amountMl: number) {
    const res = await apiClient.post(`/members/${memberId}/nutrition/water-logs`, { amountMl });
    return res.data;
  }

  /**
   * Get active assigned meal plan for member.
   */
  static async getAssignedMealPlan(memberId: string = 'me'): Promise<AssignedMealPlanDto | null> {
    const res = await apiClient.get<AssignedMealPlanDto | null>(
      `/members/${memberId}/nutrition/meal-plans/active`,
    );
    return res.data;
  }

  /**
   * Get 7D/30D nutrition trends.
   */
  static async getNutritionTrends(memberId: string = 'me', days: number = 7) {
    const res = await apiClient.get(`/members/${memberId}/nutrition/trends?days=${days}`);
    return res.data;
  }
}
