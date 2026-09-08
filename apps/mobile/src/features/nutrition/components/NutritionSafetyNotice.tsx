import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { spacing, radius } from '../../../theme';

export interface NutritionSafetyNoticeProps {
  urgent?: boolean;
  message?: string;
  category?: string;
}

export const NutritionSafetyNotice: React.FC<NutritionSafetyNoticeProps> = ({
  urgent = false,
  message,
  category,
}) => {
  const getIcon = () => {
    if (urgent) return '🚨';
    if (category === 'ALLERGEN_VIOLATION') return '⚠️';
    if (category === 'EATING_DISORDER') return '💙';
    return '🛡️';
  };

  const getTitle = () => {
    if (urgent) return 'Clinical Safety Intervention';
    if (category === 'ALLERGEN_VIOLATION') return 'Strict Allergen Protection';
    if (category === 'EATING_DISORDER') return 'Health & Well-being Notice';
    return 'Nutrition Safety & Medical Boundary';
  };

  return (
    <View style={[styles.container, urgent && styles.urgentContainer]}>
      <Text style={styles.icon}>{getIcon()}</Text>
      <View style={styles.textWrap}>
        <Text style={[styles.title, urgent && styles.urgentTitle]}>{getTitle()}</Text>
        <Text style={styles.description}>
          {message ||
            'FitCore AI provides nutritional guidance for educational purposes only. It does not replace medical advice, medical nutrition therapy, or professional dietetic care.'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderRadius: radius.md,
    padding: spacing[3],
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    borderWidth: 1,
    borderColor: '#334155',
  },
  urgentContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  icon: {
    fontSize: 20,
    marginRight: spacing[2],
    marginTop: 2,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 2,
  },
  urgentTitle: {
    color: '#F87171',
  },
  description: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 17,
  },
});
