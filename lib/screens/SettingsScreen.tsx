import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { User, Bell, Crown, Mail, ChevronRight, LogOut } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii } from '../theme/tokens';
import { GlobalHeader } from '../components/GlobalHeader';
import { CustomModal } from '../components/CustomModal';

interface SettingsScreenProps {
  currentStreak: number;
  isPro: boolean;
  onUpgradePress: () => void;
  onPersonalInformationPress: () => void;
  onNotificationSettingsPress: () => void;
}

export function SettingsScreen({ 
  currentStreak, 
  isPro, 
  onUpgradePress,
  onPersonalInformationPress,
  onNotificationSettingsPress
}: SettingsScreenProps) {
  const auth = getAuth();
  const user = auth.currentUser;
  const isGuest = user ? user.isAnonymous : true;
  const displayName = user?.displayName ?? (isGuest ? 'Guest User' : 'Anonymous');
  const initial = displayName ? displayName[0].toUpperCase() : 'U';

  const [signOutBusy, setSignOutBusy] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

  async function handleSignOut() {
    if (signOutBusy) return;
    setSignOutBusy(true);
    try {
      await signOut(getAuth());
    } catch (error) {
      console.warn('Sign out failed', error);
    } finally {
      setSignOutBusy(false);
    }
  }

  function handlePersonalInfoPress() {
    if (isGuest) {
      setShowGuestModal(true);
    } else {
      onPersonalInformationPress();
    }
  }

  function SettingsRow({ icon: Icon, label, onPress, destructive = false }: any) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          pressed && styles.rowPressed,
        ]}
      >
        <Icon size={20} color={destructive ? Colors.Danger : Colors.TextMuted} />
        <Text style={[styles.rowLabel, destructive && { color: Colors.Danger }]}>{label}</Text>
        <ChevronRight size={20} color={Colors.TextMuted} />
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <GlobalHeader title="Profile" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

      {/* User Summary */}
      <View style={styles.userSummary}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.planStatus}>{isPro ? 'Pro plan' : 'Free plan'}</Text>
        </View>
      </View>

      {/* Pro Banner */}
      {!isPro && (
        <View style={styles.proBanner}>
          <View style={styles.proBannerContent}>
            <Text style={styles.proBannerTitle}>Unlock DaySumm Pro</Text>
            <Text style={styles.proBannerText}>Get unlimited history and advanced digests.</Text>
          </View>
          <Pressable style={styles.proButton} onPress={onUpgradePress}>
            <Text style={styles.proButtonText}>Upgrade</Text>
          </Pressable>
        </View>
      )}

      {/* Sections */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Account</Text>
        <View style={styles.card}>
          <SettingsRow icon={User} label="Personal Information" onPress={handlePersonalInfoPress} />
          <View style={styles.divider} />
          <SettingsRow icon={Crown} label="Subscription" onPress={isPro ? undefined : onUpgradePress} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Preferences</Text>
        <View style={styles.card}>
          <SettingsRow icon={Bell} label="Notifications" onPress={onNotificationSettingsPress} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Support</Text>
        <View style={styles.card}>
          <SettingsRow icon={Mail} label="Contact Us" />
          <View style={styles.divider} />
          <SettingsRow icon={LogOut} label={signOutBusy ? 'Signing out...' : 'Sign Out'} onPress={handleSignOut} destructive />
        </View>
      </View>
      </ScrollView>

      <CustomModal
        visible={showGuestModal}
        type="warning"
        title="Looking Good!"
        message="Please don't lose your data. Log in with a Google account for seamless access and preserved data. Only users logged in with Google are allowed to edit personal information."
        primaryButtonText="OK"
        onPrimaryPress={() => setShowGuestModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  userSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.ScreenTitle,
    color: Colors.Background,
  },
  userInfo: {
    justifyContent: 'center',
  },
  userName: {
    ...Typography.SectionHeader,
    color: Colors.TextPrimary,
    marginBottom: 2,
  },
  planStatus: {
    ...Typography.Secondary,
    color: Colors.TextMuted,
  },
  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.PrimaryTint,
    borderWidth: 1,
    borderColor: Colors.Primary,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  proBannerContent: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  proBannerTitle: {
    ...Typography.Body,
    fontWeight: '700',
    color: Colors.PrimaryDeep,
    marginBottom: 2,
  },
  proBannerText: {
    ...Typography.Secondary,
    color: Colors.PrimaryDeep,
  },
  proButton: {
    backgroundColor: Colors.ProGold,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.button,
  },
  proButtonText: {
    ...Typography.Label,
    fontWeight: '700',
    color: Colors.Background,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    ...Typography.Secondary,
    fontWeight: '600',
    color: Colors.TextMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: Colors.Card,
    borderWidth: 1,
    borderColor: Colors.Border,
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  rowPressed: {
    backgroundColor: Colors.Surface,
  },
  rowLabel: {
    flex: 1,
    ...Typography.Body,
    color: Colors.TextPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.Divider,
    marginLeft: 52, // icon width + gap + padding
  },
});
