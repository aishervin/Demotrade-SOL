/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AccountState } from '../types/trading';
import { createInitialAccountState } from '../engine/tradingEngine';

const STORAGE_KEY = 'apexfutures_demo_account_v1';
const PREFS_KEY = 'apexfutures_demo_prefs_v1';

export interface UserPreferences {
  language: 'en' | 'fa';
  defaultLeverage: number;
  defaultMarginMode: 'isolated' | 'cross';
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  orderBookPrecision: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'en',
  defaultLeverage: 75,
  defaultMarginMode: 'isolated',
  soundEnabled: true,
  hapticsEnabled: true,
  orderBookPrecision: 2,
};

export class PersistenceManager {
  public static loadAccountState(): AccountState {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (serialized) {
        const parsed = JSON.parse(serialized);
        // Basic schema check
        if (typeof parsed.walletBalance === 'number' && Array.isArray(parsed.positions)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load persisted account state, using fresh state:', e);
    }
    return createInitialAccountState();
  }

  public static saveAccountState(state: AccountState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save account state:', e);
    }
  }

  public static resetAccountState(newBalance = 10000): AccountState {
    const freshState = createInitialAccountState(newBalance);
    this.saveAccountState(freshState);
    return freshState;
  }

  public static loadPreferences(): UserPreferences {
    try {
      const serialized = localStorage.getItem(PREFS_KEY);
      if (serialized) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(serialized) };
      }
    } catch (_) {}
    return DEFAULT_PREFERENCES;
  }

  public static savePreferences(prefs: UserPreferences) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (_) {}
  }
}
