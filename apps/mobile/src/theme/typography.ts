import { fontSizes, lineHeights, fontWeights } from '@fitcore/ui';
import { TextStyle, Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const typography: Record<string, TextStyle> = {
  h1: {
    fontFamily,
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights['3xl'],
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily,
    fontSize: fontSizes['2xl'],
    lineHeight: lineHeights['2xl'],
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    fontWeight: fontWeights.semibold,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.medium,
    color: '#9CA3AF',
  },
  body: {
    fontFamily,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.regular,
    color: '#FFFFFF',
  },
  bodySmall: {
    fontFamily,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.regular,
    color: '#9CA3AF',
  },
  caption: {
    fontFamily,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.medium,
    color: '#6B7280',
    letterSpacing: 0.2,
  },
  button: {
    fontFamily,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.3,
  },
  metric: {
    fontFamily,
    fontSize: fontSizes['4xl'],
    lineHeight: lineHeights['4xl'],
    fontWeight: fontWeights.extrabold,
    color: '#FFFFFF',
    letterSpacing: -1,
  },
};
