export const Colors = {
  // Warm, low-glare surfaces with a clear ink hierarchy.
  background: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceHighlight: '#F0F1F7',
  surfaceSubtle: '#FAFAFC',
  card: '#FFFFFF',
  cardBorder: '#E7E8F0',
  cardBorderHover: '#D5D7E4',

  // Vivid Red Accent - Selective, punchy, high-tech
  primary: '#5B4BDB',
  primaryHover: '#4939C4',
  primarySubtle: '#F0EDFF',
  primaryBorder: '#D8D1FF',
  primaryGlow: 'rgba(91, 75, 219, 0.14)',

  // Secondary Accents
  accentCyan: '#087E8B',
  accentCyanSubtle: '#E6F6F7',
  accentPurple: '#7254C8',
  accentPurpleSubtle: '#F0ECFA',
  accentGreen: '#18835B',
  accentGreenSubtle: '#E7F5EE',
  accentAmber: '#A86A0A',
  accentAmberSubtle: '#FFF4DF',

  // Typography - High contrast readability
  textPrimary: '#1D2030',
  textSecondary: '#45495B',
  textMuted: '#686D7F',
  textSubtle: '#777C8C',
  textDisabled: '#9A9EAA',
  textOnPrimary: '#FFFFFF',

  // Borders & Dividers
  border: '#E7E8F0',
  borderLight: '#D9DBE6',
  divider: '#EFF0F4',

  // Status Colors
  success: '#18835B',
  successSubtle: '#E7F5EE',
  warning: '#A86A0A',
  warningSubtle: '#FFF4DF',
  error: '#C13F50',
  errorSubtle: '#FBECEE',
  info: '#3769B1',
  infoSubtle: '#EAF1FC',

  // Interactive Overlays
  overlay: 'rgba(29, 32, 48, 0.52)',
  skeleton: '#E8E9F0',
  skeletonHighlight: '#F3F4F8',
};

// Paired light palette for screens that opt into the system color scheme.
// Keep semantic names aligned with `Colors` so components can share styles.
export const LightColors = {
  ...Colors,
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceHighlight: '#F1F2F5',
  surfaceSubtle: '#F8F8FA',
  card: '#FFFFFF',
  cardBorder: '#E5E7EB',
  cardBorderHover: '#D1D5DB',
  primary: '#C92F32',
  primaryHover: '#A92327',
  primarySubtle: '#C92F3214',
  primaryBorder: '#C92F3240',
  primaryGlow: 'rgba(201, 47, 50, 0.14)',
  textPrimary: '#17191F',
  textSecondary: '#444955',
  textMuted: '#646B78',
  textSubtle: '#747B87',
  textDisabled: '#9AA0AA',
  border: '#E5E7EB',
  borderLight: '#D8DBE1',
  divider: '#ECEEF1',
  overlay: 'rgba(18, 20, 25, 0.48)',
  skeleton: '#E6E8EC',
  skeletonHighlight: '#F1F2F5',
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
  display: 34,
  title1: 28,
  title2: 23,
  title3: 18,
  headline: 16,
  body: 15,
  subhead: 14,
  footnote: 13,
  caption: 12,
  lineHeights: { body: 23, compact: 19, title: 31 },

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
