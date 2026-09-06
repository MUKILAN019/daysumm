import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface DigestReadyBannerProps {
  onPress: () => void;
}

export function DigestReadyBanner({ onPress }: DigestReadyBannerProps) {
  const { colors, isDark } = useTheme();

  const bannerStyle: ViewStyle = {
    backgroundColor: isDark ? colors.Surface : colors.TextDark,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? colors.Border : undefined,
  };

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.banner, bannerStyle]}>
      <Text style={[styles.text, { color: colors.TextPrimary }]}>🔔 Your digest is ready — tap to view</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 50,
    elevation: 8,
  },
  text: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});