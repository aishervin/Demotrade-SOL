/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AccountState,
  FeeSchedule,
  Fill,
  FundingRecord,
  LedgerEntry,
  MarginMode,
  MarketTick,
  Order,
  OrderSide,
  OrderType,
  Position,
  PositionSide,
  RiskSettings,
} from '../types/trading';
import { roundTo } from './decimal';
import {
  calculateFee,
  calculateInitialMargin,
  calculateIsolatedLiquidationPrice,
  calculateNotional,
  calculateROE,
  calculateUnrealizedPnL,
  DEFAULT_FEE_SCHEDULE,
  DEFAULT_RISK_SETTINGS,
  getMaintenanceMarginRate,
} from './margin';

export const INITIAL_DEMO_BALANCE = 10000; // 10,000 USDT demo funds

export function createInitialAccountState(initialBalance = INITIAL_DEMO_BALANCE): AccountState {
  const timestamp = Date.now();
  return {
    walletBalance: initialBalance,
    availableBalance: initialBalance,
    totalIsolatedMargin: 0,
    totalUnrealizedPnL: 0,
    totalRealizedPnL: 0,
    totalFeesPaid: 0,
    totalFundingPaid: 0,
    accountEquity: initialBalance,
    marginLevelCross: 0,
    initialBalance,
    positions: [],
    openOrders: [],
    orderHistory: [],
    tradeHistory: [],
    fundingHistory: [],
    ledger: [
      {
        id: `init-${timestamp}`,
        timestamp,
        type: 'deposit_demo',
        amount: initialBalance,
        balanceAfter: initialBalance,
        description: 'Initial virtual demo funding ($10,000 USDT)',
      },
    ],
    lastUpdated: timestamp,
  };
}

export interface PlaceOrderParams {
  symbol?: string;
  side: OrderSide; // buy = Long, sell = Short
  type: OrderType;
  quantity: number; // in SOL
  price?: number; // limit price
  triggerPrice?: number; // stop price
  trailingCallbackPercent?: number; // e.g. 1%
  leverage: number;
  marginMode: MarginMode;
  reduceOnly?: boolean;
  postOnly?: boolean;
  stopLoss?: number;
  takeProfit?: number;
}

export interface ExecutionResult {
  success: boolean;
  error?: string;
  order?: Order;
  fills?: Fill[];
  state: AccountState;
  notification?: {
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
  };
}

/**
 * Validates and places a new order into the simulation engine
 */
export function placeOrder(
  currentState: AccountState,
  tick: MarketTick,
  params: PlaceOrderParams,
  fees: FeeSchedule = DEFAULT_FEE_SCHEDULE,
  risk: RiskSettings = DEFAULT_RISK_SETTINGS
): ExecutionResult {
  const symbol = params.symbol || 'SOL/USDT';
  const qty = roundTo(params.quantity, 4);

  if (qty <= 0) {
    return { success: false, error: 'Order quantity must be greater than 0', state: currentState };
  }

  const leverage = Math.min(Math.max(params.leverage, 1), risk.maxLeverage);
  const refPrice = params.price && params.price > 0 ? params.price : tick.price;
  const notional = calculateNotional(qty, refPrice);

  if (notional > risk.maxPositionNotional) {
    return {
      success: false,
      error: `Order notional (${notional} USDT) exceeds maximum allowed risk limit (${risk.maxPositionNotional} USDT)`,
      state: currentState,
    };
  }

  const estMargin = calculateInitialMargin(qty, refPrice, leverage);
  const estOpeningFee = calculateFee(notional, params.type === 'limit', fees);

  // Check reduce-only logic
  const existingPosition = currentState.positions.find((p) => p.symbol === symbol);
  const isClosing = existingPosition && (
    (existingPosition.side === 'long' && params.side === 'sell') ||
    (existingPosition.side === 'short' && params.side === 'buy')
  );

  if (params.reduceOnly && !isClosing) {
    return {
      success: false,
      error: 'Reduce-only order rejected: no existing position in opposite direction to reduce.',
      state: currentState,
    };
  }

  // Margin check if opening or increasing
  if (!isClosing && (estMargin + estOpeningFee > currentState.availableBalance)) {
    return {
      success: false,
      error: `Insufficient margin. Required: ${(estMargin + estOpeningFee).toFixed(2)} USDT, Available: ${currentState.availableBalance.toFixed(2)} USDT`,
      state: currentState,
    };
  }

  const timestamp = Date.now();
  const orderId = `ord-${timestamp}-${Math.floor(Math.random() * 1000)}`;

  const order: Order = {
    id: orderId,
    clientOrderId: `c-${Date.now()}`,
    symbol,
    side: params.side,
    type: params.type,
    price: params.price,
    triggerPrice: params.triggerPrice,
    trailingCallbackPercent: params.trailingCallbackPercent,
    quantity: qty,
    filledQuantity: 0,
    remainingQuantity: qty,
    status: 'new',
    leverage,
    marginMode: params.marginMode,
    reduceOnly: !!params.reduceOnly,
    postOnly: !!params.postOnly,
    timeInForce: 'GTC',
    estimatedMargin: estMargin,
    stopLoss: params.stopLoss,
    takeProfit: params.takeProfit,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // If market order, execute immediately
  if (params.type === 'market') {
    return executeMarketOrder(currentState, order, tick, fees);
  }

  // Otherwise, place into open pending orders
  const newAvailableBalance = isClosing
    ? currentState.availableBalance
    : roundTo(currentState.availableBalance - estMargin, 4);

  const updatedState: AccountState = {
    ...currentState,
    availableBalance: newAvailableBalance,
    openOrders: [order, ...currentState.openOrders],
    lastUpdated: timestamp,
  };

  return {
    success: true,
    order,
    state: updatedState,
    notification: {
      type: 'success',
      message: `${params.side === 'buy' ? 'Long' : 'Short'} ${params.type.toUpperCase()} order placed: ${qty} SOL @ ${params.price || 'Market'}`,
    },
  };
}

/**
 * Execute a market order immediately with simulated realistic execution price & slippage
 */
function executeMarketOrder(
  currentState: AccountState,
  order: Order,
  tick: MarketTick,
  fees: FeeSchedule
): ExecutionResult {
  // Apply a tiny realistic spread/slippage (0.01% - 0.02%)
  const slippageFactor = (order.side === 'buy' ? 1.00015 : 0.99985);
  const basePrice = order.side === 'buy' ? (tick.askPrice || tick.price) : (tick.bidPrice || tick.price);
  const execPrice = roundTo(basePrice * slippageFactor, 2);

  return executeFill(currentState, order, execPrice, order.quantity, fees, false);
}

/**
 * Process a fill for an order
 */
export function executeFill(
  currentState: AccountState,
  order: Order,
  execPrice: number,
  fillQty: number,
  fees: FeeSchedule,
  isMaker: boolean
): ExecutionResult {
  const timestamp = Date.now();
  const fillNotional = calculateNotional(fillQty, execPrice);
  const fee = calculateFee(fillNotional, isMaker, fees);
  const targetSide: PositionSide = order.side === 'buy' ? 'long' : 'short';

  let newWalletBalance = currentState.walletBalance;
  let newRealizedPnLTotal = currentState.totalRealizedPnL;
  let newFeesPaidTotal = roundTo(currentState.totalFeesPaid + fee, 4);

  const existingPosIndex = currentState.positions.findIndex((p) => p.symbol === order.symbol);
  let updatedPositions = [...currentState.positions];
  const newLedgerEntries: LedgerEntry[] = [];
  let fillRealizedPnL = 0;

  if (existingPosIndex >= 0) {
    const pos = currentState.positions[existingPosIndex];

    if (pos.side === targetSide) {
      // Adding to existing position: Calculate weighted average entry price
      const totalSize = roundTo(pos.size + fillQty, 4);
      const totalNotional = pos.size * pos.entryPrice + fillQty * execPrice;
      const newEntryPrice = roundTo(totalNotional / totalSize, 2);
      const newIsolatedMargin = roundTo(
        pos.isolatedMargin + calculateInitialMargin(fillQty, execPrice, pos.leverage),
        4
      );
      const newLiqPrice = calculateIsolatedLiquidationPrice(
        pos.side,
        totalSize,
        newEntryPrice,
        newIsolatedMargin,
        pos.leverage,
        fees
      );

      updatedPositions[existingPosIndex] = {
        ...pos,
        size: totalSize,
        notional: roundTo(totalSize * execPrice, 4),
        entryPrice: newEntryPrice,
        isolatedMargin: newIsolatedMargin,
        estimatedLiquidationPrice: newLiqPrice,
        stopLossPrice: order.stopLoss || pos.stopLossPrice,
        takeProfitPrice: order.takeProfit || pos.takeProfitPrice,
        updatedAt: timestamp,
      };

      newWalletBalance = roundTo(newWalletBalance - fee, 4);
      newLedgerEntries.push({
        id: `fee-${timestamp}-${Math.floor(Math.random() * 1000)}`,
        timestamp,
        type: 'fee',
        amount: -fee,
        balanceAfter: newWalletBalance,
        description: `Trading fee for adding to ${pos.side.toUpperCase()}: ${fillQty} SOL @ ${execPrice}`,
      });
    } else {
      // Reducing or closing opposite position
      const closedQty = Math.min(pos.size, fillQty);
      const direction = pos.side === 'long' ? 1 : -1;
      fillRealizedPnL = roundTo(closedQty * direction * (execPrice - pos.entryPrice), 4);
      newRealizedPnLTotal = roundTo(newRealizedPnLTotal + fillRealizedPnL, 4);

      // Return proportional margin + realized PnL - fee to wallet
      const marginPortion = roundTo(pos.isolatedMargin * (closedQty / pos.size), 4);
      newWalletBalance = roundTo(newWalletBalance + marginPortion + fillRealizedPnL - fee, 4);

      newLedgerEntries.push({
        id: `close-${timestamp}-${Math.floor(Math.random() * 1000)}`,
        timestamp,
        type: 'trade_close',
        amount: fillRealizedPnL,
        balanceAfter: newWalletBalance,
        description: `Closed ${closedQty} SOL of ${pos.side.toUpperCase()} @ ${execPrice} (PnL: ${fillRealizedPnL >= 0 ? '+' : ''}${fillRealizedPnL} USDT)`,
      });

      newLedgerEntries.push({
        id: `fee-${timestamp}-${Math.floor(Math.random() * 1000)}`,
        timestamp,
        type: 'fee',
        amount: -fee,
        balanceAfter: newWalletBalance,
        description: `Trading fee for closing: ${fee} USDT`,
      });

      const remainingPosQty = roundTo(pos.size - closedQty, 4);

      if (remainingPosQty > 0.0001) {
        // Position partially closed
        const remainingMargin = roundTo(pos.isolatedMargin - marginPortion, 4);
        const newLiqPrice = calculateIsolatedLiquidationPrice(
          pos.side,
          remainingPosQty,
          pos.entryPrice,
          remainingMargin,
          pos.leverage,
          fees
        );

        updatedPositions[existingPosIndex] = {
          ...pos,
          size: remainingPosQty,
          notional: roundTo(remainingPosQty * execPrice, 4),
          isolatedMargin: remainingMargin,
          estimatedLiquidationPrice: newLiqPrice,
          realizedPnL: roundTo(pos.realizedPnL + fillRealizedPnL, 4),
          updatedAt: timestamp,
        };
      } else {
        // Position fully closed
        updatedPositions.splice(existingPosIndex, 1);
      }

      // If fillQty was larger than position and reduceOnly is false, open opposite with remaining
      const excessQty = roundTo(fillQty - closedQty, 4);
      if (excessQty > 0.001 && !order.reduceOnly) {
        const excessMargin = calculateInitialMargin(excessQty, execPrice, order.leverage);
        const excessLiqPrice = calculateIsolatedLiquidationPrice(
          targetSide,
          excessQty,
          execPrice,
          excessMargin,
          order.leverage,
          fees
        );

        const newPos: Position = {
          id: `pos-${timestamp}-${Math.floor(Math.random() * 1000)}`,
          symbol: order.symbol,
          side: targetSide,
          size: excessQty,
          notional: roundTo(excessQty * execPrice, 4),
          entryPrice: execPrice,
          markPrice: execPrice,
          leverage: order.leverage,
          marginMode: order.marginMode,
          isolatedMargin: excessMargin,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          realizedPnL: 0,
          estimatedLiquidationPrice: excessLiqPrice,
          maintenanceMargin: roundTo(excessQty * execPrice * getMaintenanceMarginRate(excessQty * execPrice), 4),
          stopLossPrice: order.stopLoss,
          takeProfitPrice: order.takeProfit,
          estClosingFee: calculateFee(excessQty * execPrice, false, fees),
          openedAt: timestamp,
          updatedAt: timestamp,
        };
        updatedPositions.push(newPos);
      }
    }
  } else {
    // Brand new position
    const margin = calculateInitialMargin(fillQty, execPrice, order.leverage);
    const liqPrice = calculateIsolatedLiquidationPrice(
      targetSide,
      fillQty,
      execPrice,
      margin,
      order.leverage,
      fees
    );

    newWalletBalance = roundTo(newWalletBalance - fee, 4);

    newLedgerEntries.push({
      id: `open-${timestamp}-${Math.floor(Math.random() * 1000)}`,
      timestamp,
      type: 'trade_open',
      amount: -margin,
      balanceAfter: newWalletBalance,
      description: `Opened ${order.leverage}x ${targetSide.toUpperCase()} ${fillQty} SOL @ ${execPrice}`,
    });

    newLedgerEntries.push({
      id: `fee-${timestamp}-${Math.floor(Math.random() * 1000)}`,
      timestamp,
      type: 'fee',
      amount: -fee,
      balanceAfter: newWalletBalance,
      description: `Trading fee: ${fee} USDT`,
    });

    const newPosition: Position = {
      id: `pos-${timestamp}-${Math.floor(Math.random() * 1000)}`,
      symbol: order.symbol,
      side: targetSide,
      size: fillQty,
      notional: roundTo(fillQty * execPrice, 4),
      entryPrice: execPrice,
      markPrice: execPrice,
      leverage: order.leverage,
      marginMode: order.marginMode,
      isolatedMargin: margin,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      realizedPnL: 0,
      estimatedLiquidationPrice: liqPrice,
      maintenanceMargin: roundTo(fillQty * execPrice * getMaintenanceMarginRate(fillQty * execPrice), 4),
      stopLossPrice: order.stopLoss,
      takeProfitPrice: order.takeProfit,
      trailingStopCallback: order.trailingCallbackPercent,
      trailingStopPeakPrice: execPrice,
      estClosingFee: calculateFee(fillQty * execPrice, false, fees),
      openedAt: timestamp,
      updatedAt: timestamp,
    };

    updatedPositions.push(newPosition);
  }

  // Create Fill record
  const fill: Fill = {
    id: `fill-${timestamp}-${Math.floor(Math.random() * 1000)}`,
    orderId: order.id,
    symbol: order.symbol,
    side: order.side,
    price: execPrice,
    quantity: fillQty,
    fee,
    feeAsset: 'USDT',
    realizedPnL: fillRealizedPnL,
    timestamp,
  };

  const updatedOrder: Order = {
    ...order,
    filledQuantity: roundTo(order.filledQuantity + fillQty, 4),
    remainingQuantity: roundTo(order.remainingQuantity - fillQty, 4),
    status: order.remainingQuantity - fillQty <= 0.0001 ? 'filled' : 'partially_filled',
    updatedAt: timestamp,
  };

  // Recompute available balance and equity
  const totalIsolatedMargin = updatedPositions.reduce((acc, p) => acc + p.isolatedMargin, 0);
  const pendingOrdersMargin = currentState.openOrders
    .filter((o) => o.id !== order.id)
    .reduce((acc, o) => acc + o.estimatedMargin, 0);

  const availableBalance = Math.max(0, roundTo(newWalletBalance - totalIsolatedMargin - pendingOrdersMargin, 4));

  const updatedState: AccountState = {
    ...currentState,
    walletBalance: newWalletBalance,
    availableBalance,
    totalIsolatedMargin,
    totalRealizedPnL: newRealizedPnLTotal,
    totalFeesPaid: newFeesPaidTotal,
    positions: updatedPositions,
    openOrders: currentState.openOrders.filter((o) => o.id !== order.id),
    orderHistory: [updatedOrder, ...currentState.orderHistory],
    tradeHistory: [fill, ...currentState.tradeHistory],
    ledger: [...newLedgerEntries, ...currentState.ledger],
    lastUpdated: timestamp,
  };

  return {
    success: true,
    order: updatedOrder,
    fills: [fill],
    state: updatedState,
    notification: {
      type: 'success',
      message: `${order.side === 'buy' ? 'Long' : 'Short'} filled: ${fillQty} SOL @ ${execPrice} USDT`,
    },
  };
}

/**
 * Updates positions with new market price ticks:
 * - Recalculates Unrealized PnL & ROE
 * - Checks Stop-Loss and Take-Profit triggers
 * - Checks Trailing Stop triggers
 * - Checks Liquidation triggers
 * - Matches open Limit / Stop orders
 */
export function processMarketTick(
  state: AccountState,
  tick: MarketTick,
  fees: FeeSchedule = DEFAULT_FEE_SCHEDULE
): {
  state: AccountState;
  events: Array<{ type: 'liquidation' | 'sl_triggered' | 'tp_triggered' | 'limit_filled'; message: string }>;
} {
  const currentPrice = tick.price;
  let currentState = { ...state };
  const events: Array<{ type: 'liquidation' | 'sl_triggered' | 'tp_triggered' | 'limit_filled'; message: string }> = [];

  // 1. Process Open Limit and Stop orders against current tick
  const remainingOpenOrders: Order[] = [];
  for (const order of currentState.openOrders) {
    if (order.symbol !== tick.symbol) {
      remainingOpenOrders.push(order);
      continue;
    }

    let shouldFill = false;
    let fillPrice = order.price || currentPrice;

    if (order.type === 'limit' && order.price) {
      if (order.side === 'buy' && (tick.askPrice || currentPrice) <= order.price) {
        shouldFill = true;
        fillPrice = order.price;
      } else if (order.side === 'sell' && (tick.bidPrice || currentPrice) >= order.price) {
        shouldFill = true;
        fillPrice = order.price;
      }
    } else if (order.type === 'stop_market' && order.triggerPrice) {
      if (order.side === 'buy' && currentPrice >= order.triggerPrice) {
        shouldFill = true;
        fillPrice = tick.askPrice || currentPrice;
      } else if (order.side === 'sell' && currentPrice <= order.triggerPrice) {
        shouldFill = true;
        fillPrice = tick.bidPrice || currentPrice;
      }
    }

    if (shouldFill) {
      const res = executeFill(currentState, order, fillPrice, order.quantity, fees, order.type === 'limit');
      currentState = res.state;
      events.push({
        type: 'limit_filled',
        message: `${order.type.toUpperCase()} Order Filled: ${order.quantity} SOL @ ${fillPrice}`,
      });
    } else {
      remainingOpenOrders.push(order);
    }
  }
  currentState.openOrders = remainingOpenOrders;

  // 2. Check each position for TP/SL and Liquidation
  const remainingPositions: Position[] = [];

  for (const pos of currentState.positions) {
    if (pos.symbol !== tick.symbol) {
      remainingPositions.push(pos);
      continue;
    }

    const uPnL = calculateUnrealizedPnL(pos.side, pos.size, pos.entryPrice, currentPrice);
    const roe = calculateROE(uPnL, pos.isolatedMargin);

    // Track peak price for Trailing Stop
    let peakPrice = pos.trailingStopPeakPrice || pos.entryPrice;
    if (pos.side === 'long') {
      peakPrice = Math.max(peakPrice, currentPrice);
    } else {
      peakPrice = Math.min(peakPrice, currentPrice);
    }

    // Trailing Stop trigger check
    let trailingTriggered = false;
    if (pos.trailingStopCallback && pos.trailingStopCallback > 0) {
      if (pos.side === 'long' && currentPrice <= peakPrice * (1 - pos.trailingStopCallback / 100)) {
        trailingTriggered = true;
      } else if (pos.side === 'short' && currentPrice >= peakPrice * (1 + pos.trailingStopCallback / 100)) {
        trailingTriggered = true;
      }
    }

    // Check Take Profit trigger
    let tpTriggered = false;
    if (pos.takeProfitPrice && pos.takeProfitPrice > 0) {
      if (pos.side === 'long' && currentPrice >= pos.takeProfitPrice) tpTriggered = true;
      if (pos.side === 'short' && currentPrice <= pos.takeProfitPrice) tpTriggered = true;
    }

    // Check Stop Loss trigger
    let slTriggered = false;
    if (pos.stopLossPrice && pos.stopLossPrice > 0) {
      if (pos.side === 'long' && currentPrice <= pos.stopLossPrice) slTriggered = true;
      if (pos.side === 'short' && currentPrice >= pos.stopLossPrice) slTriggered = true;
    }

    // Check Liquidation trigger
    let isLiquidated = false;
    if (pos.marginMode === 'isolated' && pos.estimatedLiquidationPrice > 0) {
      if (pos.side === 'long' && currentPrice <= pos.estimatedLiquidationPrice) isLiquidated = true;
      if (pos.side === 'short' && currentPrice >= pos.estimatedLiquidationPrice) isLiquidated = true;
    }

    if (isLiquidated) {
      // Execute simulated liquidation
      const liqTimestamp = Date.now();
      const liqFee = roundTo(pos.notional * fees.liquidationFeeRate, 4);
      // For isolated liquidation, user loses the allocated isolated margin
      const lostMargin = pos.isolatedMargin;
      const newWallet = roundTo(currentState.walletBalance - lostMargin, 4);

      currentState.ledger = [
        {
          id: `liq-${liqTimestamp}-${Math.floor(Math.random() * 1000)}`,
          timestamp: liqTimestamp,
          type: 'liquidation',
          amount: -lostMargin,
          balanceAfter: newWallet,
          description: `⚠️ LIQUIDATION: ${pos.leverage}x ${pos.side.toUpperCase()} ${pos.size} SOL liquidated @ ${currentPrice} USDT`,
        },
        ...currentState.ledger,
      ];

      currentState.walletBalance = newWallet;
      events.push({
        type: 'liquidation',
        message: `⚠️ Position Liquidated: ${pos.leverage}x ${pos.side.toUpperCase()} ${pos.size} SOL @ ${currentPrice}`,
      });
      continue; // Remove position
    }

    if (tpTriggered || slTriggered || trailingTriggered) {
      // Close position automatically at market price
      const closeSide: OrderSide = pos.side === 'long' ? 'sell' : 'buy';
      const reason = tpTriggered ? 'Take-Profit' : slTriggered ? 'Stop-Loss' : 'Trailing Stop';
      const closeOrder: Order = {
        id: `auto-${Date.now()}`,
        clientOrderId: `auto-${Date.now()}`,
        symbol: pos.symbol,
        side: closeSide,
        type: 'market',
        quantity: pos.size,
        filledQuantity: 0,
        remainingQuantity: pos.size,
        status: 'new',
        leverage: pos.leverage,
        marginMode: pos.marginMode,
        reduceOnly: true,
        postOnly: false,
        timeInForce: 'IOC',
        estimatedMargin: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const res = executeFill(currentState, closeOrder, currentPrice, pos.size, fees, false);
      currentState = res.state;
      events.push({
        type: tpTriggered ? 'tp_triggered' : 'sl_triggered',
        message: `🎯 ${reason} Triggered: Closed ${pos.size} SOL @ ${currentPrice} USDT`,
      });
      continue;
    }

    // Update normal ongoing position metrics
    remainingPositions.push({
      ...pos,
      markPrice: currentPrice,
      notional: roundTo(pos.size * currentPrice, 4),
      unrealizedPnL: uPnL,
      unrealizedPnLPercent: roe,
      trailingStopPeakPrice: peakPrice,
      updatedAt: Date.now(),
    });
  }

  currentState.positions = remainingPositions;

  // Recompute total account unrealized PnL & Equity
  const totalUnrealizedPnL = roundTo(
    remainingPositions.reduce((acc, p) => acc + p.unrealizedPnL, 0),
    4
  );
  const totalIsolatedMargin = roundTo(
    remainingPositions.reduce((acc, p) => acc + p.isolatedMargin, 0),
    4
  );
  const pendingOrdersMargin = roundTo(
    currentState.openOrders.reduce((acc, o) => acc + o.estimatedMargin, 0),
    4
  );

  const accountEquity = roundTo(currentState.walletBalance + totalUnrealizedPnL, 4);
  const availableBalance = Math.max(0, roundTo(currentState.walletBalance - totalIsolatedMargin - pendingOrdersMargin, 4));

  currentState.totalUnrealizedPnL = totalUnrealizedPnL;
  currentState.totalIsolatedMargin = totalIsolatedMargin;
  currentState.accountEquity = accountEquity;
  currentState.availableBalance = availableBalance;
  currentState.lastUpdated = Date.now();

  return { state: currentState, events };
}

/**
 * Close a position manually (partial or full) at market price
 */
export function closePosition(
  currentState: AccountState,
  positionId: string,
  closedQtySOL: number,
  currentPrice: number,
  fees: FeeSchedule = DEFAULT_FEE_SCHEDULE
): ExecutionResult {
  const pos = currentState.positions.find((p) => p.id === positionId);
  if (!pos) {
    return { success: false, error: 'Position not found', state: currentState };
  }

  const qty = roundTo(Math.min(pos.size, closedQtySOL), 4);
  if (qty <= 0) {
    return { success: false, error: 'Invalid close quantity', state: currentState };
  }

  const side: OrderSide = pos.side === 'long' ? 'sell' : 'buy';
  const order: Order = {
    id: `close-${Date.now()}`,
    clientOrderId: `c-${Date.now()}`,
    symbol: pos.symbol,
    side,
    type: 'market',
    quantity: qty,
    filledQuantity: 0,
    remainingQuantity: qty,
    status: 'new',
    leverage: pos.leverage,
    marginMode: pos.marginMode,
    reduceOnly: true,
    postOnly: false,
    timeInForce: 'IOC',
    estimatedMargin: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return executeFill(currentState, order, currentPrice, qty, fees, false);
}

/**
 * Cancel an open pending order and release reserved margin
 */
export function cancelOrder(currentState: AccountState, orderId: string): AccountState {
  const order = currentState.openOrders.find((o) => o.id === orderId);
  if (!order) return currentState;

  const updatedOpenOrders = currentState.openOrders.filter((o) => o.id !== orderId);
  const updatedOrderHistory: Order[] = [
    { ...order, status: 'canceled', updatedAt: Date.now() },
    ...currentState.orderHistory,
  ];

  const pendingMargin = updatedOpenOrders.reduce((acc, o) => acc + o.estimatedMargin, 0);
  const availableBalance = Math.max(
    0,
    roundTo(currentState.walletBalance - currentState.totalIsolatedMargin - pendingMargin, 4)
  );

  return {
    ...currentState,
    openOrders: updatedOpenOrders,
    orderHistory: updatedOrderHistory,
    availableBalance,
    lastUpdated: Date.now(),
  };
}

/**
 * Cancel all open orders
 */
export function cancelAllOrders(currentState: AccountState): AccountState {
  const canceled = currentState.openOrders.map((o) => ({
    ...o,
    status: 'canceled' as const,
    updatedAt: Date.now(),
  }));

  const availableBalance = Math.max(
    0,
    roundTo(currentState.walletBalance - currentState.totalIsolatedMargin, 4)
  );

  return {
    ...currentState,
    openOrders: [],
    orderHistory: [...canceled, ...currentState.orderHistory],
    availableBalance,
    lastUpdated: Date.now(),
  };
}

/**
 * Adjust isolated margin (add or remove collateral)
 */
export function adjustPositionMargin(
  currentState: AccountState,
  positionId: string,
  deltaMargin: number // positive = add margin, negative = remove margin
): { success: boolean; state: AccountState; error?: string } {
  const pos = currentState.positions.find((p) => p.id === positionId);
  if (!pos) return { success: false, state: currentState, error: 'Position not found' };

  if (deltaMargin > 0) {
    if (deltaMargin > currentState.availableBalance) {
      return { success: false, state: currentState, error: 'Insufficient available balance to add margin' };
    }
  } else if (deltaMargin < 0) {
    // Check minimum maintenance margin
    const minMargin = calculateInitialMargin(pos.size, pos.entryPrice, pos.leverage);
    if (pos.isolatedMargin + deltaMargin < minMargin * 0.8) {
      return { success: false, state: currentState, error: 'Cannot remove margin below minimum requirement' };
    }
  }

  const newMargin = roundTo(pos.isolatedMargin + deltaMargin, 4);
  const newLiqPrice = calculateIsolatedLiquidationPrice(
    pos.side,
    pos.size,
    pos.entryPrice,
    newMargin,
    pos.leverage
  );

  const updatedPositions = currentState.positions.map((p) =>
    p.id === positionId
      ? { ...p, isolatedMargin: newMargin, estimatedLiquidationPrice: newLiqPrice, updatedAt: Date.now() }
      : p
  );

  const totalIsolatedMargin = roundTo(
    updatedPositions.reduce((acc, p) => acc + p.isolatedMargin, 0),
    4
  );
  const availableBalance = roundTo(currentState.availableBalance - deltaMargin, 4);

  const ledgerEntry: LedgerEntry = {
    id: `mrg-${Date.now()}`,
    timestamp: Date.now(),
    type: deltaMargin > 0 ? 'margin_add' : 'margin_remove',
    amount: -deltaMargin,
    balanceAfter: currentState.walletBalance,
    description: `${deltaMargin > 0 ? 'Added' : 'Removed'} ${Math.abs(deltaMargin)} USDT isolated margin for ${pos.side.toUpperCase()}`,
  };

  return {
    success: true,
    state: {
      ...currentState,
      positions: updatedPositions,
      totalIsolatedMargin,
      availableBalance,
      ledger: [ledgerEntry, ...currentState.ledger],
      lastUpdated: Date.now(),
    },
  };
}

/**
 * Update Take Profit and Stop Loss for an open position
 */
export function updatePositionTPSL(
  currentState: AccountState,
  positionId: string,
  takeProfitPrice?: number,
  stopLossPrice?: number
): AccountState {
  const updatedPositions = currentState.positions.map((p) =>
    p.id === positionId
      ? {
          ...p,
          takeProfitPrice: takeProfitPrice && takeProfitPrice > 0 ? takeProfitPrice : undefined,
          stopLossPrice: stopLossPrice && stopLossPrice > 0 ? stopLossPrice : undefined,
          updatedAt: Date.now(),
        }
      : p
  );

  return {
    ...currentState,
    positions: updatedPositions,
    lastUpdated: Date.now(),
  };
}

/**
 * Apply 8-hour funding settlement
 */
export function applyFundingSettlement(
  currentState: AccountState,
  fundingRate: number = 0.0001 // +0.01%
): AccountState {
  const timestamp = Date.now();
  let walletBalance = currentState.walletBalance;
  let totalFundingPaid = currentState.totalFundingPaid;
  const newFundingRecords: FundingRecord[] = [];
  const newLedgerEntries: LedgerEntry[] = [];

  for (const pos of currentState.positions) {
    const notional = pos.notional;
    // Positive rate: Longs pay funding, Shorts receive funding
    const payment = pos.side === 'long' ? -roundTo(notional * fundingRate, 4) : roundTo(notional * fundingRate, 4);

    walletBalance = roundTo(walletBalance + payment, 4);
    totalFundingPaid = roundTo(totalFundingPaid + (payment < 0 ? Math.abs(payment) : -payment), 4);

    newFundingRecords.push({
      id: `fund-${timestamp}-${Math.floor(Math.random() * 1000)}`,
      timestamp,
      symbol: pos.symbol,
      rate: fundingRate,
      side: pos.side,
      positionSize: pos.size,
      notional,
      payment,
    });

    newLedgerEntries.push({
      id: `fund-led-${timestamp}-${Math.floor(Math.random() * 1000)}`,
      timestamp,
      type: 'funding',
      amount: payment,
      balanceAfter: walletBalance,
      description: `Funding settlement (${(fundingRate * 100).toFixed(4)}%): ${payment >= 0 ? '+' : ''}${payment} USDT on ${pos.side.toUpperCase()}`,
    });
  }

  const accountEquity = roundTo(walletBalance + currentState.totalUnrealizedPnL, 4);
  const availableBalance = Math.max(0, roundTo(walletBalance - currentState.totalIsolatedMargin, 4));

  return {
    ...currentState,
    walletBalance,
    accountEquity,
    availableBalance,
    totalFundingPaid,
    fundingHistory: [...newFundingRecords, ...currentState.fundingHistory],
    ledger: [...newLedgerEntries, ...currentState.ledger],
    lastUpdated: timestamp,
  };
}
