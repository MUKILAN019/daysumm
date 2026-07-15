import { Pressable, StyleSheet, Text } from 'react-native';

interface DigestReadyBannerProps {
  onPress: () => void;
}

export function DigestReadyBanner({ onPress }: DigestReadyBannerProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.banner}>
      <Text style={styles.text}>🔔 Your digest is ready — tap to view</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 50,
    elevation: 8,
  },
  text: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});