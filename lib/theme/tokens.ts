export const Colors = {
  Primary: '#6C5CE7',
  PrimaryDark: '#2E2470',
  PrimaryDeep: '#4B3FC4',
  PrimaryTint: '#EFECFE',

  Accent: '#FF7A9C',

  /*
   * A softly tinted lavender canvas rather than plain white.
   * This makes the dot grid and foreground content feel intentional
   * without competing with the black cat artwork.
   */
  Background: '#F3F1FA',

  Surface: '#FFFFFF',
  Card: '#FFFFFF',
  Border: '#E5E7EB',

  TextPrimary: '#14131A',
  TextSecondary: '#4B5563',
  TextMuted: '#9CA3AF',

  Divider: '#E5E7EB',

  Success: '#22B07D',
  Warning: '#E8A33D',
  Danger: '#E05561',
  Info: '#0EA5E9',

  ProGold: '#F0A93B',

  Ink: '#14131A',
  White: '#FFFFFF',

  // Action and highlight palette
  BluePrimary: '#2563EB',
  BlueDark: '#1D4ED8',
  BlueLight: '#EFF6FF',
  BlueBorder: '#BFDBFE',

  // Slate neutrals
  SlateMuted: '#CBD5E1',
  SlateText: '#64748B',
  SlateBorder: '#94A3B8',
  SlateBg: '#F1F5F9',

  // Danger and error palette
  DangerDark: '#B91C1C',
  DangerDeep: '#991B1B',
  DangerBg: '#FEF2F2',
  DangerBorder: '#FCA5A5',
  DangerSoftBg: '#FEE2E2',
  DangerBorderSoft: '#FECACA',

  // Warning and amber palette
  WarningLight: '#FFF8D6',
  WarningBg: '#FEF3C7',
  WarningBorder: '#F59E0B',
  WarningText: '#B45309',

  // Extended neutrals
  GrayBg: '#F7F8FA',
  GraySubtle: '#F9FAFB',
  GrayDisabled: '#D1D5DB',
  PrimaryDisabled: '#C7C2F0',
  TextDark: '#111827',
  TextSubtle: '#6B7280',

  // Entry tag colors
  TagBlockerBg: '#FEF2F2',
  TagBlockerText: '#DC2626',
  TagBlockerBorder: '#FCA5A5',

  TagHighlightBg: '#ECFDF5',
  TagHighlightText: '#059669',
  TagHighlightBorder: '#A7F3D0',

  TagActionBg: '#FFFBEB',
  TagActionText: '#D97706',
  TagActionBorder: '#FDE68A',

  TagDecisionBg: '#EFF6FF',
  TagDecisionText: '#2563EB',
  TagDecisionBorder: '#BFDBFE',

  TagNoteBg: '#F3F4F6',
  TagNoteText: '#4B5563',
  TagNoteBorder: '#E5E7EB',
};

export const StreakTokens = {
  Tier1: {
    bg: '#FFF0F3',
    border: '#FFE4E9',
    flame: '#BE123C',
    textColor: '#BE123C',
    glowColor: '#F59E0B',
  },

  Tier2: {
    bg: '#FFEDD5',
    border: '#F97316',
    flame: '#EA580C',
    textColor: '#C2410C',
    glowColor: '#F97316',
  },

  Tier3: {
    bg: '#FEF9C3',
    border: '#EAB308',
    flame: '#D97706',
    textColor: '#854D0E',
    glowColor: '#EAB308',
  },

  Tier4: {
    bg: '#FEF3C7',
    border: '#F59E0B',
    flame: '#EA580C',
    textColor: '#B45309',
    glowColor: '#F59E0B',
  },
};

const fontFamily = 'Roboto';

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
  shadowOffset: {
    width: 0,
    height: 1,
  },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
};
