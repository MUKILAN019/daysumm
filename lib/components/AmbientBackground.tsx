import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

interface AmbientBackgroundProps {
  /** White/light blobs for dark backgrounds (onboarding). */
  isDarkTheme?: boolean;
  /** Set false to disable the slow drift animation (e.g. reduced motion). */
  animated?: boolean;
  /** Global opacity multiplier for the whole ambient layer. */
  intensity?: number;
}

const PRIMARY = '108,92,231';   // #6C5CE7
const ACCENT  = '255,122,156';  // #FF7A9C
const GOLD    = '240,169,59';   // #F0A93B

function useDrift(enabled: boolean, duration: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [enabled, duration, delay, v]);
  return v;
}

export function AmbientBackground({
  isDarkTheme = false,
  animated = true,
  intensity = 1,
}: AmbientBackgroundProps) {
  const a = useDrift(animated, 9000);
  const b = useDrift(animated, 11000, 600);
  const c = useDrift(animated, 13000, 1200);

  const tint = (rgb: string, dark: number, light: number) =>
    `rgba(${rgb},${(isDarkTheme ? dark : light) * intensity})`;

  const move = (v: Animated.Value, x: number, y: number, s = 0.06) => ({
    transform: [
      { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, x] }) },
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, y] }) },
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + s] }) },
    ],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Soft top glow — anchors the header area */}
      <Animated.View
        style={[
          styles.blob,
          styles.blobTop,
          { backgroundColor: tint(PRIMARY, 0.2, 0.16) },
          move(a, 0, 26, 0.08),
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blobRight,
          { backgroundColor: tint(ACCENT, 0.24, 0.16) },
          move(b, -22, 18),
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blobLeft,
          { backgroundColor: tint(GOLD, 0.2, 0.14) },
          move(c, 20, -20),
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blobBottomRight,
          { backgroundColor: tint(PRIMARY, 0.16, 0.12) },
          move(b, -14, -22, 0.1),
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blobMiddleLeft,
          { backgroundColor: tint(GOLD, 0.16, 0.1) },
          move(a, 16, 14, 0.12),
        ]}
      />

      {/* Depth vignette: pushes blobs back so foreground text stays crisp */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDarkTheme
              ? 'rgba(20,19,26,0.10)'
              : 'rgba(255,255,255,0.28)',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', borderRadius: 999 },
  blobTop: { width: 460, height: 460, top: -210, alignSelf: 'center' },
  blobRight: { width: 280, height: 280, top: 130, right: -130 },
  blobLeft: { width: 240, height: 240, top: 390, left: -120 },
  blobBottomRight: { width: 200, height: 200, bottom: -50, right: -70 },
  blobMiddleLeft: { width: 150, height: 150, top: 150, left: -75 },
});
