import { colors as baseColors } from '@fitcore/ui';

export const themeColors = {
  ...baseColors,
  cardBackground: '#16191E',
  modalBackground: '#1A1E24',
  elevatedBackground: '#222832',
  inputBackground: '#12151A',
  inputBorder: '#282E39',
  inputBorderFocused: '#E63946',
  badgeBackground: 'rgba(230, 57, 70, 0.15)',
  badgeText: '#FF4D5E',
} as const;

export type ThemeColors = typeof themeColors;
