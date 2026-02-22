/**
 * IAP Purchase Service
 * Handles in-app purchase initialization, purchasing, restoring, and receipt verification
 * Uses react-native-iap v14 with unified API
 */

import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  getAvailablePurchases,
  purchaseUpdatedListener,
  purchaseErrorListener,
  isUserCancelledError,
  type Purchase,
  type ProductSubscription,
  type PurchaseError,
  type EventSubscription,
  ErrorCode,
} from 'react-native-iap';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { SUBSCRIPTION_SKUS, getStoreName } from './products';
import { apiPost } from '../api/client';

// ─── Types ──────────────────────────────────────────────

export interface VerifyReceiptResponse {
  success: boolean;
  subscription: {
    status: string;
    plan: string;
    is_premium: boolean;
    expires_at: string | null;
  };
  quota: {
    tier: string;
    daily_limit: number;
    daily_used: number;
    remaining: number;
  };
}

export interface PurchaseCallbacks {
  onPurchaseSuccess?: (purchase: Purchase) => void;
  onPurchaseError?: (error: PurchaseError) => void;
  onReceiptVerified?: (response: VerifyReceiptResponse) => void;
  onReceiptVerificationFailed?: (error: Error) => void;
}

// ─── State ──────────────────────────────────────────────

let isConnected = false;
let purchaseUpdateSubscription: EventSubscription | null = null;
let purchaseErrorSubscription: EventSubscription | null = null;
let currentCallbacks: PurchaseCallbacks = {};

// ─── Connection ─────────────────────────────────────────

/**
 * Initialize IAP connection and set up listeners
 * Must be called once at app startup
 */
export async function initIAP(callbacks: PurchaseCallbacks = {}): Promise<boolean> {
  // Skip IAP entirely in Expo Go — native modules are not available
  if (Constants.appOwnership === 'expo') {
    if (__DEV__) {
      console.log('[IAP] Running in Expo Go — skipping IAP initialization');
    }
    return false;
  }

  try {
    currentCallbacks = callbacks;

    const result = await initConnection();
    isConnected = true;

    // Set up purchase listeners
    purchaseUpdateSubscription = purchaseUpdatedListener(handlePurchaseUpdate);
    purchaseErrorSubscription = purchaseErrorListener(handlePurchaseError);

    if (__DEV__) {
      console.log('[IAP] Connection initialized:', result);
    }

    return true;
  } catch (error) {
    // Gracefully handle Expo Go / missing native modules
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isExpoGo = errorMessage.includes('Expo Go') || errorMessage.includes('NitroModules');

    if (isExpoGo) {
      if (__DEV__) {
        console.log('[IAP] Running in Expo Go — IAP not available (expected)');
      }
    } else {
      console.error('[IAP] Failed to initialize:', error);
    }

    isConnected = false;
    return false;
  }
}

/**
 * Clean up IAP connection and listeners
 * Should be called when the app is shutting down
 */
export async function cleanupIAP(): Promise<void> {
  try {
    purchaseUpdateSubscription?.remove();
    purchaseErrorSubscription?.remove();
    purchaseUpdateSubscription = null;
    purchaseErrorSubscription = null;
    currentCallbacks = {};

    if (isConnected) {
      await endConnection();
      isConnected = false;
    }

    if (__DEV__) {
      console.log('[IAP] Connection cleaned up');
    }
  } catch (error) {
    console.error('[IAP] Cleanup error:', error);
  }
}

// ─── Products ───────────────────────────────────────────

/**
 * Fetch available subscription products from the store
 */
export async function fetchSubscriptions(): Promise<ProductSubscription[]> {
  if (!isConnected) {
    console.warn('[IAP] Not connected. Call initIAP first.');
    return [];
  }

  try {
    const products = await fetchProducts({
      skus: SUBSCRIPTION_SKUS as unknown as string[],
      type: 'subs',
    });

    // Filter to subscription products only
    const subs = (products ?? []).filter(
      (p): p is ProductSubscription => p.type === 'subs'
    );

    if (__DEV__) {
      console.log('[IAP] Fetched subscriptions:', subs.length);
      subs.forEach((s: ProductSubscription) => {
        console.log(`  - ${s.id}: ${s.displayPrice}`);
      });
    }

    return subs;
  } catch (error) {
    console.error('[IAP] Failed to fetch subscriptions:', error);
    return [];
  }
}

// ─── Purchase ───────────────────────────────────────────

/**
 * Request a subscription purchase
 * Uses unified API for both iOS and Android
 */
export async function purchaseSubscription(
  productId: string,
  subscriptions?: ProductSubscription[]
): Promise<void> {
  if (!isConnected) {
    throw new Error('IAP не инициализирован');
  }

  try {
    const subscription = subscriptions?.find(
      (s) => s.id === productId
    );

    if (Platform.OS === 'ios') {
      await requestPurchase({
        request: {
          apple: {
            sku: productId,
          },
        },
        type: 'subs',
      });
    } else {
      // Android requires offerToken via subscriptionOffers
      const androidSub = subscription as any;
      const offers = androidSub?.subscriptionOfferDetails;

      await requestPurchase({
        request: {
          google: {
            skus: [productId],
            subscriptionOffers: offers?.map((offer: any) => ({
              sku: productId,
              offerToken: offer.offerTokenAndroid || offer.offerToken,
            })),
          },
        },
        type: 'subs',
      });
    }

    if (__DEV__) {
      console.log('[IAP] Purchase requested:', productId);
    }
  } catch (error: any) {
    // User cancellation is not a real error
    if (isUserCancelledError(error)) {
      if (__DEV__) {
        console.log('[IAP] Purchase cancelled by user');
      }
      return;
    }
    throw error;
  }
}

// ─── Restore ────────────────────────────────────────────

/**
 * Restore previous purchases
 * Fetches available purchases and verifies each with the server
 */
export async function restorePurchases(): Promise<VerifyReceiptResponse | null> {
  if (!isConnected) {
    throw new Error('IAP не инициализирован');
  }

  try {
    const purchases = await getAvailablePurchases();

    if (__DEV__) {
      console.log('[IAP] Available purchases for restore:', purchases.length);
    }

    if (purchases.length === 0) {
      return null;
    }

    // Find the most recent subscription purchase
    const subscriptionPurchase = purchases
      .filter((p) => (SUBSCRIPTION_SKUS as readonly string[]).includes(p.productId))
      .sort((a, b) => {
        const dateA = a.transactionDate ?? 0;
        const dateB = b.transactionDate ?? 0;
        return dateB - dateA;
      })[0];

    if (!subscriptionPurchase) {
      return null;
    }

    // Verify the restored purchase with server
    const result = await verifyReceipt(subscriptionPurchase);

    // Finish the transaction
    await finishTransaction({
      purchase: subscriptionPurchase,
      isConsumable: false,
    });

    return result;
  } catch (error) {
    console.error('[IAP] Restore failed:', error);
    throw error;
  }
}

// ─── Receipt Verification ────────────────────────────────

/**
 * Send purchase receipt to backend for server-side verification
 */
export async function verifyReceipt(
  purchase: Purchase
): Promise<VerifyReceiptResponse> {
  const store = getStoreName();

  const payload: Record<string, unknown> = {
    store,
    product_id: purchase.productId,
    transaction_id: purchase.transactionId,
  };

  if (Platform.OS === 'ios') {
    // In v14, purchaseToken holds the JWS for iOS
    payload.receipt_data = purchase.purchaseToken;
  } else {
    payload.purchase_token = purchase.purchaseToken;
    payload.package_name = (purchase as any).packageNameAndroid;
  }

  if (__DEV__) {
    console.log('[IAP] Verifying receipt:', {
      store,
      productId: purchase.productId,
      transactionId: purchase.transactionId,
    });
  }

  const response = await apiPost<VerifyReceiptResponse>(
    '/v1/subscription/verify',
    payload,
    undefined,
    { maxRetries: 2, baseDelay: 2000 }
  );

  return response;
}

// ─── Internal Handlers ──────────────────────────────────

/**
 * Handle successful purchase update from store
 */
async function handlePurchaseUpdate(purchase: Purchase): Promise<void> {
  if (__DEV__) {
    console.log('[IAP] Purchase update:', purchase.productId, purchase.transactionId);
  }

  // purchaseToken is the unified receipt (JWS on iOS, purchaseToken on Android)
  if (!purchase.purchaseToken) {
    console.warn('[IAP] Purchase has no token');
    return;
  }

  try {
    // Verify receipt with our server
    const result = await verifyReceipt(purchase);

    // Finish the transaction (subscription = non-consumable)
    await finishTransaction({
      purchase,
      isConsumable: false,
    });

    currentCallbacks.onReceiptVerified?.(result);
    currentCallbacks.onPurchaseSuccess?.(purchase);
  } catch (error) {
    console.error('[IAP] Receipt verification failed:', error);
    currentCallbacks.onReceiptVerificationFailed?.(
      error instanceof Error ? error : new Error('Ошибка верификации чека')
    );
  }
}

/**
 * Handle purchase error from store
 */
function handlePurchaseError(error: PurchaseError): void {
  if (__DEV__) {
    console.error('[IAP] Purchase error:', error.code, error.message);
  }

  // Don't report user cancellation as error
  if (error.code === ErrorCode.UserCancelled) {
    return;
  }

  currentCallbacks.onPurchaseError?.(error);
}
