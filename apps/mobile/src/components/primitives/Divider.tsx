import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { spacing, themeColors } from '../../theme';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  spacingSize?: 1 | 2 | 3 | 4 | 5 | 6;
  style?: StyleProp<ViewStyle>;
  color?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  spacingSize = 3,
  style,
  color = themeColors.divider,
}) => {
  const margin = spacing[spacingSize] || spacing[3];

  if (orientation === 'vertical') {
    return (
      <View
        style={[styles.vertical, { backgroundColor: color, marginHorizontal: margin }, style]}
      />
    );
  }

  return (
    <View style={[styles.horizontal, { backgroundColor: color, marginVertical: margin }, style]} />
  );
};

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: '100%',
  },
  vertical: {
    width: 1,
    height: '100%',
  },
});
