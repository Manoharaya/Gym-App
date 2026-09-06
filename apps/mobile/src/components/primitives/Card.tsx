import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { dimensions, radius, shadows, spacing, themeColors } from '../../theme';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  elevated?: boolean;
  bordered?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  elevated = true,
  bordered = true,
  accessibilityLabel,
  testID,
}) => {
  const cardStyle = [styles.card, elevated && shadows.sm, bordered && styles.bordered, style];

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={cardStyle}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing[4],
  },
  bordered: {
    borderWidth: dimensions.cardBorderWidth,
    borderColor: themeColors.border,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
