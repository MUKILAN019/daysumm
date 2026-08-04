import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../theme/tokens';

interface AmbientBackgroundProps {
  /** If true, uses white/lighter blobs suited for dark backgrounds like the onboarding screens. */
  isDarkTheme?: boolean;
}

export function AmbientBackground({ isDarkTheme = false }: AmbientBackgroundProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={[
          styles.blob,
          styles.blobTop,
          {
            backgroundColor: isDarkTheme
              ? 'rgba(255,255,255,0.18)'
              : 'rgba(108,92,231,0.15)', // Colors.Primary
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          styles.blobRight,
          {
            backgroundColor: isDarkTheme
              ? 'rgba(255,122,156,0.24)'
              : 'rgba(255,122,156,0.16)', // Colors.Accent
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          styles.blobLeft,
          {
            backgroundColor: isDarkTheme
              ? 'rgba(240,169,59,0.22)'
              : 'rgba(240,169,59,0.16)', // Colors.ProGold
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          styles.blobBottomRight,
          {
            backgroundColor: isDarkTheme
              ? 'rgba(255,255,255,0.15)'
              : 'rgba(108,92,231,0.12)', // Colors.Primary
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          styles.blobMiddleLeft,
          {
            backgroundColor: isDarkTheme
              ? 'rgba(240,169,59,0.18)'
              : 'rgba(240,169,59,0.12)', // Colors.ProGold
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobTop: {
    width: 420,
    height: 420,
    top: -180,
    alignSelf: 'center',
  },
  blobRight: {
    width: 260,
    height: 260,
    top: 140,
    right: -120,
  },
  blobLeft: {
    width: 220,
    height: 220,
    top: 400,
    left: -110,
  },
  blobBottomRight: {
    width: 180,
    height: 180,
    bottom: -40,
    right: -60,
  },
  blobMiddleLeft: {
    width: 140,
    height: 140,
    top: 160,
    left: -70,
  },
});
