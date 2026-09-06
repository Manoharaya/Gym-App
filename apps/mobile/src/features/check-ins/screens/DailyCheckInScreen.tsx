import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Button, Icon, ProgressRing } from '../../../components/primitives';
import { themeColors, typography, spacing, radius } from '../../../theme';

interface ScoreOption {
  label: string;
  value: number;
}

const SCORE_LEVELS: ScoreOption[] = [
  { label: 'Low', value: 1 },
  { label: 'Moderate', value: 2 },
  { label: 'Good', value: 3 },
  { label: 'Optimal', value: 4 },
  { label: 'Peak', value: 5 },
];

export const DailyCheckInScreen: React.FC = () => {
  const navigation = useNavigation();

  const [sleepScore, setSleepScore] = useState(4);
  const [sorenessScore, setSorenessScore] = useState(2);
  const [stressScore, setStressScore] = useState(2);
  const [energyScore, setEnergyScore] = useState(4);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Dynamic readiness algorithm: (Sleep*25 + Energy*25 + (6-Stress)*25 + (6-Soreness)*25) / 5
  const readinessPercent = Math.round(
    ((sleepScore * 20) + (energyScore * 20) + ((6 - stressScore) * 20) + ((6 - sorenessScore) * 20)) / 4,
  );

  const handleSubmit = () => {
    setIsSubmitted(true);
    Alert.alert(
      'Check-In Recorded 🎯',
      `Calculated Readiness: ${readinessPercent}%\n\nFitCore AI has adjusted your target training volume for today.`,
      [{ text: 'Return to Dashboard', onPress: () => navigation.goBack() }],
    );
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']} statusBarStyle="light">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Bio-Check-In</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Dynamic Calculated Readiness Banner */}
        <Card style={styles.readinessCard}>
          <View style={styles.readinessRow}>
            <ProgressRing
              progress={readinessPercent}
              size={80}
              strokeWidth={8}
              color={readinessPercent > 80 ? themeColors.success : themeColors.accent}
              valueText={`${readinessPercent}%`}
              label="SCORE"
            />
            <View style={styles.readinessInfo}>
              <Text style={styles.readinessTitle}>Live Readiness Score</Text>
              <Text style={styles.readinessDesc}>
                {readinessPercent >= 80
                  ? 'High capacity: Green-lighted for progressive overload.'
                  : readinessPercent >= 60
                  ? 'Moderate capacity: Maintain target sets, avoid technical failure.'
                  : 'Low capacity: Active recovery or mobility recommended.'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Metric 1: Sleep Quality */}
        <Card style={styles.metricCard}>
          <Text style={styles.metricTitle}>1. Sleep Quality & Restfulness</Text>
          <View style={styles.optionsRow}>
            {SCORE_LEVELS.map((lvl) => (
              <TouchableOpacity
                key={lvl.value}
                onPress={() => setSleepScore(lvl.value)}
                style={[styles.scoreBtn, sleepScore === lvl.value && styles.scoreBtnSelected]}
              >
                <Text
                  style={[
                    styles.scoreText,
                    sleepScore === lvl.value && styles.scoreTextSelected,
                  ]}
                >
                  {lvl.value}
                </Text>
                <Text style={styles.scoreSubLabel}>{lvl.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Metric 2: Muscle Soreness */}
        <Card style={styles.metricCard}>
          <Text style={styles.metricTitle}>2. Muscle Soreness (DOMS)</Text>
          <View style={styles.optionsRow}>
            {SCORE_LEVELS.map((lvl) => (
              <TouchableOpacity
                key={lvl.value}
                onPress={() => setSorenessScore(lvl.value)}
                style={[styles.scoreBtn, sorenessScore === lvl.value && styles.scoreBtnSelected]}
              >
                <Text
                  style={[
                    styles.scoreText,
                    sorenessScore === lvl.value && styles.scoreTextSelected,
                  ]}
                >
                  {lvl.value}
                </Text>
                <Text style={styles.scoreSubLabel}>{lvl.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Metric 3: Mental Stress */}
        <Card style={styles.metricCard}>
          <Text style={styles.metricTitle}>3. Mental Stress / Work Fatigue</Text>
          <View style={styles.optionsRow}>
            {SCORE_LEVELS.map((lvl) => (
              <TouchableOpacity
                key={lvl.value}
                onPress={() => setStressScore(lvl.value)}
                style={[styles.scoreBtn, stressScore === lvl.value && styles.scoreBtnSelected]}
              >
                <Text
                  style={[
                    styles.scoreText,
                    stressScore === lvl.value && styles.scoreTextSelected,
                  ]}
                >
                  {lvl.value}
                </Text>
                <Text style={styles.scoreSubLabel}>{lvl.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Metric 4: Motivation & Energy */}
        <Card style={styles.metricCard}>
          <Text style={styles.metricTitle}>4. Training Drive & Energy</Text>
          <View style={styles.optionsRow}>
            {SCORE_LEVELS.map((lvl) => (
              <TouchableOpacity
                key={lvl.value}
                onPress={() => setEnergyScore(lvl.value)}
                style={[styles.scoreBtn, energyScore === lvl.value && styles.scoreBtnSelected]}
              >
                <Text
                  style={[
                    styles.scoreText,
                    energyScore === lvl.value && styles.scoreTextSelected,
                  ]}
                >
                  {lvl.value}
                </Text>
                <Text style={styles.scoreSubLabel}>{lvl.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Button
          title={isSubmitted ? 'Saved' : 'Submit Bio-Check-In'}
          onPress={handleSubmit}
          variant="accent"
          size="lg"
          loading={isSubmitted}
          disabled={isSubmitted}
          style={styles.submitBtn}
        />
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
  readinessCard: {
    padding: spacing[4],
    backgroundColor: '#121624',
    borderColor: '#2D2254',
    borderWidth: 1,
  },
  readinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  readinessInfo: {
    flex: 1,
    gap: spacing[1],
  },
  readinessTitle: {
    ...typography.h3,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  readinessDesc: {
    ...typography.caption,
    color: themeColors.textSecondary,
    lineHeight: 18,
  },
  metricCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  metricTitle: {
    ...typography.bodySmall,
    color: themeColors.textPrimary,
    fontWeight: '700',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  scoreBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: themeColors.surface,
    paddingVertical: spacing[2.5],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    gap: 2,
  },
  scoreBtnSelected: {
    backgroundColor: themeColors.accent,
    borderColor: themeColors.accent,
  },
  scoreText: {
    ...typography.h3,
    color: themeColors.textSecondary,
    fontWeight: '700',
  },
  scoreTextSelected: {
    color: '#FFFFFF',
  },
  scoreSubLabel: {
    fontSize: 9,
    color: themeColors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  submitBtn: {
    marginTop: spacing[2],
  },
});
