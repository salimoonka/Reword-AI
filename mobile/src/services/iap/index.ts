/**
 * IAP Service - In-App Purchases
 * Re-exports all IAP functionality
 * 
 * App code should import everything from this module instead of
 * importing directly from 'react-native-iap' to keep native-module
 * dependencies isolated.
 */

export {
  PRODUCT_IDS,
  SUBSCRIPTION_SKUS,
  PRODUCT_DISPLAY,
  getProductPrice,
  isSubscription,
  getStoreName,
} from './products';

export {
  initIAP,
  cleanupIAP,
  fetchSubscriptions,
  purchaseSubscription,
  restorePurchases,
  verifyReceipt,
  type VerifyReceiptResponse,
  type PurchaseCallbacks,
} from './purchase';

// Re-export types from react-native-iap so app code never imports the package directly
export type { Purchase, ProductSubscription, PurchaseError } from 'react-native-iap';
export { isUserCancelledError } from 'react-native-iap';
