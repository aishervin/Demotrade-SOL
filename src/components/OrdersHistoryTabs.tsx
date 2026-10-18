/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Fill,
  FundingRecord,
  LedgerEntry,
  Order,
  Position,
} from '../types/trading';
import { PositionsPanel } from './PositionsPanel';
import { formatAmount, formatPercent, formatPrice, formatUSDT } from '../engine/decimal';
import { Trash2, Clock, Zap, BookOpen, Layers } from 'lucide-react';

interface OrdersHistoryTabsProps {
  positions: Position[];
  openOrders: Order[];
  orderHistory: Order[];
  tradeHistory: Fill[];
  fundingHistory: FundingRecord[];
  ledger: LedgerEntry[];
  currentPrice: number;
  nextFundingCountdown: string;
  fundingRate: number;
  onClosePosition: (positionId: string, qtySOL: number) => void;
  onCloseAllPositions: () => void;
  onCancelOrder: (orderId: string) => void;
  onCancelAllOrders: () => void;
  onOpenTPSL: (position: Position) => void;
  onOpenAdjustMargin: (position: Position) => void;
  onOpenShareCard: (position: Position) => void;
  onReversePosition: (positionId: string) => void;
  onSimulateFunding: () => void;
}

type TabType = 'positions' | 'openOrders' | 'orderHistory' | 'tradeHistory' | 'funding' | 'ledger';

export function OrdersHistoryTabs({
  positions,
  openOrders,
  orderHistory,
  tradeHistory,
  fundingHistory,
  ledger,
  currentPrice,
  nextFundingCountdown,
  fundingRate,
  onClosePosition,
  onCloseAllPositions,
  onCancelOrder,
  onCancelAllOrders,
  onOpenTPSL,
  onOpenAdjustMargin,
  onOpenShareCard,
  onReversePosition,
  onSimulateFunding,
}: OrdersHistoryTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('positions');

  return (
    <div className="flex flex-col bg-[#0b0e14] border-t border-[#181d27] min-h-[280px]">
      {/* Tab Navigation Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0c1017] border-b border-[#181d27] overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Positions Tab */}
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'positions'
                ? 'bg-[#1e2738] text-[#38bdf8]'
                : 'text-[#848e9c] hover:text-[#d1d4dc]'
            }`}
          >
            <span>Positions</span>
            {positions.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-[#38bdf8] text-[#090c10] font-bold rounded-full">
                {positions.length}
              </span>
            )}
          </button>

          {/* Open Orders Tab */}
          <button
            onClick={() => setActiveTab('openOrders')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'openOrders'
                ? 'bg-[#1e2738] text-[#38bdf8]'
                : 'text-[#848e9c] hover:text-[#d1d4dc]'
            }`}
          >
            <span>Open Orders</span>
            {openOrders.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-[#f0b90b] text-[#090c10] font-bold rounded-full">
                {openOrders.length}
              </span>
            )}
          </button>

          {/* Order History */}
          <button
            onClick={() => setActiveTab('orderHistory')}
            className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'orderHistory'
                ? 'bg-[#1e2738] text-[#38bdf8]'
                : 'text-[#848e9c] hover:text-[#d1d4dc]'
            }`}
          >
            Order History
          </button>

          {/* Trade History */}
          <button
            onClick={() => setActiveTab('tradeHistory')}
            className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'tradeHistory'
                ? 'bg-[#1e2738] text-[#38bdf8]'
                : 'text-[#848e9c] hover:text-[#d1d4dc]'
            }`}
          >
            Trade History
          </button>

          {/* Funding History */}
          <button
            onClick={() => setActiveTab('funding')}
            className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'funding'
                ? 'bg-[#1e2738] text-[#38bdf8]'
                : 'text-[#848e9c] hover:text-[#d1d4dc]'
            }`}
          >
            Funding
          </button>

          {/* Ledger */}
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'ledger'
                ? 'bg-[#1e2738] text-[#38bdf8]'
                : 'text-[#848e9c] hover:text-[#d1d4dc]'
            }`}
          >
            Ledger
          </button>
        </div>

        {/* Action button in header */}
        <div className="flex items-center gap-2">
          {activeTab === 'positions' && positions.length > 1 && (
            <button
              onClick={onCloseAllPositions}
              className="text-[11px] font-bold text-[#f6465d] hover:underline whitespace-nowrap"
            >
              Close All
            </button>
          )}

          {activeTab === 'openOrders' && openOrders.length > 0 && (
            <button
              onClick={onCancelAllOrders}
              className="text-[11px] font-bold text-[#f6465d] hover:underline whitespace-nowrap"
            >
              Cancel All
            </button>
          )}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-x-auto">
        {/* Positions View */}
        {activeTab === 'positions' && (
          <PositionsPanel
            positions={positions}
            currentPrice={currentPrice}
            onClosePosition={onClosePosition}
            onCloseAll={onCloseAllPositions}
            onOpenTPSL={onOpenTPSL}
            onOpenAdjustMargin={onOpenAdjustMargin}
            onOpenShareCard={onOpenShareCard}
            onReversePosition={onReversePosition}
          />
        )}

        {/* Open Orders View */}
        {activeTab === 'openOrders' && (
          <div className="divide-y divide-[#181d27]">
            {openOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-[#64748b] text-xs">
                No open pending orders
              </div>
            ) : (
              openOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3 bg-[#0c1017] flex items-center justify-between text-xs font-mono-num"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ord.side === 'buy' ? 'bg-[#0ecb81]/15 text-[#0ecb81]' : 'bg-[#f6465d]/15 text-[#f6465d]'
                        }`}
                      >
                        {ord.side === 'buy' ? 'BUY / LONG' : 'SELL / SHORT'}
                      </span>
                      <span className="font-bold text-[#f1f5f9]">{ord.symbol}</span>
                      <span className="text-[10px] text-[#848e9c] uppercase bg-[#141a24] px-1 py-0.5 rounded">
                        {ord.type}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#848e9c]">
                      Qty: <span className="text-white font-medium">{formatAmount(ord.quantity, 3)} SOL</span> · Price:{' '}
                      <span className="text-white font-medium">{ord.price ? formatPrice(ord.price) : 'Market'}</span>
                      {ord.triggerPrice && (
                        <span> · Trigger: <span className="text-[#f0b90b]">{formatPrice(ord.triggerPrice)}</span></span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onCancelOrder(ord.id)}
                    className="p-1.5 text-[#ef4444] hover:bg-[#ef4444]/15 rounded transition-colors"
                    title="Cancel Order"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Order History View */}
        {activeTab === 'orderHistory' && (
          <div className="divide-y divide-[#181d27]">
            {orderHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-[#64748b] text-xs">
                No order history
              </div>
            ) : (
              orderHistory.slice(0, 20).map((ord) => (
                <div key={ord.id} className="p-3 bg-[#0c1017] text-xs font-mono-num flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          ord.side === 'buy' ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                        }`}
                      >
                        {ord.side.toUpperCase()}
                      </span>
                      <span className="font-semibold text-[#d1d4dc]">{ord.symbol}</span>
                      <span className="text-[10px] text-[#848e9c] uppercase">{ord.type}</span>
                    </div>
                    <div className="text-[11px] text-[#64748b]">
                      {formatAmount(ord.quantity, 3)} SOL @ {ord.price ? formatPrice(ord.price) : 'Market'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        ord.status === 'filled'
                          ? 'bg-[#0ecb81]/15 text-[#0ecb81]'
                          : ord.status === 'canceled'
                          ? 'bg-[#64748b]/15 text-[#848e9c]'
                          : 'bg-[#f0b90b]/15 text-[#f0b90b]'
                      }`}
                    >
                      {ord.status}
                    </span>
                    <span className="text-[10px] text-[#64748b] block mt-0.5">
                      {new Date(ord.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Trade History View */}
        {activeTab === 'tradeHistory' && (
          <div className="divide-y divide-[#181d27]">
            {tradeHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-[#64748b] text-xs">
                No trade executions recorded
              </div>
            ) : (
              tradeHistory.slice(0, 20).map((fill) => (
                <div key={fill.id} className="p-3 bg-[#0c1017] text-xs font-mono-num flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${fill.side === 'buy' ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                        {fill.side.toUpperCase()}
                      </span>
                      <span className="font-semibold text-white">{fill.symbol}</span>
                      <span className="text-[11px] text-[#d1d4dc]">
                        {formatAmount(fill.quantity, 3)} SOL @ {formatPrice(fill.price)}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#64748b]">
                      Fee: {formatUSDT(fill.fee)} USDT · {new Date(fill.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  {fill.realizedPnL !== 0 && (
                    <div className="text-right">
                      <span className="text-[10px] text-[#64748b] block">Realized PnL</span>
                      <span
                        className={`font-bold ${fill.realizedPnL >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}
                      >
                        {fill.realizedPnL >= 0 ? '+' : ''}{formatUSDT(fill.realizedPnL)} USDT
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Funding History View */}
        {activeTab === 'funding' && (
          <div className="p-3 bg-[#0c1017] text-xs space-y-3">
            {/* Countdown card */}
            <div className="p-3 bg-[#131822] rounded-xl border border-[#1e2533] flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[#848e9c] text-[10px] block">Next 8h Funding Settlement in:</span>
                <span className="text-lg font-mono-num font-extrabold text-[#f0b90b]">
                  {nextFundingCountdown}
                </span>
                <span className="text-[11px] text-[#64748b] block">
                  Simulated Funding Rate: +{(fundingRate * 100).toFixed(4)}% (Longs pay Shorts)
                </span>
              </div>
              <button
                type="button"
                onClick={onSimulateFunding}
                className="py-1.5 px-3 bg-[#1e293b] hover:bg-[#28364d] text-[#38bdf8] text-xs font-bold rounded-lg border border-[#38bdf8]/30 flex items-center gap-1.5 transition-colors"
              >
                <Zap size={13} /> Settle Funding Now
              </button>
            </div>

            {/* Funding logs */}
            <div className="divide-y divide-[#181d27]">
              {fundingHistory.length === 0 ? (
                <div className="text-center py-6 text-[#64748b]">
                  No simulated funding settlements yet. Click "Settle Funding Now" to simulate an 8-hour cycle.
                </div>
              ) : (
                fundingHistory.slice(0, 15).map((f) => (
                  <div key={f.id} className="py-2 flex justify-between font-mono-num text-[11px]">
                    <div>
                      <span className="text-white font-medium">{f.symbol} {f.side.toUpperCase()}</span>
                      <span className="text-[#64748b] text-[10px] ml-2">
                        {new Date(f.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className={f.payment >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
                      {f.payment >= 0 ? '+' : ''}{formatUSDT(f.payment)} USDT
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Ledger View */}
        {activeTab === 'ledger' && (
          <div className="divide-y divide-[#181d27]">
            {ledger.length === 0 ? (
              <div className="text-center py-8 text-[#64748b]">No ledger records</div>
            ) : (
              ledger.slice(0, 25).map((entry) => (
                <div key={entry.id} className="p-3 bg-[#0c1017] text-xs font-mono-num flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-[#848e9c] uppercase font-semibold">
                      {entry.type.replace('_', ' ')}
                    </span>
                    <p className="text-[#d1d4dc] text-[11px] leading-snug">{entry.description}</p>
                    <span className="text-[10px] text-[#64748b]">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-bold ${
                        entry.amount >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                      }`}
                    >
                      {entry.amount >= 0 ? '+' : ''}{formatUSDT(entry.amount)} USDT
                    </span>
                    <span className="text-[10px] text-[#64748b] block mt-0.5">
                      Bal: {formatUSDT(entry.balanceAfter)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
