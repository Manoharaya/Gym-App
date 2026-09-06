import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../../../components/primitives/Text';
import { themeColors } from '../../../theme';

interface StepHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
}

export const StepHeader: React.FC<StepHeaderProps> = ({
  title,
  subtitle,
  badge,
}) => {
  return (
    <View style={styles.container}>
      {badge && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  badgeText: {
    color: themeColors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: '#A3A3A3',
    fontSize: 15,
    lineHeight: 22,
  },
});
