/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FeeSchedule, MarginMode, PositionSide, RiskSettings } from '../types/trading';
import { roundTo } from './decimal';

export const DEFAULT_FEE_SCHEDULE: FeeSchedule = {
  makerFeeRate: 0.0002, // 0.02%
  takerFeeRate: 0.0005, // 0.05%
  liquidationFeeRate: 0.005, // 0.5%
};

export const DEFAULT_RISK_SETTINGS: RiskSettings = {
  maxLeverage: 75,
  defaultLeverage: 75,
  maxPositionNotional: 250000,
  baseMaintenanceMarginRate: 0.005, // 0.5%
  slippageTolerancePercent: 0.05,
  confirmHighRiskOrders: true,
};

/**
 * Tiered maintenance margin rate for SOL/USDT linear contracts
 */
export function getMaintenanceMarginRate(notional: number): number {
  if (notional <= 50000) return 0.005; // 0.5% up to 50k
  if (notional <= 100000) return 0.0075; // 0.75%
  if (notional <= 250000) return 0.01; // 1.0%
  return 0.015; // 1.5%
}

/**
 * Calculate position notional value: quantity (SOL) * price (USDT)
 */
export function calculateNotional(quantitySOL: number, price: number): number {
  return roundTo(Math.abs(quantitySOL) * price, 4);
}

/**
 * Calculate initial margin required to open a position: notional / leverage
 */
export function calculateInitialMargin(quantitySOL: number, price: number, leverage: number): number {
  if (leverage <= 0) leverage = 1;
  const notional = calculateNotional(quantitySOL, price);
  return roundTo(notional / leverage, 4);
}

/**
 * Calculate unrealized profit and loss
 * Long: Size * (MarkPrice - EntryPrice)
 * Short: Size * (EntryPrice - MarkPrice)
 */
export function calculateUnrealizedPnL(
  side: PositionSide,
  sizeSOL: number,
  entryPrice: number,
  markPrice: number
): number {
  if (side === 'long') {
    return roundTo(sizeSOL * (markPrice - entryPrice), 4);
  } else {
    return roundTo(sizeSOL * (entryPrice - markPrice), 4);
  }
}

/**
 * Return on Equity percentage: (Unrealized PnL / Initial Margin) * 100
 */
export function calculateROE(unrealizedPnL: number, margin: number): number {
  if (margin <= 0) return 0;
  return roundTo((unrealizedPnL / margin) * 100, 2);
}

/**
 * Calculate trading fee
 */
export function calculateFee(notional: number, isMaker = false, fees = DEFAULT_FEE_SCHEDULE): number {
  const rate = isMaker ? fees.makerFeeRate : fees.takerFeeRate;
  return roundTo(notional * rate, 4);
}

/**
 * Calculate estimated liquidation price for an isolated position.
 * Takes into account position margin, maintenance margin rate (MMR), and estimated closing fees.
 */
export function calculateIsolatedLiquidationPrice(
  side: PositionSide,
  sizeSOL: number,
  entryPrice: number,
  isolatedMargin: number,
  leverage: number,
  fees = DEFAULT_FEE_SCHEDULE
): number {
  if (sizeSOL <= 0 || entryPrice <= 0 || isolatedMargin <= 0) return 0;

  const notional = sizeSOL * entryPrice;
  const mmr = getMaintenanceMarginRate(notional);
  const estClosingFee = calculateFee(notional, false, fees);

  if (side === 'long') {
    // LiqPrice = (EntryPrice * Size - Margin + EstClosingFee) / (Size * (1 - MMR))
    const numerator = entryPrice * sizeSOL - isolatedMargin + estClosingFee;
    const denominator = sizeSOL * (1 - mmr);
    const liqPrice = denominator > 0 ? numerator / denominator : 0;
    return roundTo(Math.max(0, liqPrice), 2);
  } else {
    // LiqPrice = (EntryPrice * Size + Margin - EstClosingFee) / (Size * (1 + MMR))
    const numerator = entryPrice * sizeSOL + isolatedMargin - estClosingFee;
    const denominator = sizeSOL * (1 + mmr);
    const liqPrice = denominator > 0 ? numerator / denominator : 0;
    return roundTo(Math.max(0, liqPrice), 2);
  }
}

/**
 * Calculate cross margin liquidation price for a position given account free equity
 */
export function calculateCrossLiquidationPrice(
  side: PositionSide,
  sizeSOL: number,
  entryPrice: number,
  accountEquity: number,
  totalMaintenanceMargin: number,
  fees = DEFAULT_FEE_SCHEDULE
): number {
  if (sizeSOL <= 0 || entryPrice <= 0) return 0;
  const notional = sizeSOL * entryPrice;
  const mmr = getMaintenanceMarginRate(notional);
  const estClosingFee = calculateFee(notional, false, fees);

  // Available equity buffer for this position before account equity falls below maintenance margin
  const buffer = Math.max(0, accountEquity - totalMaintenanceMargin);

  if (side === 'long') {
    const liqPrice = (entryPrice * sizeSOL - buffer + estClosingFee) / (sizeSOL * (1 - mmr));
    return roundTo(Math.max(0, liqPrice), 2);
  } else {
    const liqPrice = (entryPrice * sizeSOL + buffer - estClosingFee) / (sizeSOL * (1 + mmr));
    return roundTo(Math.max(0, liqPrice), 2);
  }
}

/**
 * Calculate distance to liquidation as a percentage of current price
 */
export function calculateLiquidationDistance(currentPrice: number, liqPrice: number): number {
  if (currentPrice <= 0 || liqPrice <= 0) return 100;
  return roundTo(Math.abs((currentPrice - liqPrice) / currentPrice) * 100, 2);
}
