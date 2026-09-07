import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/interfaces/request-with-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { NutritionProfileService } from '../services/nutrition-profile.service';
import { NutritionTargetService } from '../services/nutrition-target.service';
import { FoodLibraryService } from '../services/food-library.service';
import { MealService } from '../services/meal.service';
import { MealPlanService } from '../services/meal-plan.service';
import { FoodLogService } from '../services/food-log.service';
import { NutritionSummaryService } from '../services/nutrition-summary.service';
import {
  CreateNutritionProfileDto,
  UpdateNutritionProfileDto,
  CreateDietaryPreferenceDto,
  SetNutritionTargetDto,
  CreateFoodDto,
  UpdateFoodDto,
  FoodSearchQueryDto,
  CreateMealDto,
  AddFoodToMealDto,
  CreateMealPlanDto,
  AssignMealPlanDto,
  LogFoodDto,
  LogWaterDto,
  NutritionQueryDto,
} from '../dto/nutrition.dto';

@ApiTags('Nutrition & Meal Planning')
@ApiBearerAuth()
@Controller()
export class NutritionController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: NutritionProfileService,
    private readonly targetService: NutritionTargetService,
    private readonly foodLibraryService: FoodLibraryService,
    private readonly mealService: MealService,
    private readonly mealPlanService: MealPlanService,
    private readonly foodLogService: FoodLogService,
    private readonly summaryService: NutritionSummaryService,
  ) {}

  private resolveOrgId(user: AuthenticatedUser, headerOrgId?: string): string {
    const orgId = headerOrgId || (user as any).organisationId || user.roles[0]?.organisationId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context required: active organisation not identified');
    }
    return orgId;
  }

  private async resolveMemberProfileId(
    organisationId: string,
    user: AuthenticatedUser,
    paramMemberId?: string,
  ): Promise<string> {
    if (paramMemberId && paramMemberId !== 'me') {
      return paramMemberId;
    }

    const profile = await this.prisma.memberProfile.findFirst({
      where: { userId: user.id, organisationId },
    });

    if (!profile) {
      throw new NotFoundException('Member profile not found for the authenticated user');
    }

    return profile.id;
  }

  // ==========================================
  // DAILY NUTRITION SUMMARY
  // ==========================================

  @Get('nutrition/summary')
  @RequirePermission('nutrition', 'read')
  @ApiOperation({ summary: 'Get daily nutrition summary' })
  async getDailySummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('memberProfileId') memberProfileIdQuery?: string,
    @Query('date') dateStr?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberProfileIdQuery);
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.summaryService.getDailySummary(orgId, memberProfileId, date, user);
  }

  @Get('members/me/nutrition/summary')
  @RequirePermission('nutrition', 'read')
  @ApiOperation({ summary: 'Get current member daily nutrition summary' })
  async getMyDailySummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') dateStr?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, 'me');
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.summaryService.getDailySummary(orgId, memberProfileId, date, user);
  }

  @Get('members/:memberId/nutrition/summary')
  @RequirePermission('nutrition', 'read')
  @ApiOperation({ summary: 'Get specific member daily nutrition summary' })
  async getMemberDailySummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Query('date') dateStr?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.summaryService.getDailySummary(orgId, memberProfileId, date, user);
  }

  @Get('members/:memberId/nutrition/trends')
  @RequirePermission('nutrition', 'read')
  @ApiOperation({ summary: 'Get 7D/30D nutrition trends and averages' })
  async getMemberNutritionTrends(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Query('days') daysStr?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    const days = daysStr ? parseInt(daysStr, 10) : 7;
    return this.summaryService.getNutritionTrends(orgId, memberProfileId, days, user);
  }

  // ==========================================
  // NUTRITION PROFILE & PREFERENCES
  // ==========================================

  @Get('members/:memberId/nutrition/profile')
  @RequirePermission('nutrition', 'read')
  @ApiOperation({ summary: 'Get member nutrition profile and preferences' })
  async getMemberProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.profileService.getProfile(orgId, memberProfileId, user);
  }

  @Post('members/:memberId/nutrition/profile')
  @RequirePermission('nutrition', 'write')
  @ApiOperation({ summary: 'Create or update member nutrition profile' })
  async updateMemberProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Body() dto: CreateNutritionProfileDto | UpdateNutritionProfileDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.profileService.createOrUpdateProfile(orgId, memberProfileId, dto, user);
  }

  @Post('members/:memberId/nutrition/preferences')
  @RequirePermission('nutrition', 'write')
  @ApiOperation({ summary: 'Add a dietary preference, allergy, or food avoidance' })
  async addDietaryPreference(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Body() dto: CreateDietaryPreferenceDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.profileService.addDietaryPreference(orgId, memberProfileId, dto, user);
  }

  @Delete('members/:memberId/nutrition/preferences/:prefId')
  @RequirePermission('nutrition', 'write')
  @ApiOperation({ summary: 'Delete a dietary preference' })
  async deleteDietaryPreference(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Param('prefId') prefId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.profileService.deleteDietaryPreference(orgId, memberProfileId, prefId, user);
  }

  // ==========================================
  // NUTRITION TARGETS
  // ==========================================

  @Get('members/:memberId/nutrition/targets')
  @RequirePermission('nutrition', 'read')
  @ApiOperation({ summary: 'Get current active nutrition target' })
  async getActiveTarget(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.targetService.getActiveTarget(orgId, memberProfileId, user);
  }

  @Post('members/:memberId/nutrition/targets')
  @RequirePermission('nutrition', 'write')
  @ApiOperation({ summary: 'Configure new nutrition target with history preservation' })
  async setTarget(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Body() dto: SetNutritionTargetDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.targetService.setTarget(orgId, memberProfileId, dto, user);
  }

  @Get('members/:memberId/nutrition/targets/history')
  @RequirePermission('nutrition', 'read')
  @ApiOperation({ summary: 'Get target change timeline' })
  async getTargetHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.targetService.getTargetHistory(orgId, memberProfileId, user);
  }

  // ==========================================
  // FOOD LIBRARY & SEARCH
  // ==========================================

  @Get('nutrition/foods')
  @RequirePermission('foods', 'read')
  @ApiOperation({ summary: 'Search food library (SYSTEM + callers org foods)' })
  async searchFoods(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FoodSearchQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.foodLibraryService.searchFoods(orgId, query, user);
  }

  @Get('nutrition/foods/:foodId')
  @RequirePermission('foods', 'read')
  @ApiOperation({ summary: 'Get food item details' })
  async getFoodById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('foodId') foodId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.foodLibraryService.getFoodById(orgId, foodId, user);
  }

  @Post('nutrition/foods')
  @RequirePermission('foods', 'write')
  @ApiOperation({ summary: 'Create custom organisation food' })
  async createFood(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFoodDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.foodLibraryService.createOrganisationFood(orgId, dto, user);
  }

  @Put('nutrition/foods/:foodId')
  @RequirePermission('foods', 'write')
  @ApiOperation({ summary: 'Update custom organisation food' })
  async updateFood(
    @CurrentUser() user: AuthenticatedUser,
    @Param('foodId') foodId: string,
    @Body() dto: UpdateFoodDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.foodLibraryService.updateOrganisationFood(orgId, foodId, dto, user);
  }

  @Delete('nutrition/foods/:foodId')
  @RequirePermission('foods', 'delete')
  @ApiOperation({ summary: 'Delete/archive custom organisation food' })
  async deleteFood(
    @CurrentUser() user: AuthenticatedUser,
    @Param('foodId') foodId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.foodLibraryService.deleteOrganisationFood(orgId, foodId, user);
  }

  // ==========================================
  // MEALS & MEAL ITEMS
  // ==========================================

  @Post('nutrition/meals')
  @RequirePermission('nutrition', 'write')
  @ApiOperation({ summary: 'Create a meal' })
  async createMeal(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMealDto,
    @Query('memberProfileId') memberProfileIdQuery?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    let memberProfileId: string | null = null;
    if (memberProfileIdQuery) {
      memberProfileId = await this.resolveMemberProfileId(orgId, user, memberProfileIdQuery);
    }
    return this.mealService.createMeal(orgId, memberProfileId, dto, user);
  }

  @Post('nutrition/meals/:mealId/items')
  @RequirePermission('nutrition', 'write')
  @ApiOperation({ summary: 'Add a food item to a meal' })
  async addFoodToMeal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mealId') mealId: string,
    @Body() dto: AddFoodToMealDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.mealService.addFoodToMeal(orgId, mealId, dto, user);
  }

  @Delete('nutrition/meals/:mealId/items/:itemId')
  @RequirePermission('nutrition', 'write')
  @ApiOperation({ summary: 'Remove a food item from a meal' })
  async removeFoodFromMeal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mealId') mealId: string,
    @Param('itemId') itemId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.mealService.removeFoodFromMeal(orgId, mealId, itemId, user);
  }

  @Get('nutrition/meals')
  @RequirePermission('nutrition', 'read')
  @ApiOperation({ summary: 'List meals' })
  async listMeals(
    @CurrentUser() user: AuthenticatedUser,
    @Query('memberProfileId') memberProfileIdQuery?: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    let memberProfileId: string | undefined;
    if (memberProfileIdQuery) {
      memberProfileId = await this.resolveMemberProfileId(orgId, user, memberProfileIdQuery);
    }
    return this.mealService.listMeals(orgId, memberProfileId, user);
  }

  @Get('nutrition/meals/:mealId')
  @RequirePermission('nutrition', 'read')
  @ApiOperation({ summary: 'Get meal with constituent items and total macros' })
  async getMeal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mealId') mealId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.mealService.getMealWithItems(orgId, mealId, user);
  }

  // ==========================================
  // MEAL PLANS & ASSIGNMENTS
  // ==========================================

  @Post('nutrition/meal-plans')
  @RequirePermission('nutrition_plans', 'manage')
  @ApiOperation({ summary: 'Create reusable organisation meal plan' })
  async createMealPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMealPlanDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.mealPlanService.createMealPlan(orgId, dto, user);
  }

  @Post('nutrition/meal-plans/:planId/version')
  @RequirePermission('nutrition_plans', 'manage')
  @ApiOperation({ summary: 'Create new version of existing meal plan' })
  async createMealPlanVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Body() dto: CreateMealPlanDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.mealPlanService.createMealPlanVersion(orgId, planId, dto, user);
  }

  @Get('nutrition/meal-plans')
  @RequirePermission('nutrition_plans', 'read')
  @ApiOperation({ summary: 'List reusable organisation meal plans' })
  async listMealPlans(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.mealPlanService.listMealPlans(orgId, user);
  }

  @Get('nutrition/meal-plans/:planId')
  @RequirePermission('nutrition_plans', 'read')
  @ApiOperation({ summary: 'Get meal plan with days, meals, and food items' })
  async getMealPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    return this.mealPlanService.getMealPlanById(orgId, planId, user);
  }

  @Post('members/:memberId/nutrition/meal-plans/assign')
  @RequirePermission('nutrition_plans', 'manage')
  @ApiOperation({ summary: 'Assign meal plan to member with immutable snapshot' })
  async assignMealPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Body() dto: AssignMealPlanDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.mealPlanService.assignMealPlan(orgId, memberProfileId, dto, user);
  }

  @Get('members/:memberId/nutrition/meal-plans/active')
  @RequirePermission('nutrition_plans', 'read')
  @ApiOperation({ summary: 'Get active assigned meal plan for member' })
  async getAssignedMealPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.mealPlanService.getAssignedMealPlan(orgId, memberProfileId, user);
  }

  // ==========================================
  // FOOD LOGGING & WATER
  // ==========================================

  @Post('members/:memberId/nutrition/food-logs')
  @RequirePermission('food_logs', 'manage')
  @ApiOperation({ summary: 'Log food consumption with immutable nutritional snapshot' })
  async logFood(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Body() dto: LogFoodDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.foodLogService.logFood(orgId, memberProfileId, dto, user);
  }

  @Delete('members/:memberId/nutrition/food-logs/:logId')
  @RequirePermission('food_logs', 'manage')
  @ApiOperation({ summary: 'Delete food log record' })
  async deleteFoodLog(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Param('logId') logId: string,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.foodLogService.deleteFoodLog(orgId, memberProfileId, logId, user);
  }

  @Post('members/:memberId/nutrition/water-logs')
  @RequirePermission('food_logs', 'manage')
  @ApiOperation({ summary: 'Log water consumption' })
  async logWater(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Body() dto: LogWaterDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.foodLogService.logWater(orgId, memberProfileId, dto, user);
  }

  @Get('members/:memberId/nutrition/history')
  @RequirePermission('food_logs', 'manage')
  @ApiOperation({ summary: 'Get paginated food log history across date range' })
  async getFoodLogHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Query() query: NutritionQueryDto,
    @Headers('x-organisation-id') headerOrgId?: string,
  ) {
    const orgId = this.resolveOrgId(user, headerOrgId);
    const memberProfileId = await this.resolveMemberProfileId(orgId, user, memberId);
    return this.foodLogService.getFoodLogHistory(orgId, memberProfileId, query, user);
  }
}
