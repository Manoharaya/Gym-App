import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { spacing, radius } from '../../theme';

export interface AIThinkingStateProps {
  message?: string;
}

export const AIThinkingState: React.FC<AIThinkingStateProps> = ({
  message = 'AI is analyzing your fitness data...',
}) => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.shimmerBox, { opacity: pulseAnim }]}>
        <View style={styles.headerRow}>
          <View style={styles.sparkleIcon}>
            <Text style={styles.sparkleText}>✨</Text>
          </View>
          <Text style={styles.message}>{message}</Text>
        </View>
        <View style={styles.bar1} />
        <View style={styles.bar2} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[4],
    width: '100%',
  },
  shimmerBox: {
    backgroundColor: '#1E293B',
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sparkleIcon: {
    marginRight: spacing[2],
  },
  sparkleText: {
    fontSize: 16,
  },
  message: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  bar1: {
    height: 12,
    backgroundColor: '#334155',
    borderRadius: radius.sm,
    width: '90%',
    marginBottom: spacing[2],
  },
  bar2: {
    height: 12,
    backgroundColor: '#334155',
    borderRadius: radius.sm,
    width: '65%',
  },
});
