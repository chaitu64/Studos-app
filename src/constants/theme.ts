export const Colors = {
  background: '#0D1017',
  surface: '#131720',
  surfaceElevated: '#181D27',
  surfaceHighlight: '#202633',
  surfaceSubtle: '#11151D',
  card: '#151A24',
  cardBorder: '#272E3A',
  cardBorderHover: '#353E4D',

  primary: '#C05550',
  primaryHover: '#A94440',
  primarySubtle: '#2A1D20',
  primaryBorder: '#593238',
  primaryGlow: 'rgba(192, 85, 80, 0.16)',

  // Secondary Accents
  accentCyan: '#61B9C1',
  accentCyanSubtle: '#17292E',
  accentPurple: '#A696E8',
  accentPurpleSubtle: '#28233B',
  accentGreen: '#72C69B',
  accentGreenSubtle: '#192C25',
  accentAmber: '#E1B66E',
  accentAmberSubtle: '#302719',

  // Typography - High contrast readability
  textPrimary: '#F2F3F6',
  textSecondary: '#C4CAD4',
  textMuted: '#9AA3B2',
  textSubtle: '#7D8797',
  textDisabled: '#626B79',
  textOnPrimary: '#FFFFFF',

  // Borders & Dividers
  border: '#272E3A',
  borderLight: '#353E4D',
  divider: '#222833',

  // Status Colors
  success: '#72C69B',
  successSubtle: '#192C25',
  warning: '#E1B66E',
  warningSubtle: '#302719',
  error: '#EE8585',
  errorSubtle: '#321F24',
  info: '#86AEE8',
  infoSubtle: '#1D293A',

  // Interactive Overlays
  overlay: 'rgba(4, 6, 10, 0.72)',
  skeleton: '#202633',
  skeletonHighlight: '#2A3240',
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
  bold: '600' as const,
  semiBold: '500' as const,
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
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },
  primaryGlow: {
    shadowColor: '#D7655F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 3,
  },
};
