import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Alert, Image, Linking } from 'react-native';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { User, Bell, Crown, Mail, ChevronRight, LogOut } from 'lucide-react-native';
import Purchases from 'react-native-purchases';
import { Colors, Typography, Spacing, Radii } from '../theme/tokens';
import { GlobalHeader } from '../components/GlobalHeader';
import { CustomModal } from '../components/CustomModal';
import { AmbientBackground } from '../components/AmbientBackground';
import { StreakBadge } from '../components/StreakBadge';

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
  const isGuest = user ? (user.isAnonymous || user.providerData.length === 0) : true;
  const displayName = user?.displayName ?? (isGuest ? 'Guest User' : 'Anonymous');
  const initial = displayName ? displayName[0].toUpperCase() : 'U';

  const [signOutBusy, setSignOutBusy] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

  async function handleSignOut() {
    if (signOutBusy) return;
    setSignOutBusy(true);
    try {
      const isAnon = await Purchases.isAnonymous();
      if (!isAnon) {
        await Purchases.logOut();
      }
      await signOut(getAuth());
    } catch (error) {
      console.warn('Sign out failed', error);
    } finally {
      setSignOutBusy(false);
    }
  }

  async function handleManageSubscription() {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      if (customerInfo.managementURL) {
        Linking.openURL(customerInfo.managementURL);
      } else {
        Linking.openURL('https://play.google.com/store/account/subscriptions');
      }
    } catch (error) {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  }

  function handlePersonalInfoPress() {
    if (isGuest) {
      setShowGuestModal(true);
    } else {
      onPersonalInformationPress();
    }
  }

  function handleContactUs() {
    Linking.openURL('mailto:mukilan192004@gmail.com?subject=DaySumm%20Feedback');
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
      <AmbientBackground />
      <GlobalHeader
        title="Profile"
        rightAction={<StreakBadge currentStreak={currentStreak} />}
      />
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
        <Pressable 
          style={({ pressed }) => [styles.proBanner, pressed && styles.proBannerPressed]} 
          onPress={onUpgradePress}
        >
          <Image source={require('../../assets/cat-king.png')} style={styles.proBannerImage} resizeMode="contain" />
          <View style={styles.proBannerContent}>
            <Text style={styles.proBannerTitle}>Unlock DaySumm Pro</Text>
            <Text style={styles.proBannerText}>Get unlimited history and faster AI processing.</Text>
          </View>
          <ChevronRight size={20} color={Colors.ProGold} />
        </Pressable>
      )}

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Account</Text>
        <View style={styles.card}>
          <SettingsRow icon={User} label="Personal Information" onPress={handlePersonalInfoPress} />
          <View style={styles.divider} />
          <SettingsRow 
            icon={Crown} 
            label="Subscription" 
            onPress={isPro ? handleManageSubscription : onUpgradePress} 
          />
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Preferences</Text>
        <View style={styles.card}>
          <SettingsRow icon={Bell} label="Notifications" onPress={onNotificationSettingsPress} />
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Support</Text>
        <View style={styles.card}>
          <SettingsRow icon={Mail} label="Contact Us" onPress={handleContactUs} />
        </View>
      </View>

      {/* Danger Zone Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: Colors.Danger }]}>Account Actions</Text>
        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          disabled={signOutBusy}
          style={({ pressed }) => [
            styles.signOutCard,
            pressed && styles.signOutCardPressed,
            signOutBusy && { opacity: 0.7 },
          ]}
        >
          <LogOut size={18} color={Colors.Danger} strokeWidth={2} />
          <Text style={styles.signOutCardText}>{signOutBusy ? 'Signing out...' : 'Sign Out'}</Text>
        </Pressable>
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
    backgroundColor: Colors.WarningBg,
    borderWidth: 1.5,
    borderColor: Colors.WarningBorder,
    borderRadius: Radii.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: Spacing.xl,
    shadowColor: Colors.ProGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  proBannerPressed: {
    opacity: 0.88,
  },
  proBannerImage: {
    width: 68,
    height: 68,
    marginRight: 12,
  },
  proBannerContent: {
    flex: 1,
    paddingRight: 8,
    justifyContent: 'center',
  },
  proBannerTitle: {
    ...Typography.Body,
    fontWeight: '800',
    color: Colors.TextDark,
    marginBottom: 4,
  },
  proBannerText: {
    ...Typography.Secondary,
    fontSize: 13,
    color: Colors.TextSecondary,
    lineHeight: 18,
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
  signOutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.DangerBg,
    borderWidth: 1.5,
    borderColor: Colors.DangerBorder,
    borderRadius: Radii.card,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
  },
  signOutCardPressed: {
    backgroundColor: Colors.DangerSoftBg,
  },
  signOutCardText: {
    ...Typography.Body,
    fontWeight: '700',
    color: Colors.Danger,
  },
});
