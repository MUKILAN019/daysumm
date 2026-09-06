import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Image, type ImageSourcePropType } from 'react-native';
import { Elevation, Spacing, Typography, Radii } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export type CustomModalType = 'info' | 'warning' | 'success';

interface CustomModalProps {
  visible: boolean;
  title: string;
  message?: string;
  type?: CustomModalType;
  primaryButtonText?: string;
  onPrimaryPress: () => void;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
  children?: React.ReactNode;
  customMascot?: ImageSourcePropType;
}

export function CustomModal({
  visible,
  title,
  message,
  type = 'info',
  primaryButtonText = 'OK',
  onPrimaryPress,
  secondaryButtonText,
  onSecondaryPress,
  children,
  customMascot,
}: CustomModalProps) {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onPrimaryPress}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, {
          backgroundColor: colors.Card,
          shadowColor: Elevation.shadowColor,
        }]}>
          {/* Header band with cat mascot */}
          <View style={[styles.headerBand, { backgroundColor: isDark ? colors.PrimaryTint : colors.PrimaryTint }]}>
            <View style={[styles.headerBandInner, { backgroundColor: isDark ? colors.PrimaryTint : colors.PrimaryTint }]} />
            <Image
              source={customMascot ?? require('../../assets/cat-modal-friendly.png')}
              style={styles.mascot}
              resizeMode="contain"
            />
          </View>

          <View style={styles.body}>
            <Text style={[styles.title, { color: colors.TextPrimary }]}>{title}</Text>
            {message ? <Text style={[styles.message, { color: colors.TextSecondary }]}>{message}</Text> : null}

            {children ? <View style={styles.childrenContainer}>{children}</View> : null}

            <View style={styles.buttonContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.primaryButton,
                  { backgroundColor: type === 'warning' ? colors.ProGold : colors.Primary },
                  pressed && { backgroundColor: type === 'warning' ? colors.WarningBorder : colors.PrimaryDeep },
                ]}
                onPress={onPrimaryPress}
              >
                <Text style={styles.buttonText}>{primaryButtonText}</Text>
              </Pressable>
              {secondaryButtonText && onSecondaryPress && (
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: pressed ? colors.Border : colors.Surface,
                      borderWidth: 1,
                      borderColor: colors.Border,
                    },
                  ]}
                  onPress={onSecondaryPress}
                >
                  <Text style={[styles.buttonText, { color: colors.TextPrimary }]}>
                    {secondaryButtonText}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const MASCOT_SIZE = 104;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContainer: {
    borderRadius: Radii.sheet,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 14,
  },
  headerBand: {
    height: 88,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerBandInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  mascot: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    marginBottom: -MASCOT_SIZE / 2,
    zIndex: 2,
  },
  body: {
    paddingTop: MASCOT_SIZE / 2 + Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...Typography.ScreenTitle,
    fontSize: 20,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...Typography.Body,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  childrenContainer: {
    width: '100%',
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: Spacing.sm,
    width: '100%',
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: Radii.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {},
  buttonText: {
    ...Typography.Body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
