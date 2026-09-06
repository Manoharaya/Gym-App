import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Button, Badge, Icon, ProgressRing } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

export const NutritionScreen: React.FC = () => {
  const navigation = useNavigation();
  const [waterMl, setWaterMl] = useState(2400);

  const addWater = (amount: number) => {
    setWaterMl((prev) => Math.min(4000, prev + amount));
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nutrition & Fuel</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Calorie Overview Hero */}
        <Card style={styles.heroCard}>
          <View style={styles.heroContent}>
            <ProgressRing
              progress={82}
              size={100}
              strokeWidth={10}
              color={themeColors.accent}
              valueText="2,150"
              label="KCAL"
            />
            <View style={styles.calorieStats}>
              <Text style={styles.calorieTarget}>Daily Target: 2,600 kcal</Text>
              <Text style={styles.calorieRemaining}>450 kcal remaining</Text>
              <Badge label="ANABOLIC SURPLUS" variant="accent" style={styles.surplusBadge} />
            </View>
          </View>
        </Card>

        {/* Macro Distribution */}
        <Card style={styles.macrosCard}>
          <Text style={styles.sectionHeading}>MACRONUTRIENT TARGETS</Text>

          {/* Protein */}
          <View style={styles.macroRow}>
            <View style={styles.macroLabelCol}>
              <Text style={styles.macroName}>Protein</Text>
              <Text style={styles.macroValues}>165g / 190g</Text>
            </View>
            <View style={styles.macroBarTrack}>
              <View style={[styles.macroBarFill, { width: '87%', backgroundColor: themeColors.primary }]} />
            </View>
            <Text style={styles.macroPercent}>87%</Text>
          </View>

          {/* Carbs */}
          <View style={styles.macroRow}>
            <View style={styles.macroLabelCol}>
              <Text style={styles.macroName}>Carbohydrates</Text>
              <Text style={styles.macroValues}>210g / 260g</Text>
            </View>
            <View style={styles.macroBarTrack}>
              <View style={[styles.macroBarFill, { width: '80%', backgroundColor: themeColors.accent }]} />
            </View>
            <Text style={styles.macroPercent}>80%</Text>
          </View>

          {/* Fats */}
          <View style={styles.macroRow}>
            <View style={styles.macroLabelCol}>
              <Text style={styles.macroName}>Healthy Fats</Text>
              <Text style={styles.macroValues}>58g / 70g</Text>
            </View>
            <View style={styles.macroBarTrack}>
              <View style={[styles.macroBarFill, { width: '83%', backgroundColor: themeColors.warning }]} />
            </View>
            <Text style={styles.macroPercent}>83%</Text>
          </View>
        </Card>

        {/* Hydration Tracker */}
        <Card style={styles.hydrationCard}>
          <View style={styles.hydrationHeader}>
            <View>
              <Text style={styles.hydrationTitle}>Daily Hydration</Text>
              <Text style={styles.hydrationSubtitle}>Target: 3.0 Litres</Text>
            </View>
            <Text style={styles.hydrationValue}>{(waterMl / 1000).toFixed(1)} L</Text>
          </View>

          <View style={styles.waterButtonsRow}>
            <Button
              title="+250 ml Glass"
              onPress={() => addWater(250)}
              variant="outline"
              size="sm"
              style={styles.waterBtn}
            />
            <Button
              title="+500 ml Bottle"
              onPress={() => addWater(500)}
              variant="outline"
              size="sm"
              style={styles.waterBtn}
            />
          </View>
        </Card>

        {/* AI Dietary Optimization */}
        <Card style={styles.aiDietCard}>
          <View style={styles.aiDietHeader}>
            <Icon name="sparkles" size={16} color={themeColors.aiPrimary} />
            <Text style={styles.aiDietTitle}>AI NUTRITION RECOMMENDATION</Text>
          </View>
          <Text style={styles.aiDietText}>
            "To optimize muscle protein synthesis following today's 45-minute upper body session, aim
            for 30–35g of slow-digesting protein (casein or greek yogurt) prior to sleep to maximize
            nighttime recovery."
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  backButton: {
    padding: spacing[2],
    marginLeft: -spacing[2],
  },
  headerTitle: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  container: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[10],
  },
  heroCard: {
    padding: spacing[4],
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  calorieStats: {
    flex: 1,
    gap: spacing[1],
  },
  calorieTarget: {
    ...typography.caption,
    color: themeColors.textMuted,
  },
  calorieRemaining: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  surplusBadge: {
    marginTop: spacing[1],
  },
  macrosCard: {
    padding: spacing[4],
    gap: spacing[3.5],
  },
  sectionHeading: {
    ...typography.caption,
    color: themeColors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  macroLabelCol: {
    width: 100,
  },
  macroName: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '600',
  },
  macroValues: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontSize: 11,
  },
  macroBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: themeColors.surface,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  macroPercent: {
    ...typography.caption,
    color: themeColors.textSecondary,
    fontWeight: '700',
    width: 32,
    textAlign: 'right',
  },
  hydrationCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  hydrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hydrationTitle: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  hydrationSubtitle: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: 2,
  },
  hydrationValue: {
    ...typography.h2,
    color: themeColors.accent,
    fontWeight: '800',
  },
  waterButtonsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  waterBtn: {
    flex: 1,
  },
  aiDietCard: {
    backgroundColor: '#121624',
    borderColor: '#2D2254',
    borderWidth: 1,
    padding: spacing[4],
    gap: spacing[2],
  },
  aiDietHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  aiDietTitle: {
    ...typography.caption,
    color: '#A78BFA',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  aiDietText: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
