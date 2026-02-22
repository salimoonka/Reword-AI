/**
 * SharedStorage - TypeScript wrapper for native SharedStorage module
 * Provides type-safe access to shared preferences between React Native and keyboard extension
 */

import { NativeModules, Platform } from 'react-native';

const { SharedStorage: NativeModule } = NativeModules;

interface AuthData {
  token: string;
  refreshToken?: string;
  expiryTimestamp: number;
  userId: string;
}

interface Preferences {
  selectedMode: string;
  autoCorrect: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  showSuggestions: boolean;
}

interface SubscriptionInfo {
  isPremium: boolean;
  dailyLimit: number;
  remainingQuota: number;
  expiryTimestamp?: number;
}

interface UsageStats {
  totalParaphrases: number;
  dailyParaphrases: number;
  remainingQuota: number;
}

interface ParaphraseEntry {
  original: string;
  result: string;
  mode: string;
  timestamp: string;
}

class SharedStorageClass {
  // MARK: - Authentication

  async setAuthToken(token: string): Promise<boolean> {
    return NativeModule.setAuthToken(token);
  }

  async getAuthToken(): Promise<string | null> {
    return NativeModule.getAuthToken();
  }

  async setAuthData(data: AuthData): Promise<boolean> {
    return NativeModule.setAuthData(
      data.token,
      data.refreshToken || null,
      data.expiryTimestamp,
      data.userId
    );
  }

  async clearAuthData(): Promise<boolean> {
    return NativeModule.clearAuthData();
  }

  async isAuthenticated(): Promise<boolean> {
    return NativeModule.isAuthenticated();
  }

  // MARK: - API Configuration

  async setApiBaseUrl(url: string): Promise<boolean> {
    if (NativeModule?.setApiBaseUrl) {
      return NativeModule.setApiBaseUrl(url);
    }
    return true;
  }

  async getApiBaseUrl(): Promise<string> {
    if (NativeModule?.getApiBaseUrl) {
      return NativeModule.getApiBaseUrl();
    }
    return 'https://api.reword.ai';
  }

  // MARK: - Preferences

  async setSelectedMode(mode: 'lite' | 'moderate' | 'creative'): Promise<boolean> {
    return NativeModule.setSelectedMode(mode);
  }

  async getSelectedMode(): Promise<string> {
    return NativeModule.getSelectedMode();
  }

  async setAutoCorrect(enabled: boolean): Promise<boolean> {
    return NativeModule.setAutoCorrect(enabled);
  }

  async getAutoCorrect(): Promise<boolean> {
    return NativeModule.getAutoCorrect();
  }

  async setSoundEnabled(enabled: boolean): Promise<boolean> {
    return NativeModule.setSoundEnabled(enabled);
  }

  async setHapticEnabled(enabled: boolean): Promise<boolean> {
    return NativeModule.setHapticEnabled(enabled);
  }

  async setShowSuggestions(enabled: boolean): Promise<boolean> {
    return NativeModule.setShowSuggestions(enabled);
  }

  async setCloudEnabled(enabled: boolean): Promise<boolean> {
    if (Platform.OS === 'ios' && NativeModule?.setCloudEnabled) {
      return NativeModule.setCloudEnabled(enabled);
    }
    // Android: no shared storage needed, setting is checked in JS
    return true;
  }

  async getPreferences(): Promise<Preferences> {
    return NativeModule.getPreferences();
  }

  // MARK: - Subscription

  async setIsPremium(isPremium: boolean): Promise<boolean> {
    return NativeModule.setIsPremium(isPremium);
  }

  async getIsPremium(): Promise<boolean> {
    return NativeModule.getIsPremium();
  }

  async setDailyLimit(limit: number): Promise<boolean> {
    return NativeModule.setDailyLimit(limit);
  }

  async getRemainingQuota(): Promise<number> {
    return NativeModule.getRemainingQuota();
  }

  async getSubscriptionInfo(): Promise<SubscriptionInfo> {
    return NativeModule.getSubscriptionInfo();
  }

  // MARK: - Usage Stats

  async getUsageStats(): Promise<UsageStats> {
    return NativeModule.getUsageStats();
  }

  async incrementUsage(): Promise<boolean> {
    return NativeModule.incrementUsage();
  }

  // MARK: - Cache

  async getRecentParaphrases(): Promise<ParaphraseEntry[]> {
    return NativeModule.getRecentParaphrases();
  }

  async addRecentParaphrase(
    original: string,
    result: string,
    mode: string
  ): Promise<boolean> {
    return NativeModule.addRecentParaphrase(original, result, mode);
  }

  async getCustomDictionary(): Promise<string[]> {
    return NativeModule.getCustomDictionary();
  }

  async addToDictionary(word: string): Promise<boolean> {
    return NativeModule.addToDictionary(word);
  }

  // MARK: - Generic Key-Value

  async setValue(key: string, value: string | number | boolean | null): Promise<boolean> {
    return NativeModule.setValue(key, value);
  }

  async getValue<T = unknown>(key: string): Promise<T | null> {
    return NativeModule.getValue(key);
  }

  async getAllKeys(): Promise<string[]> {
    return NativeModule.getAllKeys();
  }

  // MARK: - Utility

  async clearAll(): Promise<boolean> {
    return NativeModule.clearAll();
  }

  /**
   * Check if native module is available
   */
  isAvailable(): boolean {
    return !!NativeModule;
  }

  /**
   * Get platform-specific note
   */
  getPlatformNote(): string {
    if (Platform.OS === 'ios') {
      return 'Uses App Group for cross-extension data sharing';
    } else if (Platform.OS === 'android') {
      return 'Uses SharedPreferences for cross-process data sharing';
    }
    return 'Not supported on this platform';
  }
}

export const SharedStorage = new SharedStorageClass();

export type {
  AuthData,
  Preferences,
  SubscriptionInfo,
  UsageStats,
  ParaphraseEntry,
};
