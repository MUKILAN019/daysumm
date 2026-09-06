export type ThemeColors = typeof Colors;

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

export const FontFamily = {
  Regular: 'PlusJakartaSans_400Regular',
  Medium: 'PlusJakartaSans_500Medium',
  SemiBold: 'PlusJakartaSans_600SemiBold',
  Bold: 'PlusJakartaSans_700Bold',
  ExtraBold: 'PlusJakartaSans_800ExtraBold',
};

export const Typography = {
  Display: {
    fontFamily: FontFamily.ExtraBold,
    fontSize: 32,
    lineHeight: 32 * 1.35,
    letterSpacing: -0.5,
  },

  ScreenTitle: {
    fontFamily: FontFamily.Bold,
    fontSize: 26,
    lineHeight: 26 * 1.35,
    letterSpacing: -0.3,
  },

  SectionHeader: {
    fontFamily: FontFamily.SemiBold,
    fontSize: 19,
    lineHeight: 19 * 1.4,
    letterSpacing: -0.2,
  },

  Body: {
    fontFamily: FontFamily.Medium,
    fontSize: 15,
    lineHeight: 15 * 1.45,
    letterSpacing: 0,
  },

  Secondary: {
    fontFamily: FontFamily.Medium,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    letterSpacing: 0,
  },

  Label: {
    fontFamily: FontFamily.SemiBold,
    fontSize: 12,
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

// ---------------------------------------------------------------------------
// Dark mode palette — deep indigo-black with DaySumm's purple brand preserved
// ---------------------------------------------------------------------------
export const DarkColors: ThemeColors = {
  Primary: '#8B7FF5',
  PrimaryDark: '#5B4FD0',
  PrimaryDeep: '#7A6FE8',
  PrimaryTint: '#2A2456',

  Accent: '#FF7A9C',

  Background: '#0D0C14',
  Surface: '#17162A',
  Card: '#1E1C2E',
  Border: '#2D2B40',

  TextPrimary: '#EEE8FF',
  TextSecondary: '#9E9BB8',
  TextMuted: '#6B6885',

  Divider: '#2D2B40',

  Success: '#2CCF8E',
  Warning: '#F0B040',
  Danger: '#F06878',
  Info: '#38B2E0',

  ProGold: '#F0B040',

  Ink: '#0D0C14',
  White: '#FFFFFF',

  BluePrimary: '#5B91F8',
  BlueDark: '#4478E8',
  BlueLight: '#14203A',
  BlueBorder: '#263A60',

  SlateMuted: '#3D3B50',
  SlateText: '#8A88A0',
  SlateBorder: '#4A4860',
  SlateBg: '#17162A',

  DangerDark: '#E84040',
  DangerDeep: '#D02828',
  DangerBg: '#2A1520',
  DangerBorder: '#8B3040',
  DangerSoftBg: '#351A22',
  DangerBorderSoft: '#7A2C38',

  WarningLight: '#2A2010',
  WarningBg: '#231E0E',
  WarningBorder: '#C07828',
  WarningText: '#E0A848',

  GrayBg: '#0D0C14',
  GraySubtle: '#17162A',
  GrayDisabled: '#3D3B50',
  PrimaryDisabled: '#3D3870',
  TextDark: '#EEE8FF',
  TextSubtle: '#8A88A0',

  TagBlockerBg: '#2A1520',
  TagBlockerText: '#F06878',
  TagBlockerBorder: '#8B3040',

  TagHighlightBg: '#0E2420',
  TagHighlightText: '#2CCF8E',
  TagHighlightBorder: '#1A5A40',

  TagActionBg: '#231E0E',
  TagActionText: '#E0A848',
  TagActionBorder: '#6A5020',

  TagDecisionBg: '#0E1A30',
  TagDecisionText: '#5B91F8',
  TagDecisionBorder: '#1A3060',

  TagNoteBg: '#1E1C2E',
  TagNoteText: '#9E9BB8',
  TagNoteBorder: '#2D2B40',
};

