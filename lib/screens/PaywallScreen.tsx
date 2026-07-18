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
        <Text style={styles.headline}>{getHeadlineForRole(role)}</Text>
        <Text style={styles.subheadline}>Upgrade to DaySumm Pro</Text>

        <View style={styles.featureList}>
          {PRO_FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {isLoadingOffering ? (
          <ActivityIndicator size="large" color="#2563EB" style={styles.loadingSpinner} />
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
                  style={[styles.packageButton, isPurchasing && styles.packageButtonDisabled]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA', paddingTop: 56 },
  headerRow: { paddingHorizontal: 20 },
  backButton: { paddingVertical: 6, paddingHorizontal: 8, alignSelf: 'flex-start' },
  backButtonText: { color: '#2563EB', fontSize: 15, fontWeight: '700' },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: 16 },
  headline: { fontSize: 24, fontWeight: '700', color: '#111827', lineHeight: 32 },
  subheadline: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  featureList: { gap: 12, marginTop: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  featureCheck: { color: '#059669', fontSize: 16, fontWeight: '700' },
  featureText: { flex: 1, fontSize: 15, color: '#111827', lineHeight: 21 },
  packageList: { gap: 10, marginTop: 12 },
  packageButton: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  packageButtonDisabled: { opacity: 0.7 },
  packageButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  loadingSpinner: { marginTop: 24 },
  errorText: { color: '#B91C1C', fontSize: 14, textAlign: 'center', marginTop: 12 },
});