export const LOG_LEVEL = { DEBUG: 'DEBUG' };
export default {
  configure: () => {},
  setLogLevel: () => {},
  logIn: async () => {},
  logOut: async () => {},
  getCustomerInfo: async () => ({ entitlements: { active: {} } }),
  invalidateCustomerInfoCache: async () => {},
};
