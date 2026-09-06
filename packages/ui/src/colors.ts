/**
 * FitCore Global Color Tokens
 * Premium, modern, athletic dark-first aesthetic.
 */

export const colors = {
  // Brand Athletic Primaries
  primary: '#E63946',
  primaryHover: '#D62828',
  primaryLight: 'rgba(230, 57, 70, 0.15)',

  // Secondary Accents
  secondary: '#1D3557',
  secondaryLight: '#457B9D',

  // Dark Canvas & Surfaces
  background: '#0D0F12',
  surface: '#16191E',
  surfaceHover: '#1F242C',
  surfaceActive: '#282E38',
  card: '#16191E',
  modal: '#1B1F26',

  // Light Mode Fallback Tokens
  lightBackground: '#F8F9FA',
  lightSurface: '#FFFFFF',
  lightBorder: '#E5E7EB',

  // Borders & Dividers
  border: '#2A303C',
  borderLight: '#384252',
  divider: '#222834',

  // Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textInverse: '#0D0F12',

  // Status & Feedback
  success: '#2EC4B6',
  successBackground: 'rgba(46, 196, 182, 0.15)',
  warning: '#FF9F1C',
  warningBackground: 'rgba(255, 159, 28, 0.15)',
  danger: '#E63946',
  dangerBackground: 'rgba(230, 57, 70, 0.15)',
  info: '#457B9D',
  infoBackground: 'rgba(69, 123, 157, 0.15)',
} as const;

export type ColorToken = keyof typeof colors;
