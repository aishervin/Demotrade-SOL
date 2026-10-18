/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { MarginMode, OrderSide, OrderType, Position } from '../types/trading';
import {
  calculateFee,
  calculateInitialMargin,
  calculateIsolatedLiquidationPrice,
  calculateNotional,
  DEFAULT_FEE_SCHEDULE,
} from '../engine/margin';
import { formatPrice, formatUSDT, roundTo } from '../engine/decimal';
import { ChevronDown, PlusCircle } from 'lucide-react';
import { OrderTypeModal } from './modals/OrderTypeModal';

interface TradeFormProps {
  currentPrice: number;
  availableBalance: number;
  leverage: number;
  marginMode: MarginMode;
  onOpenLeverageModal: () => void;
  onOpenMarginModeModal: () => void;
  onOpenDepositModal?: () => void;
  onSubmitOrder: (params: {
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price?: number;
    triggerPrice?: number;
    trailingCallbackPercent?: number;
    reduceOnly?: boolean;
    postOnly?: boolean;
    stopLoss?: number;
    takeProfit?: number;
  }) => void;
  existingPosition?: Position;
}

export function TradeForm({
  currentPrice,
  availableBalance,
  leverage,
  marginMode,
  onOpenLeverageModal,
  onOpenMarginModeModal,
  onOpenDepositModal,
  onSubmitOrder,
  existingPosition,
}: TradeFormProps) {
  const [tab, setTab] = useState<'open' | 'close'>('open');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [isOrderTypeModalOpen, setIsOrderTypeModalOpen] = useState(false);
  const [unit, setUnit] = useState<'USDT' | 'SOL'>('USDT');

  // Input states
  const [priceInput, setPriceInput] = useState<string>('');
  const [triggerPriceInput, setTriggerPriceInput] = useState<string>('');
  const [quantityInput, setQuantityInput] = useState<string>('');
  const [percentSlider, setPercentSlider] = useState<number>(0);
  const [slippageChecked, setSlippageChecked] = useState(false);

  // Execution reference price
  const executionRefPrice = useMemo(() => {
    if (orderType === 'limit' && priceInput && parseFloat(priceInput) > 0) {
      return parseFloat(priceInput);
    }
    return currentPrice;
  }, [orderType, priceInput, currentPrice]);

  // Derived quantity in SOL
  const qtyInSOL = useMemo(() => {
    const rawVal = parseFloat(quantityInput);
    if (isNaN(rawVal) || rawVal <= 0) return 0;
    if (unit === 'USDT') {
      return roundTo(rawVal / executionRefPrice, 3);
    }
    return roundTo(rawVal, 3);
  }, [quantityInput, unit, executionRefPrice]);

  // Order Notional in USDT
  const notionalUSDT = useMemo(() => {
    return roundTo(qtyInSOL * executionRefPrice, 2);
  }, [qtyInSOL, executionRefPrice]);

  // Margin required
  const marginCost = useMemo(() => {
    if (qtyInSOL <= 0) return 0;
    return calculateInitialMargin(qtyInSOL, executionRefPrice, leverage);
  }, [qtyInSOL, executionRefPrice, leverage]);

  // Estimated PnL
  const estLongPnL = useMemo(() => {
    if (qtyInSOL <= 0) return '--';
    const targetPrice = executionRefPrice * 1.01;
    return `+${roundTo(qtyInSOL * (targetPrice - executionRefPrice), 2)}`;
  }, [qtyInSOL, executionRefPrice]);

  // Handle slider changes
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = Number(e.target.value);
    setPercentSlider(pct);

    if (pct === 0) {
      setQuantityInput('');
      return;
    }

    if (tab === 'close' && existingPosition) {
      const closeSol = roundTo(existingPosition.size * (pct / 100), 3);
      if (unit === 'SOL') {
        setQuantityInput(String(closeSol));
      } else {
        setQuantityInput(String(roundTo(closeSol * executionRefPrice, 2)));
      }
      return;
    }

    // Allocate fraction of available balance as margin
    const targetMargin = (availableBalance * (pct / 100)) * 0.98;
    const targetNotional = targetMargin * leverage;

    if (unit === 'USDT') {
      setQuantityInput(String(roundTo(targetNotional, 2)));
    } else {
      setQuantityInput(String(roundTo(targetNotional / executionRefPrice, 3)));
    }
  };

  const handleAction = (side: OrderSide) => {
    if (qtyInSOL <= 0) return;

    const limitPrice = orderType === 'limit' ? parseFloat(priceInput) : undefined;
    const trigPrice = orderType === 'stop_market' ? parseFloat(triggerPriceInput) : undefined;

    onSubmitOrder({
      side,
      type: orderType,
      quantity: qtyInSOL,
      price: limitPrice,
      triggerPrice: trigPrice,
      reduceOnly: tab === 'close',
    });

    setQuantityInput('');
    setPercentSlider(0);
  };

  return (
    <div className="flex flex-col bg-black text-[#e5e5e5] select-none text-xs font-sans px-2 py-2 w-full">
      {/* 1. Open / Close Tabs */}
      <div className="grid grid-cols-2 gap-1 mb-2">
        <button
          type="button"
          onClick={() => setTab('open')}
          className={`py-1.5 rounded-lg font-bold text-xs transition-colors ${
            tab === 'open'
              ? 'bg-[#1e1e1e] text-white border border-[#333]'
              : 'bg-[#121212] text-[#777] hover:text-[#bbb]'
          }`}
        >
          Open
        </button>
        <button
          type="button"
          onClick={() => setTab('close')}
          className={`py-1.5 rounded-lg font-bold text-xs transition-colors ${
            tab === 'close'
              ? 'bg-[#f6465d] text-white'
              : 'bg-[#121212] text-[#777] hover:text-[#bbb]'
          }`}
        >
          Close
        </button>
      </div>

      {/* 2. Isolated & Leverage Pill Selectors */}
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <button
          type="button"
          onClick={onOpenMarginModeModal}
          className="flex items-center justify-between px-2.5 py-1.5 bg-[#181818] hover:bg-[#222] rounded-md text-xs font-semibold text-[#ddd] border border-[#262626] transition-colors"
        >
          <span className="capitalize">{marginMode === 'isolated' ? 'Isolated' : 'Cross'}</span>
          <ChevronDown size={13} className="text-[#888]" />
        </button>

        <button
          type="button"
          onClick={onOpenLeverageModal}
          className="flex items-center justify-between px-2.5 py-1.5 bg-[#181818] hover:bg-[#222] rounded-md text-xs font-bold text-[#ddd] border border-[#262626] font-mono-num transition-colors"
        >
          <span>{leverage}X</span>
          <ChevronDown size={13} className="text-[#888]" />
        </button>
      </div>

      {/* 3. Order Type Dropdown */}
      <div className="mb-2">
        <button
          type="button"
          onClick={() => setIsOrderTypeModalOpen(true)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 bg-[#181818] hover:bg-[#222] rounded-md text-xs font-semibold text-[#ddd] border border-[#262626] transition-colors"
        >
          <span className="capitalize">
            {orderType === 'market'
              ? 'Market'
              : orderType === 'limit'
              ? 'Limit'
              : orderType === 'stop_market'
              ? 'Trigger'
              : 'Trailing Stop'}
          </span>
          <ChevronDown size={13} className="text-[#888]" />
        </button>
      </div>

      {/* 4. Trigger Price (if Stop/Trigger) */}
      {orderType === 'stop_market' && (
        <div className="mb-2">
          <input
            type="number"
            step="0.01"
            placeholder="Trigger Price"
            value={triggerPriceInput}
            onChange={(e) => setTriggerPriceInput(e.target.value)}
            className="w-full bg-[#181818] border border-[#262626] rounded-md px-2.5 py-1.5 text-xs font-mono-num text-white placeholder-[#555] focus:outline-none focus:border-[#444]"
          />
        </div>
      )}

      {/* 5. Price Field */}
      <div className="mb-2">
        {orderType === 'market' ? (
          <div className="w-full bg-[#181818] border border-[#262626] rounded-md px-2.5 py-1.5 text-xs text-[#888] font-medium">
            Market
          </div>
        ) : (
          <input
            type="number"
            step="0.01"
            placeholder={String(currentPrice)}
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            className="w-full bg-[#181818] border border-[#262626] rounded-md px-2.5 py-1.5 text-xs font-mono-num text-white placeholder-[#555] focus:outline-none focus:border-[#444]"
          />
        )}
      </div>

      {/* 6. Quantity Field with Unit Dropdown */}
      <div className="relative mb-2">
        <input
          type="number"
          step="0.01"
          placeholder="Quantity"
          value={quantityInput}
          onChange={(e) => {
            setQuantityInput(e.target.value);
            setPercentSlider(0);
          }}
          className="w-full bg-[#181818] border border-[#262626] rounded-md pl-2.5 pr-14 py-1.5 text-xs font-mono-num text-white placeholder-[#555] focus:outline-none focus:border-[#444]"
        />
        <div className="absolute right-1 top-1 bottom-1 flex items-center">
          <button
            type="button"
            onClick={() => setUnit(unit === 'USDT' ? 'SOL' : 'USDT')}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-[#aaa] hover:text-white"
          >
            <span>{unit}</span>
            <ChevronDown size={11} className="text-[#888]" />
          </button>
        </div>
      </div>

      {/* 7. KCEX Percentage Slider */}
      <div className="mb-2 px-1">
        <div className="relative flex items-center h-4">
          <input
            type="range"
            min="0"
            max="100"
            step="25"
            value={percentSlider}
            onChange={handleSliderChange}
            aria-label="Order size percentage slider"
            className="w-full h-1 bg-[#262626] rounded-lg appearance-none cursor-pointer accent-white"
          />
        </div>
        <div className="flex justify-between text-[9px] text-[#666] font-mono-num -mt-0.5">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* 8. Available Balance with (+) icon */}
      <div className="flex items-center justify-between text-[11px] text-[#888] font-mono-num mb-1.5">
        <span>Avbl</span>
        <button
          type="button"
          onClick={onOpenDepositModal}
          className="flex items-center gap-1 text-[#e5e5e5] hover:text-white"
        >
          <PlusCircle size={12} className="text-[#bbb]" />
          <span>{formatUSDT(availableBalance)} USDT</span>
        </button>
      </div>

      {/* 9. Slippage Checkbox */}
      <div className="flex items-center gap-1.5 text-[11px] text-[#888] mb-3">
        <input
          type="checkbox"
          id="slippage-check"
          checked={slippageChecked}
          onChange={(e) => setSlippageChecked(e.target.checked)}
          className="rounded bg-[#181818] border-[#333] text-white focus:ring-0"
        />
        <label htmlFor="slippage-check" className="cursor-pointer border-b border-dotted border-[#666]">
          Slippage
        </label>
      </div>

      {/* 10. Buttons & Info Breakdown (Open vs Close) */}
      {tab === 'open' ? (
        <div className="space-y-2 mt-auto">
          {/* Long Button Section */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-[#888] font-mono-num px-0.5">
              <span>Open Long</span>
              <span>{formatUSDT(marginCost)} USDT</span>
            </div>
            <div className="flex justify-between text-[10px] text-[#888] font-mono-num px-0.5">
              <span>Est. PNL</span>
              <span className="text-[#0ecb81]">{estLongPnL} USDT</span>
            </div>
            <button
              type="button"
              onClick={() => handleAction('buy')}
              disabled={qtyInSOL <= 0 || marginCost > availableBalance}
              className="w-full py-2.5 bg-[#0ecb81] hover:bg-[#0ba367] disabled:opacity-40 rounded-lg text-white font-bold text-xs tracking-wide transition-all shadow-md active:scale-98"
            >
              Open Long
            </button>
          </div>

          {/* Short Button Section */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] text-[#888] font-mono-num px-0.5">
              <span>Open Short</span>
              <span>{formatUSDT(marginCost)} USDT</span>
            </div>
            <div className="flex justify-between text-[10px] text-[#888] font-mono-num px-0.5">
              <span>Est. PNL</span>
              <span>-- USDT</span>
            </div>
            <button
              type="button"
              onClick={() => handleAction('sell')}
              disabled={qtyInSOL <= 0 || marginCost > availableBalance}
              className="w-full py-2.5 bg-[#f6465d] hover:bg-[#d63449] disabled:opacity-40 rounded-lg text-white font-bold text-xs tracking-wide transition-all shadow-md active:scale-98"
            >
              Open Short
            </button>
          </div>
        </div>
      ) : (
        /* Close Tab (Matching Screenshot 1 & 4) */
        <div className="space-y-2 mt-auto">
          {/* Close Short Button */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-[#888] font-mono-num px-0.5">
              <span>Close Short</span>
              <span>{existingPosition && existingPosition.side === 'short' ? formatUSDT(existingPosition.notional) : '0.00'} USDT</span>
            </div>
            <div className="flex justify-between text-[10px] text-[#888] font-mono-num px-0.5">
              <span>Est. PNL</span>
              <span>-- USDT</span>
            </div>
            <button
              type="button"
              onClick={() => handleAction('buy')}
              disabled={qtyInSOL <= 0}
              className="w-full py-2.5 bg-[#0ecb81] hover:bg-[#0ba367] disabled:opacity-40 rounded-lg text-white font-bold text-xs tracking-wide transition-all shadow-md active:scale-98"
            >
              Close Short
            </button>
          </div>

          {/* Close Long Button */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] text-[#888] font-mono-num px-0.5">
              <span>Close Long</span>
              <span>{existingPosition && existingPosition.side === 'long' ? formatUSDT(existingPosition.notional) : '0.00'} USDT</span>
            </div>
            <div className="flex justify-between text-[10px] text-[#888] font-mono-num px-0.5">
              <span>Est. PNL</span>
              <span>-- USDT</span>
            </div>
            <button
              type="button"
              onClick={() => handleAction('sell')}
              disabled={qtyInSOL <= 0}
              className="w-full py-2.5 bg-[#f6465d] hover:bg-[#d63449] disabled:opacity-40 rounded-lg text-white font-bold text-xs tracking-wide transition-all shadow-md active:scale-98"
            >
              Close Long
            </button>
          </div>
        </div>
      )}

      {/* Order Type Bottom Sheet Modal */}
      <OrderTypeModal
        currentType={orderType}
        isOpen={isOrderTypeModalOpen}
        onClose={() => setIsOrderTypeModalOpen(false)}
        onSelect={(type) => setOrderType(type)}
      />
    </div>
  );
}
