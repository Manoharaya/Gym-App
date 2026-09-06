/**
 * FitCore Global Color Tokens
 * Premium, modern, athletic aesthetic combining Apple-level minimalism
 * and luxury fitness technology.
 */

export const colors = {
  // Brand Athletic Primaries
  primary: '#E63946',
  primaryHover: '#D62828',
  primaryLight: 'rgba(230, 57, 70, 0.15)',
  primaryGlow: 'rgba(230, 57, 70, 0.35)',

  // Electric Athletic Accents (Sky / Cyan)
  accent: '#0EA5E9',
  accentHover: '#0284C7',
  accentLight: 'rgba(14, 165, 233, 0.15)',
  accentGlow: 'rgba(14, 165, 233, 0.3)',

  // Intelligent AI Accents (Violet / Indigo)
  aiPrimary: '#8B5CF6',
  aiSecondary: '#6366F1',
  aiGradientStart: '#8B5CF6',
  aiGradientEnd: '#4F46E5',
  aiLight: 'rgba(139, 92, 246, 0.15)',
  aiGlow: 'rgba(139, 92, 246, 0.35)',

  // Secondary Accents
  secondary: '#1D3557',
  secondaryLight: '#457B9D',

  // Dark Canvas & Surfaces (Obsidian & Deep Space Slate)
  background: '#0B0E14',
  surface: '#141822',
  surfaceHover: '#1B2130',
  surfaceActive: '#232B3E',
  surfaceElevated: '#1F2738',
  card: '#141822',
  cardBorder: '#232B3E',
  modal: '#1A2130',

  // Light Mode Tokens (Porcelain & Slate)
  lightBackground: '#F8FAFC',
  lightSurface: '#FFFFFF',
  lightSurfaceHover: '#F1F5F9',
  lightBorder: '#E2E8F0',
  lightCard: '#FFFFFF',
  lightTextPrimary: '#0F172A',
  lightTextSecondary: '#475569',
  lightTextMuted: '#94A3B8',

  // Borders & Dividers
  border: '#232B3E',
  borderLight: '#333E54',
  divider: '#1E2535',

  // Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0B0E14',

  // Status, Feedback & Biometrics
  success: '#10B981',
  successBackground: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningBackground: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444',
  dangerBackground: 'rgba(239, 68, 68, 0.15)',
  info: '#38BDF8',
  infoBackground: 'rgba(56, 189, 248, 0.15)',

  // Biometric & Fitness Metric Status
  heartRate: '#F43F5E',
  recoveryOptimal: '#10B981',
  recoveryModerate: '#F59E0B',
  recoveryLow: '#EF4444',
  caloriesBurned: '#FB923C',
  activeMinutes: '#38BDF8',
  streakFire: '#F97316',
} as const;

export type ColorToken = keyof typeof colors;
