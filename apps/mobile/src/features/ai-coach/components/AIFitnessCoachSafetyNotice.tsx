import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { spacing, radius } from '../../../theme';

export interface AIFitnessCoachSafetyNoticeProps {
  urgent?: boolean;
  message?: string;
}

export const AIFitnessCoachSafetyNotice: React.FC<AIFitnessCoachSafetyNoticeProps> = ({
  urgent = false,
  message,
}) => {
  return (
    <View style={[styles.container, urgent && styles.urgentContainer]}>
      <Text style={styles.icon}>{urgent ? '🚨' : '🛡️'}</Text>
      <View style={styles.textWrap}>
        <Text style={[styles.title, urgent && styles.urgentTitle]}>
          {urgent ? 'Urgent Medical Notice' : 'Clinical & Safety Notice'}
        </Text>
        <Text style={styles.description}>
          {message ||
            'FitCore AI provides fitness guidance only. It is not authorized to diagnose injuries or provide medical prescriptions. Consult qualified healthcare professionals for medical conditions.'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
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
