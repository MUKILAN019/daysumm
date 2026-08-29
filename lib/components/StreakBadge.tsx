import { StyleSheet, Text, View } from 'react-native';
import { Flame } from 'lucide-react-native';
import { Colors } from '../theme/tokens';

interface StreakBadgeProps {
  currentStreak: number;
}

export function StreakBadge({ currentStreak }: StreakBadgeProps) {
  if (currentStreak === 0) return null;

  return (
    <View style={styles.badge}>
      <Flame size={16} color={Colors.Accent} style={{ marginRight: 4 }} />
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
    backgroundColor: '#FFF0F3',
    borderWidth: 1,
    borderColor: '#FFE4E9',
  },
  text: { fontSize: 13, fontWeight: '700', color: '#BE123C' },
});