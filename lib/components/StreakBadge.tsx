import { StyleSheet, Text, View } from 'react-native';

interface StreakBadgeProps {
  currentStreak: number;
}

export function StreakBadge({ currentStreak }: StreakBadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{currentStreak > 0 ? `🔥 ${currentStreak}` : '🔥 0'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
  },
  text: { fontSize: 14, fontWeight: '700', color: '#92400E' },
});