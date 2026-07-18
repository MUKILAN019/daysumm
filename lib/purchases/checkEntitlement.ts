import Purchases from 'react-native-purchases';

export async function hasProEntitlementCached(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active['pro'] !== undefined;
  } catch (error) {
    console.warn('Failed to read cached entitlement info', error);
    return false;
  }
}