export const Colors = {
  // Backgrounds - Dark charcoal & deep near-black
  background: '#090A0F',
  surface: '#11151F',
  surfaceElevated: '#171D2D',
  surfaceHighlight: '#1E2638',
  surfaceSubtle: '#141A26',
  card: '#121624',
  cardBorder: '#252C3D',
  cardBorderHover: '#2E3D5B',

  // Vivid Red Accent - Selective, punchy, high-tech
  primary: '#FF4545',
  primaryHover: '#E02D22',
  primarySubtle: '#FF3B301A',
  primaryBorder: '#FF3B304D',
  primaryGlow: 'rgba(255, 59, 48, 0.25)',

  // Secondary Accents
  accentCyan: '#06B6D4',
  accentCyanSubtle: '#06B6D41A',
  accentPurple: '#8B5CF6',
  accentPurpleSubtle: '#8B5CF61A',
  accentGreen: '#10B981',
  accentGreenSubtle: '#10B9811A',
  accentAmber: '#F59E0B',
  accentAmberSubtle: '#F59E0B1A',

  // Typography - High contrast readability
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textSubtle: '#64748B',
  textDisabled: '#475569',
  textOnPrimary: '#FFFFFF',

  // Borders & Dividers
  border: '#1E2536',
  borderLight: '#2A344A',
  divider: '#161C2A',

  // Status Colors
  success: '#10B981',
  successSubtle: '#10B9811A',
  warning: '#F59E0B',
  warningSubtle: '#F59E0B1A',
  error: '#EF4444',
  errorSubtle: '#EF44441A',
  info: '#3B82F6',
  infoSubtle: '#3B82F61A',

  // Interactive Overlays
  overlay: 'rgba(5, 7, 10, 0.85)',
  skeleton: '#1A2130',
  skeletonHighlight: '#242F45',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  screenPadding: 16,
};

export const Typography = {
  // Font sizes
  display: 32,
  title1: 26,
  title2: 22,
  title3: 18,
  headline: 16,
  body: 14,
  subhead: 13,
  footnote: 12,
  caption: 11,

  // Weights
  bold: '700' as const,
  semiBold: '600' as const,
  medium: '500' as const,
  regular: '400' as const,
};

export const BorderRadius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Shadows = {
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryGlow: {
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
};
