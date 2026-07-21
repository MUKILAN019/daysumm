import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Colors, Typography, Spacing } from '../theme/tokens';
import type { ReactNode } from 'react';

interface GlobalHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
}

export function GlobalHeader({ title, subtitle, onBack, rightAction }: GlobalHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <ChevronLeft size={24} strokeWidth={1.75} color={Colors.TextPrimary} />
          </Pressable>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}
      </View>

      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
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
    paddingTop: 60, // Clear status bar
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.Background,
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
    backgroundColor: Colors.Background,
  },
  backButtonPressed: {
    backgroundColor: Colors.Surface,
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
    fontSize: 24, // Override screen title from 28 to 24 per requirement
    lineHeight: 24 * 1.4,
    color: Colors.TextPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.Secondary,
    fontWeight: '400', // Override from 500 to 400 per requirement
    color: Colors.TextSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
});
