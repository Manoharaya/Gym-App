import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { dimensions, radius, spacing, themeColors, typography } from '../../theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  containerStyle,
  inputStyle,
  leftIcon,
  rightIcon,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text accessible accessibilityRole="text" style={styles.label}>
          {label}
        </Text>
      ) : null}

      <View
        style={[styles.inputContainer, isFocused && styles.focused, !!error && styles.errorBorder]}
      >
        {leftIcon ? <View style={styles.iconContainer}>{leftIcon}</View> : null}
        <TextInput
          placeholderTextColor={themeColors.textMuted}
          style={[styles.input, inputStyle]}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={label || props.placeholder}
          {...props}
        />
        {rightIcon ? <View style={styles.iconContainer}>{rightIcon}</View> : null}
      </View>

      {error ? (
        <Text accessible accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  label: {
    ...typography.bodySmall,
    color: themeColors.textSecondary,
    marginBottom: spacing[2],
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.inputBackground,
    borderWidth: 1,
    borderColor: themeColors.inputBorder,
    borderRadius: radius.md,
    minHeight: dimensions.minTouchTarget,
    paddingHorizontal: spacing[3],
  },
  focused: {
    borderColor: themeColors.inputBorderFocused,
  },
  errorBorder: {
    borderColor: themeColors.danger,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: themeColors.textPrimary,
    minHeight: dimensions.minTouchTarget,
    paddingVertical: spacing[2],
  },
  iconContainer: {
    marginHorizontal: spacing[1],
  },
  errorText: {
    ...typography.caption,
    color: themeColors.danger,
    marginTop: spacing[1],
  },
  hintText: {
    ...typography.caption,
    color: themeColors.textMuted,
    marginTop: spacing[1],
  },
});
