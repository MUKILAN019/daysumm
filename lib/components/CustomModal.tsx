import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ViewStyle, TextStyle } from 'react-native';
import { Colors, Spacing, Typography, Radii } from '../theme/tokens';
import { ShieldAlert, AlertCircle, CheckCircle2 } from 'lucide-react-native';

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
  
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <ShieldAlert size={36} color={Colors.ProGold} />;
      case 'success':
        return <CheckCircle2 size={36} color={Colors.Primary} />;
      default:
        return <AlertCircle size={36} color={Colors.PrimaryDeep} />;
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onPrimaryPress}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            {getIcon()}
          </View>
          
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          
          {children && <View style={styles.childrenContainer}>{children}</View>}
          
          <View style={styles.buttonContainer}>
            {secondaryButtonText && onSecondaryPress && (
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed
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
                pressed && styles.primaryButtonPressed
              ]}
              onPress={onPrimaryPress}
            >
              <Text style={styles.buttonText}>{primaryButtonText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContainer: {
    backgroundColor: Colors.Card,
    borderRadius: Radii.sheet,
    padding: Spacing.xl,
    paddingTop: 32,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: Colors.TextPrimary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
    padding: Spacing.sm,
    backgroundColor: Colors.Surface,
    borderRadius: 999,
  },
  title: {
    ...Typography.ScreenTitle,
    fontSize: 22,
    color: Colors.TextPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...Typography.Body,
    color: Colors.TextSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
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
    height: 52,
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
  secondaryButton: {
    backgroundColor: Colors.Surface,
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
