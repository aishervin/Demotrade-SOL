/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AccountState,
  Candle,
  IndicatorConfig,
  MarginMode,
  MarketTick,
  OrderBookData,
  Position,
  RecentTrade,
  Timeframe,
} from '../types/trading';
import {
  adjustPositionMargin,
  applyFundingSettlement,
  cancelAllOrders as engineCancelAll,
  cancelOrder as engineCancelOrder,
  closePosition as engineClosePosition,
  createInitialAccountState,
  ExecutionResult,
  placeOrder as enginePlaceOrder,
  PlaceOrderParams,
  processMarketTick,
  updatePositionTPSL,
} from '../engine/tradingEngine';
import { ConnectionStatus, MarketDataAdapter } from '../services/marketData';
import { PersistenceManager, UserPreferences } from '../storage/db';
import { translations, Translations } from '../locales/translations';

export interface NotificationItem {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
}

export const DEFAULT_INDICATORS: IndicatorConfig = {
  showEMA9: true,
  showEMA21: true,
  showSMA50: false,
  showSMA200: false,
  showBollingerBands: false,
  showRSI: false,
  showMACD: false,
  showVolume: true,
};

function createSeedCandles(): Candle[] {
  const candles: Candle[] = [];
  const nowSec = Math.floor(Date.now() / 1000);
  const stepSec = 900; // 15m default
  const alignedNow = Math.floor(nowSec / stepSec) * stepSec;
  let price = 180.20;

  for (let i = 80; i >= 0; i--) {
    const time = alignedNow - i * stepSec;
    const change = (Math.sin(i * 0.3) * 1.8) + ((i % 5 === 0 ? 1 : -1) * 0.9);
    const open = price;
    const close = Math.round((open + change) * 100) / 100;
    const high = Math.round((Math.max(open, close) + 0.6) * 100) / 100;
    const low = Math.round((Math.min(open, close) - 0.6) * 100) / 100;
    const volume = Math.round((1200 + Math.random() * 800) * 10) / 10;
    price = close;
    candles.push({ time, open, high, low, close, volume });
  }
  return candles;
}

// Global singleton instance so all React components share the same reactive state
let listeners: Array<() => void> = [];

let state = {
  account: PersistenceManager.loadAccountState(),
  preferences: PersistenceManager.loadPreferences(),
  tick: {
    symbol: 'SOL/USDT',
    price: 184.50,
    bidPrice: 184.48,
    askPrice: 184.52,
    high24h: 189.20,
    low24h: 179.80,
    volume24h: 3450200,
    quoteVolume24h: 636561900,
    priceChange24h: 4.70,
    priceChangePercent24h: 2.61,
    timestamp: Date.now(),
    source: 'spot_reference' as const,
  } as MarketTick,
  candles: createSeedCandles(),
  orderBook: {
    bids: [],
    asks: [],
    spread: 0.02,
    spreadPercent: 0.01,
    lastUpdated: Date.now(),
  } as OrderBookData,
  recentTrades: [] as RecentTrade[],
  connectionStatus: 'connecting' as ConnectionStatus,
  latencyMs: 38,
  timeframe: '15m' as Timeframe,
  leverage: 75,
  marginMode: 'isolated' as MarginMode,
  indicators: { ...DEFAULT_INDICATORS },
  notifications: [] as NotificationItem[],
  nextFundingCountdown: '05:42:18',
  fundingRate: 0.0001, // +0.0100%
};

let marketAdapter: MarketDataAdapter | null = null;
let fundingCountdownTimer: any = null;

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function addNotification(type: 'success' | 'warning' | 'error' | 'info', message: string) {
  const notif: NotificationItem = {
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type,
    message,
    timestamp: Date.now(),
  };
  state = {
    ...state,
    notifications: [notif, ...state.notifications.slice(0, 4)],
  };
  emitChange();

  setTimeout(() => {
    state = {
      ...state,
      notifications: state.notifications.filter((n) => n.id !== notif.id),
    };
    emitChange();
  }, 4500);
}

export function initTradingStore() {
  if (marketAdapter) return;

  // Initialize market adapter
  marketAdapter = new MarketDataAdapter({
    onTick: (tick) => {
      // Process tick in trading engine
      const { state: updatedAccount, events } = processMarketTick(state.account, tick);
      state = {
        ...state,
        tick,
        account: updatedAccount,
      };

      // Persist state if orders or positions changed
      PersistenceManager.saveAccountState(updatedAccount);

      for (const ev of events) {
        addNotification(
          ev.type === 'liquidation' ? 'error' : ev.type === 'limit_filled' ? 'success' : 'info',
          ev.message
        );
      }
      emitChange();
    },
    onCandle: (candle, isClosed) => {
      const existingCandles = [...state.candles];
      const lastIdx = existingCandles.length - 1;

      if (lastIdx >= 0 && existingCandles[lastIdx].time === candle.time) {
        existingCandles[lastIdx] = candle;
      } else if (lastIdx >= 0 && candle.time < existingCandles[lastIdx].time) {
        const foundIdx = existingCandles.findIndex((c) => c.time === candle.time);
        if (foundIdx >= 0) {
          existingCandles[foundIdx] = candle;
        } else {
          existingCandles.push(candle);
          existingCandles.sort((a, b) => a.time - b.time);
        }
      } else {
        existingCandles.push(candle);
      }

      state = {
        ...state,
        candles: existingCandles,
      };
      emitChange();
    },
    onHistoricalCandles: (historicalCandles) => {
      // Strictly sort ascending and deduplicate
      const sorted = [...historicalCandles].sort((a, b) => a.time - b.time);
      const deduped: Candle[] = [];
      let prevTime = -1;
      for (const c of sorted) {
        if (c.time > prevTime) {
          deduped.push(c);
          prevTime = c.time;
        }
      }
      state = {
        ...state,
        candles: deduped,
      };
      emitChange();
    },
    onOrderBook: (orderBook) => {
      state = { ...state, orderBook };
      emitChange();
    },
    onTrade: (trade) => {
      state = {
        ...state,
        recentTrades: [trade, ...state.recentTrades.slice(0, 24)],
      };
      emitChange();
    },
    onStatusChange: (connectionStatus, latencyMs) => {
      state = {
        ...state,
        connectionStatus,
        latencyMs: latencyMs || state.latencyMs,
      };
      emitChange();
    },
  });

  marketAdapter.setTimeframe(state.timeframe);
  marketAdapter.start();

  // Setup funding countdown timer (8h epochs: 00:00, 08:00, 16:00 UTC)
  fundingCountdownTimer = setInterval(() => {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const nextEpochHours = (Math.floor(utcHours / 8) + 1) * 8;
    const nextEpoch = new Date(now);
    nextEpoch.setUTCHours(nextEpochHours, 0, 0, 0);

    const diffMs = nextEpoch.getTime() - now.getTime();
    if (diffMs <= 0) {
      // Trigger funding settlement
      const fundedAccount = applyFundingSettlement(state.account, state.fundingRate);
      state = { ...state, account: fundedAccount };
      PersistenceManager.saveAccountState(fundedAccount);
      addNotification('info', `Simulated 8-hour funding settled (${(state.fundingRate * 100).toFixed(4)}%)`);
      emitChange();
      return;
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
    const countdown = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    state = { ...state, nextFundingCountdown: countdown };
    emitChange();
  }, 1000);
}

export function useTradingStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    initTradingStore();
    const listener = () => setTick((t) => t + 1);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const t: Translations = translations[state.preferences.language];

  // Actions
  const handlePlaceOrder = useCallback(
    (params: Omit<PlaceOrderParams, 'leverage' | 'marginMode'> & Partial<Pick<PlaceOrderParams, 'leverage' | 'marginMode'>>): ExecutionResult => {
      const res = enginePlaceOrder(state.account, state.tick, {
        ...params,
        leverage: params.leverage ?? state.leverage,
        marginMode: params.marginMode ?? state.marginMode,
      });

    if (res.success) {
      state = { ...state, account: res.state };
      PersistenceManager.saveAccountState(res.state);
      if (res.notification) {
        addNotification(res.notification.type, res.notification.message);
      }
      emitChange();
    } else if (res.error) {
      addNotification('error', res.error);
    }
    return res;
  }, []);

  const handleClosePosition = useCallback((positionId: string, qtySOL: number) => {
    const res = engineClosePosition(state.account, positionId, qtySOL, state.tick.price);
    if (res.success) {
      state = { ...state, account: res.state };
      PersistenceManager.saveAccountState(res.state);
      if (res.notification) {
        addNotification(res.notification.type, res.notification.message);
      }
      emitChange();
    } else if (res.error) {
      addNotification('error', res.error);
    }
  }, []);

  const handleCloseAllPositions = useCallback(() => {
    let currentAcc = state.account;
    const count = currentAcc.positions.length;
    for (const pos of currentAcc.positions) {
      const res = engineClosePosition(currentAcc, pos.id, pos.size, state.tick.price);
      if (res.success) {
        currentAcc = res.state;
      }
    }
    state = { ...state, account: currentAcc };
    PersistenceManager.saveAccountState(currentAcc);
    addNotification('info', `Closed all ${count} open positions at market price`);
    emitChange();
  }, []);

  const handleCancelOrder = useCallback((orderId: string) => {
    const updated = engineCancelOrder(state.account, orderId);
    state = { ...state, account: updated };
    PersistenceManager.saveAccountState(updated);
    addNotification('info', 'Order canceled');
    emitChange();
  }, []);

  const handleCancelAllOrders = useCallback(() => {
    const count = state.account.openOrders.length;
    const updated = engineCancelAll(state.account);
    state = { ...state, account: updated };
    PersistenceManager.saveAccountState(updated);
    addNotification('info', `Canceled all ${count} open orders`);
    emitChange();
  }, []);

  const handleAdjustMargin = useCallback((positionId: string, delta: number) => {
    const res = adjustPositionMargin(state.account, positionId, delta);
    if (res.success) {
      state = { ...state, account: res.state };
      PersistenceManager.saveAccountState(res.state);
      addNotification('success', `${delta > 0 ? 'Added' : 'Removed'} ${Math.abs(delta)} USDT margin`);
      emitChange();
    } else if (res.error) {
      addNotification('error', res.error);
    }
  }, []);

  const handleUpdateTPSL = useCallback((positionId: string, tp?: number, sl?: number) => {
    const updated = updatePositionTPSL(state.account, positionId, tp, sl);
    state = { ...state, account: updated };
    PersistenceManager.saveAccountState(updated);
    addNotification('success', 'Take Profit & Stop Loss updated');
    emitChange();
  }, []);

  const handleReversePosition = useCallback((positionId: string) => {
    const pos = state.account.positions.find((p) => p.id === positionId);
    if (!pos) return;

    // First close existing position
    const closeRes = engineClosePosition(state.account, positionId, pos.size, state.tick.price);
    if (!closeRes.success) return;

    // Then open opposite side with same size and leverage
    const reverseSide = pos.side === 'long' ? 'sell' : 'buy';
    const openRes = enginePlaceOrder(closeRes.state, state.tick, {
      symbol: pos.symbol,
      side: reverseSide,
      type: 'market',
      quantity: pos.size,
      leverage: pos.leverage,
      marginMode: pos.marginMode,
    });

    if (openRes.success) {
      state = { ...state, account: openRes.state };
      PersistenceManager.saveAccountState(openRes.state);
      addNotification('success', `Reversed to ${reverseSide === 'buy' ? 'Long' : 'Short'} ${pos.size} SOL`);
      emitChange();
    }
  }, []);

  const handleResetAccount = useCallback((newBalance = 10000) => {
    const fresh = PersistenceManager.resetAccountState(newBalance);
    state = { ...state, account: fresh };
    addNotification('info', `Demo balance reset to $${newBalance.toLocaleString()} USDT`);
    emitChange();
  }, []);

  const handleSetTimeframe = useCallback((tf: Timeframe) => {
    state = { ...state, timeframe: tf };
    if (marketAdapter) marketAdapter.setTimeframe(tf);
    emitChange();
  }, []);

  const handleSetLeverage = useCallback((leverage: number) => {
    const lev = Math.min(Math.max(leverage, 1), 75);
    state = { ...state, leverage: lev };
    emitChange();
  }, []);

  const handleSetMarginMode = useCallback((marginMode: MarginMode) => {
    state = { ...state, marginMode };
    emitChange();
  }, []);

  const handleSetLanguage = useCallback((language: 'en' | 'fa') => {
    const prefs: UserPreferences = { ...state.preferences, language };
    state = { ...state, preferences: prefs };
    PersistenceManager.savePreferences(prefs);
    emitChange();
  }, []);

  const handleSetIndicatorConfig = useCallback((indicators: IndicatorConfig) => {
    state = { ...state, indicators };
    emitChange();
  }, []);

  const handleSimulateFunding = useCallback(() => {
    const funded = applyFundingSettlement(state.account, state.fundingRate);
    state = { ...state, account: funded };
    PersistenceManager.saveAccountState(funded);
    addNotification('info', `Simulated funding settlement processed (${(state.fundingRate * 100).toFixed(4)}%)`);
    emitChange();
  }, []);

  return {
    account: state.account,
    tick: state.tick,
    candles: state.candles,
    orderBook: state.orderBook,
    recentTrades: state.recentTrades,
    connectionStatus: state.connectionStatus,
    latencyMs: state.latencyMs,
    timeframe: state.timeframe,
    leverage: state.leverage,
    marginMode: state.marginMode,
    indicators: state.indicators,
    notifications: state.notifications,
    preferences: state.preferences,
    nextFundingCountdown: state.nextFundingCountdown,
    fundingRate: state.fundingRate,
    t,
    actions: {
      placeOrder: handlePlaceOrder,
      closePosition: handleClosePosition,
      closeAllPositions: handleCloseAllPositions,
      cancelOrder: handleCancelOrder,
      cancelAllOrders: handleCancelAllOrders,
      adjustMargin: handleAdjustMargin,
      updateTPSL: handleUpdateTPSL,
      reversePosition: handleReversePosition,
      resetAccount: handleResetAccount,
      setTimeframe: handleSetTimeframe,
      setLeverage: handleSetLeverage,
      setMarginMode: handleSetMarginMode,
      setLanguage: handleSetLanguage,
      setIndicatorConfig: handleSetIndicatorConfig,
      simulateFunding: handleSimulateFunding,
    },
  };
}
