import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Alert, Image, Linking, Animated, Switch } from 'react-native';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { User, Bell, Crown, Mail, ChevronRight, LogOut, Sun, Moon } from 'lucide-react-native';
import Purchases from 'react-native-purchases';
import { logoutRevenueCat } from '../purchases/revenueCat';
import { Typography, Spacing, Radii } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { GlobalHeader } from '../components/GlobalHeader';
import { CustomModal } from '../components/CustomModal';
import { MainBackground } from '../components/MainBackground';
import { StreakBadge } from '../components/StreakBadge';

interface SettingsScreenProps {
  currentStreak: number;
  isPro: boolean;
  onUpgradePress: () => void;
  onPersonalInformationPress: () => void;
  onNotificationSettingsPress: () => void;
  onSignOut?: () => void;
}

export function SettingsScreen({ 
  currentStreak, 
  isPro, 
  onUpgradePress,
  onPersonalInformationPress,
  onNotificationSettingsPress,
  onSignOut,
}: SettingsScreenProps) {
  const { colors, isDark, toggleTheme } = useTheme();
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
      if (onSignOut) {
        await onSignOut();
      } else {
        const auth = getAuth();
        if (auth.currentUser) {
          await logoutRevenueCat();
          await signOut(auth);
        }
      }
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
          { backgroundColor: pressed ? colors.Surface : 'transparent' },
        ]}
      >
        <Icon size={20} color={destructive ? colors.Danger : colors.TextMuted} />
        <Text style={[styles.rowLabel, { color: destructive ? colors.Danger : colors.TextPrimary }]}>{label}</Text>
        <ChevronRight size={20} color={colors.TextMuted} />
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <MainBackground />
      <GlobalHeader
        title="Profile"
        rightAction={currentStreak > 0 ? <StreakBadge currentStreak={currentStreak} /> : undefined}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

      {/* User Summary */}
      <View style={styles.userSummary}>
        <View style={[styles.avatar, { backgroundColor: colors.Primary }]}>
          <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>{initial}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.TextPrimary }]}>{displayName}</Text>
          <Text style={[styles.planStatus, { color: colors.TextMuted }]}>{isPro ? 'Pro plan' : 'Free plan'}</Text>
        </View>
      </View>

      {/* Pro Banner */}
      {!isPro && (
        <Pressable 
          style={({ pressed }) => [styles.proBanner, {
            backgroundColor: colors.WarningBg,
            borderColor: colors.WarningBorder,
          }, pressed && styles.proBannerPressed]} 
          onPress={onUpgradePress}
        >
          <Image source={require('../../assets/cat-king.png')} style={styles.proBannerImage} resizeMode="contain" />
          <View style={styles.proBannerContent}>
            <Text style={[styles.proBannerTitle, { color: colors.TextDark }]}>Unlock DaySumm Pro</Text>
            <Text style={[styles.proBannerText, { color: colors.TextSecondary }]}>Get unlimited history and faster AI processing.</Text>
          </View>
          <ChevronRight size={20} color={colors.ProGold} />
        </Pressable>
      )}

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: colors.TextMuted }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: colors.Card, borderColor: colors.Border }]}>
          <SettingsRow icon={User} label="Personal Information" onPress={handlePersonalInfoPress} />
          <View style={[styles.divider, { backgroundColor: colors.Divider }]} />
          <SettingsRow 
            icon={Crown} 
            label="Subscription" 
            onPress={isPro ? handleManageSubscription : onUpgradePress} 
          />
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: colors.TextMuted }]}>Preferences</Text>
        <View style={[styles.card, { backgroundColor: colors.Card, borderColor: colors.Border }]}>
          <View style={styles.row}>
            {isDark ? (
              <Moon size={20} color={colors.ProGold} />
            ) : (
              <Sun size={20} color={colors.Primary} />
            )}
            <Text style={[styles.rowLabel, { color: colors.TextPrimary }]}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#D1D5DB', true: colors.Primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.Divider }]} />
          <SettingsRow icon={Bell} label="Notifications" onPress={onNotificationSettingsPress} />
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: colors.TextMuted }]}>Support</Text>
        <View style={[styles.card, { backgroundColor: colors.Card, borderColor: colors.Border }]}>
          <SettingsRow icon={Mail} label="Contact Us" onPress={handleContactUs} />
        </View>
      </View>

      {/* Danger Zone Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: colors.Danger }]}>Account Actions</Text>
        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          disabled={signOutBusy}
          style={({ pressed }) => [
            styles.signOutCard,
            {
              backgroundColor: pressed ? colors.DangerSoftBg : colors.DangerBg,
              borderColor: colors.DangerBorder,
            },
            signOutBusy && { opacity: 0.7 },
          ]}
        >
          <LogOut size={18} color={colors.Danger} strokeWidth={2} />
          <Text style={[styles.signOutCardText, { color: colors.Danger }]}>
            {signOutBusy ? 'Signing out...' : 'Sign Out'}
          </Text>
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
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.ScreenTitle,
  },
  userInfo: {
    justifyContent: 'center',
  },
  userName: {
    ...Typography.SectionHeader,
    marginBottom: 2,
  },
  planStatus: {
    ...Typography.Secondary,
  },
  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: Spacing.xl,
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
    marginBottom: 4,
  },
  proBannerText: {
    ...Typography.Secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    ...Typography.Secondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    paddingLeft: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  rowLabel: {
    flex: 1,
    ...Typography.Body,
  },
  divider: {
    height: 1,
    marginLeft: 52,
  },
  signOutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: Radii.card,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
  },
  signOutCardText: {
    ...Typography.Body,
    fontWeight: '700',
  },
});
