import { Platform } from 'react-native';

export const Colors = {
  Primary: '#10B981',
  PrimaryDark: '#0F9B75',
  PrimaryDeep: '#047857',
  PrimaryTint: '#ECFDF5',
  Accent: '#34D399',
  Background: '#FFFFFF',
  Surface: '#F9FAFB',
  Card: '#FFFFFF',
  Border: '#E5E7EB',
  TextPrimary: '#0F172A',
  TextSecondary: '#475569',
  TextMuted: '#94A3B8',
  Divider: '#E5E7EB',
  Success: '#10B981',
  Warning: '#F59E0B',
  Danger: '#EF4444',
  Info: '#0EA5E9',
  ProGold: '#D4A24C',
};

const fontFamily = Platform.select({
  ios: 'System', // Uses SF Pro on iOS
  android: 'Roboto', // Uses Roboto on Android
  default: 'System',
});

export const Typography = {
  Display: {
    fontFamily,
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 32 * 1.4,
    letterSpacing: 0,
  },
  ScreenTitle: {
    fontFamily,
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 28 * 1.4,
    letterSpacing: 0,
  },
  SectionHeader: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 20 * 1.4,
    letterSpacing: 0,
  },
  Body: {
    fontFamily,
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 16 * 1.4,
    letterSpacing: 0,
  },
  Secondary: {
    fontFamily,
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 14 * 1.4,
    letterSpacing: 0,
  },
  Label: {
    fontFamily,
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 12 * 1.4,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
};

export const Spacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 40,
  xxl: 48,
  screenPadding: 16,
};

export const Radii = {
  chip: 8,
  card: 16,
  sheet: 24,
  button: 999,
};

export const Elevation = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
};
