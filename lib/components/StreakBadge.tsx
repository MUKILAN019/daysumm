import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Flame } from 'lucide-react-native';
import { Colors } from '../theme/tokens';

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
  let bg = '#FFF0F3';
  let border = '#FFE4E9';
  let flameColor = Colors.Accent;
  let textColor = '#BE123C';
  let glowColor = '#F59E0B';

  if (currentStreak >= 100) {
    bg = '#FFEDD5';
    border = '#F97316';
    flameColor = '#EA580C';
    textColor = '#C2410C';
    glowColor = '#F97316';
  } else if (currentStreak >= 30) {
    bg = '#FEF9C3';
    border = '#EAB308';
    flameColor = '#D97706';
    textColor = '#854D0E';
    glowColor = '#EAB308';
  } else if (currentStreak >= 7) {
    bg = '#FEF3C7';
    border = '#F59E0B';
    flameColor = '#EA580C';
    textColor = '#B45309';
    glowColor = '#F59E0B';
  }

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