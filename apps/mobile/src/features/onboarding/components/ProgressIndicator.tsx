import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { themeColors } from '../../../theme';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  title?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  title,
}) => {
  const percentage = Math.min(Math.round((currentStep / totalSteps) * 100), 100);

  return (
    <View style={styles.container}>
      <View style={styles.textRow}>
        <Text style={styles.stepLabel}>
          Step {currentStep} of {totalSteps}
        </Text>
        <Text style={styles.percentLabel}>{percentage}%</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percentage}%` }]} />
      </View>

      {title && <Text style={styles.stepTitle}>{title}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: themeColors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stepLabel: {
    color: '#A3A3A3',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  percentLabel: {
    color: themeColors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#333333',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: themeColors.primary,
    borderRadius: 3,
  },
  stepTitle: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
