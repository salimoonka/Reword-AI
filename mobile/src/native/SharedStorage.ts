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
  /**
   * Guard: throws a descriptive error if native module is unavailable.
   * Every public method should call this before accessing NativeModule.
   */
  private ensureAvailable(): void {
    if (!NativeModule) {
      throw new Error(
        'SharedStorage native module is not available. ' +
        'This is expected in Expo Go; methods are no-ops there.'
      );
    }
  }

  /**
   * Safely call a native method, returning `fallback` when the module is missing.
   */
  private async safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    if (!NativeModule) return fallback;
    try {
      return await fn();
    } catch (e) {
      console.warn('[SharedStorage] Native call failed:', e);
      return fallback;
    }
  }

  // MARK: - Authentication

  async setAuthToken(token: string): Promise<boolean> {
    return this.safe(() => NativeModule.setAuthToken(token), false);
  }

  async getAuthToken(): Promise<string | null> {
    return this.safe(() => NativeModule.getAuthToken(), null);
  }

  async setAuthData(data: AuthData): Promise<boolean> {
    return this.safe(
      () =>
        NativeModule.setAuthData(
          data.token,
          data.refreshToken || null,
          data.expiryTimestamp,
          data.userId
        ),
      false,
    );
  }

  async clearAuthData(): Promise<boolean> {
    return this.safe(() => NativeModule.clearAuthData(), false);
  }

  async isAuthenticated(): Promise<boolean> {
    return this.safe(() => NativeModule.isAuthenticated(), false);
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
    return this.safe(() => NativeModule.setSelectedMode(mode), false);
  }

  async getSelectedMode(): Promise<string> {
    return this.safe(() => NativeModule.getSelectedMode(), 'moderate');
  }

  async setAutoCorrect(enabled: boolean): Promise<boolean> {
    return this.safe(() => NativeModule.setAutoCorrect(enabled), false);
  }

  async getAutoCorrect(): Promise<boolean> {
    return this.safe(() => NativeModule.getAutoCorrect(), true);
  }

  async setSoundEnabled(enabled: boolean): Promise<boolean> {
    return this.safe(() => NativeModule.setSoundEnabled(enabled), false);
  }

  async setHapticEnabled(enabled: boolean): Promise<boolean> {
    return this.safe(() => NativeModule.setHapticEnabled(enabled), false);
  }

  async setShowSuggestions(enabled: boolean): Promise<boolean> {
    return this.safe(() => NativeModule.setShowSuggestions(enabled), false);
  }

  async setCloudEnabled(enabled: boolean): Promise<boolean> {
    if (Platform.OS === 'ios' && NativeModule?.setCloudEnabled) {
      return NativeModule.setCloudEnabled(enabled);
    }
    // Android: no shared storage needed, setting is checked in JS
    return true;
  }

  async getPreferences(): Promise<Preferences> {
    return this.safe(() => NativeModule.getPreferences(), {
      selectedMode: 'moderate',
      autoCorrect: true,
      soundEnabled: true,
      hapticEnabled: true,
      showSuggestions: true,
    });
  }

  // MARK: - Subscription

  async setIsPremium(isPremium: boolean): Promise<boolean> {
    return this.safe(() => NativeModule.setIsPremium(isPremium), false);
  }

  async getIsPremium(): Promise<boolean> {
    return this.safe(() => NativeModule.getIsPremium(), false);
  }

  async setDailyLimit(limit: number): Promise<boolean> {
    return this.safe(() => NativeModule.setDailyLimit(limit), false);
  }

  async getRemainingQuota(): Promise<number> {
    return this.safe(() => NativeModule.getRemainingQuota(), 0);
  }

  async getSubscriptionInfo(): Promise<SubscriptionInfo> {
    return this.safe(() => NativeModule.getSubscriptionInfo(), {
      isPremium: false,
      dailyLimit: 30,
      remainingQuota: 0,
    });
  }

  // MARK: - Usage Stats

  async getUsageStats(): Promise<UsageStats> {
    return this.safe(() => NativeModule.getUsageStats(), {
      totalParaphrases: 0,
      dailyParaphrases: 0,
      remainingQuota: 0,
    });
  }

  async incrementUsage(): Promise<boolean> {
    return this.safe(() => NativeModule.incrementUsage(), false);
  }

  // MARK: - Cache

  async getRecentParaphrases(): Promise<ParaphraseEntry[]> {
    return this.safe(() => NativeModule.getRecentParaphrases(), []);
  }

  async addRecentParaphrase(
    original: string,
    result: string,
    mode: string
  ): Promise<boolean> {
    return this.safe(
      () => NativeModule.addRecentParaphrase(original, result, mode),
      false,
    );
  }

  async getCustomDictionary(): Promise<string[]> {
    return this.safe(() => NativeModule.getCustomDictionary(), []);
  }

  async addToDictionary(word: string): Promise<boolean> {
    return this.safe(() => NativeModule.addToDictionary(word), false);
  }

  // MARK: - Generic Key-Value

  async setValue(key: string, value: string | number | boolean | null): Promise<boolean> {
    return this.safe(() => NativeModule.setValue(key, value), false);
  }

  async getValue<T = unknown>(key: string): Promise<T | null> {
    return this.safe(() => NativeModule.getValue(key), null);
  }

  async getAllKeys(): Promise<string[]> {
    return this.safe(() => NativeModule.getAllKeys(), []);
  }

  // MARK: - Utility

  async clearAll(): Promise<boolean> {
    return this.safe(() => NativeModule.clearAll(), false);
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
