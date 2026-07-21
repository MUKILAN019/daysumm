import { StyleSheet, Text, View } from 'react-native';
import { Flame } from 'lucide-react-native';

interface StreakBadgeProps {
  currentStreak: number;
}

export function StreakBadge({ currentStreak }: StreakBadgeProps) {
  if (currentStreak === 0) return null;

  return (
    <View style={styles.badge}>
      <Flame size={16} color="#EAB308" style={{ marginRight: 4 }} />
      <Text style={styles.text}>{currentStreak}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: '#FEF9C3',
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  text: { fontSize: 13, fontWeight: '700', color: '#A16207' },
});