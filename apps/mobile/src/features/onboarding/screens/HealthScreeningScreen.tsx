import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { StepHeader } from '../components/StepHeader';
import { StepFooter } from '../components/StepFooter';
import { themeColors } from '../../../theme';

interface HealthScreeningScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export const HealthScreeningScreen: React.FC<HealthScreeningScreenProps> = ({
  onNext,
  onBack,
}) => {
  const [activityLevel, setActivityLevel] = useState<string>('MODERATELY_ACTIVE');
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['STRENGTH']);

  const activityLevels = [
    { key: 'SEDENTARY', title: 'Sedentary', desc: 'Little to no regular exercise' },
    { key: 'LIGHTLY_ACTIVE', title: 'Lightly Active', desc: '1–2 light workouts per week' },
    { key: 'MODERATELY_ACTIVE', title: 'Moderately Active', desc: '3–4 workouts per week' },
    { key: 'VERY_ACTIVE', title: 'Very Active', desc: '5+ intense athletic sessions per week' },
  ];

  const goals = [
    'STRENGTH & POWER',
    'CARDIOVASCULAR CONDITIONING',
    'MOBILITY & RECOVERY',
    'ATHLETIC PERFORMANCE',
    'BODY COMPOSITION',
  ];

  const toggleGoal = (g: string) => {
    setSelectedGoals((prev) =>
      prev.includes(g) ? prev.filter((item) => item !== g) : [...prev, g]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <StepHeader
          title="Health & Fitness Baseline"
          subtitle="Help our coaches understand your current physical readiness and fitness targets."
        />

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            ℹ️ This screening is collected for fitness programming and operational safety. FitCore coaches do not provide medical diagnosis.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Current Activity Level</Text>
        {activityLevels.map((lvl) => (
          <TouchableOpacity
            key={lvl.key}
            style={[
              styles.levelCard,
              activityLevel === lvl.key && styles.levelCardSelected,
            ]}
            onPress={() => setActivityLevel(lvl.key)}
            activeOpacity={0.8}
          >
            <View style={styles.levelHeader}>
              <View
                style={[
                  styles.radioDot,
                  activityLevel === lvl.key && styles.radioDotSelected,
                ]}
              />
              <Text style={styles.levelTitle}>{lvl.title}</Text>
            </View>
            <Text style={styles.levelDesc}>{lvl.desc}</Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Primary Fitness Objectives</Text>
        <View style={styles.goalsWrap}>
          {goals.map((g) => {
            const isSelected = selectedGoals.includes(g);
            return (
              <TouchableOpacity
                key={g}
                style={[styles.goalChip, isSelected && styles.goalChipSelected]}
                onPress={() => toggleGoal(g)}
                activeOpacity={0.8}
              >
                <Text style={[styles.goalText, isSelected && styles.goalTextSelected]}>
                  {isSelected ? '✓ ' : '+ '}
                  {g}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <StepFooter onBack={onBack} onNext={onNext} nextLabel="Continue" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 24,
  },
  disclaimerBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: themeColors.primary,
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
  },
  disclaimerText: {
    color: '#93C5FD',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  levelCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  levelCardSelected: {
    borderColor: themeColors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  radioDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#737373',
    marginRight: 10,
  },
  radioDotSelected: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.primary,
  },
  levelTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  levelDesc: {
    color: '#A3A3A3',
    fontSize: 13,
    marginLeft: 26,
  },
  goalsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  goalChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333333',
  },
  goalChipSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: themeColors.primary,
  },
  goalText: {
    color: '#A3A3A3',
    fontSize: 13,
    fontWeight: '600',
  },
  goalTextSelected: {
    color: '#FFFFFF',
  },
});
