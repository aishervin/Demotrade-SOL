/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { OrderBookData, RecentTrade } from '../types/trading';
import { formatAmount, formatPercent, formatPrice } from '../engine/decimal';
import { ChevronRight, ChevronDown, AlignJustify } from 'lucide-react';

interface OrderBookProps {
  orderBook: OrderBookData;
  recentTrades: RecentTrade[];
  lastPrice: number;
  priceChange24h: number;
  fundingRateText?: string;
  fundingCountdown?: string;
  onPriceSelect?: (price: number) => void;
}

export function OrderBook({
  orderBook,
  lastPrice,
  priceChange24h,
  fundingRateText = '+0.0100%',
  fundingCountdown = '06:32:22',
  onPriceSelect,
}: OrderBookProps) {
  const [precision, setPrecision] = useState<number>(2);

  // Calculate max cumulative total for visual depth percentages
  const maxAskTotal = useMemo(() => {
    return orderBook.asks.reduce((max, a) => Math.max(max, a.total), 1);
  }, [orderBook.asks]);

  const maxBidTotal = useMemo(() => {
    return orderBook.bids.reduce((max, b) => Math.max(max, b.total), 1);
  }, [orderBook.bids]);

  // Display top 7 asks (reversed so lowest ask is directly above center price)
  const displayAsks = useMemo(() => {
    return [...orderBook.asks].slice(0, 7).reverse();
  }, [orderBook.asks]);

  // Display top 7 bids
  const displayBids = useMemo(() => {
    return [...orderBook.bids].slice(0, 7);
  }, [orderBook.bids]);

  const isUp = priceChange24h >= 0;

  return (
    <div className="flex flex-col bg-black text-[#e5e5e5] select-none text-[11px] font-mono-num px-2 py-2 w-full h-full justify-between">
      {/* 1. Funding / Countdown Header */}
      <div className="flex flex-col items-end pb-1 border-b border-[#1c1c1c] mb-1">
        <span className="text-[10px] text-[#777] font-sans">Funding/Countdown</span>
        <span className="text-[11px] font-bold text-white tracking-tight">
          {fundingRateText}/{fundingCountdown}
        </span>
      </div>

      {/* 2. Column Headers */}
      <div className="flex justify-between text-[10px] text-[#666] font-sans pb-1 px-0.5">
        <span>Price<br />(USDT)</span>
        <span className="text-right">Quantity<br />(USDT)</span>
      </div>

      {/* 3. Asks (Sell Orders - Red) */}
      <div className="flex flex-col gap-[2px]">
        {displayAsks.map((ask, idx) => {
          const depthPercent = Math.min(100, Math.round((ask.total / maxAskTotal) * 100));
          const notionalAmount = ask.quantity * ask.price;
          const displayQty = notionalAmount >= 1000000
            ? `${(notionalAmount / 1000000).toFixed(2)}M`
            : notionalAmount >= 1000
            ? `${(notionalAmount / 1000).toFixed(1)}K`
            : notionalAmount.toFixed(0);

          return (
            <div
              key={`ask-${idx}-${ask.price}`}
              onClick={() => onPriceSelect && onPriceSelect(ask.price)}
              className="relative flex justify-between py-[1.5px] px-1 cursor-pointer hover:bg-[#1f1013] transition-colors"
            >
              {/* Depth Visual Bar */}
              <div
                className="absolute right-0 top-0 bottom-0 bg-[#f6465d]/18 pointer-events-none"
                style={{ width: `${depthPercent}%` }}
              />
              <span className="text-[#f6465d] font-semibold z-10">
                {formatPrice(ask.price, precision)}
              </span>
              <span className="text-right text-[#d1d4dc] z-10 text-[10px]">
                {displayQty}
              </span>
            </div>
          );
        })}
      </div>

      {/* 4. Center Price with 24h % (Tap to fill price in order form) */}
      <div
        onClick={() => onPriceSelect && onPriceSelect(lastPrice)}
        className="my-1.5 py-1 px-1 flex items-center justify-between cursor-pointer hover:bg-[#141414] rounded transition-colors group"
        title="Tap to use current price in order form"
      >
        <div className="flex flex-col">
          <span
            className={`text-base font-extrabold tracking-tight ${
              isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'
            }`}
          >
            {formatPrice(lastPrice, precision)}
          </span>
          <span className="text-[10px] text-[#888] flex items-center gap-1">
            <span>{formatPrice(lastPrice, precision)}</span>
            <span className={isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
              {priceChange24h >= 0 ? '+' : ''}
              {priceChange24h.toFixed(2)}%
            </span>
          </span>
        </div>
      </div>

      {/* 5. Bids (Buy Orders - Green) */}
      <div className="flex flex-col gap-[2px]">
        {displayBids.map((bid, idx) => {
          const depthPercent = Math.min(100, Math.round((bid.total / maxBidTotal) * 100));
          const notionalAmount = bid.quantity * bid.price;
          const displayQty = notionalAmount >= 1000000
            ? `${(notionalAmount / 1000000).toFixed(2)}M`
            : notionalAmount >= 1000
            ? `${(notionalAmount / 1000).toFixed(1)}K`
            : notionalAmount.toFixed(0);

          return (
            <div
              key={`bid-${idx}-${bid.price}`}
              onClick={() => onPriceSelect && onPriceSelect(bid.price)}
              className="relative flex justify-between py-[1.5px] px-1 cursor-pointer hover:bg-[#0d1f17] transition-colors"
            >
              {/* Depth Visual Bar */}
              <div
                className="absolute right-0 top-0 bottom-0 bg-[#0ecb81]/18 pointer-events-none"
                style={{ width: `${depthPercent}%` }}
              />
              <span className="text-[#0ecb81] font-semibold z-10">
                {formatPrice(bid.price, precision)}
              </span>
              <span className="text-right text-[#d1d4dc] z-10 text-[10px]">
                {displayQty}
              </span>
            </div>
          );
        })}
      </div>

      {/* 6. Bottom Controls: Precision dropdown & Layout icon */}
      <div className="flex items-center justify-between pt-1 border-t border-[#1c1c1c] mt-1 text-[10px]">
        <div className="flex items-center bg-[#181818] border border-[#262626] rounded px-1.5 py-0.5">
          <select
            value={precision}
            onChange={(e) => setPrecision(Number(e.target.value))}
            aria-label="Order book price precision"
            className="bg-transparent text-[#ccc] focus:outline-none pr-1"
          >
            <option value={2} className="bg-[#181818] text-white">0.01</option>
            <option value={1} className="bg-[#181818] text-white">0.1</option>
            <option value={0} className="bg-[#181818] text-white">1.0</option>
          </select>
          <ChevronDown size={10} className="text-[#888] pointer-events-none -ml-1" />
        </div>

        {/* Layout icon */}
        <div className="flex items-center gap-0.5 p-1 bg-[#181818] rounded border border-[#262626]">
          <div className="w-1.5 h-3 bg-[#f6465d] rounded-2xs" />
          <div className="w-1.5 h-3 bg-[#0ecb81] rounded-2xs" />
        </div>
      </div>
    </div>
  );
}
