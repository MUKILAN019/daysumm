import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { Typography, Spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import type { ReactNode } from 'react';

interface GlobalHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
}

export function GlobalHeader({ title, subtitle, onBack, rightAction }: GlobalHeaderProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + Spacing.xs, 44);
  const { isDark, colors } = useTheme();

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.left}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255, 255, 255, 0.7)',
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(229, 231, 235, 0.5)' },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ChevronLeft size={24} strokeWidth={1.75} color={colors.TextPrimary} />
          </Pressable>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}
      </View>

      <View style={styles.center}>
        <Text style={[styles.title, { color: colors.TextPrimary }]} numberOfLines={1}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.TextSecondary }]} numberOfLines={1}>{subtitle}</Text>
        )}
      </View>

      <View style={styles.right}>
        {rightAction ? rightAction : <View style={styles.rightPlaceholder} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.sm,
    backgroundColor: 'transparent',
  },
  left: {
    flex: 1,
    alignItems: 'flex-start',
  },
  center: {
    flex: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    flex: 1,
    alignItems: 'flex-end',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  backButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  rightPlaceholder: {
    width: 44,
    height: 44,
  },
  title: {
    ...Typography.ScreenTitle,
    fontSize: 24,
    lineHeight: 24 * 1.4,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.Secondary,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 2,
  },
});
