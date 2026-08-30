import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Flame } from 'lucide-react-native';
import { Colors, StreakTokens } from '../theme/tokens';

interface StreakBadgeProps {
  currentStreak: number;
}

export function StreakBadge({ currentStreak }: StreakBadgeProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const isHighStreak = currentStreak >= 7;

  useEffect(() => {
    if (isHighStreak) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isHighStreak, pulseAnim]);

  if (currentStreak === 0) return null;

  // Milestone color schemes
  let tier = StreakTokens.Tier1;
  let flameColor = Colors.Accent;

  if (currentStreak >= 100) {
    tier = StreakTokens.Tier2;
    flameColor = tier.flame;
  } else if (currentStreak >= 30) {
    tier = StreakTokens.Tier3;
    flameColor = tier.flame;
  } else if (currentStreak >= 7) {
    tier = StreakTokens.Tier4;
    flameColor = tier.flame;
  }

  const bg = tier.bg;
  const border = tier.border;
  const textColor = tier.textColor;
  const glowColor = tier.glowColor;

  const glowScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0.1],
  });

  return (
    <View style={styles.container}>
      {isHighStreak && (
        <Animated.View
          style={[
            styles.glowRing,
            {
              backgroundColor: glowColor,
              transform: [{ scale: glowScale }],
              opacity: glowOpacity,
            },
          ]}
        />
      )}
      <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
        <Flame size={16} color={flameColor} style={{ marginRight: 4 }} />
        <Text style={[styles.text, { color: textColor }]}>{currentStreak}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 20,
    borderWidth: 1.2,
  },
  text: {
    fontSize: 13,
    fontWeight: '800',
  },
});