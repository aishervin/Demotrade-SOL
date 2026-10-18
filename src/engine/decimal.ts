/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Decimal-safe arithmetic and formatting utilities for financial trading.
 * Eliminates floating-point precision artifacts in crypto calculations.
 */

export function roundTo(value: number, decimals: number): number {
  if (!isFinite(value) || isNaN(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function floorTo(value: number, decimals: number): number {
  if (!isFinite(value) || isNaN(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.floor((value + Number.EPSILON) * factor) / factor;
}

export function ceilTo(value: number, decimals: number): number {
  if (!isFinite(value) || isNaN(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.ceil((value - Number.EPSILON) * factor) / factor;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export function formatPrice(price: number | undefined | null, decimals = 2): string {
  if (price === undefined || price === null || isNaN(price)) return '0.00';
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatAmount(amount: number | undefined | null, decimals = 3): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.000';
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatUSDT(amount: number | undefined | null, decimals = 2): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00';
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(percent: number | undefined | null, decimals = 2, showPlus = true): string {
  if (percent === undefined || percent === null || isNaN(percent)) return '0.00%';
  const prefix = showPlus && percent > 0 ? '+' : '';
  return `${prefix}${percent.toFixed(decimals)}%`;
}
