import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Colors, Spacing, Typography, Radii } from '../theme/tokens';

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
}: CustomModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onPrimaryPress}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Teal header band with owl mascot */}
          <View style={styles.headerBand}>
            <View style={styles.headerBandInner} />
            <Image
              source={require('../../assets/owl-modal-friendly.png')}
              style={styles.mascot}
              resizeMode="contain"
            />
          </View>

          <View style={styles.body}>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}

            {children ? <View style={styles.childrenContainer}>{children}</View> : null}

            <View style={styles.buttonContainer}>
              {secondaryButtonText && onSecondaryPress && (
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    styles.secondaryButton,
                    pressed && styles.secondaryButtonPressed,
                  ]}
                  onPress={onSecondaryPress}
                >
                  <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                    {secondaryButtonText}
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  type === 'warning' && styles.primaryButtonWarning,
                ]}
                onPress={onPrimaryPress}
              >
                <Text style={styles.buttonText}>{primaryButtonText}</Text>
              </Pressable>
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
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContainer: {
    backgroundColor: Colors.Card,
    borderRadius: Radii.sheet,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 14,
  },
  headerBand: {
    height: 88,
    backgroundColor: Colors.PrimaryTint,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerBandInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: Colors.PrimaryTint,
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
    color: Colors.TextPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...Typography.Body,
    color: Colors.TextSecondary,
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
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: Radii.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.Primary,
  },
  primaryButtonPressed: {
    backgroundColor: Colors.PrimaryDeep,
  },
  primaryButtonWarning: {
    backgroundColor: Colors.ProGold,
  },
  secondaryButton: {
    backgroundColor: Colors.Surface,
    borderWidth: 1,
    borderColor: Colors.Border,
  },
  secondaryButtonPressed: {
    backgroundColor: Colors.Border,
  },
  buttonText: {
    ...Typography.Body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: Colors.TextPrimary,
  },
});
