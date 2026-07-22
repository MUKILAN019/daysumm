import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import { Colors, Spacing, Typography, Radii } from '../theme/tokens';
import { Crown, CheckCircle2 } from 'lucide-react-native';

import { getAuth } from '@react-native-firebase/auth';
import { CustomModal } from '../components/CustomModal';

interface PaywallScreenProps {
  role: string | null;
  onBack: () => void;
  onPurchaseSuccess: () => void;
}

const PRO_FEATURES = [
  'Unlimited daily digests — no 3-per-day cap',
  '30-day digest history, not just 3 days',
  'Priority AI generation',
  'Support an indie builder',
];

function getHeadlineForRole(role: string | null): string {
  switch (role) {
    case 'Software Engineer':
      return 'Ship your standup update without lifting a finger.';
    case 'Manager':
      return "Never scramble for what your team did today.";
    case 'Freelancer':
      return 'Client-ready recaps, every single day.';
    default:
      return 'Your whole day, summarized — automatically.';
  }
}

export function PaywallScreen({ role, onBack, onPurchaseSuccess }: PaywallScreenProps) {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoadingOffering, setIsLoadingOffering] = useState(true);
  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;
  const isGuest = user ? (user.isAnonymous || user.providerData.length === 0) : true;

  useEffect(() => {
    let isCancelled = false;

    Purchases.getOfferings()
      .then((offerings) => {
        if (isCancelled) return;
        const currentPackages = offerings.current?.availablePackages ?? [];
        setPackages(currentPackages);
      })
      .catch((error: unknown) => {
        console.warn('Failed to fetch offerings', error);
        if (!isCancelled) {
          setErrorMessage('Could not load pricing right now. Please try again.');
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingOffering(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  async function handlePurchase(pkg: PurchasesPackage) {
    if (isGuest) {
      setShowGuestModal(true);
      return;
    }

    setPurchasingPackageId(pkg.identifier);
    setErrorMessage(null);

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      if (customerInfo.entitlements.active['pro']) {
        onPurchaseSuccess();
      }
    } catch (error: unknown) {
      const err = error as { userCancelled?: boolean; message?: string };

      if (err.userCancelled) {
        // Quiet dismissal — not an error the user needs to see.
        return;
      }

      console.warn('Purchase failed', error);
      setErrorMessage('Purchase failed. Please try again.');
    } finally {
      setPurchasingPackageId(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Crown size={48} color={Colors.ProGold} />
        </View>
        <Text style={styles.headline}>{getHeadlineForRole(role)}</Text>
        <Text style={styles.subheadline}>Upgrade to DaySumm Pro</Text>

        <View style={styles.featureList}>
          {PRO_FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <CheckCircle2 size={20} color={Colors.Primary} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {isLoadingOffering ? (
          <ActivityIndicator size="large" color={Colors.Primary} style={styles.loadingSpinner} />
        ) : packages.length === 0 ? (
          <Text style={styles.errorText}>
            {errorMessage ?? 'No plans available right now.'}
          </Text>
        ) : (
          <View style={styles.packageList}>
            {packages.map((pkg) => {
              const isPurchasing = purchasingPackageId === pkg.identifier;
              return (
                <Pressable
                  key={pkg.identifier}
                  accessibilityRole="button"
                  disabled={purchasingPackageId !== null}
                  onPress={() => handlePurchase(pkg)}
                  style={({ pressed }) => [
                    styles.packageButton,
                    pressed && styles.packageButtonPressed,
                    isPurchasing && styles.packageButtonDisabled,
                  ]}
                >
                  {isPurchasing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.packageButtonText}>
                      Upgrade to Pro — {pkg.product.priceString}
                      {pkg.packageType === 'ANNUAL' ? '/year' : '/month'}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {errorMessage && packages.length > 0 ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
      </ScrollView>

      <CustomModal
        visible={showGuestModal}
        type="warning"
        title="Login Required"
        message="Please log in with a Google account to upgrade to Pro and unlock all features safely."
        primaryButtonText="OK"
        onPrimaryPress={() => setShowGuestModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Background, paddingTop: 56 },
  headerRow: { paddingHorizontal: Spacing.md },
  backButton: { paddingVertical: 6, paddingHorizontal: 8, alignSelf: 'flex-start' },
  backButtonText: { color: Colors.Primary, fontSize: 16, fontWeight: '600' },
  content: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.lg, paddingBottom: 64, gap: Spacing.lg },
  iconContainer: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: Colors.Card, 
    alignItems: 'center', 
    justifyContent: 'center', 
    alignSelf: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.Border,
  },
  headline: { ...Typography.ScreenTitle, color: Colors.TextPrimary, textAlign: 'center' },
  subheadline: { ...Typography.Secondary, fontWeight: '700', color: Colors.ProGold, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
  featureList: { gap: 16, marginTop: Spacing.md, backgroundColor: Colors.Card, padding: Spacing.lg, borderRadius: Radii.card, borderWidth: 1, borderColor: Colors.Border },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureText: { flex: 1, ...Typography.Body, color: Colors.TextPrimary },
  packageList: { gap: 12, marginTop: Spacing.xl },
  packageButton: {
    minHeight: 56,
    borderRadius: Radii.button,
    backgroundColor: Colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    shadowColor: Colors.PrimaryDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  packageButtonPressed: { backgroundColor: Colors.PrimaryDeep },
  packageButtonDisabled: { opacity: 0.7 },
  packageButtonText: { color: '#FFFFFF', ...Typography.Label, fontWeight: '700' },
  loadingSpinner: { marginTop: Spacing.xxl },
  errorText: { color: Colors.Danger, ...Typography.Secondary, textAlign: 'center', marginTop: Spacing.md },
});