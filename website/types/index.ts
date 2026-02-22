export type Store = 'apple' | 'google' | 'external';

export type SubscriptionStatus = 'active' | 'expired' | 'canceled' | 'trial' | 'none';

export type PlanId = 'pro_monthly' | 'pro_yearly';

export interface SubscriptionInfo {
  user_id: string;
  status: SubscriptionStatus;
  plan: string;
  store: Store;
  expires_at: string | null;
  trial_ends_at: string | null;
  is_premium: boolean;
}

export interface QuotaInfo {
  tier: 'free' | 'pro';
  daily_limit: number;
  daily_used: number;
  remaining: number;
  reset_at: string;
}

export interface PaymentMethod {
  id: 'card' | 'sbp';
  name: string;
  description: string;
  icon: string;
}
