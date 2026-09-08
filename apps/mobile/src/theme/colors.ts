import { colors as baseColors } from '@fitcore/ui';

export const themeColors = {
  ...baseColors,
  cardBackground: '#141822',
  modalBackground: '#1A2130',
  elevatedBackground: '#1F2738',
  inputBackground: '#0F1219',
  inputBorder: '#232B3E',
  inputBorderFocused: '#0EA5E9',
  badgeBackground: 'rgba(14, 165, 233, 0.15)',
  badgeText: '#38BDF8',
  surfaceHighlight: '#1E293B',
  surfaceLight: '#1A2130',
  textTertiary: '#64748B',
} as const;

export type ThemeColors = typeof themeColors;
