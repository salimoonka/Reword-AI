/**
 * Supabase Database Types
 * Auto-generated types for database tables
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      subscriptions: {
        Row: Subscription;
        Insert: SubscriptionInsert;
        Update: SubscriptionUpdate;
      };
      usage_log: {
        Row: UsageLog;
        Insert: UsageLogInsert;
        Update: never;
      };
      paraphrase_cache: {
        Row: ParaphraseCache;
        Insert: ParaphraseCacheInsert;
        Update: ParaphraseCacheUpdate;
      };
    };
    Functions: {
      get_daily_usage_count: {
        Args: { p_user_id: string };
        Returns: number;
      };
      has_premium_access: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      get_remaining_quota: {
        Args: { p_user_id: string; p_daily_limit?: number };
        Returns: number;
      };
    };
  };
}

// ============================================
// PROFILES
// ============================================

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  preferred_mode: 'lite' | 'moderate' | 'creative';
  theme: 'auto' | 'dark' | 'light';
  language: 'ru' | 'en';
  sound_enabled: boolean;
  haptic_enabled: boolean;
  auto_correct_enabled: boolean;
  show_suggestions: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  preferred_mode?: 'lite' | 'moderate' | 'creative';
  theme?: 'auto' | 'dark' | 'light';
  language?: 'ru' | 'en';
  sound_enabled?: boolean;
  haptic_enabled?: boolean;
  auto_correct_enabled?: boolean;
  show_suggestions?: boolean;
}

export interface ProfileUpdate {
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  preferred_mode?: 'lite' | 'moderate' | 'creative';
  theme?: 'auto' | 'dark' | 'light';
  language?: 'ru' | 'en';
  sound_enabled?: boolean;
  haptic_enabled?: boolean;
  auto_correct_enabled?: boolean;
  show_suggestions?: boolean;
}

// ============================================
// SUBSCRIPTIONS
// ============================================

export type SubscriptionStatus = 'free' | 'active' | 'expired' | 'cancelled' | 'trial';
export type SubscriptionPlan = 'free' | 'pro_monthly' | 'pro_yearly';
export type Store = 'apple' | 'google';

export interface Subscription {
  id: string;
  user_id: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  store: Store | null;
  store_product_id: string | null;
  store_transaction_id: string | null;
  store_original_transaction_id: string | null;
  started_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  trial_ends_at: string | null;
  price_amount: number | null;
  price_currency: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionInsert {
  user_id: string;
  status?: SubscriptionStatus;
  plan?: SubscriptionPlan;
  store?: Store | null;
  store_product_id?: string | null;
  store_transaction_id?: string | null;
  store_original_transaction_id?: string | null;
  started_at?: string | null;
  expires_at?: string | null;
  cancelled_at?: string | null;
  trial_ends_at?: string | null;
  price_amount?: number | null;
  price_currency?: string;
}

export interface SubscriptionUpdate {
  status?: SubscriptionStatus;
  plan?: SubscriptionPlan;
  store?: Store | null;
  store_product_id?: string | null;
  store_transaction_id?: string | null;
  store_original_transaction_id?: string | null;
  started_at?: string | null;
  expires_at?: string | null;
  cancelled_at?: string | null;
  trial_ends_at?: string | null;
  price_amount?: number | null;
  price_currency?: string;
}

// ============================================
// USAGE_LOG
// ============================================

export type UsageAction = 'paraphrase' | 'check' | 'spellcheck';
export type ParaphraseMode = 
  | 'paraphrase'
  | 'shorten' 
  | 'expand' 
  | 'formal' 
  | 'friendly' 
  | 'confident' 
  | 'professional' 
  | 'colloquial' 
  | 'empathetic';

export interface UsageLog {
  id: string;
  user_id: string;
  action: UsageAction;
  mode: ParaphraseMode | null;
  input_length: number;
  output_length: number | null;
  input_hash: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  model: string | null;
  latency_ms: number | null;
  cached: boolean;
  success: boolean;
  error_code: string | null;
  created_at: string;
}

export interface UsageLogInsert {
  user_id: string;
  action: UsageAction;
  mode?: ParaphraseMode | null;
  input_length: number;
  output_length?: number | null;
  input_hash?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
  model?: string | null;
  latency_ms?: number | null;
  cached?: boolean;
  success?: boolean;
  error_code?: string | null;
}

// ============================================
// PARAPHRASE_CACHE
// ============================================

export interface ParaphraseCache {
  id: string;
  input_hash: string;
  mode: string;
  output_text: string;
  model: string | null;
  tokens_used: number | null;
  hit_count: number;
  created_at: string;
  expires_at: string;
}

export interface ParaphraseCacheInsert {
  input_hash: string;
  mode: string;
  output_text: string;
  model?: string | null;
  tokens_used?: number | null;
}

export interface ParaphraseCacheUpdate {
  hit_count?: number;
  expires_at?: string;
}
