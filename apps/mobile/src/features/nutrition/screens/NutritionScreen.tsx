import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen, Card, Badge, Icon, Tabs, Button } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';
import {
  NutritionService,
  DailyNutritionSummaryDto,
  FoodItemDto,
  AssignedMealPlanDto,
  NutritionProfileDto,
  NutritionTargetDto,
} from '../services/nutritionService';

type NutritionTab = 'summary' | 'food_log' | 'search_log' | 'meal_plan' | 'targets' | 'history';

const TABS = [
  { id: 'summary' as NutritionTab, label: 'Today' },
  { id: 'food_log' as NutritionTab, label: 'Logs' },
  { id: 'search_log' as NutritionTab, label: 'Add Food' },
  { id: 'meal_plan' as NutritionTab, label: 'Meal Plan' },
  { id: 'targets' as NutritionTab, label: 'Targets' },
  { id: 'history' as NutritionTab, label: 'Trends' },
];

export const NutritionScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params || {}) as { memberId?: string; clientName?: string };
  const targetMemberId = params.memberId || 'me';

  const [activeTab, setActiveTab] = useState<NutritionTab>('summary');
  const [summary, setSummary] = useState<DailyNutritionSummaryDto | null>(null);
  const [profile, setProfile] = useState<NutritionProfileDto | null>(null);
  const [target, setTarget] = useState<NutritionTargetDto | null>(null);
  const [mealPlan, setMealPlan] = useState<AssignedMealPlanDto | null>(null);
  const [trends, setTrends] = useState<any | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Logging State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<FoodItemDto[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [selectedFood, setSelectedFood] = useState<FoodItemDto | null>(null);
  const [logQuantity, setLogQuantity] = useState<string>('100');
  const [logMealType, setLogMealType] = useState<string>('BREAKFAST');
  const [loggingFood, setLoggingFood] = useState<boolean>(false);

  // Load All Data
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [sumRes, profRes, tgtRes, planRes, trendRes] = await Promise.all([
        NutritionService.getMyDailySummary(),
        NutritionService.getMemberProfile(targetMemberId),
        NutritionService.getActiveTarget(targetMemberId),
        NutritionService.getAssignedMealPlan(targetMemberId),
        NutritionService.getNutritionTrends(targetMemberId, 7),
      ]);

      setSummary(sumRes);
      setProfile(profRes);
      setTarget(tgtRes);
      setMealPlan(planRes);
      setTrends(trendRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to load nutrition data from server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetMemberId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Water Quick Add
  const addWater = async (amount: number) => {
    try {
      await NutritionService.logWater(targetMemberId, amount);
      const updated = await NutritionService.getMyDailySummary();
      setSummary(updated);
    } catch (err: any) {
      Alert.alert('Hydration Error', err?.message || 'Could not record water consumption');
    }
  };

  // Food Search
  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await NutritionService.searchFoods(text.trim());
      setSearchResults(res.items);
    } catch (err: any) {
      console.warn('Food search error', err);
    } finally {
      setSearching(false);
    }
  };

  // Log Selected Food
  const submitFoodLog = async () => {
    if (!selectedFood) return;
    const qty = parseFloat(logQuantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid positive quantity');
      return;
    }

    setLoggingFood(true);
    try {
      await NutritionService.logFood(targetMemberId, {
        foodId: selectedFood.id,
        mealType: logMealType,
        quantity: qty,
        unit: selectedFood.servingUnit || 'g',
        idempotencyKey: `log-${Date.now()}-${selectedFood.id}`,
      });

      setSelectedFood(null);
      setLogQuantity('100');
      Alert.alert('Food Logged', `${selectedFood.name} logged to ${logMealType}`);
      await loadData();
      setActiveTab('food_log');
    } catch (err: any) {
      Alert.alert('Logging Failed', err?.message || 'Failed to log food');
    } finally {
      setLoggingFood(false);
    }
  };

  // Delete Log
  const handleDeleteLog = (logId: string, foodName: string) => {
    Alert.alert('Delete Food Log', `Remove "${foodName}" from today's logs?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await NutritionService.deleteFoodLog(targetMemberId, logId);
            await loadData();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Could not delete food log');
          }
        },
      },
    ]);
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Nutrition & Fuel</Text>
          {params.clientName && (
            <Text style={styles.clientSubheading}>{params.clientName}</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Tabs
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as NutritionTab)}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading verified nutrition data...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={loadData} variant="outline" style={{ marginTop: spacing[4] }} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={themeColors.primary}
            />
          }
        >
          {/* TAB 1: SUMMARY */}
          {activeTab === 'summary' && summary && (
            <View>
              {/* Hero Calorie Card */}
              <Card style={styles.heroCard}>
                <View style={styles.heroRow}>
                  <View style={styles.calorieBox}>
                    <Text style={styles.calorieBigNumber}>{summary.totalCalories}</Text>
                    <Text style={styles.calorieLabel}>KCAL CONSUMED</Text>
                  </View>
                  <View style={styles.calorieDetails}>
                    <Text style={styles.targetLabel}>Target: {summary.targetCalories} kcal</Text>
                    <Text style={styles.remainingLabel}>
                      {summary.remainingCalories > 0
                        ? `${summary.remainingCalories} kcal remaining`
                        : 'Target reached'}
                    </Text>
                    <Badge
                      label={`${summary.calorieAdherencePct}% ADHERENCE`}
                      variant={summary.calorieAdherencePct >= 90 ? 'accent' : 'warning'}
                      style={styles.adherenceBadge}
                    />
                  </View>
                </View>
              </Card>

              {/* Macros Breakdown */}
              <Card style={styles.macrosCard}>
                <Text style={styles.sectionHeading}>MACRONUTRIENT INTAKE</Text>

                {/* Protein */}
                <View style={styles.macroRow}>
                  <View style={styles.macroHeader}>
                    <Text style={styles.macroName}>Protein</Text>
                    <Text style={styles.macroValue}>
                      {summary.totalProtein}g / {summary.targetProtein}g
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, summary.proteinAdherencePct)}%`,
                          backgroundColor: themeColors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.macroPercent}>
                    {summary.proteinAdherencePct}% {summary.proteinAdherencePct >= 100 ? '✓' : '→'}
                  </Text>
                </View>

                {/* Carbs */}
                <View style={styles.macroRow}>
                  <View style={styles.macroHeader}>
                    <Text style={styles.macroName}>Carbohydrates</Text>
                    <Text style={styles.macroValue}>
                      {summary.totalCarbohydrates}g / {summary.targetCarbohydrates}g
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, summary.carbAdherencePct)}%`,
                          backgroundColor: themeColors.accent,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.macroPercent}>
                    {summary.carbAdherencePct}% {summary.carbAdherencePct >= 100 ? '✓' : '→'}
                  </Text>
                </View>

                {/* Fats */}
                <View style={styles.macroRow}>
                  <View style={styles.macroHeader}>
                    <Text style={styles.macroName}>Healthy Fats</Text>
                    <Text style={styles.macroValue}>
                      {summary.totalFat}g / {summary.targetFat}g
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, summary.fatAdherencePct)}%`,
                          backgroundColor: themeColors.warning,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.macroPercent}>
                    {summary.fatAdherencePct}% {summary.fatAdherencePct >= 100 ? '✓' : '→'}
                  </Text>
                </View>
              </Card>

              {/* Hydration Tracker */}
              <Card style={styles.hydrationCard}>
                <View style={styles.hydrationHeader}>
                  <View>
                    <Text style={styles.hydrationTitle}>Daily Hydration</Text>
                    <Text style={styles.hydrationSubtitle}>Target: {summary.targetWaterMl} ml</Text>
                  </View>
                  <Text style={styles.hydrationBigNumber}>{(summary.totalWaterMl / 1000).toFixed(1)} L</Text>
                </View>

                <View style={styles.waterButtonsRow}>
                  <Button
                    title="+250 ml Glass"
                    onPress={() => addWater(250)}
                    variant="outline"
                    style={styles.waterBtn}
                  />
                  <Button
                    title="+500 ml Bottle"
                    onPress={() => addWater(500)}
                    variant="outline"
                    style={styles.waterBtn}
                  />
                  <Button
                    title="+1000 ml"
                    onPress={() => addWater(1000)}
                    variant="outline"
                    style={styles.waterBtn}
                  />
                </View>
              </Card>

              {/* Meal Timeline */}
              <Text style={[styles.sectionHeading, { marginTop: spacing[5] }]}>TODAY'S MEALS</Text>
              {summary.meals.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No Meals Logged Yet</Text>
                  <Text style={styles.emptySubtext}>Tap "Add Food" above to record your first meal today.</Text>
                </Card>
              ) : (
                summary.meals.map((meal, idx) => (
                  <Card key={idx} style={styles.mealCard}>
                    <View style={styles.mealHeader}>
                      <Badge label={meal.mealType} variant="neutral" />
                      <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
                    </View>
                    <Text style={styles.mealMacroSub}>
                      P: {meal.protein}g | C: {meal.carbohydrates}g | F: {meal.fat}g
                    </Text>
                    {meal.items.map((item) => (
                      <View key={item.id} style={styles.foodItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.foodItemName}>{item.foodNameAtLog}</Text>
                          <Text style={styles.foodItemQuantity}>
                            {item.quantity} {item.unit} • {item.calories} kcal
                          </Text>
                        </View>
                      </View>
                    ))}
                  </Card>
                ))
              )}
            </View>
          )}

          {/* TAB 2: FOOD LOGS */}
          {activeTab === 'food_log' && summary && (
            <View>
              <View style={styles.tabHeaderRow}>
                <Text style={styles.sectionHeading}>RECORDED LOGS ({summary.foodItemCount})</Text>
                <Button
                  title="+ Add Food"
                  onPress={() => setActiveTab('search_log')}
                  variant="primary"
                />
              </View>

              {summary.foodItemCount === 0 ? (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No food logs recorded today</Text>
                  <Text style={styles.emptySubtext}>Use the Add Food tab to log consumption.</Text>
                </Card>
              ) : (
                summary.meals.map((meal) =>
                  meal.items.map((item) => (
                    <Card key={item.id} style={styles.logCard}>
                      <View style={styles.logCardRow}>
                        <View style={{ flex: 1 }}>
                          <Badge label={item.mealType} variant="neutral" style={{ alignSelf: 'flex-start' }} />
                          <Text style={styles.logFoodName}>{item.foodNameAtLog}</Text>
                          <Text style={styles.logFoodDetails}>
                            {item.quantity} {item.unit} • {item.calories} kcal
                          </Text>
                          <Text style={styles.logMacros}>
                            P: {item.protein}g | C: {item.carbohydrates}g | F: {item.fat}g
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteLog(item.id, item.foodNameAtLog)}
                          style={styles.deleteButton}
                          accessibilityLabel="Delete food log"
                        >
                          <Icon name="close" size={18} color={themeColors.danger} />
                        </TouchableOpacity>
                      </View>
                    </Card>
                  )),
                )
              )}
            </View>
          )}

          {/* TAB 3: SEARCH & LOG */}
          {activeTab === 'search_log' && (
            <View>
              <Text style={styles.sectionHeading}>SEARCH FOOD LIBRARY</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search chicken, rice, eggs, oats..."
                placeholderTextColor={themeColors.textSecondary}
                value={searchQuery}
                onChangeText={handleSearch}
                accessibilityLabel="Search foods"
              />

              {searching ? (
                <ActivityIndicator size="small" color={themeColors.primary} style={{ marginTop: spacing[4] }} />
              ) : searchResults.length > 0 ? (
                searchResults.map((food) => (
                  <TouchableOpacity
                    key={food.id}
                    onPress={() => {
                      setSelectedFood(food);
                      setLogQuantity(String(food.servingSize || 100));
                    }}
                  >
                    <Card style={styles.searchResultCard}>
                      <View style={styles.searchResultRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.searchFoodName}>{food.name}</Text>
                          <Text style={styles.searchFoodDetails}>
                            {food.servingSize} {food.servingUnit} • {food.calories} kcal
                          </Text>
                          <Text style={styles.searchMacros}>
                            P: {food.protein}g | C: {food.carbohydrates}g | F: {food.fat}g
                          </Text>
                        </View>
                        <Badge label={food.category} variant="neutral" />
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))
              ) : searchQuery ? (
                <Text style={styles.noResultsText}>No foods found matching "{searchQuery}"</Text>
              ) : (
                <Text style={styles.searchHintText}>
                  Type above to search across verified system foods and organisation items.
                </Text>
              )}

              {/* Log Food Modal */}
              {selectedFood && (
                <Modal visible={!!selectedFood} transparent animationType="slide">
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <Text style={styles.modalTitle}>Log {selectedFood.name}</Text>
                      <Text style={styles.modalSubtitle}>
                        Per serving ({selectedFood.servingSize} {selectedFood.servingUnit}): {selectedFood.calories} kcal
                      </Text>

                      <Text style={styles.inputLabel}>Meal Type</Text>
                      <View style={styles.mealTypeButtons}>
                        {['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_WORKOUT', 'POST_WORKOUT'].map((mt) => (
                          <TouchableOpacity
                            key={mt}
                            onPress={() => setLogMealType(mt)}
                            style={[
                              styles.mealTypeBtn,
                              logMealType === mt && styles.mealTypeBtnActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.mealTypeBtnText,
                                logMealType === mt && styles.mealTypeBtnTextActive,
                              ]}
                            >
                              {mt}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={styles.inputLabel}>Quantity ({selectedFood.servingUnit})</Text>
                      <TextInput
                        style={styles.modalInput}
                        keyboardType="numeric"
                        value={logQuantity}
                        onChangeText={setLogQuantity}
                      />

                      <View style={styles.modalActions}>
                        <Button
                          title="Cancel"
                          variant="ghost"
                          onPress={() => setSelectedFood(null)}
                          style={{ flex: 1, marginRight: spacing[2] }}
                        />
                        <Button
                          title={loggingFood ? 'Saving...' : 'Confirm Log'}
                          variant="primary"
                          onPress={submitFoodLog}
                          style={{ flex: 1 }}
                        />
                      </View>
                    </View>
                  </View>
                </Modal>
              )}
            </View>
          )}

          {/* TAB 4: MEAL PLAN */}
          {activeTab === 'meal_plan' && (
            <View>
              <Text style={styles.sectionHeading}>ACTIVE MEAL PLAN</Text>
              {!mealPlan ? (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No Active Meal Plan Assigned</Text>
                  <Text style={styles.emptySubtext}>
                    Ask your trainer or gym manager to assign an organisation meal plan to your profile.
                  </Text>
                </Card>
              ) : (
                <View>
                  <Card style={styles.planOverviewCard}>
                    <Text style={styles.planName}>{mealPlan.mealPlan.name}</Text>
                    {mealPlan.mealPlan.description && (
                      <Text style={styles.planDesc}>{mealPlan.mealPlan.description}</Text>
                    )}
                    <Text style={styles.planMeta}>
                      Pattern: {mealPlan.mealPlan.dietaryPattern || 'Standard'} • Duration: {mealPlan.mealPlan.durationDays} Days
                    </Text>
                  </Card>

                  {mealPlan.mealPlan.days?.map((day) => (
                    <Card key={day.id} style={styles.dayCard}>
                      <Text style={styles.dayTitle}>{day.dayName || `Day ${day.dayNumber}`}</Text>
                      {day.meals?.map((meal) => (
                        <View key={meal.id} style={styles.planMealRow}>
                          <Text style={styles.planMealName}>{meal.name} ({meal.mealType})</Text>
                          {meal.items?.map((item, idx) => (
                            <Text key={idx} style={styles.planItemText}>
                              • {item.food.name} — {item.quantity} {item.unit} ({item.calories} kcal)
                            </Text>
                          ))}
                        </View>
                      ))}
                    </Card>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* TAB 5: TARGETS & PROFILE */}
          {activeTab === 'targets' && (
            <View>
              <Text style={styles.sectionHeading}>CONFIGURED TARGETS</Text>
              <Card style={styles.targetCard}>
                <View style={styles.targetRow}>
                  <Text style={styles.targetProp}>Daily Calories</Text>
                  <Text style={styles.targetVal}>{target?.dailyCalories || 2000} kcal</Text>
                </View>
                <View style={styles.targetRow}>
                  <Text style={styles.targetProp}>Protein</Text>
                  <Text style={styles.targetVal}>{target?.proteinGrams || 150} g</Text>
                </View>
                <View style={styles.targetRow}>
                  <Text style={styles.targetProp}>Carbohydrates</Text>
                  <Text style={styles.targetVal}>{target?.carbohydrateGrams || 200} g</Text>
                </View>
                <View style={styles.targetRow}>
                  <Text style={styles.targetProp}>Fats</Text>
                  <Text style={styles.targetVal}>{target?.fatGrams || 65} g</Text>
                </View>
                <View style={styles.targetRow}>
                  <Text style={styles.targetProp}>Water</Text>
                  <Text style={styles.targetVal}>{target?.waterMl || 2500} ml</Text>
                </View>
                <View style={styles.targetRow}>
                  <Text style={styles.targetProp}>Source</Text>
                  <Badge label={target?.source || 'DEFAULT'} variant="neutral" />
                </View>
              </Card>

              {/* Dietary Profile & Allergies */}
              <Text style={[styles.sectionHeading, { marginTop: spacing[5] }]}>DIETARY PREFERENCES</Text>
              <Card style={styles.profileCard}>
                <Text style={styles.profileItem}>Dietary Pattern: {profile?.dietaryPattern || 'OMNIVORE'}</Text>
                <Text style={styles.profileItem}>Activity Level: {profile?.activityLevel || 'MODERATELY_ACTIVE'}</Text>
                <Text style={styles.profileItem}>Nutrition Goal: {profile?.nutritionGoal || 'MAINTENANCE'}</Text>

                {profile?.allergies && profile.allergies.length > 0 && (
                  <View style={styles.prefSection}>
                    <Text style={styles.prefHeading}>Declared Allergies:</Text>
                    <View style={styles.badgeRow}>
                      {profile.allergies.map((a, i) => (
                        <Badge key={i} label={a} variant="danger" style={{ marginRight: spacing[1] }} />
                      ))}
                    </View>
                  </View>
                )}

                {profile?.intolerances && profile.intolerances.length > 0 && (
                  <View style={styles.prefSection}>
                    <Text style={styles.prefHeading}>Intolerances:</Text>
                    <View style={styles.badgeRow}>
                      {profile.intolerances.map((it, i) => (
                        <Badge key={i} label={it} variant="warning" style={{ marginRight: spacing[1] }} />
                      ))}
                    </View>
                  </View>
                )}
              </Card>
            </View>
          )}

          {/* TAB 6: TRENDS & HISTORY */}
          {activeTab === 'history' && trends && (
            <View>
              <Text style={styles.sectionHeading}>7-DAY AVERAGES</Text>
              <Card style={styles.trendHeroCard}>
                <View style={styles.trendAvgRow}>
                  <View style={styles.trendAvgBox}>
                    <Text style={styles.trendAvgNum}>{trends.averages?.calories || 0}</Text>
                    <Text style={styles.trendAvgLabel}>KCAL / DAY</Text>
                  </View>
                  <View style={styles.trendAvgBox}>
                    <Text style={styles.trendAvgNum}>{trends.averages?.protein || 0}g</Text>
                    <Text style={styles.trendAvgLabel}>PROTEIN / DAY</Text>
                  </View>
                  <View style={styles.trendAvgBox}>
                    <Text style={styles.trendAvgNum}>{(trends.averages?.waterMl / 1000).toFixed(1)}L</Text>
                    <Text style={styles.trendAvgLabel}>WATER / DAY</Text>
                  </View>
                </View>
              </Card>

              <Text style={[styles.sectionHeading, { marginTop: spacing[4] }]}>RECENT DAYS</Text>
              {trends.days?.map((day: any, i: number) => (
                <Card key={i} style={styles.dayHistoryCard}>
                  <View style={styles.dayHistoryRow}>
                    <View>
                      <Text style={styles.dayDate}>{day.date}</Text>
                      <Text style={styles.daySummaryText}>
                        {day.totalCalories} kcal • P: {day.totalProtein}g | C: {day.totalCarbohydrates}g | F: {day.totalFat}g
                      </Text>
                    </View>
                    <Badge
                      label={`${day.calorieAdherencePct}%`}
                      variant={day.calorieAdherencePct >= 90 ? 'accent' : 'neutral'}
                    />
                  </View>
                </Card>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  clientSubheading: {
    ...typography.caption,
    color: themeColors.accent,
  },
  tabsContainer: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  container: {
    padding: spacing[4],
    paddingBottom: spacing[16],
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
  },
  loadingText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginTop: spacing[3],
  },
  errorText: {
    ...typography.body,
    color: themeColors.danger,
    textAlign: 'center',
  },
  heroCard: {
    padding: spacing[4],
    backgroundColor: themeColors.surface,
    marginBottom: spacing[3],
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calorieBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieBigNumber: {
    ...typography.h2,
    color: themeColors.accent,
    fontSize: 36,
  },
  calorieLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    letterSpacing: 1,
  },
  calorieDetails: {
    flex: 1,
    marginLeft: spacing[6],
  },
  targetLabel: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
  },
  remainingLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  adherenceBadge: {
    marginTop: spacing[2],
    alignSelf: 'flex-start',
  },
  macrosCard: {
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  sectionHeading: {
    ...typography.caption,
    color: themeColors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing[2],
  },
  macroRow: {
    marginBottom: spacing[3],
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  macroName: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
  },
  macroValue: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: themeColors.surfaceActive,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  macroPercent: {
    ...typography.caption,
    color: themeColors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
  hydrationCard: {
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  hydrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  hydrationTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  hydrationSubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  hydrationBigNumber: {
    ...typography.h2,
    color: themeColors.primary,
  },
  waterButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  waterBtn: {
    flex: 1,
    marginHorizontal: 3,
  },
  mealCard: {
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealCalories: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: themeColors.accent,
  },
  mealMacroSub: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
    marginBottom: spacing[2],
  },
  foodItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  foodItemName: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
  },
  foodItemQuantity: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  emptyCard: {
    padding: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  emptySubtext: {
    ...typography.caption,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginTop: spacing[1],
  },
  tabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  logCard: {
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  logCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logFoodName: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginTop: spacing[1],
  },
  logFoodDetails: {
    ...typography.caption,
    color: themeColors.accent,
  },
  logMacros: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    padding: spacing[2],
  },
  searchInput: {
    height: 48,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    color: themeColors.textPrimary,
    marginBottom: spacing[3],
  },
  searchResultCard: {
    padding: spacing[3],
    marginBottom: spacing[1],
  },
  searchResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchFoodName: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  searchFoodDetails: {
    ...typography.caption,
    color: themeColors.accent,
  },
  searchMacros: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  noResultsText: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginTop: spacing[3],
  },
  searchHintText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginTop: spacing[3],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing[4],
  },
  modalContent: {
    backgroundColor: themeColors.surface,
    borderRadius: radius.lg,
    padding: spacing[5],
  },
  modalTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  modalSubtitle: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginBottom: spacing[3],
  },
  inputLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    color: themeColors.textPrimary,
    marginBottom: spacing[3],
  },
  mealTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing[2],
  },
  mealTypeBtn: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    backgroundColor: themeColors.surfaceActive,
    marginRight: spacing[1],
    marginBottom: spacing[1],
  },
  mealTypeBtnActive: {
    backgroundColor: themeColors.primary,
  },
  mealTypeBtnText: {
    ...typography.caption,
    color: themeColors.textSecondary,
  },
  mealTypeBtnTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[3],
  },
  planOverviewCard: {
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  planName: {
    ...typography.h3,
    color: themeColors.textPrimary,
  },
  planDesc: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginTop: spacing[1],
  },
  planMeta: {
    ...typography.caption,
    color: themeColors.accent,
    marginTop: spacing[2],
  },
  dayCard: {
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  dayTitle: {
    ...typography.body,
    fontWeight: '700',
    color: themeColors.textPrimary,
    marginBottom: spacing[1],
  },
  planMealRow: {
    marginTop: spacing[1],
  },
  planMealName: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: themeColors.accent,
  },
  planItemText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginLeft: spacing[2],
  },
  targetCard: {
    padding: spacing[4],
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  targetProp: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
  },
  targetVal: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: 'bold',
  },
  profileCard: {
    padding: spacing[4],
  },
  profileItem: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    marginBottom: spacing[1],
  },
  prefSection: {
    marginTop: spacing[2],
  },
  prefHeading: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginBottom: spacing[1],
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  trendHeroCard: {
    padding: spacing[4],
  },
  trendAvgRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  trendAvgBox: {
    alignItems: 'center',
  },
  trendAvgNum: {
    ...typography.h2,
    color: themeColors.accent,
  },
  trendAvgLabel: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  dayHistoryCard: {
    padding: spacing[3],
    marginBottom: spacing[1],
  },
  dayHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayDate: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  daySummaryText: {
    ...typography.caption,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
});
