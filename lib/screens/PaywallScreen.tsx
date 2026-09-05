import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import { CheckCircle2, Sparkles, Star, Zap } from 'lucide-react-native';
import { getAuth } from '@react-native-firebase/auth';
import { Colors, Spacing, Typography, Radii } from '../theme/tokens';
import { GlobalHeader } from '../components/GlobalHeader';
import { CustomModal } from '../components/CustomModal';
import { MainBackground } from '../components/MainBackground';

interface PaywallScreenProps {
  role: string | null;
  onBack: () => void;
  onPurchaseSuccess: () => void;
}

const PRO_FEATURES = [
  'Create unlimited digests — no daily limit',
  'Keep 30 days of digest history',
  'Get your digest first with faster AI processing',
];

function getHeadlineForRole(role: string | null): string {
  switch (role) {
    case 'Software Engineer':
      return 'Turn your day into a clear recap in seconds.';
    case 'Manager':
      return 'See what your team worked on without chasing updates.';
    case 'Freelancer':
      return 'Send polished client updates without the extra effort.';
    default:
      return 'Make your day easier to review and share.';
  }
}

function getTrialText(pkg: PurchasesPackage): string | null {
  const prod = pkg.product;
  if (!prod) return null;

  const hasTrial =
    prod.introPrice?.price === 0 ||
    prod.defaultOption?.freePhase != null ||
    (prod.subscriptionOptions ?? []).some((opt) => opt.freePhase != null);

  return hasTrial ? '7-Day Free Trial' : null;
}

export function PaywallScreen({ role, onBack, onPurchaseSuccess }: PaywallScreenProps) {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoadingOffering, setIsLoadingOffering] = useState(true);
  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const purchaseInFlightRef = useRef(false);

  const auth = getAuth();
  const user = auth.currentUser;
  const isGuest = user ? user.isAnonymous || user.providerData.length === 0 : true;

  const featureAnimValues = useRef(
    PRO_FEATURES.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    featureAnimValues.forEach((anim) => anim.setValue(0));
    const animations = featureAnimValues.map((anim) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );
    Animated.stagger(70, animations).start();
  }, [featureAnimValues]);

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
    if (purchaseInFlightRef.current) return;

    if (isGuest) {
      setShowGuestModal(true);
      return;
    }

    purchaseInFlightRef.current = true;
    setPurchasingPackageId(pkg.identifier);
    setErrorMessage(null);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active['pro']) setShowSuccessModal(true);
    } catch (error: unknown) {
      const err = error as {
        userCancelled?: boolean;
        message?: string;
        underlyingErrorMessage?: string;
        debugMessage?: string;
      };
      if (err.userCancelled) return;
      console.warn('Purchase failed', error);

      const detail = err.underlyingErrorMessage || err.debugMessage || err.message;
      if (detail && detail.toLowerCase().includes('published')) {
        setErrorMessage('Google Play needs the app version to be published before purchases can be completed.');
      } else {
        setErrorMessage("That didn't go through. Please try again.");
      }
    } finally {
      purchaseInFlightRef.current = false;
      setPurchasingPackageId(null);
    }
  }

  return (
    <View style={styles.container}>
      <MainBackground />
      <GlobalHeader title="Upgrade to Pro" onBack={onBack} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} bounces={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.mascotMedallion}>
            <View style={styles.glowAura} />
            <Sparkles size={28} color={Colors.ProGold} style={styles.star1} strokeWidth={2} />
            <Star size={18} color={Colors.ProGold} style={styles.star2} strokeWidth={2.5} fill={Colors.ProGold} />
            <Sparkles size={24} color={Colors.ProGold} style={styles.star3} strokeWidth={2.5} />
            <Star size={16} color={Colors.ProGold} style={styles.star4} strokeWidth={2} fill={Colors.ProGold} />
            <Image
              source={require('../../assets/cat-king.png')}
              style={styles.mascotIcon}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.eyebrow}>DaySumm Pro</Text>
          <Text style={styles.headline}>{getHeadlineForRole(role)}</Text>
        </View>

        {/* Features */}
        <View style={styles.featureList}>
          {PRO_FEATURES.map((feature, idx) => {
            const anim = featureAnimValues[idx] || featureAnimValues[0];
            return (
              <Animated.View
                key={feature}
                style={[
                  styles.featureRow,
                  idx < PRO_FEATURES.length - 1 && styles.featureRowDivider,
                  {
                    opacity: anim,
                    transform: [
                      {
                        translateY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [12, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <CheckCircle2 size={20} color={Colors.Primary} />
                <Text style={styles.featureText}>{feature}</Text>
              </Animated.View>
            );
          })}
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
                const isMonthly = pkg.packageType === 'MONTHLY';
                const isAnnual = pkg.packageType === 'ANNUAL';
                const suffix = isAnnual ? '/year' : '/month';
                const trialText = getTrialText(pkg);

                if (isAnnual) {
                  return (
                    <View key={pkg.identifier} style={styles.annualPackageWrapper}>
                      <View style={styles.bestValueRibbon}>
                        <Sparkles size={11} color={Colors.WarningText} strokeWidth={2.5} />
                        <Text style={styles.bestValueText}>BEST VALUE</Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        disabled={purchasingPackageId !== null}
                        onPress={() => handlePurchase(pkg)}
                        style={({ pressed }) => [
                          styles.annualPackageButton,
                          pressed && styles.packageButtonPressed,
                          isPurchasing && styles.packageButtonDisabled,
                        ]}
                      >
                        {isPurchasing ? (
                          <ActivityIndicator color={Colors.White} />
                        ) : (
                          <View style={{ alignItems: 'center', gap: 4 }}>
                            <View style={styles.calloutRow}>
                              <Sparkles size={15} color={Colors.ProGold} strokeWidth={2.5} />
                              <Text style={styles.annualButtonTitle}>Unlimited Digests</Text>
                              <Zap size={14} color={Colors.ProGold} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.annualPriceText}>
                              {pkg.product.priceString}{suffix}
                              {trialText ? ` · ${trialText}` : ''}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    </View>
                  );
                }

                return (
                  <Pressable
                    key={pkg.identifier}
                    accessibilityRole="button"
                    disabled={purchasingPackageId !== null}
                    onPress={() => handlePurchase(pkg)}
                    style={({ pressed }) => [
                      styles.monthlyPackageButton,
                      pressed && styles.monthlyPackageButtonPressed,
                      isPurchasing && styles.packageButtonDisabled,
                    ]}
                  >
                    {isPurchasing ? (
                      <ActivityIndicator color={Colors.Primary} />
                    ) : (
                      <View style={{ alignItems: 'center' }}>
                        <Text style={styles.monthlyButtonText}>
                          {trialText ? `Start ${trialText}` : 'Subscribe Monthly'}
                        </Text>
                        <Text style={styles.monthlyFineprint}>
                          {trialText
                            ? `Then ${pkg.product.priceString}${suffix}`
                            : `${pkg.product.priceString}${suffix}`}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          {errorMessage && packages.length > 0 ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </View>
      </ScrollView>

      <CustomModal
        visible={showGuestModal}
        type="warning"
        title="Sign in first"
        message="Sign in with Google to unlock Pro and keep your digests tied to your account."
        primaryButtonText="OK"
        onPrimaryPress={() => setShowGuestModal(false)}
      />

      <CustomModal
        visible={showSuccessModal}
        type="success"
        title="You’re all set"
        message="You now have unlimited digests, full history, and faster processing. Enjoy the extra time back."
        primaryButtonText="Let’s go"
        customMascot={require('../../assets/cat-widget-cheer.png')}
        onPrimaryPress={() => {
          setShowSuccessModal(false);
          onPurchaseSuccess();
        }}
      />
    </View>
  );
}

const MEDALLION = 132;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    flexGrow: 1,
    justifyContent: 'flex-start',
    gap: Spacing.lg,
  },

  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  mascotMedallion: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  glowAura: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.WarningLight,
    shadowColor: Colors.ProGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 10,
  },
  star1: {
    position: 'absolute',
    top: 20,
    left: 30,
    transform: [{ rotate: '-10deg' }],
    zIndex: 2,
  },
  star2: {
    position: 'absolute',
    top: 30,
    right: 28,
    transform: [{ rotate: '20deg' }],
    zIndex: 2,
  },
  star3: {
    position: 'absolute',
    bottom: 30,
    left: 24,
    transform: [{ rotate: '15deg' }],
    zIndex: 2,
  },
  star4: {
    position: 'absolute',
    bottom: 40,
    right: 30,
    transform: [{ rotate: '-15deg' }],
    zIndex: 2,
  },
  mascotIcon: { width: 144, height: 144, zIndex: 5 },
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

  purchaseSection: { gap: Spacing.md },
  packageList: { gap: 14 },

  annualPackageWrapper: {
    position: 'relative',
    marginTop: 8,
  },
  bestValueRibbon: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.WarningBg,
    borderWidth: 1,
    borderColor: Colors.WarningBorder,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 999,
    zIndex: 10,
  },
  bestValueText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.WarningText,
    letterSpacing: 0.8,
  },
  annualPackageButton: {
    minHeight: 64,
    borderRadius: 20,
    backgroundColor: Colors.Primary,
    borderWidth: 2,
    borderColor: Colors.ProGold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    shadowColor: Colors.ProGold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  annualButtonTitle: {
    color: Colors.White,
    ...Typography.Body,
    fontWeight: '800',
    fontSize: 16.5,
  },
  annualPriceText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12.5,
    fontWeight: '600',
  },

  monthlyPackageButton: {
    minHeight: 52,
    borderRadius: 20,
    backgroundColor: Colors.Surface,
    borderWidth: 1.5,
    borderColor: Colors.Border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  monthlyPackageButtonPressed: {
    backgroundColor: Colors.Background,
  },
  monthlyButtonText: {
    color: Colors.TextPrimary,
    ...Typography.Body,
    fontWeight: '700',
    fontSize: 15,
  },
  monthlyFineprint: {
    ...Typography.Secondary,
    fontSize: 12,
    color: Colors.TextMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  packageButtonPressed: { backgroundColor: Colors.PrimaryDark },
  packageButtonDisabled: { opacity: 0.7 },

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
