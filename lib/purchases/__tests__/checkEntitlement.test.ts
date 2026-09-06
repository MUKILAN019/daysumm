import { describe, it, expect } from '@jest/globals';
import { isProEntitled } from '../checkEntitlement';
import type { CustomerInfo } from 'react-native-purchases';

describe('isProEntitled', () => {
  it('returns true when pro entitlement is active', () => {
    const mockCustomerInfo = {
      entitlements: {
        active: {
          pro: {
            identifier: 'pro',
            isActive: true,
            willRenew: true,
            latestPurchaseDate: '2026-09-01T00:00:00Z',
            originalPurchaseDate: '2026-09-01T00:00:00Z',
            expirationDate: '2027-09-01T00:00:00Z',
            store: 'PLAY_STORE',
            productIdentifier: 'daysumm_pro_annual',
            isSandbox: true,
            unsubscribeDetectedAt: null,
            billingIssueDetectedAt: null,
          },
        },
        all: {},
      },
    } as unknown as CustomerInfo;

    expect(isProEntitled(mockCustomerInfo)).toBe(true);
  });

  it('returns false when pro entitlement is missing from active entitlements', () => {
    const mockCustomerInfo = {
      entitlements: {
        active: {},
        all: {},
      },
    } as unknown as CustomerInfo;

    expect(isProEntitled(mockCustomerInfo)).toBe(false);
  });

  it('returns false when active entitlements object is undefined or empty', () => {
    const mockCustomerInfo = {
      entitlements: {
        active: {},
        all: {},
      },
    } as unknown as CustomerInfo;

    expect(isProEntitled(mockCustomerInfo)).toBe(false);
  });
});
