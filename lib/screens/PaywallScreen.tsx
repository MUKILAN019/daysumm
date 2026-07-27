import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import { CheckCircle2 } from 'lucide-react-native';
import { getAuth } from '@react-native-firebase/auth';
import { Colors, Spacing, Typography, Radii } from '../theme/tokens';
import { GlobalHeader } from '../components/GlobalHeader';
import { CustomModal } from '../components/CustomModal';

interface PaywallScreenProps {
  role: string | null;
  onBack: () => void;
  onPurchaseSuccess: () => void;
}

const PRO_FEATURES = [
  'Unlimited digests — no 3-a-day limit',
  '30 days of digest history, not just 3',
  'Your digest, generated first — priority AI processing',
  'Keep an indie builder building',
];

function getHeadlineForRole(role: string | null): string {
  switch (role) {
    case 'Software Engineer':
      return 'Your standup, written before you even sit down.';
    case 'Manager':
      return 'Know what your team did today — without asking.';
    case 'Freelancer':
      return 'A client-ready recap, every single day.';
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;
  const isGuest = user ? user.isAnonymous || user.providerData.length === 0 : true;

  useEffect(() => {
    let isCancelled = false;
    Purchases.getOfferings()
      .then((offerings) => {
        if (isCancelled) return;
        setPackages(offerings.current?.availablePackages ?? []);
      })
      .catch((error: unknown) => {
        console.warn('Failed to fetch offerings', error);
        if (!isCancelled) setErrorMessage("Couldn't load pricing just now — give it another try.");
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
      if (customerInfo.entitlements.active['pro']) setShowSuccessModal(true);
    } catch (error: unknown) {
      const err = error as { userCancelled?: boolean };
      if (err.userCancelled) return;
      console.warn('Purchase failed', error);
      setErrorMessage("That didn't go through. Please try again.");
    } finally {
      setPurchasingPackageId(null);
    }
  }

  return (
    <View style={styles.container}>
      <GlobalHeader title="Upgrade to Pro" onBack={onBack} />

      <View style={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.mascotMedallion}>
            <Image
              source={require('../../assets/owl-king.png')}
              style={styles.mascotIcon}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.eyebrow}>DaySumm Pro</Text>
          <Text style={styles.headline}>{getHeadlineForRole(role)}</Text>
        </View>

        {/* Features */}
        <View style={styles.featureList}>
          {PRO_FEATURES.map((feature, idx) => (
            <View
              key={feature}
              style={[styles.featureRow, idx < PRO_FEATURES.length - 1 && styles.featureRowDivider]}
            >
              <CheckCircle2 size={20} color={Colors.Primary} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Purchase */}
        <View style={styles.purchaseSection}>
          {isLoadingOffering ? (
            <ActivityIndicator size="large" color={Colors.Primary} />
          ) : packages.length === 0 ? (
            <Text style={styles.errorText}>{errorMessage ?? 'No plans available right now.'}</Text>
          ) : (
            <View style={styles.packageList}>
              {packages.map((pkg) => {
                const isPurchasing = purchasingPackageId === pkg.identifier;
                const suffix = pkg.packageType === 'ANNUAL' ? '/year' : '/month';
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
                        Get Pro — {pkg.product.priceString}
                        {suffix}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
              <Text style={styles.fineprint}>Cancel anytime. No hidden fees.</Text>
            </View>
          )}

          {errorMessage && packages.length > 0 ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </View>
      </View>

      <CustomModal
        visible={showGuestModal}
        type="warning"
        title="Sign in first"
        message="Sign in with Google to upgrade to Pro — this keeps your digests and subscription tied to your account, not just this device."
        primaryButtonText="OK"
        onPrimaryPress={() => setShowGuestModal(false)}
      />

      <CustomModal
        visible={showSuccessModal}
        type="success"
        title="You're on Pro"
        message="Unlimited digests, full history, no more waiting in line for generation. Enjoy the extra time back."
        primaryButtonText="Let's go"
        onPrimaryPress={() => {
          setShowSuccessModal(false);
          onPurchaseSuccess();
        }}
      >
        <Image
          source={require('../../assets/owl-smiley-cheer.png')}
          style={styles.successMascot}
          resizeMode="contain"
        />
      </CustomModal>
    </View>
  );
}

const MEDALLION = 132;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Background },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    justifyContent: 'space-between',
  },

  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  mascotMedallion: {
    width: MEDALLION,
    height: MEDALLION,
    borderRadius: MEDALLION / 2,
    backgroundColor: Colors.PrimaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  mascotIcon: { width: 96, height: 96 },
  eyebrow: {
    ...Typography.Label,
    color: Colors.ProGold,
    letterSpacing: 1.5,
  },
  headline: {
    ...Typography.ScreenTitle,
    fontSize: 24,
    lineHeight: 32,
    color: Colors.TextPrimary,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },

  featureList: {
    backgroundColor: Colors.Card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.Border,
    paddingHorizontal: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  featureRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.Divider,
  },
  featureText: {
    flex: 1,
    ...Typography.Body,
    color: Colors.TextPrimary,
  },

  purchaseSection: { gap: Spacing.sm },
  packageList: { gap: 10 },
  packageButton: {
    minHeight: 56,
    borderRadius: Radii.button,
    backgroundColor: Colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    shadowColor: Colors.PrimaryDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  packageButtonPressed: { backgroundColor: Colors.PrimaryDark },
  packageButtonDisabled: { opacity: 0.7 },
  packageButtonText: {
    color: '#FFFFFF',
    ...Typography.Body,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  fineprint: {
    ...Typography.Secondary,
    fontSize: 12,
    color: Colors.TextMuted,
    textAlign: 'center',
    marginTop: 4,
  },

  errorText: {
    ...Typography.Secondary,
    color: Colors.Danger,
    textAlign: 'center',
  },
  successMascot: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginVertical: Spacing.md,
  },
});
