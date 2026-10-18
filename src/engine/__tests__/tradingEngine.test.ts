/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  calculateFee,
  calculateInitialMargin,
  calculateIsolatedLiquidationPrice,
  calculateNotional,
  calculateROE,
  calculateUnrealizedPnL,
} from '../margin';
import {
  applyFundingSettlement,
  cancelOrder,
  closePosition,
  createInitialAccountState,
  placeOrder,
  processMarketTick,
} from '../tradingEngine';
import { MarketTick } from '../../types/trading';
import { roundTo } from '../decimal';

const mockTick: MarketTick = {
  symbol: 'SOL/USDT',
  price: 200,
  bidPrice: 199.98,
  askPrice: 200.02,
  high24h: 210,
  low24h: 190,
  volume24h: 1000000,
  quoteVolume24h: 200000000,
  priceChange24h: 10,
  priceChangePercent24h: 5.26,
  timestamp: Date.now(),
  source: 'binance_live',
};

describe('Financial Math & Margin Formulas', () => {
  it('calculates correct notional values', () => {
    // 10 SOL @ 200 USDT = 2000 USDT
    expect(calculateNotional(10, 200)).toBe(2000);
    // 0.5 SOL @ 185.50 USDT = 92.75 USDT
    expect(calculateNotional(0.5, 185.50)).toBe(92.75);
  });

  it('calculates initial margin across leverage tiers (1x, 10x, 50x, 75x)', () => {
    const notional = 1500; // 7.5 SOL @ 200
    expect(calculateInitialMargin(7.5, 200, 1)).toBe(1500);
    expect(calculateInitialMargin(7.5, 200, 10)).toBe(150);
    expect(calculateInitialMargin(7.5, 200, 50)).toBe(30);
    expect(calculateInitialMargin(7.5, 200, 75)).toBe(20);
  });

  it('calculates Long unrealized PnL and ROE accurately', () => {
    // 10 SOL entered at 200, price rises to 210 -> PnL = +100 USDT
    const pnl = calculateUnrealizedPnL('long', 10, 200, 210);
    expect(pnl).toBe(100);

    // Initial margin at 75x = (10 * 200) / 75 = 26.6667
    const margin = calculateInitialMargin(10, 200, 75);
    const roe = calculateROE(pnl, margin);
    // 100 / 26.67 * 100 = ~374.95%
    expect(roe).toBeGreaterThan(370);
  });

  it('calculates Short unrealized PnL and ROE accurately', () => {
    // 10 SOL short entered at 200, price drops to 190 -> PnL = +100 USDT
    const pnl = calculateUnrealizedPnL('short', 10, 200, 190);
    expect(pnl).toBe(100);

    // If price rises to 210 -> PnL = -100 USDT
    const lossPnl = calculateUnrealizedPnL('short', 10, 200, 210);
    expect(lossPnl).toBe(-100);
  });

  it('calculates isolated liquidation price for 75x leverage', () => {
    // 5 SOL @ 200 = 1000 USDT notional, margin = 1000 / 75 = 13.3333 USDT
    const margin = calculateInitialMargin(5, 200, 75);
    const longLiq = calculateIsolatedLiquidationPrice('long', 5, 200, margin, 75);
    // For 75x long, liq price should be roughly 1.3% below entry (~197.4)
    expect(longLiq).toBeLessThan(200);
    expect(longLiq).toBeGreaterThan(195);

    const shortLiq = calculateIsolatedLiquidationPrice('short', 5, 200, margin, 75);
    // For 75x short, liq price should be roughly 1.3% above entry (~202.6)
    expect(shortLiq).toBeGreaterThan(200);
    expect(shortLiq).toBeLessThan(205);
  });

  it('calculates isolated liquidation price for 10x leverage', () => {
    const margin = calculateInitialMargin(5, 200, 10);
    const longLiq = calculateIsolatedLiquidationPrice('long', 5, 200, margin, 10);
    // At 10x, liq price is roughly 9.5% below entry (~181)
    expect(longLiq).toBeLessThan(190);
    expect(longLiq).toBeGreaterThan(175);
  });
});

describe('Trading Engine Execution & Position Lifecycle', () => {
  it('opens a LONG market position with 75x leverage and updates account balances', () => {
    const initialAccount = createInitialAccountState(10000);

    const result = placeOrder(initialAccount, mockTick, {
      side: 'buy',
      type: 'market',
      quantity: 10, // 10 SOL @ 200 = 2000 USDT notional
      leverage: 75,
      marginMode: 'isolated',
    });

    expect(result.success).toBe(true);
    expect(result.state.positions.length).toBe(1);

    const pos = result.state.positions[0];
    expect(pos.side).toBe('long');
    expect(pos.size).toBe(10);
    expect(pos.leverage).toBe(75);
    expect(pos.entryPrice).toBeCloseTo(200, 0);

    // Initial margin should be approx 2000 / 75 = ~26.67
    expect(pos.isolatedMargin).toBeGreaterThan(26);
    expect(pos.isolatedMargin).toBeLessThan(27);

    // Available balance should decrease by margin
    expect(result.state.availableBalance).toBeLessThan(10000);
    expect(result.state.ledger.length).toBeGreaterThan(1);
  });

  it('rejects order if required margin exceeds available balance', () => {
    const poorAccount = createInitialAccountState(50); // only 50 USDT available

    const result = placeOrder(poorAccount, mockTick, {
      side: 'buy',
      type: 'market',
      quantity: 50, // 50 SOL @ 200 = 10,000 USDT notional -> at 10x requires 1,000 USDT
      leverage: 10,
      marginMode: 'isolated',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient margin');
  });

  it('rejects reduce-only order if no existing position exists', () => {
    const account = createInitialAccountState(10000);

    const result = placeOrder(account, mockTick, {
      side: 'sell',
      type: 'market',
      quantity: 5,
      leverage: 75,
      marginMode: 'isolated',
      reduceOnly: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Reduce-only order rejected');
  });

  it('scales into a position and updates average entry price', () => {
    const account = createInitialAccountState(10000);

    // 1st buy: 5 SOL @ 200
    const res1 = placeOrder(account, mockTick, {
      side: 'buy',
      type: 'market',
      quantity: 5,
      leverage: 50,
      marginMode: 'isolated',
    });

    // 2nd buy: 5 SOL @ 210
    const tickHigher = { ...mockTick, price: 210, askPrice: 210.02, bidPrice: 209.98 };
    const res2 = placeOrder(res1.state, tickHigher, {
      side: 'buy',
      type: 'market',
      quantity: 5,
      leverage: 50,
      marginMode: 'isolated',
    });

    expect(res2.success).toBe(true);
    expect(res2.state.positions.length).toBe(1);
    const pos = res2.state.positions[0];
    expect(pos.size).toBe(10);
    // Average price of 5 @ 200 + 5 @ 210 should be 205
    expect(pos.entryPrice).toBeCloseTo(205, 0);
  });

  it('partially closes a position and calculates realized PnL correctly', () => {
    const account = createInitialAccountState(10000);

    // Open 10 SOL Long @ 200
    const openRes = placeOrder(account, mockTick, {
      side: 'buy',
      type: 'market',
      quantity: 10,
      leverage: 50,
      marginMode: 'isolated',
    });

    const pos = openRes.state.positions[0];

    // Partially close 5 SOL @ 220 (+20 gain per SOL = +100 USDT gain)
    const closeRes = closePosition(openRes.state, pos.id, 5, 220);
    expect(closeRes.success).toBe(true);

    // 5 SOL remaining
    expect(closeRes.state.positions.length).toBe(1);
    expect(closeRes.state.positions[0].size).toBe(5);

    // Realized PnL should be around +100
    expect(closeRes.state.totalRealizedPnL).toBeCloseTo(100, 0);
  });

  it('fully closes a position and releases all margin', () => {
    const account = createInitialAccountState(10000);

    const openRes = placeOrder(account, mockTick, {
      side: 'buy',
      type: 'market',
      quantity: 10,
      leverage: 50,
      marginMode: 'isolated',
    });

    const pos = openRes.state.positions[0];
    const fullCloseRes = closePosition(openRes.state, pos.id, 10, 205);

    expect(fullCloseRes.success).toBe(true);
    expect(fullCloseRes.state.positions.length).toBe(0);
    expect(fullCloseRes.state.totalIsolatedMargin).toBe(0);
  });

  it('triggers take-profit on market tick when price hits target', () => {
    const account = createInitialAccountState(10000);

    const openRes = placeOrder(account, mockTick, {
      side: 'buy',
      type: 'market',
      quantity: 5,
      leverage: 50,
      marginMode: 'isolated',
      takeProfit: 215,
    });

    // Price moves to 216 -> should trigger TP
    const tpTick = { ...mockTick, price: 216 };
    const tickResult = processMarketTick(openRes.state, tpTick);

    expect(tickResult.events.some((e) => e.type === 'tp_triggered')).toBe(true);
    expect(tickResult.state.positions.length).toBe(0);
  });

  it('triggers stop-loss on market tick when price breaches stop', () => {
    const account = createInitialAccountState(10000);

    const openRes = placeOrder(account, mockTick, {
      side: 'buy',
      type: 'market',
      quantity: 5,
      leverage: 10,
      marginMode: 'isolated',
      stopLoss: 190,
    });

    // Price drops to 189 (at 10x, liq is ~181, so SL triggers first!)
    const slTick = { ...mockTick, price: 189 };
    const tickResult = processMarketTick(openRes.state, slTick);

    expect(tickResult.events.some((e) => e.type === 'sl_triggered')).toBe(true);
    expect(tickResult.state.positions.length).toBe(0);
  });

  it('executes limit order when market price reaches limit condition', () => {
    const account = createInitialAccountState(10000);

    // Place Buy limit order @ 195 (current price is 200)
    const ordRes = placeOrder(account, mockTick, {
      side: 'buy',
      type: 'limit',
      price: 195,
      quantity: 4,
      leverage: 50,
      marginMode: 'isolated',
    });

    expect(ordRes.success).toBe(true);
    expect(ordRes.state.openOrders.length).toBe(1);
    expect(ordRes.state.positions.length).toBe(0);

    // Market drops to 194.50
    const dropTick = { ...mockTick, price: 194.50, askPrice: 194.52 };
    const tickRes = processMarketTick(ordRes.state, dropTick);

    expect(tickRes.events.some((e) => e.type === 'limit_filled')).toBe(true);
    expect(tickRes.state.openOrders.length).toBe(0);
    expect(tickRes.state.positions.length).toBe(1);
    expect(tickRes.state.positions[0].entryPrice).toBe(195);
  });

  it('triggers liquidation when price falls below isolated liquidation price', () => {
    const account = createInitialAccountState(10000);

    // Open Long 5 SOL @ 200 with 75x leverage (liq price is ~197.4)
    const openRes = placeOrder(account, mockTick, {
      side: 'buy',
      type: 'market',
      quantity: 5,
      leverage: 75,
      marginMode: 'isolated',
    });

    const pos = openRes.state.positions[0];
    expect(pos.estimatedLiquidationPrice).toBeGreaterThan(196);

    // Price crashes to 195 (breaches liquidation price)
    const crashTick = { ...mockTick, price: 195 };
    const tickResult = processMarketTick(openRes.state, crashTick);

    expect(tickResult.events.some((e) => e.type === 'liquidation')).toBe(true);
    expect(tickResult.state.positions.length).toBe(0);
    // User loses only the allocated isolated margin
    expect(tickResult.state.walletBalance).toBeLessThan(10000);
  });

  it('triggers trailing stop when price peaks and then retraces by callback percentage', () => {
    const account = createInitialAccountState(10000);

    // Open Long with 2% trailing stop callback
    const openRes = placeOrder(account, mockTick, {
      side: 'buy',
      type: 'market',
      quantity: 5,
      leverage: 10,
      marginMode: 'isolated',
      trailingCallbackPercent: 2, // 2% retracement
    });

    // Price rallies from 200 to 220
    const rallyTick = { ...mockTick, price: 220 };
    const rallyRes = processMarketTick(openRes.state, rallyTick);
    expect(rallyRes.state.positions[0].trailingStopPeakPrice).toBe(220);

    // Price retraces more than 2% from peak (220 * 0.97 = 213.4)
    const dropTick = { ...mockTick, price: 213 };
    const dropRes = processMarketTick(rallyRes.state, dropTick);

    expect(dropRes.events.some((e) => e.type === 'sl_triggered')).toBe(true);
    expect(dropRes.state.positions.length).toBe(0);
  });

  it('cancels pending order and restores available balance', () => {
    const account = createInitialAccountState(10000);

    const ordRes = placeOrder(account, mockTick, {
      side: 'buy',
      type: 'limit',
      price: 180,
      quantity: 10,
      leverage: 50,
      marginMode: 'isolated',
    });

    expect(ordRes.state.openOrders.length).toBe(1);
    const balanceBeforeCancel = ordRes.state.availableBalance;

    const canceledState = cancelOrder(ordRes.state, ordRes.state.openOrders[0].id);
    expect(canceledState.openOrders.length).toBe(0);
    expect(canceledState.availableBalance).toBeGreaterThan(balanceBeforeCancel);
  });
});
