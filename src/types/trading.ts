/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MarginMode = 'isolated' | 'cross';
export type OrderSide = 'buy' | 'sell'; // buy = Long, sell = Short
export type PositionSide = 'long' | 'short';
export type OrderType = 'market' | 'limit' | 'stop_market' | 'stop_limit' | 'trailing_stop';
export type OrderStatus = 'new' | 'partially_filled' | 'filled' | 'canceled' | 'rejected' | 'expired';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK';

export interface MarketTick {
  symbol: string;
  price: number;
  bidPrice: number;
  askPrice: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  timestamp: number;
  source: 'binance_live' | 'spot_reference' | 'simulated_fallback';
}

export interface Candle {
  time: number; // Unix timestamp in seconds for lightweight-charts
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

export interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  spreadPercent: number;
  lastUpdated: number;
}

export interface RecentTrade {
  id: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  time: number;
}

export interface Position {
  id: string;
  symbol: string;
  side: PositionSide;
  size: number; // in SOL
  notional: number; // size * markPrice
  entryPrice: number;
  markPrice: number;
  leverage: number;
  marginMode: MarginMode;
  isolatedMargin: number; // USDT allocated specifically if isolated
  unrealizedPnL: number;
  unrealizedPnLPercent: number; // ROE %
  realizedPnL: number;
  estimatedLiquidationPrice: number;
  maintenanceMargin: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  trailingStopCallback?: number; // e.g. 1%
  trailingStopPeakPrice?: number; // tracked highest/lowest price
  estClosingFee: number;
  openedAt: number;
  updatedAt: number;
}

export interface Order {
  id: string;
  clientOrderId: string;
  symbol: string;
  side: OrderSide; // buy = Long, sell = Short
  type: OrderType;
  price?: number; // limit price
  triggerPrice?: number; // stop/trigger price
  trailingCallbackPercent?: number; // trailing stop retracement %
  quantity: number; // in SOL
  filledQuantity: number;
  remainingQuantity: number;
  status: OrderStatus;
  leverage: number;
  marginMode: MarginMode;
  reduceOnly: boolean;
  postOnly: boolean;
  timeInForce: TimeInForce;
  estimatedMargin: number;
  stopLoss?: number;
  takeProfit?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Fill {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  price: number;
  quantity: number;
  fee: number;
  feeAsset: 'USDT';
  realizedPnL: number;
  timestamp: number;
}

export interface LedgerEntry {
  id: string;
  timestamp: number;
  type: 'deposit_demo' | 'trade_open' | 'trade_close' | 'liquidation' | 'fee' | 'funding' | 'margin_add' | 'margin_remove' | 'account_reset';
  amount: number; // positive or negative USDT
  balanceAfter: number;
  description: string;
  relatedId?: string;
}

export interface FundingRecord {
  id: string;
  timestamp: number;
  symbol: string;
  rate: number; // e.g. 0.0001 = 0.01%
  side: PositionSide;
  positionSize: number;
  notional: number;
  payment: number; // positive = received, negative = paid
}

export interface AccountState {
  walletBalance: number; // available cash + isolated margins
  availableBalance: number; // free margin to open new positions
  totalIsolatedMargin: number;
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  totalFeesPaid: number;
  totalFundingPaid: number;
  accountEquity: number; // walletBalance + totalUnrealizedPnL
  marginLevelCross: number; // % margin ratio for cross mode
  initialBalance: number;
  positions: Position[];
  openOrders: Order[];
  orderHistory: Order[];
  tradeHistory: Fill[];
  fundingHistory: FundingRecord[];
  ledger: LedgerEntry[];
  lastUpdated: number;
}

export interface FeeSchedule {
  makerFeeRate: number; // e.g. 0.0002 (0.02%)
  takerFeeRate: number; // e.g. 0.0005 (0.05%)
  liquidationFeeRate: number; // e.g. 0.005 (0.5%)
}

export interface RiskSettings {
  maxLeverage: number; // 75
  defaultLeverage: number; // 75
  maxPositionNotional: number; // e.g. 250,000 USDT
  baseMaintenanceMarginRate: number; // 0.005 (0.5% for SOL)
  slippageTolerancePercent: number; // e.g. 0.05%
  confirmHighRiskOrders: boolean;
}

export interface IndicatorConfig {
  showEMA9: boolean;
  showEMA21: boolean;
  showSMA50: boolean;
  showSMA200: boolean;
  showBollingerBands: boolean;
  showRSI: boolean;
  showMACD: boolean;
  showVolume: boolean;
}

export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';
