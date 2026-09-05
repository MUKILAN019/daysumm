// src/components/MainBackground.tsx
import React, { useEffect, useRef, memo } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Pattern,
  Rect,
  Stop,
} from 'react-native-svg';
import { Colors } from '../theme/tokens';

interface MainBackgroundProps {
  isDarkTheme?: boolean;
  animated?: boolean;
}

const GRID_SIZE = 24;
const DOT_RADIUS = 0.9;
const TOP_WASH_HEIGHT_RATIO = 0.24;

export const MainBackground = memo(function MainBackground({
  isDarkTheme = false,
  animated = true,
}: MainBackgroundProps) {
  const { width, height } = useWindowDimensions();

  const entranceOpacity = useRef(
    new Animated.Value(animated ? 0 : 1),
  ).current;

  useEffect(() => {
    if (!animated) {
      entranceOpacity.setValue(1);
      return;
    }

    const animation = Animated.timing(entranceOpacity, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [animated, entranceOpacity]);

  const canvasStyle = isDarkTheme
    ? styles.darkCanvas
    : styles.lightCanvas;

  const dotOpacity = isDarkTheme ? 0.28 : 0.22;
  const washOpacity = isDarkTheme ? 0.22 : 0.18;

  const washHeight = Math.max(
    168,
    height * TOP_WASH_HEIGHT_RATIO,
  );

  return (
    <View
      pointerEvents="none"
      style={[styles.canvas, canvasStyle]}
    >
      <Animated.View
        style={[
          styles.layer,
          {
            opacity: entranceOpacity,
          },
        ]}
      >
        <Svg
          width={width}
          height={height}
          style={styles.layer}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Defs>
            <Pattern
              id="daysummBulletJournalGrid"
              width={GRID_SIZE}
              height={GRID_SIZE}
              patternUnits="userSpaceOnUse"
            >
              <Circle
                cx={GRID_SIZE / 2}
                cy={GRID_SIZE / 2}
                r={DOT_RADIUS}
                fill={Colors.TextMuted}
                fillOpacity={dotOpacity}
              />
            </Pattern>

            <LinearGradient
              id="daysummHeaderWash"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <Stop
                offset="0"
                stopColor={Colors.Primary}
                stopOpacity={washOpacity}
              />

              <Stop
                offset="0.38"
                stopColor={Colors.PrimaryTint}
                stopOpacity={isDarkTheme ? 0.05 : 0.2}
              />

              <Stop
                offset="0.76"
                stopColor={Colors.Primary}
                stopOpacity={0.025}
              />

              <Stop
                offset="1"
                stopColor={Colors.Primary}
                stopOpacity={0}
              />
            </LinearGradient>
          </Defs>

          {/* Structured bullet-journal dot grid */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="url(#daysummBulletJournalGrid)"
          />

          {/* Restrained wash that visually grounds the header */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={washHeight}
            fill="url(#daysummHeaderWash)"
          />
        </Svg>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },

  layer: {
    ...StyleSheet.absoluteFill,
  },

  lightCanvas: {
    backgroundColor: '#F5F2FF',
  },

  darkCanvas: {
    backgroundColor: Colors.Ink,
  },
});
