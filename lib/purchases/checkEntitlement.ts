import Purchases, { type CustomerInfo } from 'react-native-purchases';

export function isProEntitled(customerInfo: CustomerInfo): boolean {
  const pro = customerInfo.entitlements.active['pro'];
  if (!pro) {
    return false;
  }
  if (pro.expirationDate) {
    const expiresAt = new Date(pro.expirationDate).getTime();
    if (!isNaN(expiresAt) && expiresAt <= Date.now()) {
      return false;
    }
  }
  return true;
}

export async function hasProEntitlementCached(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return isProEntitled(customerInfo);
  } catch (error) {
    console.warn('Failed to read cached entitlement info', error);
    return false;
  }
}

export async function refreshEntitlement(): Promise<boolean> {
  try {
    // Invalidate RevenueCat's local SDK cache to force a fresh backend API fetch
    await Purchases.invalidateCustomerInfoCache();
    const customerInfo = await Purchases.getCustomerInfo();
    return isProEntitled(customerInfo);
  } catch (error) {
    console.warn('Failed to refresh entitlement info with cache invalidation', error);
    try {
      const cachedInfo = await Purchases.getCustomerInfo();
      return isProEntitled(cachedInfo);
    } catch {
      return false;
    }
  }
}