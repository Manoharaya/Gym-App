import React from 'react';
import { StyleProp, Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { typography } from '../../theme';

export type TextVariant =
  'h1' | 'h2' | 'h3' | 'subtitle' | 'body' | 'bodySmall' | 'caption' | 'button' | 'metric';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color,
  align,
  style,
  children,
  ...props
}) => {
  const variantStyle = typography[variant] || typography.body;

  return (
    <RNText
      accessible
      allowFontScaling
      style={[
        variantStyle,
        color ? { color } : undefined,
        align ? { textAlign: align } : undefined,
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};
