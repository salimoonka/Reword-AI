/**
 * IAP Product Configuration
 * Product IDs and pricing for App Store / Google Play
 */

import { Platform } from 'react-native';

/**
 * Product IDs — must match App Store Connect / Google Play Console
 */
export const PRODUCT_IDS = {
  PRO_MONTHLY: 'com.rewordai.pro.monthly',
} as const;

/**
 * Subscription SKUs array for fetching from store
 */
export const SUBSCRIPTION_SKUS = [PRODUCT_IDS.PRO_MONTHLY];

/**
 * Product display info (used when store info isn't available)
 */
export const PRODUCT_DISPLAY: Record<
  string,
  { title: string; description: string; price: string; period: string }
> = {
  [PRODUCT_IDS.PRO_MONTHLY]: {
    title: 'PRO подписка',
    description: 'Безлимитные AI-перефразирования',
    price: '199 ₽',
    period: 'месяц',
  },
};

/**
 * Get the localized price from store product, or fallback to display price
 */
export function getProductPrice(
  productId: string,
  storePrice?: string
): string {
  if (storePrice) return storePrice;
  return PRODUCT_DISPLAY[productId]?.price ?? '199 ₽';
}

/**
 * Determine if a product ID is a subscription
 */
export function isSubscription(productId: string): boolean {
  return (SUBSCRIPTION_SKUS as readonly string[]).includes(productId);
}

/**
 * Get the store name for the current platform
 */
export function getStoreName(): 'apple' | 'google' {
  return Platform.OS === 'ios' ? 'apple' : 'google';
}
